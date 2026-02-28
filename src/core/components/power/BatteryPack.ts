import type { IComponent, PinManifest, PinValueMap } from '../interfaces/IComponent';
export interface BatterySpecs { readonly nominalVoltage: number; readonly capacityAh: number; readonly internalResistance: number; }
export class BatteryPack implements IComponent {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [{ name: 'CURRENT_DRAW', direction: 'input', signalType: 'analog' }, { name: 'V_OUT', direction: 'output', signalType: 'power' }];
  private cr: number; private oV: number;
  constructor(id: string, private readonly specs: BatterySpecs) { this.id = id; this.cr = specs.capacityAh; this.oV = specs.nominalVoltage; }
  get pinManifest(): PinManifest[] { return BatteryPack.PIN_MANIFEST; }
  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const cd = inputs['CURRENT_DRAW'] ?? 0; this.cr = Math.max(0, this.cr - cd * (dt / 3600));
    const soc = this.cr / this.specs.capacityAh, drop = soc < 0.2 ? soc / 0.2 : 1;
    this.oV = Math.max(0, this.specs.nominalVoltage * drop - cd * this.specs.internalResistance);
    return { V_OUT: this.oV };
  }
  reset(): void { this.cr = this.specs.capacityAh; this.oV = this.specs.nominalVoltage; }
}
export const BATTERY_4xAA: BatterySpecs = { nominalVoltage: 6.0, capacityAh: 2.5, internalResistance: 0.4 };
export const LIPO_2S: BatterySpecs = { nominalVoltage: 7.4, capacityAh: 2.2, internalResistance: 0.05 };
