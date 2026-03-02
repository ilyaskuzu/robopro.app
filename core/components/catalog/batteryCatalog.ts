import type { BatterySpecs } from '../power/BatteryPack';

export interface BatteryCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'battery';
  readonly specs: BatterySpecs;
  /** Weight in grams */
  readonly weight: number;
  /** Dimensions [length, width, height] in mm */
  readonly dimensions: readonly [number, number, number];
  /** Chemistry type */
  readonly chemistry: 'alkaline' | 'lipo' | 'li-ion' | 'usb' | 'nimh' | 'lifepo4' | 'sla';
  /** Max continuous discharge current (A). Infinity for USB supply. */
  readonly maxDischargeCurrent: number;
}

export const BATTERY_CATALOG: readonly BatteryCatalogEntry[] = [
  {
    id: '4xaa-alkaline',
    displayName: '4×AA Alkaline (6V)',
    category: 'battery',
    specs: { nominalVoltage: 6.0, capacityAh: 2.5, internalResistance: 0.4 },
    weight: 92,
    dimensions: [62, 58, 15],
    chemistry: 'alkaline',
    maxDischargeCurrent: 2,
  },
  {
    id: 'lipo-2s-7v4',
    displayName: '2S LiPo 7.4V 2200mAh',
    category: 'battery',
    specs: { nominalVoltage: 7.4, capacityAh: 2.2, internalResistance: 0.05 },
    weight: 125,
    dimensions: [106, 35, 17],
    chemistry: 'lipo',
    maxDischargeCurrent: 44,
  },
  {
    id: 'lipo-1s-3v7',
    displayName: '1S LiPo 3.7V 1000mAh',
    category: 'battery',
    specs: { nominalVoltage: 3.7, capacityAh: 1.0, internalResistance: 0.08 },
    weight: 25,
    dimensions: [48, 30, 8],
    chemistry: 'lipo',
    maxDischargeCurrent: 20,
  },
  {
    id: 'lipo-3s-11v1',
    displayName: '3S LiPo 11.1V 2200mAh',
    category: 'battery',
    specs: { nominalVoltage: 11.1, capacityAh: 2.2, internalResistance: 0.03 },
    weight: 185,
    dimensions: [106, 35, 25],
    chemistry: 'lipo',
    maxDischargeCurrent: 44,
  },
  {
    id: '9v-alkaline',
    displayName: '9V Alkaline Battery',
    category: 'battery',
    specs: { nominalVoltage: 9.0, capacityAh: 0.5, internalResistance: 2.0 },
    weight: 46,
    dimensions: [49, 27, 17],
    chemistry: 'alkaline',
    maxDischargeCurrent: 0.5,
  },
  {
    id: '18650-2s',
    displayName: '2×18650 Li-ion (7.4V)',
    category: 'battery',
    specs: { nominalVoltage: 7.4, capacityAh: 3.0, internalResistance: 0.1 },
    weight: 96,
    dimensions: [70, 37, 19],
    chemistry: 'li-ion',
    maxDischargeCurrent: 10,
  },
  {
    id: 'usb-5v',
    displayName: 'USB 5V Supply',
    category: 'battery',
    specs: { nominalVoltage: 5.0, capacityAh: Infinity, internalResistance: 0.01 },
    weight: 0,
    dimensions: [0, 0, 0],
    chemistry: 'usb',
    maxDischargeCurrent: 2,
  },
  {
    id: '2xaa-alkaline',
    displayName: '2×AA Alkaline (3V)',
    category: 'battery',
    specs: { nominalVoltage: 3, capacityAh: 2.5, internalResistance: 0.3 },
    weight: 48,
    dimensions: [58, 29, 15],
    chemistry: 'alkaline',
    maxDischargeCurrent: 1.5,
  },
  {
    id: '6xaa-alkaline',
    displayName: '6×AA Alkaline (9V)',
    category: 'battery',
    specs: { nominalVoltage: 9, capacityAh: 2.5, internalResistance: 0.6 },
    weight: 144,
    dimensions: [86, 58, 15],
    chemistry: 'alkaline',
    maxDischargeCurrent: 2,
  },
  {
    id: '4xaa-nimh',
    displayName: '4×AA NiMH Rechargeable (4.8V)',
    category: 'battery',
    specs: { nominalVoltage: 4.8, capacityAh: 2.0, internalResistance: 0.25 },
    weight: 112,
    dimensions: [58, 58, 15],
    chemistry: 'nimh',
    maxDischargeCurrent: 4,
  },
  {
    id: 'lifepo4-6v4',
    displayName: 'LiFePO4 6.4V 1500mAh',
    category: 'battery',
    specs: { nominalVoltage: 6.4, capacityAh: 1.5, internalResistance: 0.06 },
    weight: 130,
    dimensions: [65, 34, 18],
    chemistry: 'lifepo4',
    maxDischargeCurrent: 15,
  },
  {
    id: 'sla-12v',
    displayName: '12V SLA 1.3Ah',
    category: 'battery',
    specs: { nominalVoltage: 12, capacityAh: 1.3, internalResistance: 0.15 },
    weight: 600,
    dimensions: [97, 43, 52],
    chemistry: 'sla',
    maxDischargeCurrent: 5,
  },
] as const;

export function findBattery(id: string): BatteryCatalogEntry | undefined {
  return BATTERY_CATALOG.find(b => b.id === id);
}
