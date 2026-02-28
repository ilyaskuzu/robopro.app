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

const MOTOR_LEFT_ID = 'motor-left';
const MOTOR_RIGHT_ID = 'motor-right';

export class SimulationLoop {
  private readonly signalBus: SignalBus;
  private readonly electricalEngine: ElectricalEngine;
  private readonly vehicle: VehicleDynamics;
  private driverMotorMappings: DriverMotorMapping[] = [];

  constructor(
    private readonly mcu: IMicrocontroller,
    private readonly components: Map<string, IComponent>,
    private readonly wiring: WiringGraph,
    private readonly config: SimulationConfig,
  ) {
    this.signalBus = new SignalBus();
    this.electricalEngine = new ElectricalEngine();
    this.vehicle = new VehicleDynamics(config.vehicleSpec);
  }

  setDriverMotorMappings(mappings: DriverMotorMapping[]): void {
    this.driverMotorMappings = mappings;
  }

  step(): SimulationSnapshot {
    this.mcu.tick(this.config.mcuCyclesPerStep);

    const componentOutputs = this.signalBus.routeSignals(
      this.mcu, this.components, this.wiring, this.config.fixedDt,
    );

    this.feedDriverOutputsToMotors(componentOutputs);

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
      this.config.batteryVoltage,
      this.config.batteryInternalResistance,
      this.config.driverVoltageDrop,
      motorParams,
    );

    const bodyState = this.vehicle.getState();
    const { wheelRadius } = this.config.vehicleSpec;
    const kineticStates = new Map<string, IKineticState>([
      [MOTOR_LEFT_ID, {
        angularVelocity: wheelSpeeds.omegaLeft,
        linearVelocity: bodyState.v - bodyState.omega * (this.config.vehicleSpec.trackWidth / 2),
        displacement: bodyState.wheelAngleLeft * wheelRadius,
        acceleration: 0,
        netTorque: 0,
        motorCurrent: 0,
      }],
      [MOTOR_RIGHT_ID, {
        angularVelocity: wheelSpeeds.omegaRight,
        linearVelocity: bodyState.v + bodyState.omega * (this.config.vehicleSpec.trackWidth / 2),
        displacement: bodyState.wheelAngleRight * wheelRadius,
        acceleration: 0,
        netTorque: 0,
        motorCurrent: 0,
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
    for (const [, component] of this.components) {
      component.reset();
    }
  }

  private feedDriverOutputsToMotors(componentOutputs: Map<string, PinValueMap>): void {
    for (const mapping of this.driverMotorMappings) {
      const driver = this.components.get(mapping.driverId);
      const motor = this.components.get(mapping.motorId);
      if (!driver || !motor || !('getChannels' in driver)) continue;

      const channels = (driver as IDriver).getChannels();
      const channel = channels[mapping.channelIndex];
      if (!channel) continue;

      const motorInputs: PinValueMap = {
        POWER: channel.speed,
        DIRECTION: channel.direction,
      };

      const motorOutputs = motor.tick(this.config.fixedDt, motorInputs);
      componentOutputs.set(mapping.motorId, motorOutputs);
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
}
