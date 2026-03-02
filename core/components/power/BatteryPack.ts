import type { IComponent, PinManifest, PinValueMap } from '../interfaces/IComponent';

export interface BatterySpecs {
  readonly nominalVoltage: number;
  readonly capacityAh: number;
  readonly internalResistance: number;
  /**
   * Cutoff voltage — motor stops below this (V).
   * Default: nominalVoltage * 0.6
   */
  readonly cutoffVoltage?: number;
}

/**
 * Piecewise-linear discharge curve approximation.
 * Maps State-of-Charge (SoC 0→1) to fraction of nominal voltage.
 * Based on typical alkaline / NiMH / LiPo combined profile.
 *
 * SoC   → Voltage fraction
 * 1.00  → 1.00
 * 0.80  → 0.97
 * 0.50  → 0.92
 * 0.20  → 0.85
 * 0.10  → 0.72
 * 0.05  → 0.55
 * 0.00  → 0.00
 */
const DISCHARGE_CURVE: [number, number][] = [
  [1.00, 1.00],
  [0.80, 0.97],
  [0.50, 0.92],
  [0.20, 0.85],
  [0.10, 0.72],
  [0.05, 0.55],
  [0.00, 0.00],
];

/** Interpolate the discharge curve to get voltage fraction at given SoC. */
function dischargeLookup(soc: number): number {
  const clamped = Math.max(0, Math.min(1, soc));
  for (let i = 0; i < DISCHARGE_CURVE.length - 1; i++) {
    const [s0, v0] = DISCHARGE_CURVE[i];
    const [s1, v1] = DISCHARGE_CURVE[i + 1];
    if (clamped >= s1 && clamped <= s0) {
      const t = (clamped - s1) / (s0 - s1);
      return v1 + t * (v0 - v1);
    }
  }
  return 0;
}

export class BatteryPack implements IComponent {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'CURRENT_DRAW', direction: 'input', signalType: 'analog' },
    { name: 'V_OUT', direction: 'output', signalType: 'power' },
  ];

  private capacityRemaining: number;
  private outputVoltage: number;
  private readonly cutoff: number;

  constructor(id: string, private readonly specs: BatterySpecs) {
    this.id = id;
    this.capacityRemaining = specs.capacityAh;
    this.outputVoltage = specs.nominalVoltage;
    this.cutoff = specs.cutoffVoltage ?? specs.nominalVoltage * 0.6;
  }

  get pinManifest(): PinManifest[] { return BatteryPack.PIN_MANIFEST; }

  /** State-of-charge 0→1 */
  getSoC(): number {
    return this.capacityRemaining / this.specs.capacityAh;
  }

  /** Current output voltage */
  getVoltage(): number {
    return this.outputVoltage;
  }

  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const currentDraw = inputs['CURRENT_DRAW'] ?? 0;

    // Discharge: subtract consumed Ah
    this.capacityRemaining = Math.max(0, this.capacityRemaining - currentDraw * (dt / 3600));

    const soc = this.getSoC();

    // Open-circuit voltage from discharge curve
    const ocv = this.specs.nominalVoltage * dischargeLookup(soc);

    // Internal resistance increases at low SoC
    const rScale = soc < 0.2 ? 1 + (0.2 - soc) * 5 : 1; // up to 2× R at SoC=0
    const effectiveR = this.specs.internalResistance * rScale;

    // Terminal voltage = OCV − I·R
    this.outputVoltage = Math.max(0, ocv - currentDraw * effectiveR);

    // Cutoff: below cutoff voltage the battery is considered dead
    if (this.outputVoltage < this.cutoff && soc < 0.1) {
      this.outputVoltage = 0;
    }

    return { V_OUT: this.outputVoltage };
  }

  reset(): void {
    this.capacityRemaining = this.specs.capacityAh;
    this.outputVoltage = this.specs.nominalVoltage;
  }
}

export const BATTERY_4xAA: BatterySpecs = { nominalVoltage: 6.0, capacityAh: 2.5, internalResistance: 0.4 };
export const LIPO_2S: BatterySpecs = { nominalVoltage: 7.4, capacityAh: 2.2, internalResistance: 0.05 };
