/**
 * Motor driver IC specifications from datasheets.
 */
export interface DriverSpecs {
  /** Max continuous current per channel (A) */
  readonly maxCurrentPerChannel: number;
  /** Voltage drop across driver (V) */
  readonly voltageDrop: number;
  /** Minimum supply voltage (V) */
  readonly minVoltage: number;
  /** Maximum supply voltage (V) */
  readonly maxVoltage: number;
  /** Number of H-bridge channels */
  readonly channels: number;
  /** Whether the driver has a standby/enable pin */
  readonly hasStandbyPin: boolean;
}

export interface DriverCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'driver';
  readonly specs: DriverSpecs;
  /** Weight in grams */
  readonly weight: number;
  /** Dimensions [length, width, height] in mm */
  readonly dimensions: readonly [number, number, number];
}

export const DRIVER_CATALOG: readonly DriverCatalogEntry[] = [
  {
    id: 'l298n',
    displayName: 'L298N Dual H-Bridge',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 2.0,
      voltageDrop: 1.4,
      minVoltage: 5,
      maxVoltage: 35,
      channels: 2,
      hasStandbyPin: false,
    },
    weight: 30,
    dimensions: [43, 43, 27],
  },
  {
    id: 'l293d',
    displayName: 'L293D Dual H-Bridge',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 0.6,
      voltageDrop: 1.4,
      minVoltage: 4.5,
      maxVoltage: 36,
      channels: 2,
      hasStandbyPin: false,
    },
    weight: 6,
    dimensions: [20, 10, 5],
  },
  {
    id: 'tb6612fng',
    displayName: 'TB6612FNG Dual Driver',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 1.2,
      voltageDrop: 0.5,
      minVoltage: 2.5,
      maxVoltage: 13.5,
      channels: 2,
      hasStandbyPin: true,
    },
    weight: 3,
    dimensions: [20, 20, 3],
  },
  {
    id: 'drv8833',
    displayName: 'DRV8833 Dual Driver',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 1.5,
      voltageDrop: 0.2,
      minVoltage: 2.7,
      maxVoltage: 10.8,
      channels: 2,
      hasStandbyPin: true,
    },
    weight: 3,
    dimensions: [18, 15, 3],
  },
  {
    id: 'a4988',
    displayName: 'A4988 Stepper Driver',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 2.0,
      voltageDrop: 0.4,
      minVoltage: 8,
      maxVoltage: 35,
      channels: 1,
      hasStandbyPin: true,
    },
    weight: 4,
    dimensions: [20, 15, 3],
  },
  {
    id: 'uln2003',
    displayName: 'ULN2003 Darlington Array',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 0.5,
      voltageDrop: 0.9,
      minVoltage: 5,
      maxVoltage: 50,
      channels: 4,
      hasStandbyPin: false,
    },
    weight: 5,
    dimensions: [30, 17, 8],
  },
  {
    id: 'bts7960',
    displayName: 'BTS7960 43A H-Bridge',
    category: 'driver',
    specs: {
      maxCurrentPerChannel: 43,
      voltageDrop: 0.2,
      minVoltage: 5.5,
      maxVoltage: 27,
      channels: 1,
      hasStandbyPin: false,
    },
    weight: 45,
    dimensions: [50, 40, 15],
  },
] as const;

export function findDriver(id: string): DriverCatalogEntry | undefined {
  return DRIVER_CATALOG.find(d => d.id === id);
}
