import type { IActuator, ActuatorOutput } from '../interfaces/IActuator';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
import type { ServoMotorSpecs } from '../catalog/servoCatalog';

/**
 * Standard hobby servo motor.
 *
 * Input: SIGNAL pin receives PWM duty-cycle (0–1) representing the pulse
 * width 1–2 ms within a 20 ms period. This is mapped to the full angle range.
 *
 * The servo moves toward the target angle at its rated speed.
 */
export class ServoMotor implements IActuator {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'SIGNAL', direction: 'input', signalType: 'pwm' },
  ];

  private readonly specs: ServoMotorSpecs;
  /** Current angle in degrees */
  private currentAngle = 0;
  /** Target angle in degrees */
  private targetAngle = 0;
  /** Angular velocity in degrees/second, derived from speed-per-60° spec */
  private readonly maxDegreesPerSec: number;

  constructor(id: string, specs: ServoMotorSpecs) {
    this.id = id;
    this.specs = specs;
    this.maxDegreesPerSec = 60 / specs.speedPer60Deg;
    this.currentAngle = specs.maxAngleDeg / 2; // start at center
    this.targetAngle = this.currentAngle;
  }

  get pinManifest(): PinManifest[] {
    return ServoMotor.PIN_MANIFEST;
  }

  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const signal = inputs['SIGNAL'] ?? 0.5;

    // Map 0–1 duty-cycle to 0–maxAngle.
    // In real servos: 1ms pulse = 0°, 1.5ms = 90°, 2ms = 180° within 20ms period
    // PWM duty: 1ms/20ms = 0.05, 2ms/20ms = 0.10
    // We simplify: treat duty 0–1 linearly for the interpreter's analogWrite(0–255) mapping.
    this.targetAngle = Math.max(0, Math.min(this.specs.maxAngleDeg, signal * this.specs.maxAngleDeg));

    // Move toward target at max speed
    const diff = this.targetAngle - this.currentAngle;
    const maxStep = this.maxDegreesPerSec * dt;

    if (Math.abs(diff) <= maxStep) {
      this.currentAngle = this.targetAngle;
    } else {
      this.currentAngle += Math.sign(diff) * maxStep;
    }

    return {};
  }

  getOutput(): ActuatorOutput {
    // Convert current angle to normalized values for visualization
    const normalizedAngle = this.currentAngle / this.specs.maxAngleDeg;
    return {
      torque: 0, // servo torque is reactive, not actively measurable here
      angularVelocity: 0,
      direction: normalizedAngle > 0.5 ? 1 : normalizedAngle < 0.5 ? -1 : 0,
    };
  }

  /** Get current angle in degrees */
  getAngle(): number {
    return this.currentAngle;
  }

  /** Directly set angle (used by Servo.write() in sketch interpreter) */
  setAngle(degrees: number): void {
    this.targetAngle = Math.max(0, Math.min(this.specs.maxAngleDeg, degrees));
  }

  reset(): void {
    this.currentAngle = this.specs.maxAngleDeg / 2;
    this.targetAngle = this.currentAngle;
  }
}
