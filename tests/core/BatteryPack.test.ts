import { describe, it, expect } from 'vitest';
import { BatteryPack, BATTERY_4xAA, LIPO_2S } from '../../core/components/power/BatteryPack';

describe('BatteryPack', () => {
    it('outputs nominal voltage with zero current draw', () => {
        const b = new BatteryPack('bat', BATTERY_4xAA);
        const out = b.tick(1 / 60, { CURRENT_DRAW: 0 });
        expect(out['V_OUT']).toBeCloseTo(BATTERY_4xAA.nominalVoltage, 3);
    });

    it('voltage drops under load (internal resistance)', () => {
        const b = new BatteryPack('bat', BATTERY_4xAA);
        const out = b.tick(1 / 60, { CURRENT_DRAW: 1 }); // 1 A draw
        // V = nominal - I * R_internal = 6.0 - 1 * 0.4 = 5.6
        expect(out['V_OUT']).toBeCloseTo(5.6, 2);
    });

    it('depletes charge over time', () => {
        const b = new BatteryPack('bat', BATTERY_4xAA);
        // Draw 2500 Ah over enough ticks to deplete
        for (let i = 0; i < 100; i++) {
            b.tick(3600, { CURRENT_DRAW: 25 }); // aggressive depletion
        }
        const out = b.tick(1 / 60, { CURRENT_DRAW: 0 });
        // Should be heavily depleted (SOC drops below 20%)
        expect(out['V_OUT']).toBeLessThan(BATTERY_4xAA.nominalVoltage);
    });

    it('voltage never goes negative', () => {
        const b = new BatteryPack('bat', BATTERY_4xAA);
        for (let i = 0; i < 1000; i++) {
            b.tick(3600, { CURRENT_DRAW: 100 });
        }
        const out = b.tick(1, { CURRENT_DRAW: 100 });
        expect(out['V_OUT']).toBeGreaterThanOrEqual(0);
    });

    it('reset restores full charge and nominal voltage', () => {
        const b = new BatteryPack('bat', BATTERY_4xAA);
        // Deplete partially
        for (let i = 0; i < 10; i++) {
            b.tick(3600, { CURRENT_DRAW: 1 });
        }
        b.reset();
        const out = b.tick(1 / 60, { CURRENT_DRAW: 0 });
        expect(out['V_OUT']).toBeCloseTo(BATTERY_4xAA.nominalVoltage, 3);
    });

    it('works with LiPo specs', () => {
        const b = new BatteryPack('lipo', LIPO_2S);
        const out = b.tick(1 / 60, { CURRENT_DRAW: 0 });
        expect(out['V_OUT']).toBeCloseTo(LIPO_2S.nominalVoltage, 3);
    });

    it('has correct pin manifest', () => {
        const b = new BatteryPack('bat', BATTERY_4xAA);
        expect(b.pinManifest).toHaveLength(2);
        const names = b.pinManifest.map(p => p.name);
        expect(names).toContain('CURRENT_DRAW');
        expect(names).toContain('V_OUT');
    });
});
