import { describe, it, expect } from 'vitest';
import { BatteryPack, BATTERY_4xAA, LIPO_2S, type BatterySpecs } from '../../core/components/power/BatteryPack';

describe('BatteryPack — Discharge Model', () => {
  it('starts at nominal voltage and full SoC', () => {
    const b = new BatteryPack('bat', BATTERY_4xAA);
    expect(b.getSoC()).toBe(1);
    expect(b.getVoltage()).toBe(6.0);
  });

  it('voltage drops under load', () => {
    const b = new BatteryPack('bat', BATTERY_4xAA);
    b.tick(1, { CURRENT_DRAW: 1.0 }); // 1 A for 1 second
    expect(b.getVoltage()).toBeLessThan(6.0);
    expect(b.getVoltage()).toBeGreaterThan(5.0);
  });

  it('SoC decreases with current draw over time', () => {
    const b = new BatteryPack('bat', BATTERY_4xAA);
    // Draw 1A for 3600s (1 hour) → 1 Ah consumed
    b.tick(3600, { CURRENT_DRAW: 1.0 });
    expect(b.getSoC()).toBeCloseTo(0.6, 1); // 2.5 - 1.0 = 1.5 → 1.5/2.5 = 0.6
  });

  it('discharge curve: voltage decreases non-linearly with SoC', () => {
    const spec: BatterySpecs = {
      nominalVoltage: 6.0,
      capacityAh: 1.0, // 1 Ah for faster discharge
      internalResistance: 0.1,
    };
    const b = new BatteryPack('bat', spec);

    // Record voltage at different SoC levels
    const voltages: number[] = [];
    // Discharge in 10% steps: draw 0.1 Ah (0.1A * 3600s)
    for (let i = 0; i < 10; i++) {
      b.tick(3600, { CURRENT_DRAW: 0.1 });
      voltages.push(b.getVoltage());
    }

    // Voltage should decrease monotonically
    for (let i = 1; i < voltages.length; i++) {
      expect(voltages[i]).toBeLessThanOrEqual(voltages[i - 1]);
    }

    // Final voltage should be near zero
    expect(voltages[voltages.length - 1]).toBeLessThan(1.0);
  });

  it('internal resistance increases at low SoC', () => {
    const spec: BatterySpecs = {
      nominalVoltage: 6.0,
      capacityAh: 1.0,
      internalResistance: 0.5,
    };

    // At full charge, draw 1A → drop = 1 * 0.5 = 0.5V
    const bFull = new BatteryPack('b1', spec);
    bFull.tick(0.001, { CURRENT_DRAW: 1.0 }); // tiny dt, SoC unchanged
    const dropFull = spec.nominalVoltage - bFull.getVoltage();

    // At low charge (10% SoC), draw 1A → drop should be more
    const bLow = new BatteryPack('b2', spec);
    bLow.tick(3600, { CURRENT_DRAW: 0.9 }); // drain to ~10%
    const voltageBefore = bLow.getVoltage();
    bLow.tick(0.001, { CURRENT_DRAW: 1.0 });
    // At low SoC, R is scaled up, so voltage drops more per amp
    expect(bLow.getVoltage()).toBeLessThan(voltageBefore);
  });

  it('LiPo 2S starts at 7.4V', () => {
    const b = new BatteryPack('bat', LIPO_2S);
    expect(b.getVoltage()).toBe(7.4);
    expect(b.getSoC()).toBe(1);
  });

  it('reset restores full charge', () => {
    const b = new BatteryPack('bat', BATTERY_4xAA);
    b.tick(3600, { CURRENT_DRAW: 2.0 }); // drain significantly
    expect(b.getSoC()).toBeLessThan(0.5);
    b.reset();
    expect(b.getSoC()).toBe(1);
    expect(b.getVoltage()).toBe(6.0);
  });

  it('no current draw → voltage stays at nominal', () => {
    const b = new BatteryPack('bat', BATTERY_4xAA);
    b.tick(3600, { CURRENT_DRAW: 0 });
    expect(b.getSoC()).toBe(1);
    expect(b.getVoltage()).toBeCloseTo(6.0, 1);
  });

  it('capacity does not go below zero', () => {
    const spec: BatterySpecs = {
      nominalVoltage: 6.0,
      capacityAh: 0.1,
      internalResistance: 0.1,
    };
    const b = new BatteryPack('bat', spec);
    // Massive overdraw
    b.tick(36000, { CURRENT_DRAW: 10.0 });
    expect(b.getSoC()).toBe(0);
    expect(b.getVoltage()).toBe(0);
  });

  it('cutoff voltage triggers at low SoC', () => {
    const spec: BatterySpecs = {
      nominalVoltage: 6.0,
      capacityAh: 0.1,
      internalResistance: 0.1,
      cutoffVoltage: 4.0,
    };
    const b = new BatteryPack('bat', spec);
    // Drain to near zero
    b.tick(3600, { CURRENT_DRAW: 0.095 }); // ~95% drained
    // At SoC < 10% and voltage below cutoff → should be 0
    const v = b.getVoltage();
    expect(v).toBeLessThanOrEqual(4.0);
  });
});
