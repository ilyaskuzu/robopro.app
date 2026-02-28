import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
export class IrLineSensor implements ISensor {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [{ name: 'OUT', direction: 'output', signalType: 'digital' }];
  private sr = 0; private th: number;
  constructor(id: string, threshold = 0.5) { this.id = id; this.th = threshold; }
  get pinManifest(): PinManifest[] { return IrLineSensor.PIN_MANIFEST; }
  setEnvironment(env: SensorEnvironment): void { if (env.surfaceReflectance !== undefined) this.sr = Math.max(0, Math.min(1, env.surfaceReflectance)); }
  tick(_dt: number, _inputs: PinValueMap): PinValueMap { return { OUT: this.sr >= this.th ? 0 : 1 }; }
  reset(): void { this.sr = 0; }
}
