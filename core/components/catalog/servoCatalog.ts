/**
 * Servo motor specifications from datasheets.
 */
export interface ServoMotorSpecs {
  /** Stall torque in kg·cm at nominal voltage */
  readonly stallTorqueKgCm: number;
  /** Maximum rotation angle in degrees */
  readonly maxAngleDeg: number;
  /** Time to rotate 60° in seconds */
  readonly speedPer60Deg: number;
  /** Nominal operating voltage */
  readonly nominalVoltage: number;
  /** Dead-band width in µs (pulse width insensitivity) */
  readonly deadBandUs: number;
}

export interface ServoCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'servo';
  readonly specs: ServoMotorSpecs;
  /** Weight in grams */
  readonly weight: number;
  /** Dimensions [length, width, height] in mm */
  readonly dimensions: readonly [number, number, number];
}

export const SERVO_CATALOG: readonly ServoCatalogEntry[] = [
  {
    id: 'sg90',
    displayName: 'SG90 Micro Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 1.2,
      maxAngleDeg: 180,
      speedPer60Deg: 0.12,
      nominalVoltage: 4.8,
      deadBandUs: 10,
    },
    weight: 9,
    dimensions: [23, 12, 29],
  },
  {
    id: 'mg90s',
    displayName: 'MG90S Metal Gear Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 1.8,
      maxAngleDeg: 180,
      speedPer60Deg: 0.10,
      nominalVoltage: 4.8,
      deadBandUs: 5,
    },
    weight: 13.4,
    dimensions: [23, 12, 29],
  },
  {
    id: 'mg996r',
    displayName: 'MG996R Standard Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 10,
      maxAngleDeg: 180,
      speedPer60Deg: 0.17,
      nominalVoltage: 6,
      deadBandUs: 5,
    },
    weight: 55,
    dimensions: [40, 20, 43],
  },
  {
    id: 'ds3218',
    displayName: 'DS3218 High-Torque Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 21,
      maxAngleDeg: 270,
      speedPer60Deg: 0.16,
      nominalVoltage: 6.8,
      deadBandUs: 3,
    },
    weight: 60,
    dimensions: [40, 20, 41],
  },
  {
    id: 'sg92r',
    displayName: 'SG92R Digital Micro Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 2.5,
      maxAngleDeg: 180,
      speedPer60Deg: 0.10,
      nominalVoltage: 4.8,
      deadBandUs: 5,
    },
    weight: 9,
    dimensions: [23, 12, 29],
  },
  {
    id: 'mg995',
    displayName: 'MG995 Metal Gear Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 10,
      maxAngleDeg: 180,
      speedPer60Deg: 0.20,
      nominalVoltage: 6,
      deadBandUs: 5,
    },
    weight: 55,
    dimensions: [40, 20, 43],
  },
  {
    id: 'fs5106b',
    displayName: 'FS5106B Standard Servo',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 6,
      maxAngleDeg: 180,
      speedPer60Deg: 0.18,
      nominalVoltage: 6,
      deadBandUs: 8,
    },
    weight: 38,
    dimensions: [40, 19, 36],
  },
  {
    id: 'fs90r',
    displayName: 'FS90R Continuous Rotation',
    category: 'servo',
    specs: {
      stallTorqueKgCm: 1.5,
      maxAngleDeg: 360,
      speedPer60Deg: 0.11,
      nominalVoltage: 4.8,
      deadBandUs: 5,
    },
    weight: 9,
    dimensions: [23, 12, 29],
  },
] as const;

export function findServo(id: string): ServoCatalogEntry | undefined {
  return SERVO_CATALOG.find(s => s.id === id);
}
