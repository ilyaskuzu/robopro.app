import { describe, it, expect } from 'vitest';
import { LineTrack } from '../../core/simulation/LineTrack';

describe('LineTrack', () => {
    it('returns 1.0 (off-line) when no track defined', () => {
        const t = new LineTrack();
        expect(t.getReflectance(0, 0)).toBe(1.0);
    });

    it('returns 0.0 (on line) for point on track center', () => {
        const t = new LineTrack(0.02);
        t.setPoints([{ x: 0, z: 0 }, { x: 1, z: 0 }]);
        expect(t.getReflectance(0.5, 0)).toBe(0.0); // center of line
    });

    it('returns 1.0 for point far from track', () => {
        const t = new LineTrack(0.02);
        t.setPoints([{ x: 0, z: 0 }, { x: 1, z: 0 }]);
        expect(t.getReflectance(0.5, 1.0)).toBe(1.0); // 1m away
    });

    it('returns 0.0 for point within line width', () => {
        const t = new LineTrack(0.02); // 2cm wide
        t.setPoints([{ x: 0, z: 0 }, { x: 1, z: 0 }]);
        expect(t.getReflectance(0.5, 0.005)).toBe(0.0); // 5mm from center, within halfWidth of 10mm
    });

    it('returns 1.0 for point just outside line width', () => {
        const t = new LineTrack(0.02); // 2cm wide, halfWidth = 1cm
        t.setPoints([{ x: 0, z: 0 }, { x: 1, z: 0 }]);
        expect(t.getReflectance(0.5, 0.015)).toBe(1.0); // 15mm from center, outside halfWidth
    });

    it('handles curved tracks (polyline)', () => {
        const t = new LineTrack(0.02);
        t.setPoints([{ x: 0, z: 0 }, { x: 0.5, z: 0 }, { x: 0.5, z: 0.5 }]);
        expect(t.getReflectance(0.25, 0)).toBe(0.0);   // on first segment
        expect(t.getReflectance(0.5, 0.25)).toBe(0.0);  // on second segment
        expect(t.getReflectance(0.25, 0.25)).toBe(1.0);  // off track
    });

    it('clear removes all points', () => {
        const t = new LineTrack(0.02);
        t.setPoints([{ x: 0, z: 0 }, { x: 1, z: 0 }]);
        t.clear();
        expect(t.getReflectance(0.5, 0)).toBe(1.0);
    });
});
