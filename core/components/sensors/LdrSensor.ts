import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * LDR (Light-Dependent Resistor) module.
 *
 * Reads ambient light level from the environment and outputs an analog value 0–1.
 * Environment key: `lightLevel` (0 = dark, 1 = bright).
 */
export class LdrSensor implements ISensor {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'OUT', direction: 'output', signalType: 'analog' },
  ];

  private lightLevel = 0.5; // default ambient

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return LdrSensor.PIN_MANIFEST;
  }

  setEnvironment(env: SensorEnvironment): void {
    if (env.lightLevel !== undefined) {
      this.lightLevel = Math.max(0, Math.min(1, env.lightLevel));
    }
  }

  tick(_dt: number, _inputs: PinValueMap): PinValueMap {
    return { OUT: this.lightLevel };
  }

  reset(): void {
    this.lightLevel = 0.5;
  }
}
