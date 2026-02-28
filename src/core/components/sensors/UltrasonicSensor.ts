import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
export class UltrasonicSensor implements ISensor {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [{ name: 'TRIG', direction: 'input', signalType: 'digital' }, { name: 'ECHO', direction: 'output', signalType: 'digital' }];
  private dist = 4.0; private ta = false; private ed = 0; private et = 0;
  constructor(id: string) { this.id = id; }
  get pinManifest(): PinManifest[] { return UltrasonicSensor.PIN_MANIFEST; }
  setEnvironment(env: SensorEnvironment): void { if (env.distanceToObstacle !== undefined) this.dist = Math.max(0.02, Math.min(4.0, env.distanceToObstacle)); }
  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const trig = inputs['TRIG'] ?? 0;
    if (trig > 0.5 && !this.ta) { this.ta = true; this.et = 0; this.ed = 2 * this.dist / 343; }
    let echo = 0;
    if (this.ta) { this.et += dt; const d = 0.00001; if (this.et > d && this.et < d + this.ed) echo = 1; if (this.et > d + this.ed) this.ta = false; }
    if (trig <= 0.5) this.ta = false;
    return { ECHO: echo };
  }
  reset(): void { this.dist = 4.0; this.ta = false; this.ed = 0; this.et = 0; }
}
