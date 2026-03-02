import type { IActuator, ActuatorOutput } from '../interfaces/IActuator';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * LED component.
 *
 * Input: ANODE receives digital (0/1) or PWM (0–1) signal.
 * Output: brightness 0–1 for visualization.
 */
export class Led implements IActuator {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'ANODE', direction: 'input', signalType: 'pwm' },
  ];

  private brightness = 0;

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return Led.PIN_MANIFEST;
  }

  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    this.brightness = Math.max(0, Math.min(1, inputs['ANODE'] ?? 0));
    return {};
  }

  getOutput(): ActuatorOutput {
    return {
      torque: 0,
      angularVelocity: 0,
      direction: this.brightness > 0 ? 1 : 0,
    };
  }

  /** Get brightness value 0–1 */
  getBrightness(): number {
    return this.brightness;
  }

  reset(): void {
    this.brightness = 0;
  }
}
