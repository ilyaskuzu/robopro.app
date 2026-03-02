import { describe, it, expect } from 'vitest';
import { IrLineSensor } from '../../core/components/sensors/IrLineSensor';

describe('IrLineSensor', () => {
    it('outputs 1 (no line) when reflectance is below threshold', () => {
        const s = new IrLineSensor('ir1');
        s.setEnvironment({ surfaceReflectance: 0.3 }); // below default 0.5
        const out = s.tick(1 / 60, {});
        expect(out['OUT']).toBe(1); // inverted: low reflectance = no line detected → 1
    });

    it('outputs 0 (line detected) when reflectance is above threshold', () => {
        const s = new IrLineSensor('ir1');
        s.setEnvironment({ surfaceReflectance: 0.8 }); // above default 0.5
        const out = s.tick(1 / 60, {});
        expect(out['OUT']).toBe(0); // line detected → 0
    });

    it('respects custom threshold', () => {
        const s = new IrLineSensor('ir1', 0.7);
        s.setEnvironment({ surfaceReflectance: 0.6 }); // below 0.7
        expect(s.tick(1 / 60, {})['OUT']).toBe(1); // no line
        s.setEnvironment({ surfaceReflectance: 0.8 }); // above 0.7
        expect(s.tick(1 / 60, {})['OUT']).toBe(0); // line
    });

    it('clamps reflectance to [0, 1]', () => {
        const s = new IrLineSensor('ir1');
        s.setEnvironment({ surfaceReflectance: -1 });
        expect(s.tick(1 / 60, {})['OUT']).toBe(1); // clamped to 0, below threshold
        s.setEnvironment({ surfaceReflectance: 5 });
        expect(s.tick(1 / 60, {})['OUT']).toBe(0); // clamped to 1, above threshold
    });

    it('reset clears reflectance', () => {
        const s = new IrLineSensor('ir1');
        s.setEnvironment({ surfaceReflectance: 0.9 });
        expect(s.tick(1 / 60, {})['OUT']).toBe(0);
        s.reset();
        expect(s.tick(1 / 60, {})['OUT']).toBe(1); // reflectance reset to 0
    });

    it('has correct pin manifest', () => {
        const s = new IrLineSensor('ir1');
        expect(s.pinManifest).toHaveLength(1);
        expect(s.pinManifest[0].name).toBe('OUT');
        expect(s.pinManifest[0].direction).toBe('output');
    });
});
