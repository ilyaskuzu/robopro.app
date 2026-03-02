import type { IActuator, ActuatorOutput } from '../interfaces/IActuator';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
import type { StepperMotorSpecs } from '../catalog/stepperCatalog';

export class StepperMotor implements IActuator {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'STEP', direction: 'input', signalType: 'digital' },
    { name: 'DIR', direction: 'input', signalType: 'digital' },
    { name: 'ENABLE', direction: 'input', signalType: 'digital' },
  ];

  private readonly stepsPerRev: number;
  private readonly holdingTorqueNm: number;
  private readonly radPerStep: number;

  private currentStep = 0;
  private currentAngleRad = 0;
  private targetStep = 0;
  private previousStepValue = 0;
  private stepsThisTick = 0;
  private currentDirection: 1 | -1 | 0 = 0;
  private angularVelocity = 0;
  private enabled = false;

  constructor(id: string, private readonly specs: StepperMotorSpecs) {
    this.id = id;
    this.stepsPerRev = specs.stepsPerRev;
    this.holdingTorqueNm = specs.holdingTorqueNm;
    this.radPerStep = (2 * Math.PI) / specs.stepsPerRev;
  }

  get pinManifest(): PinManifest[] {
    return StepperMotor.PIN_MANIFEST;
  }

  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const stepVal = inputs['STEP'] ?? 0;
    const dirVal = inputs['DIR'] ?? 0;
    const enableVal = inputs['ENABLE'] ?? 0;

    const stepHigh = stepVal > 0.5;
    const dirForward = dirVal > 0.5;
    this.enabled = enableVal > 0.5;

    // Rising edge on STEP
    const risingEdge = stepHigh && !(this.previousStepValue > 0.5);
    this.previousStepValue = stepHigh ? 1 : 0;

    this.stepsThisTick = 0;
    if (risingEdge && this.enabled) {
      const delta = dirForward ? 1 : -1;
      this.currentStep += delta;
      this.stepsThisTick = delta;

      // Wrap step to [0, stepsPerRev)
      const n = this.stepsPerRev;
      this.currentStep = ((this.currentStep % n) + n) % n;
    }

    this.currentAngleRad = this.currentStep * this.radPerStep;
    this.targetStep = this.currentStep;

    if (this.enabled && this.stepsThisTick !== 0) {
      this.currentDirection = this.stepsThisTick > 0 ? 1 : -1;
      if (dt > 0) {
        const stepRate = Math.abs(this.stepsThisTick) / dt;
        this.angularVelocity = stepRate * this.radPerStep * this.currentDirection;
      }
    } else {
      if (!this.enabled) {
        this.currentDirection = 0;
        this.angularVelocity = 0;
      }
      // When enabled but not stepping, keep last angularVelocity briefly or decay
      // For simplicity: when not stepping this tick, angularVelocity decays to 0
      if (this.stepsThisTick === 0) {
        this.angularVelocity = 0;
      }
    }

    return {};
  }

  getOutput(): ActuatorOutput {
    const torque = this.enabled ? this.holdingTorqueNm : 0;
    return {
      torque,
      angularVelocity: this.angularVelocity,
      direction: this.currentDirection,
    };
  }

  /** Current step index (0 to stepsPerRev-1). */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /** Current angle in radians. */
  getCurrentAngleRad(): number {
    return this.currentAngleRad;
  }

  /** Target step (same as current for step-and-hold). */
  getTargetStep(): number {
    return this.targetStep;
  }

  reset(): void {
    this.currentStep = 0;
    this.currentAngleRad = 0;
    this.targetStep = 0;
    this.previousStepValue = 0;
    this.stepsThisTick = 0;
    this.currentDirection = 0;
    this.angularVelocity = 0;
    this.enabled = false;
  }
}
