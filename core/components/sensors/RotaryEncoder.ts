import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
export class RotaryEncoder implements ISensor {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [{ name: 'OUT', direction: 'output', signalType: 'digital' }];
  private readonly spr: number; private wav = 0; private aa = 0;
  constructor(id: string, slotsPerRevolution = 20) { this.id = id; this.spr = slotsPerRevolution; }
  get pinManifest(): PinManifest[] { return RotaryEncoder.PIN_MANIFEST; }
  setEnvironment(env: SensorEnvironment): void { if (env.wheelAngularVelocity !== undefined) this.wav = env.wheelAngularVelocity; }
  tick(dt: number, _inputs: PinValueMap): PinValueMap { this.aa += Math.abs(this.wav) * dt; return { OUT: Math.floor(this.aa / ((2 * Math.PI) / (this.spr * 2))) % 2 === 0 ? 1 : 0 }; }
  reset(): void { this.wav = 0; this.aa = 0; }
}
