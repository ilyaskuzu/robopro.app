import type { IMicrocontroller } from '../mcu/interfaces/IMicrocontroller';
import type { IComponent, PinValueMap } from '../components/interfaces/IComponent';
import type { IKineticState, IMotorSpec, ILoadSpec, IEnvironment } from '../physics/interfaces/IKineticEngine';
import type { RigidBodyState } from '../physics/interfaces/IVehicleBody';
import type { IActuator } from '../components/interfaces/IActuator';
import type { IDriver } from '../components/interfaces/IDriver';
import { SignalBus } from './SignalBus';
import type { WiringGraph } from './WiringGraph';
import { ElectricalEngine } from '../physics/ElectricalEngine';
import type { MotorElectricalParams } from '../physics/ElectricalEngine';
import { VehicleDynamics } from '../physics/VehicleDynamics';
import type { VehicleSpec } from '../physics/interfaces/IVehicleBody';
import type { ObstacleWorld } from './ObstacleWorld';
import type { LineTrack } from './LineTrack';
import type { FrictionMap } from './FrictionMap';
import type { WallWorld } from './WallWorld';
import type { TerrainMap } from './TerrainMap';
import type { UltrasonicSensor } from '../components/sensors/UltrasonicSensor';
import type { IrLineSensor } from '../components/sensors/IrLineSensor';
import type { RotaryEncoder } from '../components/sensors/RotaryEncoder';
import type { BatteryPack } from '../components/power/BatteryPack';

export interface SimulationConfig {
  readonly fixedDt: number;
  readonly mcuCyclesPerStep: number;
  readonly motorSpec: IMotorSpec;
  readonly loadSpec: ILoadSpec;
  readonly environment: IEnvironment;
  readonly vehicleSpec: VehicleSpec;
  readonly batteryVoltage: number;
  readonly batteryInternalResistance: number;
  readonly driverVoltageDrop: number;
  /** Max current per driver channel (A). When set, motor currents are clamped. */
  readonly driverCurrentLimitPerChannel?: number;
}

export interface SimulationSnapshot {
  readonly kineticStates: Map<string, IKineticState>;
  readonly rigidBodyState: RigidBodyState & { wheelAngleLeft: number; wheelAngleRight: number };
  readonly componentOutputs: Map<string, PinValueMap>;
  readonly supplyVoltage: number;
  readonly totalCurrent: number;
}

export interface DriverMotorMapping {
  readonly driverId: string;
  readonly channelIndex: number;
  readonly motorId: string;
}

/** Component-to-component wire (e.g. battery→driver, driver→motor). Used to decide if power/motors are connected. */
export interface ComponentWire {
  readonly fromComponentId: string;
  readonly fromPinName: string;
  readonly toComponentId: string;
  readonly toPinName: string;
}

const MOTOR_LEFT_ID = 'motor-left';
const MOTOR_RIGHT_ID = 'motor-right';

export class SimulationLoop {
  private readonly signalBus: SignalBus;
  private readonly electricalEngine: ElectricalEngine;
  private readonly vehicle: VehicleDynamics;
  private driverMotorMappings: DriverMotorMapping[] = [];
  private lastTotalCurrent = 0;
  /** Component-to-component wires from the wiring editor; when set, power/motor connections are enforced. */
  private readonly componentWires: readonly ComponentWire[];
  /**
   * True only if a battery exists AND its V_OUT pin is wired to at least one component.
   * Per KVL: no current flows without a complete circuit path. An unwired battery
   * is electrically equivalent to no battery at all.
   */
  private readonly _hasPowerSource: boolean;

