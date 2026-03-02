/**
 * Component compatibility checker for robot builds.
 * Pure TypeScript, no React/Zustand imports.
 */

export interface CompatibilityIssue {
  type: 'error' | 'warning';
  category: 'voltage' | 'current' | 'pins' | 'power';
  message: string;
  componentIds: string[];
}

export interface CompatibilityInput {
  motorVoltage: number;
  motorStallCurrentA: number;
  batteryVoltage: number;
  batteryMaxDischargeA: number;
  driverMaxCurrentA: number;
  driverMinVoltage: number;
  driverMaxVoltage: number;
  driverVoltageDrop: number;
  mcuDigitalPins: number;
  mcuAnalogPins: number;
  requiredDigitalPins: number;
  requiredAnalogPins: number;
  motorCount: number;
}

const VOLTAGE_TOLERANCE_PERCENT = 20;
const LOW_VOLTAGE_THRESHOLD_PERCENT = 50; // warn if effective motor voltage < 50% of nominal

export function checkCompatibility(input: CompatibilityInput): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  // 1. Battery voltage vs driver voltage range (error if outside)
  if (input.batteryVoltage < input.driverMinVoltage) {
    issues.push({
      type: 'error',
      category: 'voltage',
      message: `Battery voltage (${input.batteryVoltage}V) is below driver minimum (${input.driverMinVoltage}V)`,
      componentIds: ['battery', 'driver'],
    });
  }
  if (input.batteryVoltage > input.driverMaxVoltage) {
    issues.push({
      type: 'error',
      category: 'voltage',
      message: `Battery voltage (${input.batteryVoltage}V) exceeds driver maximum (${input.driverMaxVoltage}V)`,
      componentIds: ['battery', 'driver'],
    });
  }

  // 2. Battery voltage vs motor nominal voltage (warning if >20% different)
  const motorVoltageDiffPercent =
    input.motorVoltage > 0
      ? Math.abs(input.batteryVoltage - input.motorVoltage) / input.motorVoltage * 100
      : 0;
  if (motorVoltageDiffPercent > VOLTAGE_TOLERANCE_PERCENT) {
    issues.push({
      type: 'warning',
      category: 'voltage',
      message: `Battery voltage (${input.batteryVoltage}V) differs from motor nominal (${input.motorVoltage}V) by ${motorVoltageDiffPercent.toFixed(0)}%`,
      componentIds: ['battery', 'motor'],
    });
  }

  // 3. Motor stall current * motorCount vs driver max current (warning if motor draws more)
  const totalStallCurrent = input.motorStallCurrentA * input.motorCount;
  if (totalStallCurrent > input.driverMaxCurrentA) {
    issues.push({
      type: 'warning',
      category: 'current',
      message: `Total motor stall current (${totalStallCurrent.toFixed(1)}A) exceeds driver max (${input.driverMaxCurrentA}A)`,
      componentIds: ['motor', 'driver'],
    });
  }

  // 4. Motor stall current * motorCount vs battery max discharge (error if exceeds)
  if (totalStallCurrent > input.batteryMaxDischargeA) {
    issues.push({
      type: 'error',
      category: 'current',
      message: `Total motor stall current (${totalStallCurrent.toFixed(1)}A) exceeds battery max discharge (${input.batteryMaxDischargeA}A)`,
      componentIds: ['motor', 'battery'],
    });
  }

  // 5. Required pins vs available MCU pins (error if not enough)
  if (input.requiredDigitalPins > input.mcuDigitalPins) {
    issues.push({
      type: 'error',
      category: 'pins',
      message: `Required digital pins (${input.requiredDigitalPins}) exceed MCU available (${input.mcuDigitalPins})`,
      componentIds: ['mcu'],
    });
  }
  if (input.requiredAnalogPins > input.mcuAnalogPins) {
    issues.push({
      type: 'error',
      category: 'pins',
      message: `Required analog pins (${input.requiredAnalogPins}) exceed MCU available (${input.mcuAnalogPins})`,
      componentIds: ['mcu'],
    });
  }

  // 6. Effective motor voltage after driver drop (warning if very low)
  const effectiveMotorVoltage = input.batteryVoltage - input.driverVoltageDrop;
  const effectiveVsNominalPercent =
    input.motorVoltage > 0 ? (effectiveMotorVoltage / input.motorVoltage) * 100 : 100;
  if (effectiveVsNominalPercent < LOW_VOLTAGE_THRESHOLD_PERCENT && effectiveMotorVoltage > 0) {
    issues.push({
      type: 'warning',
      category: 'power',
      message: `Effective motor voltage (${effectiveMotorVoltage.toFixed(1)}V after driver drop) is ${effectiveVsNominalPercent.toFixed(0)}% of nominal (${input.motorVoltage}V)`,
      componentIds: ['motor', 'driver', 'battery'],
    });
  }

  return issues;
}
