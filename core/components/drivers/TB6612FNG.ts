import type { IDriver, DriverChannel } from '../interfaces/IDriver';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * TB6612FNG Dual Motor Driver.
 *
 * Lower voltage drop (0.5V) than L298N. Has STBY (standby) pin.
 * Pins per channel: AIN1/AIN2 (direction), PWMA (speed).
 */
export class TB6612FNG implements IDriver {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'PWMA', direction: 'input', signalType: 'pwm' },
    { name: 'AIN1', direction: 'input', signalType: 'digital' },
    { name: 'AIN2', direction: 'input', signalType: 'digital' },
    { name: 'PWMB', direction: 'input', signalType: 'pwm' },
    { name: 'BIN1', direction: 'input', signalType: 'digital' },
    { name: 'BIN2', direction: 'input', signalType: 'digital' },
    { name: 'STBY', direction: 'input', signalType: 'digital' },
    { name: 'OUT_A', direction: 'output', signalType: 'analog' },
    { name: 'OUT_B', direction: 'output', signalType: 'analog' },
    { name: 'DIR_A', direction: 'output', signalType: 'digital' },
    { name: 'DIR_B', direction: 'output', signalType: 'digital' },
  ];

  static readonly VOLTAGE_DROP = 0.5;
  static readonly MAX_CURRENT = 1.2;

  private channelA: DriverChannel = { speed: 0, direction: 0, enabled: false };
  private channelB: DriverChannel = { speed: 0, direction: 0, enabled: false };

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return TB6612FNG.PIN_MANIFEST;
  }

  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    const standby = inputs['STBY'] ?? 1; // default HIGH (active)

    if (standby < 0.5) {
      // Standby mode — all outputs off
      this.channelA = { speed: 0, direction: 0, enabled: false };
      this.channelB = { speed: 0, direction: 0, enabled: false };
      return { OUT_A: 0, OUT_B: 0, DIR_A: 0, DIR_B: 0 };
    }

    this.channelA = TB6612FNG.resolveChannel(inputs['PWMA'] ?? 0, inputs['AIN1'] ?? 0, inputs['AIN2'] ?? 0);
    this.channelB = TB6612FNG.resolveChannel(inputs['PWMB'] ?? 0, inputs['BIN1'] ?? 0, inputs['BIN2'] ?? 0);

    return {
      OUT_A: this.channelA.speed * this.channelA.direction,
      OUT_B: this.channelB.speed * this.channelB.direction,
      DIR_A: this.channelA.direction,
      DIR_B: this.channelB.direction,
    };
  }

  getChannels(): DriverChannel[] {
    return [this.channelA, this.channelB];
  }

  reset(): void {
    this.channelA = { speed: 0, direction: 0, enabled: false };
    this.channelB = { speed: 0, direction: 0, enabled: false };
  }

  private static resolveChannel(pwm: number, in1: number, in2: number): DriverChannel {
    const high1 = in1 > 0.5;
    const high2 = in2 > 0.5;
    if (!high1 && !high2) return { speed: 0, direction: 0, enabled: pwm > 0 }; // coast / stop
    if (high1 && high2) return { speed: 0, direction: 0, enabled: true };        // short brake
    return { speed: Math.min(1, Math.max(0, pwm)), direction: high1 ? 1 : -1, enabled: true };
  }
}
