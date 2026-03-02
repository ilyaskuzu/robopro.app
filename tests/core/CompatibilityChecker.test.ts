import { describe, it, expect } from 'vitest';
import { checkCompatibility } from '../../core/simulation/compatibilityChecker';
import type { CompatibilityInput } from '../../core/simulation/compatibilityChecker';

function baseInput(overrides: Partial<CompatibilityInput> = {}): CompatibilityInput {
  return {
    motorVoltage: 12,
    motorStallCurrentA: 2,
    batteryVoltage: 12,
    batteryMaxDischargeA: 20,
    driverMaxCurrentA: 5, // 2 motors × 2A stall = 4A
    driverMinVoltage: 5,
    driverMaxVoltage: 36,
    driverVoltageDrop: 1.5,
    mcuDigitalPins: 14,
    mcuAnalogPins: 6,
    requiredDigitalPins: 4,
    requiredAnalogPins: 2,
    motorCount: 2,
    ...overrides,
  };
}

describe('checkCompatibility', () => {
  it('returns no issues for a fully compatible setup', () => {
    const input = baseInput();
    const issues = checkCompatibility(input);
    expect(issues).toHaveLength(0);
  });

  it('returns error when battery voltage is below driver minimum', () => {
    const input = baseInput({ batteryVoltage: 3, driverMinVoltage: 5 });
    const issues = checkCompatibility(input);
    const voltageError = issues.find(
      (i) => i.type === 'error' && i.category === 'voltage' && i.message.includes('below driver minimum')
    );
    expect(voltageError).toBeDefined();
    expect(voltageError?.componentIds).toContain('battery');
    expect(voltageError?.componentIds).toContain('driver');
  });

  it('returns error when battery voltage exceeds driver maximum', () => {
    const input = baseInput({ batteryVoltage: 48, driverMaxVoltage: 36 });
    const issues = checkCompatibility(input);
    const voltageError = issues.find(
      (i) => i.type === 'error' && i.category === 'voltage' && i.message.includes('exceeds driver maximum')
    );
    expect(voltageError).toBeDefined();
  });

  it('returns warning when battery voltage differs from motor nominal by >20%', () => {
    const input = baseInput({ batteryVoltage: 24, motorVoltage: 12 });
    const issues = checkCompatibility(input);
    const voltageWarning = issues.find(
      (i) => i.type === 'warning' && i.category === 'voltage' && i.message.includes('differs from motor nominal')
    );
    expect(voltageWarning).toBeDefined();
  });

  it('does not warn when battery and motor voltage are within 20%', () => {
    const input = baseInput({ batteryVoltage: 12, motorVoltage: 12 });
    const issues = checkCompatibility(input);
    const voltageWarning = issues.filter((i) => i.category === 'voltage' && i.type === 'warning');
    expect(voltageWarning).toHaveLength(0);
  });

  it('returns warning when total stall current exceeds driver max', () => {
    const input = baseInput({ motorStallCurrentA: 3, motorCount: 2, driverMaxCurrentA: 4 });
    // 3 * 2 = 6A > 4A
    const issues = checkCompatibility(input);
    const currentWarning = issues.find(
      (i) => i.type === 'warning' && i.category === 'current' && i.message.includes('exceeds driver max')
    );
    expect(currentWarning).toBeDefined();
  });

  it('returns error when total stall current exceeds battery max discharge', () => {
    const input = baseInput({ motorStallCurrentA: 5, motorCount: 2, batteryMaxDischargeA: 8 });
    // 5 * 2 = 10A > 8A
    const issues = checkCompatibility(input);
    const currentError = issues.find(
      (i) => i.type === 'error' && i.category === 'current' && i.message.includes('exceeds battery max discharge')
    );
    expect(currentError).toBeDefined();
    expect(currentError?.componentIds).toContain('motor');
    expect(currentError?.componentIds).toContain('battery');
  });

  it('returns error when required digital pins exceed MCU available', () => {
    const input = baseInput({ requiredDigitalPins: 20, mcuDigitalPins: 14 });
    const issues = checkCompatibility(input);
    const pinsError = issues.find(
      (i) => i.type === 'error' && i.category === 'pins' && i.message.includes('digital pins')
    );
    expect(pinsError).toBeDefined();
  });

  it('returns error when required analog pins exceed MCU available', () => {
    const input = baseInput({ requiredAnalogPins: 8, mcuAnalogPins: 6 });
    const issues = checkCompatibility(input);
    const pinsError = issues.find(
      (i) => i.type === 'error' && i.category === 'pins' && i.message.includes('analog pins')
    );
    expect(pinsError).toBeDefined();
  });

  it('returns warning when effective motor voltage is very low after driver drop', () => {
    const input = baseInput({
      batteryVoltage: 6,
      driverVoltageDrop: 4,
      motorVoltage: 12,
    });
    // Effective = 6 - 4 = 2V, 2/12 = 16.7% of nominal (< 50%)
    const issues = checkCompatibility(input);
    const powerWarning = issues.find(
      (i) => i.type === 'warning' && i.category === 'power' && i.message.includes('Effective motor voltage')
    );
    expect(powerWarning).toBeDefined();
  });

  it('can return multiple issues at once', () => {
    const input = baseInput({
      batteryVoltage: 3,
      driverMinVoltage: 5,
      requiredDigitalPins: 20,
      mcuDigitalPins: 14,
      motorStallCurrentA: 10,
      motorCount: 2,
      batteryMaxDischargeA: 15,
    });
    const issues = checkCompatibility(input);
    expect(issues.length).toBeGreaterThanOrEqual(3);
    expect(issues.some((i) => i.category === 'voltage' && i.type === 'error')).toBe(true);
    expect(issues.some((i) => i.category === 'pins' && i.type === 'error')).toBe(true);
    expect(issues.some((i) => i.category === 'current' && i.type === 'error')).toBe(true);
  });
});
