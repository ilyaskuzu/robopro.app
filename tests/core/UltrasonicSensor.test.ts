import { describe, it, expect } from 'vitest';
import { UltrasonicSensor } from '../../core/components/sensors/UltrasonicSensor';

describe('UltrasonicSensor', () => {
    it('returns ECHO=0 with no trigger', () => {
        const s = new UltrasonicSensor('us1');
        const out = s.tick(1 / 60, { TRIG: 0 });
        expect(out['ECHO']).toBe(0);
    });

    it('produces echo pulse after trigger', () => {
        const s = new UltrasonicSensor('us1');
        s.setEnvironment({ distanceToObstacle: 0.1 }); // 10cm — short distance for fast echo

        // Send trigger high to initiate
        s.tick(0.00001, { TRIG: 1 });

        // Run ticks to observe echo
        let echoSeen = false;
        for (let i = 0; i < 5000; i++) {
            const out = s.tick(0.000001, { TRIG: 0 }); // 1µs ticks
            if (out['ECHO'] === 1) { echoSeen = true; break; }
        }
        expect(echoSeen).toBe(true);
    });

    it('echo duration scales with distance', () => {
        // Near sensor: 10cm
        const sNear = new UltrasonicSensor('near');
        sNear.setEnvironment({ distanceToObstacle: 0.1 });
        sNear.tick(0.00001, { TRIG: 1 }); // trigger

        // Far sensor: 1m
        const sFar = new UltrasonicSensor('far');
        sFar.setEnvironment({ distanceToObstacle: 1.0 });
        sFar.tick(0.00001, { TRIG: 1 }); // trigger

        let echoNear = 0, echoFar = 0;
        const dt = 0.000001; // 1µs
        for (let i = 0; i < 100000; i++) {
            // Keep TRIG low to not re-trigger, just observe echo
            const oNear = sNear.tick(dt, { TRIG: 0 });
            const oFar = sFar.tick(dt, { TRIG: 0 });
            if (oNear['ECHO'] === 1) echoNear++;
            if (oFar['ECHO'] === 1) echoFar++;
        }
        // Both should have seen echo pulses, far should be longer
        expect(echoNear).toBeGreaterThan(0);
        expect(echoFar).toBeGreaterThan(0);
        expect(echoFar).toBeGreaterThan(echoNear);
    });

    it('clamps distance to valid range', () => {
        const s = new UltrasonicSensor('us1');
        s.setEnvironment({ distanceToObstacle: -5 });
        s.setEnvironment({ distanceToObstacle: 100 });
        s.tick(1 / 60, { TRIG: 1 });
        s.tick(1 / 60, { TRIG: 0 });
    });

    it('reset clears state', () => {
        const s = new UltrasonicSensor('us1');
        s.setEnvironment({ distanceToObstacle: 1.0 });
        s.tick(0.00001, { TRIG: 1 });
        s.reset();
        const out = s.tick(1 / 60, { TRIG: 0 });
        expect(out['ECHO']).toBe(0);
    });

    it('has correct pin manifest', () => {
        const s = new UltrasonicSensor('us1');
        expect(s.pinManifest).toHaveLength(2);
        expect(s.pinManifest.find(p => p.name === 'TRIG')?.direction).toBe('input');
        expect(s.pinManifest.find(p => p.name === 'ECHO')?.direction).toBe('output');
    });
});
