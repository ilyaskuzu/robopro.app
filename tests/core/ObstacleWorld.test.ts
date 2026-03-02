import { describe, it, expect } from 'vitest';
import { ObstacleWorld } from '../../core/simulation/ObstacleWorld';

describe('ObstacleWorld', () => {
    it('returns maxDist when no obstacles', () => {
        const w = new ObstacleWorld();
        expect(w.raycast(0, 0, 0, 4.0)).toBe(4.0);
    });

    it('detects obstacle directly ahead', () => {
        const w = new ObstacleWorld();
        w.addObstacle({ x: 2, z: 0, radius: 0.1 });
        const dist = w.raycast(0, 0, 0, 4.0); // ray along +X
        expect(dist).toBeGreaterThan(1.8);
        expect(dist).toBeLessThan(2.0);
    });

    it('misses obstacle perpendicular to ray', () => {
        const w = new ObstacleWorld();
        w.addObstacle({ x: 0, z: 2, radius: 0.1 }); // obstacle at (0, 2)
        const dist = w.raycast(0, 0, 0, 4.0); // ray along +X
        expect(dist).toBe(4.0);
    });

    it('returns closest obstacle', () => {
        const w = new ObstacleWorld();
        w.addObstacle({ x: 3, z: 0, radius: 0.1 });
        w.addObstacle({ x: 1, z: 0, radius: 0.1 });
        const dist = w.raycast(0, 0, 0, 4.0);
        expect(dist).toBeGreaterThan(0.8);
        expect(dist).toBeLessThan(1.0);
    });

    it('removeObstacle works', () => {
        const w = new ObstacleWorld();
        w.addObstacle({ x: 1, z: 0, radius: 0.1 });
        w.removeObstacle(0);
        expect(w.getObstacles()).toHaveLength(0);
        expect(w.raycast(0, 0, 0, 4.0)).toBe(4.0);
    });

    it('clear removes all obstacles', () => {
        const w = new ObstacleWorld();
        w.addObstacle({ x: 1, z: 0, radius: 0.1 });
        w.addObstacle({ x: 2, z: 0, radius: 0.1 });
        w.clear();
        expect(w.getObstacles()).toHaveLength(0);
    });
});