  constructor(
    private readonly mcu: IMicrocontroller,
    private readonly components: Map<string, IComponent>,
    private readonly wiring: WiringGraph,
    private readonly config: SimulationConfig,
    private readonly obstacleWorld?: ObstacleWorld,
    private readonly lineTrack?: LineTrack,
    private readonly frictionMap?: FrictionMap,
    private readonly wallWorld?: WallWorld,
    private readonly terrainMap?: TerrainMap,
    componentWires?: readonly ComponentWire[],
  ) {
    this.componentWires = componentWires ?? [];
    // Battery must exist AND have at least one V_OUT wire for power to flow.
    // Just placing a battery in the assembly without wiring it supplies nothing.
    const batteryIds = new Set<string>();
    for (const [id, c] of components) {
      if ('getVoltage' in c && typeof (c as { getVoltage(): number }).getVoltage === 'function') {
        batteryIds.add(id);
      }
    }
    this._hasPowerSource = batteryIds.size > 0 && this.componentWires.some(
      (w) =>
        (batteryIds.has(w.fromComponentId) && w.fromPinName === 'V_OUT') ||
        (batteryIds.has(w.toComponentId) && w.toPinName === 'V_OUT')
    );
    this.signalBus = new SignalBus();
    this.electricalEngine = new ElectricalEngine();
    this.vehicle = new VehicleDynamics(config.vehicleSpec);

    // Wire spatial friction query from FrictionMap
    if (this.frictionMap) {
      this.vehicle.setFrictionQuery((x, z) => this.frictionMap!.getFriction(x, z));
    }

    // Wire terrain slope query from TerrainMap
    if (this.terrainMap) {
      this.vehicle.setSlopeQuery((x, z, heading) => {
        const sample = this.terrainMap!.sample(x, z, heading);
        return sample.gravityComponent;
      });
    }
  }

  /** True only if a battery is assembled AND wired (V_OUT connected). No wired battery = no power anywhere. */
  get hasPowerSource(): boolean {
    return this._hasPowerSource;
  }

  setDriverMotorMappings(mappings: DriverMotorMapping[]): void {
    this.driverMotorMappings = mappings;
  }

  private hasPowerConnection(): boolean {
    // When there are no component-to-component wires, we conservatively
    // assume there is *no* power path from battery to driver. This keeps
    // the electrical model and circuit errors consistent: if the wiring
    // graph never declares V_OUT→VCC, supplyVoltage must be 0 V.
    if (this.componentWires.length === 0) return false;
    return this.componentWires.some(
      (w) =>
        (w.fromPinName === 'V_OUT' && w.toPinName === 'VCC') ||
        (w.fromPinName === 'VCC' && w.toPinName === 'V_OUT')
    );
  }

  private isMotorConnected(driverPin: string, motorId: string): boolean {
    // Same rule as power: no declared driver→motor wiring means the
    // motor should be treated as unpowered/unwired.
    if (this.componentWires.length === 0) return false;
    return this.componentWires.some(
      (w) =>
        (w.fromPinName === driverPin && w.toComponentId === motorId && w.toPinName === 'POWER') ||
        (w.toPinName === driverPin && w.fromComponentId === motorId && w.fromPinName === 'POWER')
    );
  }

