import type { IDriver, DriverChannel } from '../interfaces/IDriver';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

export class L298N implements IDriver {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'VCC', direction: 'input', signalType: 'power' },
    { name: 'ENA', direction: 'input', signalType: 'pwm' },
    { name: 'IN1', direction: 'input', signalType: 'digital' },
    { name: 'IN2', direction: 'input', signalType: 'digital' },
    { name: 'ENB', direction: 'input', signalType: 'pwm' },
    { name: 'IN3', direction: 'input', signalType: 'digital' },
    { name: 'IN4', direction: 'input', signalType: 'digital' },
    { name: 'OUT_A', direction: 'output', signalType: 'analog' },
    { name: 'OUT_B', direction: 'output', signalType: 'analog' },
    { name: 'DIR_A', direction: 'output', signalType: 'digital' },
    { name: 'DIR_B', direction: 'output', signalType: 'digital' },
  ];

  static readonly VOLTAGE_DROP = 1.4;

  private channelA: DriverChannel = { speed: 0, direction: 0, enabled: false };
  private channelB: DriverChannel = { speed: 0, direction: 0, enabled: false };

  constructor(id: string) { this.id = id; }

  get pinManifest(): PinManifest[] { return L298N.PIN_MANIFEST; }

  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    this.channelA = L298N.resolveChannel(inputs['ENA'] ?? 0, inputs['IN1'] ?? 0, inputs['IN2'] ?? 0);
    this.channelB = L298N.resolveChannel(inputs['ENB'] ?? 0, inputs['IN3'] ?? 0, inputs['IN4'] ?? 0);
    return {
      OUT_A: this.channelA.speed * this.channelA.direction,
      OUT_B: this.channelB.speed * this.channelB.direction,
      DIR_A: this.channelA.direction,
      DIR_B: this.channelB.direction,
    };
  }

  getChannels(): DriverChannel[] { return [this.channelA, this.channelB]; }

  reset(): void {
    this.channelA = { speed: 0, direction: 0, enabled: false };
    this.channelB = { speed: 0, direction: 0, enabled: false };
  }

  private static resolveChannel(enable: number, in1: number, in2: number): DriverChannel {
    const high1 = in1 > 0.5;
    const high2 = in2 > 0.5;
    if (!high1 && !high2) return { speed: 0, direction: 0, enabled: enable > 0 }; // coast
    if (high1 && high2) return { speed: 0, direction: 0, enabled: true };          // brake
    return { speed: Math.min(1, Math.max(0, enable)), direction: high1 ? 1 : -1, enabled: true };
  }
}
