import type { IDriver, DriverChannel } from '../interfaces/IDriver';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * DRV8833 Dual H-Bridge Motor Driver.
 *
 * Very low voltage drop (0.2V). Uses IN1/IN2 per channel for both direction
 * and speed control (no separate enable pin). Has nSLEEP pin.
 *
 * Control logic:
 * - IN1=PWM, IN2=LOW → Forward at PWM speed
 * - IN1=LOW, IN2=PWM → Reverse at PWM speed
 * - IN1=IN2=LOW → Coast
 * - IN1=IN2=HIGH → Brake
 */
export class DRV8833 implements IDriver {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'AIN1', direction: 'input', signalType: 'pwm' },
    { name: 'AIN2', direction: 'input', signalType: 'pwm' },
    { name: 'BIN1', direction: 'input', signalType: 'pwm' },
    { name: 'BIN2', direction: 'input', signalType: 'pwm' },
    { name: 'nSLEEP', direction: 'input', signalType: 'digital' },
    { name: 'OUT_A', direction: 'output', signalType: 'analog' },
    { name: 'OUT_B', direction: 'output', signalType: 'analog' },
    { name: 'DIR_A', direction: 'output', signalType: 'digital' },
    { name: 'DIR_B', direction: 'output', signalType: 'digital' },
  ];

  static readonly VOLTAGE_DROP = 0.2;
  static readonly MAX_CURRENT = 1.5;

  private channelA: DriverChannel = { speed: 0, direction: 0, enabled: false };
  private channelB: DriverChannel = { speed: 0, direction: 0, enabled: false };

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return DRV8833.PIN_MANIFEST;
  }

  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    const sleep = inputs['nSLEEP'] ?? 1; // default HIGH (active)

    if (sleep < 0.5) {
      this.channelA = { speed: 0, direction: 0, enabled: false };
      this.channelB = { speed: 0, direction: 0, enabled: false };
      return { OUT_A: 0, OUT_B: 0, DIR_A: 0, DIR_B: 0 };
    }

    this.channelA = DRV8833.resolveChannel(inputs['AIN1'] ?? 0, inputs['AIN2'] ?? 0);
    this.channelB = DRV8833.resolveChannel(inputs['BIN1'] ?? 0, inputs['BIN2'] ?? 0);

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

  /**
   * DRV8833 uses both pins as PWM — whichever is higher determines
   * direction, the magnitude is the PWM value.
   */
  private static resolveChannel(in1: number, in2: number): DriverChannel {
    const v1 = Math.max(0, Math.min(1, in1));
    const v2 = Math.max(0, Math.min(1, in2));

    if (v1 < 0.01 && v2 < 0.01) return { speed: 0, direction: 0, enabled: false }; // coast
    if (v1 > 0.5 && v2 > 0.5) return { speed: 0, direction: 0, enabled: true };     // brake

    if (v1 > v2) return { speed: v1, direction: 1, enabled: true };   // forward
    return { speed: v2, direction: -1, enabled: true };                // reverse
  }
}
