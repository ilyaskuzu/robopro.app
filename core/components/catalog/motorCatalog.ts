import type { DcMotorSpecs } from '../motors/DcMotor';

/**
 * Extended motor spec with physical dimensions and metadata for the catalog UI.
 */
export interface MotorCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'dc-motor';
  readonly specs: DcMotorSpecs;
  /** Weight in grams */
  readonly weight: number;
  /** Dimensions [length, width, height] in mm */
  readonly dimensions: readonly [number, number, number];
  /** Shaft diameter in mm */
  readonly shaftDiameter: number;
  /** Whether the motor has a built-in gearbox */
  readonly geared: boolean;
  /** Gear ratio (1 = no gearbox) */
  readonly gearRatio: number;
}

/**
 * Real-world DC motor catalog with datasheet values.
 * Sources: manufacturer datasheets + common hobby robotics specs.
 */
export const MOTOR_CATALOG: readonly MotorCatalogEntry[] = [
  {
    id: 'fa-130-3v',
    displayName: 'FA-130 (3V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.009, noLoadRpm: 9100, nominalVoltage: 3, armatureResistance: 1.5 },
    weight: 18,
    dimensions: [25, 20, 15],
    shaftDiameter: 2,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 're-180-3v',
    displayName: 'RE-180 (3V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.012, noLoadRpm: 10600, nominalVoltage: 3, armatureResistance: 2.0 },
    weight: 22,
    dimensions: [31, 24, 18],
    shaftDiameter: 2,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 're-280-6v',
    displayName: 'RE-280 (6V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.029, noLoadRpm: 8600, nominalVoltage: 6, armatureResistance: 3.2 },
    weight: 38,
    dimensions: [38, 28, 22],
    shaftDiameter: 2.3,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 'rs-370-12v',
    displayName: 'RS-370 (12V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.078, noLoadRpm: 7400, nominalVoltage: 12, armatureResistance: 4.5 },
    weight: 55,
    dimensions: [35, 28, 24],
    shaftDiameter: 2.3,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 'tt-motor-6v',
    displayName: 'TT Motor (6V, 1:48)',
    category: 'dc-motor',
    specs: { stallTorque: 0.078, noLoadRpm: 200, nominalVoltage: 6, armatureResistance: 7.5 },
    weight: 30,
    dimensions: [70, 22, 18],
    shaftDiameter: 5.5,
    geared: true,
    gearRatio: 48,
  },
  {
    id: 'n20-6v-100rpm',
    displayName: 'N20 Micro Gear (6V, 100RPM)',
    category: 'dc-motor',
    specs: { stallTorque: 0.15, noLoadRpm: 100, nominalVoltage: 6, armatureResistance: 12 },
    weight: 10,
    dimensions: [25, 12, 10],
    shaftDiameter: 3,
    geared: true,
    gearRatio: 100,
  },
  {
    id: 'n20-12v-200rpm',
    displayName: 'N20 Micro Gear (12V, 200RPM)',
    category: 'dc-motor',
    specs: { stallTorque: 0.3, noLoadRpm: 200, nominalVoltage: 12, armatureResistance: 15 },
    weight: 12,
    dimensions: [30, 12, 10],
    shaftDiameter: 3,
    geared: true,
    gearRatio: 150,
  },
  {
    id: 'ga12-n20-3v',
    displayName: 'GA12-N20 (3V, 300RPM)',
    category: 'dc-motor',
    specs: { stallTorque: 0.06, noLoadRpm: 300, nominalVoltage: 3, armatureResistance: 8 },
    weight: 9,
    dimensions: [25, 12, 10],
    shaftDiameter: 3,
    geared: true,
    gearRatio: 30,
  },
  {
    id: 'rs-385-12v',
    displayName: 'RS-385 (12V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.049, noLoadRpm: 14000, nominalVoltage: 12, armatureResistance: 2.8 },
    weight: 48,
    dimensions: [38, 28, 28],
    shaftDiameter: 2.3,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 'rs-540-12v',
    displayName: 'RS-540 (12V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.22, noLoadRpm: 19000, nominalVoltage: 12, armatureResistance: 0.8 },
    weight: 178,
    dimensions: [50, 36, 36],
    shaftDiameter: 3.17,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 'ga25-371-6v',
    displayName: 'GA25-371 (6V, 1:34)',
    category: 'dc-motor',
    specs: { stallTorque: 0.49, noLoadRpm: 170, nominalVoltage: 6, armatureResistance: 6.5 },
    weight: 68,
    dimensions: [55, 25, 25],
    shaftDiameter: 4,
    geared: true,
    gearRatio: 34,
  },
  {
    id: 'jga25-370-12v',
    displayName: 'JGA25-370 (12V, 1:21.3)',
    category: 'dc-motor',
    specs: { stallTorque: 0.39, noLoadRpm: 280, nominalVoltage: 12, armatureResistance: 8.2 },
    weight: 72,
    dimensions: [55, 25, 25],
    shaftDiameter: 4,
    geared: true,
    gearRatio: 21.3,
  },
  {
    id: '25ga370-6v',
    displayName: '25GA370 (6V, 1:10)',
    category: 'dc-motor',
    specs: { stallTorque: 0.12, noLoadRpm: 620, nominalVoltage: 6, armatureResistance: 5.0 },
    weight: 65,
    dimensions: [52, 25, 25],
    shaftDiameter: 4,
    geared: true,
    gearRatio: 10,
  },
  {
    id: '370-motor-3v',
    displayName: '370 Motor (3V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.025, noLoadRpm: 15000, nominalVoltage: 3, armatureResistance: 1.2 },
    weight: 42,
    dimensions: [35, 24, 24],
    shaftDiameter: 2.3,
    geared: false,
    gearRatio: 1,
  },
  {
    id: '775-motor-12v',
    displayName: '775 Motor (12V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.65, noLoadRpm: 12000, nominalVoltage: 12, armatureResistance: 0.5 },
    weight: 320,
    dimensions: [66, 42, 42],
    shaftDiameter: 5,
    geared: false,
    gearRatio: 1,
  },
  {
    id: 'pololu-50-1-6v',
    displayName: 'Pololu 50:1 Micro Metal Gearmotor (6V)',
    category: 'dc-motor',
    specs: { stallTorque: 0.29, noLoadRpm: 120, nominalVoltage: 6, armatureResistance: 10 },
    weight: 10,
    dimensions: [24, 10, 12],
    shaftDiameter: 3,
    geared: true,
    gearRatio: 50,
  },
] as const;

export function findMotor(id: string): MotorCatalogEntry | undefined {
  return MOTOR_CATALOG.find(m => m.id === id);
}
