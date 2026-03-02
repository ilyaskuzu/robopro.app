import { create } from 'zustand';
import type { IKineticState } from '@/core/physics/interfaces/IKineticEngine';
import type { RigidBodyState } from '@/core/physics/interfaces/IVehicleBody';
import type { PinValueMap } from '@/core/components/interfaces/IComponent';
import { SimulationLoop, type SimulationConfig, type SimulationSnapshot, type ComponentWire } from '@/core/simulation/SimulationLoop';
import type { WiringGraph } from '@/core/simulation/WiringGraph';
import type { CircuitError } from '@/core/simulation/CircuitValidator';
import type { IMicrocontroller } from '@/core/mcu/interfaces/IMicrocontroller';
import type { IComponent } from '@/core/components/interfaces/IComponent';
import { SketchInterpreter, type SketchCallbacks } from '@/core/sketch/SketchInterpreter';
import { ObstacleWorld } from '@/core/simulation/ObstacleWorld';
import { LineTrack } from '@/core/simulation/LineTrack';
import { FrictionMap } from '@/core/simulation/FrictionMap';
import { WallWorld } from '@/core/simulation/WallWorld';
import { TerrainMap } from '@/core/simulation/TerrainMap';
import { useMcuStore } from './useMcuStore';
import { useEnvironmentStore } from './useEnvironmentStore';

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

/**
 * Fixed-size ring buffer for motion log entries.
 * Avoids array copy on every tick (60 Hz).
 */
class MotionLogRingBuffer {
  private buf: MotionLogEntry[] = [];
  private head = 0;
  private count = 0;
  constructor(private readonly capacity = MOTION_LOG_MAX) {
    this.buf = new Array(capacity);
  }
  push(entry: MotionLogEntry): void {
    this.buf[this.head] = entry;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }
  /** Returns entries in chronological order (oldest → newest). */
  toArray(): MotionLogEntry[] {
    if (this.count < this.capacity) return this.buf.slice(0, this.count);
    return [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
  }
  clear(): void { this.head = 0; this.count = 0; }
  get length(): number { return this.count; }
}

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
  obstacleWorld: ObstacleWorld;
  lineTrack: LineTrack;
  frictionMap: FrictionMap;
  wallWorld: WallWorld;
  terrainMap: TerrainMap;
  /** @internal ring buffer backing motionLog — not exposed to subscribers */
  _motionRing: MotionLogRingBuffer;
  /** Circuit validation errors from the most recent play() attempt */
  circuitErrors: CircuitError[];

  initialize: (mcu: IMicrocontroller, components: Map<string, IComponent>, wiring: WiringGraph, config: SimulationConfig, componentWires?: readonly ComponentWire[]) => void;
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
  obstacleWorld: new ObstacleWorld(),
  lineTrack: new LineTrack(),
  frictionMap: new FrictionMap(),
  wallWorld: new WallWorld(),
  terrainMap: new TerrainMap(),
  _motionRing: new MotionLogRingBuffer(),
  circuitErrors: [],

  initialize: (mcu, components, wiring, config, componentWires) => {
    const { obstacleWorld, lineTrack, frictionMap, wallWorld, terrainMap } = get();
    const env = useEnvironmentStore.getState();
    // Sync all environment data so physics matches the visible scene (presets + user-added)
    wallWorld.clear();
    for (const w of env.walls) wallWorld.addWall(w);
    obstacleWorld.clear();
    for (const o of env.obstacles) obstacleWorld.addObstacle({ x: o.x, z: o.z, radius: o.radius });
    frictionMap.clear();
    for (const z of env.frictionZones) frictionMap.addZone(z);
    terrainMap.clear();
    for (const z of env.terrainZones) terrainMap.addZone(z);

    const loop = new SimulationLoop(
      mcu, components, wiring, config,
      obstacleWorld, lineTrack, frictionMap, wallWorld, terrainMap,
      componentWires,
    );

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
      onError: (message, severity) => {
        const prefix = severity === 'error' ? '[SKETCH ERROR]' : '[SKETCH WARNING]';
        useMcuStore.getState().appendSerial(`${prefix} ${message}\n`);
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
      // Only tick interpreter if the system has power (battery assembled)
      if (interpreter?.isRunning && simulationLoop.hasPowerSource) {
        interpreter.tick(dtMs);
      }

      const snapshot: SimulationSnapshot = simulationLoop.step();

      // Only update state on last step of multi-step frame
      if (s === stepsPerFrame - 1) {
        const kineticStates: Record<string, IKineticState> = {};
        for (const [id, state] of snapshot.kineticStates) kineticStates[id] = state;
        const componentOutputs: Record<string, PinValueMap> = {};
        for (const [id, outputs] of snapshot.componentOutputs) componentOutputs[id] = outputs;

        // Sync MCU pin states so UI reflects live values
        useMcuStore.getState().syncPinStates();

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
            prev._motionRing.push(entry);
            motionLog = prev._motionRing.toArray();
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
    const { sketchSource, circuitErrors, simulationLoop } = get();
    const appendSerial = useMcuStore.getState().appendSerial;

    // No wired power source = nothing works (battery must exist AND V_OUT must be wired)
    if (simulationLoop && !simulationLoop.hasPowerSource) {
      appendSerial('[POWER] No wired battery — MCU has no power. Assemble a battery AND wire its V_OUT to the circuit.\n');
    }

    // Log circuit errors/warnings from the orchestrator's last validation
    for (const err of circuitErrors) {
      const prefix = err.severity === 'error' ? '[CIRCUIT ERROR]' : '[CIRCUIT WARNING]';
      appendSerial(`${prefix} ${err.message}\n`);
    }

    // Parse sketch and start (interpreter won't tick without power, but parse is needed for when power is added)
    const freshInterpreter = get().interpreter;
    if (freshInterpreter && sketchSource) {
      freshInterpreter.parse(sketchSource);
    }
    set({ isRunning: true });
  },

  pause: () => set({ isRunning: false }),

  reset: () => {
    const { simulationLoop, interpreter, _motionRing } = get();
    simulationLoop?.reset();
    interpreter?.reset();
    _motionRing.clear();
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
