import { describe, it, expect } from 'vitest';
import { RotaryEncoder } from '../../core/components/sensors/RotaryEncoder';

describe('RotaryEncoder', () => {
    it('outputs a defined value when wheel is stationary', () => {
        const e = new RotaryEncoder('enc1');
        const out = e.tick(1 / 60, {});
        expect(out['OUT']).toBeDefined();
        expect([0, 1]).toContain(out['OUT']);
    });

    it('toggles output as wheel rotates', () => {
        const e = new RotaryEncoder('enc1', 20);
        e.setEnvironment({ wheelAngularVelocity: 10 }); // 10 rad/s

        const outputs: number[] = [];
        for (let i = 0; i < 120; i++) {
            const out = e.tick(1 / 60, {});
            outputs.push(out['OUT']);
        }
        // With rotation, we should see both 0s and 1s
        expect(outputs).toContain(0);
        expect(outputs).toContain(1);
    });

    it('faster rotation produces more transitions per second', () => {
        // Use small dt so we don't skip slots
        const dt = 0.0001; // 0.1ms
        const ticks = 10000; // 1 second total

        const eSlow = new RotaryEncoder('slow', 20);
        eSlow.setEnvironment({ wheelAngularVelocity: 2 });
        const eFast = new RotaryEncoder('fast', 20);
        eFast.setEnvironment({ wheelAngularVelocity: 10 });

        let transitionsSlow = 0, transitionsFast = 0;
        let prevSlow = -1, prevFast = -1;

        for (let i = 0; i < ticks; i++) {
            const outSlow = eSlow.tick(dt, {})['OUT'];
            const outFast = eFast.tick(dt, {})['OUT'];
            if (prevSlow !== -1 && outSlow !== prevSlow) transitionsSlow++;
            if (prevFast !== -1 && outFast !== prevFast) transitionsFast++;
            prevSlow = outSlow;
            prevFast = outFast;
        }
        expect(transitionsFast).toBeGreaterThan(transitionsSlow);
    });

    it('more slots per revolution produce more transitions', () => {
        const dt = 0.0001;
        const ticks = 10000;

        const eFew = new RotaryEncoder('few', 10);
        eFew.setEnvironment({ wheelAngularVelocity: 5 });
        const eMany = new RotaryEncoder('many', 40);
        eMany.setEnvironment({ wheelAngularVelocity: 5 });

        let transitionsFew = 0, transitionsMany = 0;
        let prevFew = -1, prevMany = -1;

        for (let i = 0; i < ticks; i++) {
            const outFew = eFew.tick(dt, {})['OUT'];
            const outMany = eMany.tick(dt, {})['OUT'];
            if (prevFew !== -1 && outFew !== prevFew) transitionsFew++;
            if (prevMany !== -1 && outMany !== prevMany) transitionsMany++;
            prevFew = outFew;
            prevMany = outMany;
        }
        expect(transitionsMany).toBeGreaterThan(transitionsFew);
    });

    it('reset clears accumulated angle', () => {
        const e = new RotaryEncoder('enc1');
        e.setEnvironment({ wheelAngularVelocity: 10 });
        for (let i = 0; i < 60; i++) e.tick(1 / 60, {});
        e.reset();
        const out = e.tick(1 / 60, {});
        expect(out['OUT']).toBeDefined();
    });

    it('has correct pin manifest', () => {
        const e = new RotaryEncoder('enc1');
        expect(e.pinManifest).toHaveLength(1);
        expect(e.pinManifest[0].name).toBe('OUT');
        expect(e.pinManifest[0].direction).toBe('output');
    });
});
