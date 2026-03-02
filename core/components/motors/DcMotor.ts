import type { IActuator, ActuatorOutput } from '../interfaces/IActuator';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

export interface DcMotorSpecs {
  readonly stallTorque: number;
  readonly noLoadRpm: number;
  readonly nominalVoltage: number;
  readonly armatureResistance: number;
  /**
   * Gear ratio (output / motor). E.g. 48 means 48:1 reduction.
   * Output torque = motorTorque * gearRatio
   * Output speed  = motorSpeed / gearRatio
   * Default: 1 (no gearbox).
   */
  readonly gearRatio?: number;
  /**
   * Rotor moment of inertia in kg·m².
   * When provided, motor angular acceleration follows:
   *   dω/dt = (τ_motor − τ_load − b·ω) / J
   * This smooths transient response. Default: 0 (instant response).
   */
  readonly rotorInertia?: number;
  /**
   * Viscous friction coefficient (N·m·s/rad).
   * When set, subtracts viscousFriction * omega from net torque.
   * Used with rotorInertia for damping. Default: 0 (not applied unless set).
   */
  readonly viscousFriction?: number;
}

const RPM_TO_RAD = Math.PI / 30;

export class DcMotor implements IActuator {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'POWER', direction: 'input', signalType: 'analog' },
    { name: 'DIRECTION', direction: 'input', signalType: 'digital' },
  ];

  private readonly noLoadAngularVelocity: number;
  private readonly gearRatio: number;
  private readonly rotorInertia: number;
  private readonly viscousFriction: number;
  private angularVelocity = 0; // output shaft speed (after gearbox)
  private motorAngularVelocity = 0; // motor shaft speed (before gearbox)
  private currentTorque = 0; // output torque (after gearbox)
  private currentDirection: 1 | -1 | 0 = 0;

  constructor(id: string, private readonly specs: DcMotorSpecs) {
    this.id = id;
    this.noLoadAngularVelocity = specs.noLoadRpm * RPM_TO_RAD;
    this.gearRatio = specs.gearRatio ?? 1;
    this.rotorInertia = specs.rotorInertia ?? 0;
    this.viscousFriction = specs.viscousFriction ?? 0;
  }

  get pinManifest(): PinManifest[] { return DcMotor.PIN_MANIFEST; }

  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const power = inputs['POWER'] ?? 0;
    const dirSignal = inputs['DIRECTION'] ?? 0;

    this.currentDirection = power === 0 ? 0 : (dirSignal >= 0 ? 1 : -1);

    const voltageRatio = Math.abs(power);
    const effectiveStallTorque = this.specs.stallTorque * voltageRatio;
    const effectiveNoLoadSpeed = this.noLoadAngularVelocity * voltageRatio;

    // Motor-shaft angular velocity (before gearbox)
    // When no rotor inertia, use load speed directly; otherwise use integrated state
    if (this.rotorInertia <= 0) {
      this.motorAngularVelocity = this.angularVelocity * this.gearRatio;
    }

    // Motor-shaft torque (linear torque-speed curve)
    let motorTorque: number;
    if (effectiveNoLoadSpeed === 0) {
      motorTorque = 0;
    } else {
      motorTorque = Math.max(
        0,
        effectiveStallTorque * (1 - Math.abs(this.motorAngularVelocity) / effectiveNoLoadSpeed),
      );
    }

    // Viscous friction: subtract from net torque (always applied when set)
    const viscousDamping = this.viscousFriction * Math.abs(this.motorAngularVelocity);
    let netTorque = motorTorque - viscousDamping;

    // Rotor inertia dynamics: dω/dt = (netTorque) / (rotorInertia * gearRatio²) — reflected inertia
    if (this.rotorInertia > 0 && dt > 0) {
      const jReflected = this.rotorInertia * this.gearRatio * this.gearRatio;
      const alpha = netTorque / jReflected;
      this.motorAngularVelocity += alpha * dt;
      if (this.motorAngularVelocity < 0) this.motorAngularVelocity = 0;
      // Recalculate torque at new speed
      if (effectiveNoLoadSpeed > 0) {
        motorTorque = Math.max(
          0,
          effectiveStallTorque * (1 - Math.abs(this.motorAngularVelocity) / effectiveNoLoadSpeed),
        );
      }
      netTorque = motorTorque - this.viscousFriction * Math.abs(this.motorAngularVelocity);
    }

    // Apply gear ratio: output torque = netTorque * gearRatio, output speed = motorSpeed / gearRatio
    this.currentTorque = netTorque * this.gearRatio;
    this.angularVelocity = this.motorAngularVelocity / this.gearRatio;
    return {};
  }

  getOutput(): ActuatorOutput {
    return {
      torque: this.currentTorque,
      angularVelocity: this.angularVelocity,
      direction: this.currentDirection,
    };
  }

  /** Set the output shaft angular velocity (after gearbox). */
  setAngularVelocity(omega: number): void {
    this.angularVelocity = omega;
    this.motorAngularVelocity = omega * this.gearRatio;
  }

  /** Get the motor shaft angular velocity (before gearbox). */
  getMotorShaftSpeed(): number {
    return this.motorAngularVelocity;
  }

  reset(): void {
    this.angularVelocity = 0;
    this.motorAngularVelocity = 0;
    this.currentTorque = 0;
    this.currentDirection = 0;
  }
}

export const TT_MOTOR_6V: DcMotorSpecs = {
  stallTorque: 0.078,
  noLoadRpm: 200,
  nominalVoltage: 6,
  armatureResistance: 7.5,
};