  step(): SimulationSnapshot {
    // No battery assembled = no power for anything (MCU, code, motors, sensors)
    if (!this._hasPowerSource) {
      const bodyState = this.vehicle.getState();
      return {
        kineticStates: new Map(),
        rigidBodyState: {
          x: bodyState.x, z: bodyState.z, theta: bodyState.theta,
          v: 0, omega: 0, wheelAngleLeft: 0, wheelAngleRight: 0,
        },
        componentOutputs: new Map(),
        supplyVoltage: 0,
        totalCurrent: 0,
      };
    }

    this.mcu.tick(this.config.mcuCyclesPerStep);

    // Find battery dynamically (ID may differ: 'battery', 'battery-16xxx', etc.)
    let battery: BatteryPack | undefined;
    let batteryId: string | undefined;
    for (const [id, c] of this.components) {
      if ('getVoltage' in c && typeof (c as { getVoltage(): number }).getVoltage === 'function') {
        battery = c as BatteryPack;
        batteryId = id;
        break;
      }
    }

    const componentsForRouting = new Map(this.components);
    if (batteryId) componentsForRouting.delete(batteryId);

    const componentOutputs = this.signalBus.routeSignals(
      this.mcu, componentsForRouting, this.wiring, this.config.fixedDt,
    );

    let supplyVoltage = this.config.batteryVoltage;
    let batteryInternalResistance = this.config.batteryInternalResistance;
    const powerConnected = this.hasPowerConnection();
    if (battery && batteryId && powerConnected) {
      const batteryOutputs = battery.tick(this.config.fixedDt, { CURRENT_DRAW: this.lastTotalCurrent });
      componentOutputs.set(batteryId, batteryOutputs);
      supplyVoltage = battery.getVoltage();
      if (battery.getSoC() <= 0) supplyVoltage = 0;
      // Battery already applies internal resistance in getVoltage(); use 0 to avoid double-apply
      batteryInternalResistance = 0;
    } else if (!powerConnected) {
      supplyVoltage = 0;
    }

    this.feedDriverOutputsToMotors(componentOutputs, powerConnected, supplyVoltage);

    // Gate LED components by power: no power => drive ANODE to 0 so LED is off
    if (!powerConnected) {
      for (const [cid, comp] of this.components) {
        if ('getBrightness' in comp && typeof (comp as { getBrightness(): number }).getBrightness === 'function') {
          const ledOutputs = comp.tick(this.config.fixedDt, { ANODE: 0 });
          componentOutputs.set(cid, ledOutputs);
        }
      }
    }

    const motorLeft = this.components.get(MOTOR_LEFT_ID) as IActuator | undefined;
    const motorRight = this.components.get(MOTOR_RIGHT_ID) as IActuator | undefined;

    let signedTauLeft = 0;
    let signedTauRight = 0;
    if (motorLeft && 'getOutput' in motorLeft) {
      const out = motorLeft.getOutput();
      signedTauLeft = out.torque * (out.direction === 0 ? 0 : out.direction);
    }
    if (motorRight && 'getOutput' in motorRight) {
      const out = motorRight.getOutput();
      signedTauRight = out.torque * (out.direction === 0 ? 0 : out.direction);
    }

    this.vehicle.step(signedTauLeft, signedTauRight, this.config.fixedDt);

    // Collision radius: use track half-width with margin so visual chassis doesn't clip through
    const carRadius = (this.config.vehicleSpec.trackWidth / 2) * 1.2;

    // Wall collision: iterative resolve so corners and multiple walls work
    if (this.wallWorld) {
      const maxIter = 8;
      for (let iter = 0; iter < maxIter; iter++) {
        const body = this.vehicle.getState();
        const collision = this.wallWorld.checkCollision(body.x, body.z, carRadius);
        if (!collision.collided) break;
        this.vehicle.resolveWallCollision(
          collision.normalX,
          collision.normalZ,
          collision.distance,
          carRadius,
        );
      }
    }

    // Obstacle collision: iterative resolve so multiple obstacles work
    if (this.obstacleWorld) {
      const maxIter = 8;
      for (let iter = 0; iter < maxIter; iter++) {
        const body = this.vehicle.getState();
        const obsCollision = this.obstacleWorld.checkCollision(body.x, body.z, carRadius);
        if (!obsCollision.collided) break;
        const surfaceDist = carRadius - obsCollision.penetration;
        this.vehicle.resolveWallCollision(
          obsCollision.normalX,
          obsCollision.normalZ,
          surfaceDist,
          carRadius,
        );
      }
    }

    this.bridgeSensorEnvironment();

    const wheelSpeeds = this.vehicle.getWheelAngularSpeeds();
    if (motorLeft && 'setAngularVelocity' in motorLeft) {
      (motorLeft as IActuator & { setAngularVelocity(omega: number): void }).setAngularVelocity(wheelSpeeds.omegaLeft);
    }
    if (motorRight && 'setAngularVelocity' in motorRight) {
      (motorRight as IActuator & { setAngularVelocity(omega: number): void }).setAngularVelocity(wheelSpeeds.omegaRight);
    }

    const motorComponents = this.getMotorComponents();
    const motorParams: MotorElectricalParams[] = motorComponents.map(([, motor]) => ({
      backEmfConstant: this.config.motorSpec.backEmfConstant,
      armatureResistance: this.config.motorSpec.armatureResistance,
      angularVelocity: motor.getOutput().angularVelocity,
    }));

    const electricalState = this.electricalEngine.computeState(
      supplyVoltage,
      batteryInternalResistance,
      this.config.driverVoltageDrop,
      motorParams,
      this.config.driverCurrentLimitPerChannel,
    );

    this.lastTotalCurrent = electricalState.totalCurrent;

    const bodyState = this.vehicle.getState();
    const { wheelRadius } = this.config.vehicleSpec;
    const leftCurrent = electricalState.motorCurrents[0] ?? 0;
    const rightCurrent = electricalState.motorCurrents[1] ?? 0;
    const kineticStates = new Map<string, IKineticState>([
      [MOTOR_LEFT_ID, {
        angularVelocity: wheelSpeeds.omegaLeft,
        linearVelocity: bodyState.v - bodyState.omega * (this.config.vehicleSpec.trackWidth / 2),
        displacement: bodyState.wheelAngleLeft * wheelRadius,
        acceleration: 0,
        netTorque: signedTauLeft,
        motorCurrent: leftCurrent,
      }],
      [MOTOR_RIGHT_ID, {
        angularVelocity: wheelSpeeds.omegaRight,
        linearVelocity: bodyState.v + bodyState.omega * (this.config.vehicleSpec.trackWidth / 2),
        displacement: bodyState.wheelAngleRight * wheelRadius,
        acceleration: 0,
        netTorque: signedTauRight,
        motorCurrent: rightCurrent,
      }],
    ]);

    return {
      kineticStates,
      rigidBodyState: {
        x: bodyState.x,
        z: bodyState.z,
        theta: bodyState.theta,
        v: bodyState.v,
        omega: bodyState.omega,
        wheelAngleLeft: bodyState.wheelAngleLeft,
        wheelAngleRight: bodyState.wheelAngleRight,
      },
      componentOutputs,
      supplyVoltage: electricalState.supplyVoltage,
      totalCurrent: electricalState.totalCurrent,
    };
  }

