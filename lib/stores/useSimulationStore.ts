import { create } from 'zustand';
import type { IKineticState } from '@/core/physics/interfaces/IKineticEngine';
import type { RigidBodyState } from '@/core/physics/interfaces/IVehicleBody';
import type { PinValueMap } from '@/core/components/interfaces/IComponent';
import { SimulationLoop, type SimulationConfig, type SimulationSnapshot } from '@/core/simulation/SimulationLoop';
import type { WiringGraph } from '@/core/simulation/WiringGraph';
import type { IMicrocontroller } from '@/core/mcu/interfaces/IMicrocontroller';
import type { IComponent } from '@/core/components/interfaces/IComponent';
import { SketchInterpreter, type SketchCallbacks } from '@/core/sketch/SketchInterpreter';
import { useMcuStore } from './useMcuStore';

export type RigidBodyStateWithWheels = RigidBodyState & { wheelAngleLeft: number; wheelAngleRight: number };

export interface MotionLogEntry {
  tick: number;
  x: number;
  z: number;
  dir: number;   // heading in degrees 0-360
  v: number;     // forward speed m/s
  omega: number; // angular rate rad/s
  motorL: number; // left motor speed cm/s
  motorR: number; // right motor speed cm/s
  phase: string;  // detected phase label
}

const MOTION_LOG_MAX = 3000;

export interface SimulationStoreState {
  isRunning: boolean;
  sessionId: number;
  speed: number;
  kineticStates: Record<string, IKineticState>;
  rigidBodyState: RigidBodyStateWithWheels | null;
  motionLog: MotionLogEntry[];
  componentOutputs: Record<string, PinValueMap>;
  supplyVoltage: number;
  totalCurrent: number;
  tickCount: number;
  simulationLoop: SimulationLoop | null;
  config: SimulationConfig | null;
  interpreter: SketchInterpreter | null;
  sketchSource: string;

