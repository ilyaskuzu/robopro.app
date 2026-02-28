import type { IDriver, DriverChannel } from '../interfaces/IDriver';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
export class L298N implements IDriver {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'ENA', direction: 'input', signalType: 'pwm' }, { name: 'IN1', direction: 'input', signalType: 'digital' }, { name: 'IN2', direction: 'input', signalType: 'digital' },
    { name: 'ENB', direction: 'input', signalType: 'pwm' }, { name: 'IN3', direction: 'input', signalType: 'digital' }, { name: 'IN4', direction: 'input', signalType: 'digital' },
    { name: 'OUT_A', direction: 'output', signalType: 'analog' }, { name: 'OUT_B', direction: 'output', signalType: 'analog' },
    { name: 'DIR_A', direction: 'output', signalType: 'digital' }, { name: 'DIR_B', direction: 'output', signalType: 'digital' },
  ];
  static readonly VOLTAGE_DROP = 1.4;
  private cA: DriverChannel = { speed: 0, direction: 0, enabled: false };
  private cB: DriverChannel = { speed: 0, direction: 0, enabled: false };
  constructor(id: string) { this.id = id; }
  get pinManifest(): PinManifest[] { return L298N.PIN_MANIFEST; }
  tick(_dt: number, i: PinValueMap): PinValueMap {
    this.cA = L298N.rc(i['ENA'] ?? 0, i['IN1'] ?? 0, i['IN2'] ?? 0);
    this.cB = L298N.rc(i['ENB'] ?? 0, i['IN3'] ?? 0, i['IN4'] ?? 0);
    return { OUT_A: this.cA.speed * this.cA.direction, OUT_B: this.cB.speed * this.cB.direction, DIR_A: this.cA.direction, DIR_B: this.cB.direction };
  }
  getChannels(): DriverChannel[] { return [this.cA, this.cB]; }
  reset(): void { this.cA = { speed: 0, direction: 0, enabled: false }; this.cB = { speed: 0, direction: 0, enabled: false }; }
  private static rc(en: number, i1: number, i2: number): DriverChannel {
    const h1 = i1 > 0.5, h2 = i2 > 0.5;
    if (!h1 && !h2) return { speed: 0, direction: 0, enabled: en > 0 };
    if (h1 && h2) return { speed: 0, direction: 0, enabled: true };
    return { speed: Math.min(1, Math.max(0, en)), direction: h1 ? 1 : -1, enabled: true };
  }
}