  reset(): void {
    this.vehicle.reset();
    this.mcu.reset();
    this.lastTotalCurrent = 0;
    for (const [, component] of this.components) {
      component.reset();
    }
  }

  /**
   * Route driver channel outputs to motors, scaling by actual terminal voltage.
   *
   * Per KVL: V_motor = (V_supply − V_driver_drop) × PWM_duty
   * The motor receives POWER = PWM × (V_effective / V_nominal), which couples
   * battery voltage, driver voltage drop, and SoC into the mechanical torque model.
   */
  private feedDriverOutputsToMotors(
    componentOutputs: Map<string, PinValueMap>,
    powerConnected: boolean,
    supplyVoltage: number,
  ): void {
    const driverPinByChannel: Record<number, string> = { 0: 'OUT_A', 1: 'OUT_B' };
    const ZERO_INPUTS: PinValueMap = { POWER: 0, DIRECTION: 0 };

    // Effective voltage at the motor terminals: V_supply − V_driver_drop
    // Clamped to 0 (negative means driver drop exceeds supply — no current flows)
    const vEffective = Math.max(0, supplyVoltage - this.config.driverVoltageDrop);
    const vNominal = this.config.motorSpec.nominalVoltage;
    // Ratio of actual motor voltage to rated voltage — directly scales torque and no-load speed
    const voltageScale = vNominal > 0 ? vEffective / vNominal : 0;

    const fedMotorIds = new Set<string>();

    for (const mapping of this.driverMotorMappings) {
      const driver = this.components.get(mapping.driverId);
      const motor = this.components.get(mapping.motorId);
      if (!driver || !motor || !('getChannels' in driver)) continue;

      const driverPin = driverPinByChannel[mapping.channelIndex];
      const motorWired = driverPin ? this.isMotorConnected(driverPin, mapping.motorId) : true;

      if (!powerConnected || !motorWired) {
        const motorOutputs = motor.tick(this.config.fixedDt, ZERO_INPUTS);
        componentOutputs.set(mapping.motorId, motorOutputs);
        fedMotorIds.add(mapping.motorId);
        continue;
      }

      const channels = (driver as IDriver).getChannels();
      const channel = channels[mapping.channelIndex];
      if (!channel) continue;

      // POWER = PWM_duty × (V_effective / V_nominal)
      // This means: 4xAA(6V) + L298N(1.4V drop) → voltageScale=0.767 → 76.7% torque at full PWM
      //             2S LiPo(7.4V) + DRV8833(0.2V drop) → voltageScale=1.2 → 120% torque (overvoltage)
      const motorInputs: PinValueMap = {
        POWER: channel.speed * voltageScale,
        DIRECTION: channel.direction,
      };

      const motorOutputs = motor.tick(this.config.fixedDt, motorInputs);
      componentOutputs.set(mapping.motorId, motorOutputs);
      fedMotorIds.add(mapping.motorId);
    }

    for (const [id, comp] of this.components) {
      if (fedMotorIds.has(id)) continue;
      if ('getOutput' in comp && (id.includes('motor') || id.startsWith('dc-motor'))) {
        const motorOutputs = comp.tick(this.config.fixedDt, ZERO_INPUTS);
        componentOutputs.set(id, motorOutputs);
      }
    }
  }

