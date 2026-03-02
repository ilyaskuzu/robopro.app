/**
 * CircuitValidator — validates that the assembled and wired circuit is complete
 * before the simulation runs. Derives driver-motor mappings from actual wiring
 * instead of hardcoded assumptions.
 */

import type { WireConnection } from './WiringGraph';
import type { DriverMotorMapping, ComponentWire } from './SimulationLoop';
import type { IComponent, PinManifest } from '../components/interfaces/IComponent';

export interface CircuitError {
  readonly severity: 'error' | 'warning';
  readonly component: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: CircuitError[];
  readonly warnings: CircuitError[];
  readonly resolvedMappings: DriverMotorMapping[];
  readonly resolvedComponentWires: ComponentWire[];
}

export interface ValidatorInput {
  readonly placedComponents: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly pinManifest: PinManifest[];
  }>;
  readonly mcuConnections: ReadonlyArray<WireConnection>;
  readonly editorWires: ReadonlyArray<ComponentWire>;
}

const DRIVER_TYPES = new Set([
  'l298n', 'l293d', 'tb6612fng', 'drv8833', 'a4988', 'uln2003',
]);

const MOTOR_TYPES = new Set(['dc-motor', 'tt-motor-6v']);

const BATTERY_TYPES_PARTIAL = ['battery', 'lipo'];

function isDriverType(type: string): boolean {
  return DRIVER_TYPES.has(type);
}

function isMotorType(type: string): boolean {
  if (MOTOR_TYPES.has(type)) return true;
  return type.startsWith('dc-motor');
}

function isBatteryType(type: string): boolean {
  return BATTERY_TYPES_PARTIAL.some((b) => type.includes(b));
}

const DRIVER_OUTPUT_CHANNELS: Record<string, number> = {
  OUT_A: 0,
  OUT_B: 1,
  OUTA: 0,
  OUTB: 1,
};

export class CircuitValidator {
  static validate(input: ValidatorInput): ValidationResult {
    const errors: CircuitError[] = [];
    const warnings: CircuitError[] = [];

    const drivers = input.placedComponents.filter((c) => isDriverType(c.type));
    const motors = input.placedComponents.filter((c) => isMotorType(c.type));
    const batteries = input.placedComponents.filter((c) => isBatteryType(c.type));

    // Extract non-MCU (component-to-component) wires from editorWires
    const componentWires: ComponentWire[] = [...input.editorWires];

    // 0. Global power check: battery must exist AND have V_OUT wired for current to flow
    if (batteries.length === 0 && input.placedComponents.length > 0) {
      errors.push({
        severity: 'error',
        component: 'battery',
        message: 'No battery assembled — system has no power, nothing will work',
      });
    } else if (batteries.length > 0) {
      // Battery exists — verify at least one V_OUT wire connects it to the circuit
      const batteryIds = new Set(batteries.map((b) => b.id));
      const hasAnyVOutWire = componentWires.some(
        (w) =>
          (batteryIds.has(w.fromComponentId) && w.fromPinName === 'V_OUT') ||
          (batteryIds.has(w.toComponentId) && w.toPinName === 'V_OUT'),
      );
      if (!hasAnyVOutWire) {
        errors.push({
          severity: 'error',
          component: batteries[0].id,
          message: 'Battery is assembled but V_OUT is not wired — no current can flow, system has no power',
        });
      }
    }

    // 1. Power path: battery → driver
    for (const driver of drivers) {
      if (batteries.length === 0) break;
      const hasPower = componentWires.some(
        (w) =>
          (w.toComponentId === driver.id && w.toPinName === 'VCC') ||
          (w.fromComponentId === driver.id && w.fromPinName === 'VCC'),
      );
      if (!hasPower) {
        errors.push({
          severity: 'error',
          component: driver.id,
          message: `No power supply: battery V_OUT is not wired to ${driver.id} VCC — supply voltage will be 0V`,
        });
      }
    }

    // 2. Motor path: driver → motor
    const resolvedMappings: DriverMotorMapping[] = [];

    for (const motor of motors) {
      const powerWire = componentWires.find(
        (w) =>
          (w.toComponentId === motor.id && w.toPinName === 'POWER') ||
          (w.fromComponentId === motor.id && w.fromPinName === 'POWER'),
      );

      if (!powerWire) {
        if (drivers.length > 0) {
          errors.push({
            severity: 'error',
            component: motor.id,
            message: `Motor '${motor.id}' has no power connection from driver — it will not move`,
          });
        }
        continue;
      }

      // Determine which driver output pin connects to this motor
      const driverEnd =
        powerWire.toComponentId === motor.id
          ? { id: powerWire.fromComponentId, pin: powerWire.fromPinName }
          : { id: powerWire.toComponentId, pin: powerWire.toPinName };

      const driverComp = drivers.find((d) => d.id === driverEnd.id);
      if (!driverComp) continue;

      const channelIndex = DRIVER_OUTPUT_CHANNELS[driverEnd.pin];
      if (channelIndex !== undefined) {
        resolvedMappings.push({
          driverId: driverComp.id,
          channelIndex,
          motorId: motor.id,
        });
      }
    }

    // 3. MCU → driver control pins (warnings only)
    for (const driver of drivers) {
      const controlPins = driver.pinManifest
        .filter((p) => p.direction === 'input' && p.signalType !== 'power')
        .map((p) => p.name);

      for (const pin of controlPins) {
        const hasConnection = input.mcuConnections.some(
          (c) => c.componentId === driver.id && c.componentPinName === pin,
        );
        if (!hasConnection) {
          warnings.push({
            severity: 'warning',
            component: driver.id,
            message: `Driver pin ${pin} not connected to MCU — that control signal will stay at 0`,
          });
        }
      }
    }

    // 4. Sensor MCU connections (warnings only)
    const sensorTypes = ['ultrasonic', 'ir-line', 'encoder', 'ldr', 'dht11', 'mpu6050', 'hc-sr04'];
    const sensors = input.placedComponents.filter(
      (c) => sensorTypes.some((t) => c.type.includes(t)),
    );
    for (const sensor of sensors) {
      const hasConnection = input.mcuConnections.some(
        (c) => c.componentId === sensor.id,
      );
      if (!hasConnection) {
        warnings.push({
          severity: 'warning',
          component: sensor.id,
          message: `Sensor '${sensor.id}' has no MCU connection — it will not report data`,
        });
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      resolvedMappings,
      resolvedComponentWires: componentWires,
    };
  }
}
