/**
 * DriverFactory — creates driver instances and provides wiring configs
 * for dynamic component selection at runtime.
 */
import type { IDriver } from '../interfaces/IDriver';
import { L298N } from './L298N';
import { L293D } from './L293D';
import { TB6612FNG } from './TB6612FNG';
import { DRV8833 } from './DRV8833';
import { A4988 } from './A4988';
import { ULN2003 } from './ULN2003';

/**
 * Describes which MCU pins connect to which driver input pins.
 */
export interface DriverWiringConfig {
  /** Driver input pin name → MCU pin index */
  readonly pinMap: ReadonlyArray<{ mcuPin: number; driverPin: string }>;
}

type DriverCtor = new (id: string) => IDriver;

const DRIVER_CTORS: Record<string, DriverCtor> = {
  'l298n': L298N,
  'l293d': L293D,
  'tb6612fng': TB6612FNG,
  'drv8833': DRV8833,
  'a4988': A4988,
  'uln2003': ULN2003,
};

/**
 * Default Arduino pin wiring for each driver type.
 *
 * L298N / L293D use 6 pins (ENA/EN1, IN1–IN4, ENB/EN2).
 * TB6612FNG uses 7 pins (PWMA, AIN1, AIN2, PWMB, BIN1, BIN2, STBY).
 * DRV8833 uses 5 pins (AIN1, AIN2, BIN1, BIN2, nSLEEP).
 * A4988 uses 7 pins (STEP, DIR, ENABLE, MS1, MS2, MS3, SLEEP).
 * ULN2003 uses 4 pins (IN1–IN4).
 */
const DEFAULT_WIRING: Record<string, DriverWiringConfig> = {
  'l298n': {
    pinMap: [
      { mcuPin: 5, driverPin: 'ENA' },
      { mcuPin: 6, driverPin: 'ENB' },
      { mcuPin: 7, driverPin: 'IN1' },
      { mcuPin: 8, driverPin: 'IN2' },
      { mcuPin: 9, driverPin: 'IN3' },
      { mcuPin: 10, driverPin: 'IN4' },
    ],
  },
  'l293d': {
    pinMap: [
      { mcuPin: 5, driverPin: 'EN1' },
      { mcuPin: 6, driverPin: 'EN2' },
      { mcuPin: 7, driverPin: 'IN1' },
      { mcuPin: 8, driverPin: 'IN2' },
      { mcuPin: 9, driverPin: 'IN3' },
      { mcuPin: 10, driverPin: 'IN4' },
    ],
  },
  'tb6612fng': {
    pinMap: [
      { mcuPin: 5, driverPin: 'PWMA' },
      { mcuPin: 6, driverPin: 'PWMB' },
      { mcuPin: 7, driverPin: 'AIN1' },
      { mcuPin: 8, driverPin: 'AIN2' },
      { mcuPin: 9, driverPin: 'BIN1' },
      { mcuPin: 10, driverPin: 'BIN2' },
      { mcuPin: 4, driverPin: 'STBY' },
    ],
  },
  'drv8833': {
    pinMap: [
      { mcuPin: 5, driverPin: 'AIN1' },
      { mcuPin: 6, driverPin: 'AIN2' },
      { mcuPin: 9, driverPin: 'BIN1' },
      { mcuPin: 10, driverPin: 'BIN2' },
      { mcuPin: 4, driverPin: 'nSLEEP' },
    ],
  },
  'a4988': {
    pinMap: [
      { mcuPin: 2, driverPin: 'STEP' },
      { mcuPin: 3, driverPin: 'DIR' },
      { mcuPin: 4, driverPin: 'ENABLE' },
      { mcuPin: 5, driverPin: 'MS1' },
      { mcuPin: 6, driverPin: 'MS2' },
      { mcuPin: 7, driverPin: 'MS3' },
      { mcuPin: 8, driverPin: 'SLEEP' },
    ],
  },
  'uln2003': {
    pinMap: [
      { mcuPin: 5, driverPin: 'IN1' },
      { mcuPin: 6, driverPin: 'IN2' },
      { mcuPin: 7, driverPin: 'IN3' },
      { mcuPin: 8, driverPin: 'IN4' },
    ],
  },
};

/**
 * Create a driver instance by catalog ID.
 */
export function createDriver(catalogId: string, instanceId: string): IDriver {
  const Ctor = DRIVER_CTORS[catalogId];
  if (!Ctor) {
    throw new Error(`Unknown driver catalog ID: "${catalogId}". Valid IDs: ${Object.keys(DRIVER_CTORS).join(', ')}`);
  }
  return new Ctor(instanceId);
}

/**
 * Get the default MCU-pin → driver-pin wiring for a driver type.
 */
export function getDriverWiring(catalogId: string): DriverWiringConfig {
  const wiring = DEFAULT_WIRING[catalogId];
  if (!wiring) {
    throw new Error(`No default wiring for driver: "${catalogId}"`);
  }
  return wiring;
}

/**
 * Get all supported driver catalog IDs.
 */
export function getSupportedDriverIds(): string[] {
  return Object.keys(DRIVER_CTORS);
}
