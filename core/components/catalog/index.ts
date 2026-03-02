/**
 * Unified component catalog — single entry-point for all specs.
 */

export { MOTOR_CATALOG, findMotor } from './motorCatalog';
export type { MotorCatalogEntry } from './motorCatalog';

export { SERVO_CATALOG, findServo } from './servoCatalog';
export type { ServoCatalogEntry, ServoMotorSpecs } from './servoCatalog';

export { DRIVER_CATALOG, findDriver } from './driverCatalog';
export type { DriverCatalogEntry, DriverSpecs } from './driverCatalog';

export { SENSOR_CATALOG, findSensor } from './sensorCatalog';
export type { SensorCatalogEntry, SensorSpecs } from './sensorCatalog';

export { BATTERY_CATALOG, findBattery } from './batteryCatalog';
export type { BatteryCatalogEntry } from './batteryCatalog';

export { MCU_CATALOG, findMcu } from './mcuCatalog';
export type { McuCatalogEntry, McuBoardSpecs } from './mcuCatalog';

export { STEPPER_CATALOG, findStepper } from './stepperCatalog';
export type { StepperCatalogEntry, StepperMotorSpecs } from './stepperCatalog';

// ---------- generic lookup ----------

export type CatalogCategory = 'dc-motor' | 'servo' | 'driver' | 'sensor' | 'battery' | 'mcu' | 'stepper';

import { MOTOR_CATALOG } from './motorCatalog';
import { SERVO_CATALOG } from './servoCatalog';
import { DRIVER_CATALOG } from './driverCatalog';
import { SENSOR_CATALOG } from './sensorCatalog';
import { BATTERY_CATALOG } from './batteryCatalog';
import { MCU_CATALOG } from './mcuCatalog';
import { STEPPER_CATALOG } from './stepperCatalog';

const ALL_CATALOGS: Record<CatalogCategory, readonly { id: string; displayName: string }[]> = {
  'dc-motor': MOTOR_CATALOG,
  servo: SERVO_CATALOG,
  driver: DRIVER_CATALOG,
  sensor: SENSOR_CATALOG,
  battery: BATTERY_CATALOG,
  mcu: MCU_CATALOG,
  stepper: STEPPER_CATALOG,
};

/**
 * Look up any catalog entry by category + id.
 */
export function findComponentSpec(category: CatalogCategory, id: string) {
  const catalog = ALL_CATALOGS[category];
  return catalog?.find(e => e.id === id);
}