  initialize: (mcu: IMicrocontroller, components: Map<string, IComponent>, wiring: WiringGraph, config: SimulationConfig) => void;
  loadSketch: (source: string) => void;
  tick: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
}

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  isRunning: false,
  sessionId: 0,
  speed: 1,
  kineticStates: {},
  rigidBodyState: null,
  motionLog: [],
  componentOutputs: {},
  supplyVoltage: 0,
  totalCurrent: 0,
  tickCount: 0,
  simulationLoop: null,
  config: null,
  interpreter: null,
  sketchSource: '',

  initialize: (mcu, components, wiring, config) => {
    const loop = new SimulationLoop(mcu, components, wiring, config);

    const callbacks: SketchCallbacks = {
      onPinMode: (_pin, _mode) => { },
      onDigitalWrite: (pin, value) => {
        mcu.writePin(pin, value);
      },
      onAnalogWrite: (pin, value) => {
        const normalized = value / 255;
        mcu.writePin(pin, normalized);
        const mcuPin = mcu.getPin(pin);
        if (mcuPin) {
          mcuPin.pwmDutyCycle = normalized;
          mcuPin.mode = 'pwm';
          mcuPin.value = normalized;
        }
      },
      onSerialPrint: (text) => {
        useMcuStore.getState().appendSerial(text);
      },
      onDigitalRead: (pin) => {
        const mcuPin = mcu.getPin(pin);
        return mcuPin ? (mcuPin.value > 0.5 ? 1 : 0) : 0;
      },
      onAnalogRead: (pin) => {
        const mcuPin = mcu.getPin(pin);
        return mcuPin ? Math.round(mcuPin.value * 1023) : 0;
      },
    };

    const interpreter = new SketchInterpreter(callbacks);
    set({ simulationLoop: loop, config, interpreter, tickCount: 0 });
  },

  loadSketch: (source) => {
    const { interpreter } = get();
    if (interpreter) {
      interpreter.parse(source);
    }
    set({ sketchSource: source });
  },

  tick: () => {
    const { simulationLoop, isRunning, config, interpreter, speed } = get();
    if (!simulationLoop || !isRunning || !config) return;

    const dtMs = config.fixedDt * 1000;
    const stepsPerFrame = Math.max(1, Math.round(speed));

    for (let s = 0; s < stepsPerFrame; s++) {
      if (interpreter?.isRunning) {
        interpreter.tick(dtMs);
      }

      const snapshot: SimulationSnapshot = simulationLoop.step();

      // Only update state on last step of multi-step frame
      if (s === stepsPerFrame - 1) {
        const kineticStates: Record<string, IKineticState> = {};
        for (const [id, state] of snapshot.kineticStates) kineticStates[id] = state;
        const componentOutputs: Record<string, PinValueMap> = {};
        for (const [id, outputs] of snapshot.componentOutputs) componentOutputs[id] = outputs;

        set((prev) => {
          const tickCount = prev.tickCount + stepsPerFrame;
          const body = snapshot.rigidBodyState;
          let motionLog = prev.motionLog;
          if (body) {
            const deg = (body.theta * 180) / Math.PI;
            const dir = ((deg % 360) + 360) % 360;
            const vCm = body.v * 100;
            const omegaDeg = Math.abs(body.omega * 180 / Math.PI);
            const mL = kineticStates['motor-left'];
            const mR = kineticStates['motor-right'];
            const motorL = mL ? mL.linearVelocity * 100 : 0;
            const motorR = mR ? mR.linearVelocity * 100 : 0;

            const driverOut = componentOutputs['driver'];
            const pwrA = driverOut ? Math.abs(driverOut['OUT_A'] ?? 0) : 0;
            const pwrB = driverOut ? Math.abs(driverOut['OUT_B'] ?? 0) : 0;
            const dirA = driverOut ? (driverOut['DIR_A'] ?? 0) : 0;
            const dirB = driverOut ? (driverOut['DIR_B'] ?? 0) : 0;
            const motorsOn = pwrA > 0.01 || pwrB > 0.01;
            const sameDir = dirA === dirB && dirA !== 0;
            const oppDir = dirA !== 0 && dirB !== 0 && dirA !== dirB;

            let phase = 'STOPPED';
            if (motorsOn && sameDir) phase = 'FORWARD';
            else if (motorsOn && oppDir) phase = 'PIVOT';
            else if (motorsOn) phase = 'DRIVE';
            else if (!motorsOn && (Math.abs(vCm) > 0.5 || omegaDeg > 5)) phase = 'COASTING';
            else phase = 'STOPPED';

            const entry: MotionLogEntry = {
              tick: tickCount,
              x: body.x,
              z: body.z,
              dir,
              v: body.v,
              omega: body.omega,
              motorL,
              motorR,
              phase,
            };
            motionLog = [...prev.motionLog, entry].slice(-MOTION_LOG_MAX);
          }
          return {
            kineticStates,
            rigidBodyState: snapshot.rigidBodyState,
            motionLog,
            componentOutputs,
            supplyVoltage: snapshot.supplyVoltage,
            totalCurrent: snapshot.totalCurrent,
            tickCount,
          };
        });
      } // end if last step
    } // end for stepsPerFrame
  },

  play: () => {
    const { interpreter, sketchSource } = get();
    if (interpreter && sketchSource) {
      interpreter.parse(sketchSource);
    }
    set({ isRunning: true });
  },

  pause: () => set({ isRunning: false }),

  reset: () => {
    const { simulationLoop, interpreter } = get();
    simulationLoop?.reset();
    interpreter?.reset();
    set((prev) => ({
      isRunning: false,
      sessionId: prev.sessionId + 1,
      kineticStates: {},
      rigidBodyState: null,
      motionLog: [],
      componentOutputs: {},
      supplyVoltage: 0,
      totalCurrent: 0,
      tickCount: 0,
    }));
  },

  setSpeed: (speed) => set({ speed }),
}));
