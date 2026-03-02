export interface StepperMotorSpecs {
  readonly stepsPerRev: number;
  readonly holdingTorqueNm: number;
  readonly ratedCurrentA: number;
  readonly coilResistanceOhm: number;
  readonly nominalVoltage: number;
  readonly maxRpm: number;
}

export interface StepperCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'stepper';
  readonly specs: StepperMotorSpecs;
  readonly weight: number;
  readonly dimensions: readonly [number, number, number];
  readonly shaftDiameter: number;
  readonly geared: boolean;
  readonly gearRatio: number;
  readonly motorType: 'unipolar' | 'bipolar';
}

export const STEPPER_CATALOG: readonly StepperCatalogEntry[] = [
  {
    id: '28byj-48-5v',
    displayName: '28BYJ-48 (5V)',
    category: 'stepper',
    specs: {
      stepsPerRev: 2048,
      holdingTorqueNm: 0.034,
      ratedCurrentA: 0.24,
      coilResistanceOhm: 50,
      nominalVoltage: 5,
      maxRpm: 15,
    },
    weight: 33,
    dimensions: [28, 28, 20],
    shaftDiameter: 5,
    geared: true,
    gearRatio: 64,
    motorType: 'unipolar',
  },
  {
    id: 'nema17-12v',
    displayName: 'NEMA 17 (12V)',
    category: 'stepper',
    specs: {
      stepsPerRev: 200,
      holdingTorqueNm: 0.4,
      ratedCurrentA: 1.5,
      coilResistanceOhm: 1.4,
      nominalVoltage: 12,
      maxRpm: 600,
    },
    weight: 280,
    dimensions: [42, 42, 40],
    shaftDiameter: 5,
    geared: false,
    gearRatio: 1,
    motorType: 'bipolar',
  },
  {
    id: 'nema23-24v',
    displayName: 'NEMA 23 (24V)',
    category: 'stepper',
    specs: {
      stepsPerRev: 200,
      holdingTorqueNm: 1.26,
      ratedCurrentA: 2.8,
      coilResistanceOhm: 0.9,
      nominalVoltage: 24,
      maxRpm: 400,
    },
    weight: 560,
    dimensions: [57, 57, 56],
    shaftDiameter: 6.35,
    geared: false,
    gearRatio: 1,
    motorType: 'bipolar',
  },
] as const;

export function findStepper(id: string): StepperCatalogEntry | undefined {
  return STEPPER_CATALOG.find(s => s.id === id);
}
