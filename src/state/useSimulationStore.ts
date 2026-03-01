import { create } from 'zustand';
import type { IKineticState } from '../core/physics/interfaces/IKineticEngine';
import type { RigidBodyState } from '../core/physics/interfaces/IVehicleBody';
import type { PinValueMap } from '../core/components/interfaces/IComponent';
import { SimulationLoop, type SimulationConfig, type SimulationSnapshot } from '../core/simulation/SimulationLoop';
import type { WiringGraph } from '../core/simulation/WiringGraph';
import type { IMicrocontroller } from '../core/mcu/interfaces/IMicrocontroller';
import type { IComponent } from '../core/components/interfaces/IComponent';
import { SketchInterpreter, type SketchCallbacks } from '../core/sketch/SketchInterpreter';
import { ObstacleWorld } from '../core/simulation/ObstacleWorld';
import { LineTrack } from '../core/simulation/LineTrack';
import type { ISensor } from '../core/components/interfaces/ISensor';
import { useMcuStore } from './useMcuStore';

export type RigidBodyStateWithWheels = RigidBodyState & { wheelAngleLeft: number; wheelAngleRight: number };

export interface MotionLogEntry {
    tick: number;
    x: number;
    z: number;
    dir: number;
    v: number;
    omega: number;
    motorL: number;
    motorR: number;
    phase: string;
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
    obstacleWorld: ObstacleWorld;
    lineTrack: LineTrack;

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
    obstacleWorld: new ObstacleWorld(),
    lineTrack: new LineTrack(),

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
        const { simulationLoop, isRunning, config, interpreter, speed, obstacleWorld, lineTrack } = get();
        if (!simulationLoop || !isRunning || !config) return;

        const dtMs = config.fixedDt * 1000;
        // Run multiple steps per frame based on speed multiplier
        const stepsPerFrame = Math.max(1, Math.round(speed));

        for (let s = 0; s < stepsPerFrame; s++) {
            if (interpreter?.isRunning) {
                interpreter.tick(dtMs);
            }

            const snapshot: SimulationSnapshot = simulationLoop.step();

            // ── Sensor environment bridge ──
            // Feed physics data into sensors after each step
            const body = snapshot.rigidBodyState;
            if (body) {
                // Get all components and feed environment data to sensors
                const components = simulationLoop['components'] as Map<string, IComponent>;
                if (components) {
                    for (const [, component] of components) {
                        if ('setEnvironment' in component) {
                            const sensor = component as ISensor;
                            const env: Record<string, number | undefined> = {};

                            // Ultrasonic: raycast from car position in car's heading direction
                            if ('echoDuration' in component || component.pinManifest.some(p => p.name === 'TRIG')) {
                                const dist = obstacleWorld.raycast(body.x, body.z, body.theta, 4.0);
                                env.distanceToObstacle = dist;
                            }

                            // IR Line: get reflectance at car's position
                            if (component.pinManifest.some(p => p.name === 'OUT' && p.direction === 'output') && 'sr' in component) {
                                env.surfaceReflectance = lineTrack.getReflectance(body.x, body.z);
                            }

                            // Rotary Encoder: feed wheel angular velocity
                            if (component.pinManifest.some(p => p.name === 'OUT' && p.direction === 'output') && 'spr' in component) {
                                const wheelSpeeds = (simulationLoop as unknown as { vehicle: { getWheelAngularSpeeds(): { omegaLeft: number; omegaRight: number } } }).vehicle?.getWheelAngularSpeeds();
                                if (wheelSpeeds) {
                                    env.wheelAngularVelocity = (wheelSpeeds.omegaLeft + wheelSpeeds.omegaRight) / 2;
                                }
                            }

                            sensor.setEnvironment(env);
                        }
                    }
                }
            }

            // Only update state on the last step
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
            }
        }
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
