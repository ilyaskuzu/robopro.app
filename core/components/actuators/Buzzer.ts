import type { IActuator, ActuatorOutput } from '../interfaces/IActuator';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * Piezo buzzer component.
 *
 * SIGNAL pin: digital HIGH = buzzing at set frequency.
 * Frequency is set externally via `setFrequency()` (called by tone() in sketch interpreter).
 */
export class Buzzer implements IActuator {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'SIGNAL', direction: 'input', signalType: 'digital' },
  ];

  private active = false;
  private frequency = 440; // Hz, default A4

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return Buzzer.PIN_MANIFEST;
  }

  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    this.active = (inputs['SIGNAL'] ?? 0) > 0.5;
    return {};
  }

  getOutput(): ActuatorOutput {
    return {
      torque: 0,
      angularVelocity: 0,
      direction: this.active ? 1 : 0,
    };
  }

  /** Check if buzzer is currently sounding */
  isActive(): boolean {
    return this.active;
  }

  /** Get current frequency in Hz */
  getFrequency(): number {
    return this.frequency;
  }

  /** Set the buzzer's tone frequency (called by tone() sketch function) */
  setFrequency(hz: number): void {
    this.frequency = Math.max(31, Math.min(65535, hz));
  }

  reset(): void {
    this.active = false;
    this.frequency = 440;
  }
}