  private getMotorComponents(): [string, IActuator][] {
    const motors: [string, IActuator][] = [];
    for (const [id, component] of this.components) {
      if ('getOutput' in component) {
        motors.push([id, component as IActuator]);
      }
    }
    return motors;
  }

  private bridgeSensorEnvironment(): void {
    const body = this.vehicle.getState();
    const wheelSpeeds = this.vehicle.getWheelAngularSpeeds();

    for (const [, comp] of this.components) {
      const hasSetEnv = typeof (comp as any).setEnvironment === 'function';

      // Ultrasonic sensor: feed distance to nearest obstacle (ObstacleWorld or WallWorld)
      if (hasSetEnv &&
        (comp.id.includes('ultrasonic') || comp.constructor.name.includes('Ultrasonic'))) {
        let dist = Infinity;
        if (this.obstacleWorld) {
          dist = this.obstacleWorld.raycast(body.x, body.z, body.theta);
        }
        if (this.wallWorld) {
          const wallHit = this.wallWorld.raycast(
            body.x, body.z,
            Math.cos(body.theta), Math.sin(body.theta),
          );
          if (wallHit && wallHit.distance < dist) {
            dist = wallHit.distance;
          }
        }
        (comp as any).setEnvironment({ distanceToObstacle: dist });
      }

      // IR Line sensor: feed surface reflectance
      if (this.lineTrack && hasSetEnv &&
        (comp.id.includes('line') || comp.constructor.name.includes('IrLine'))) {
        const reflectance = this.lineTrack.getReflectance(body.x, body.z);
        (comp as any).setEnvironment({ surfaceReflectance: reflectance });
      }

      // Rotary encoder: feed wheel angular velocity
      if (hasSetEnv &&
        (comp.id.includes('encoder') || comp.constructor.name.includes('Encoder'))) {
        const isLeft = comp.id.includes('left');
        const omega = isLeft ? wheelSpeeds.omegaLeft : wheelSpeeds.omegaRight;
        (comp as any).setEnvironment({ wheelAngularVelocity: omega });
      }

      // MPU-6050 IMU: feed acceleration and gyroscope data
      if (hasSetEnv &&
        (comp.id.includes('mpu') || comp.constructor.name.includes('Mpu6050'))) {
        const accelX = 0; // lateral — not modeled in diff-drive
        const accelZ = 9.81; // gravity on z-axis (upward when flat)
        let accelY = 0;

        // If terrain provides slope info, adjust accel
        if (this.terrainMap) {
          const sample = this.terrainMap.sample(body.x, body.z, body.theta);
          accelY = -9.81 * Math.sin(sample.slopeAngle); // longitudinal g component
        }

        (comp as any).setEnvironment({
          accelX,
          accelY,
          accelZ,
          gyroX: 0,
          gyroY: 0,
          gyroZ: body.omega,
        });
      }
    }
  }
}
