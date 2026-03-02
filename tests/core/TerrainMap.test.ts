import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainMap } from '../../core/simulation/TerrainMap';
import type { TerrainZone } from '../../core/simulation/TerrainMap';

describe('TerrainMap', () => {
  let terrain: TerrainMap;

  beforeEach(() => {
    terrain = new TerrainMap(0);
  });

  it('returns base elevation when no zones', () => {
    expect(terrain.getElevation(0, 0)).toBe(0);
  });

  it('returns elevated value inside a ramp zone', () => {
    const ramp: TerrainZone = {
      id: 'ramp1',
      shape: 'ramp',
      x: 0, z: 0,
      width: 10, depth: 10,
      slopeDirection: 0, // slope along +X
      elevationDelta: 2,
      label: 'X Ramp',
    };
    terrain.addZone(ramp);
    // At center, t=0 → elevation = 2 * 0.5 = 1
    expect(terrain.getElevation(0, 0)).toBeCloseTo(1, 1);
    // At right edge, t=0.5 → elevation = 2 * 1 = 2
    expect(terrain.getElevation(5, 0)).toBeCloseTo(2, 1);
  });

  it('returns base elevation outside ramp zone', () => {
    terrain.addZone({
      id: 'r', shape: 'ramp',
      x: 0, z: 0, width: 2, depth: 2,
      slopeDirection: 0, elevationDelta: 1,
      label: 'Small',
    });
    expect(terrain.getElevation(100, 100)).toBe(0);
  });

  it('sample returns slope angle and gravity component', () => {
    terrain.addZone({
      id: 'ramp',
      shape: 'ramp',
      x: 0, z: 0,
      width: 10, depth: 10,
      slopeDirection: 0,
      elevationDelta: 2,
      label: 'Hill',
    });

    // Heading = 0 (along +X) → climbing the ramp
    const sample = terrain.sample(0, 0, 0);
    expect(sample.slopeAngle).not.toBe(0);
    // Going uphill → gravity component should be negative (deceleration)
    expect(sample.gravityComponent).toBeLessThan(0);
  });

  it('flat terrain gives zero slope', () => {
    const sample = terrain.sample(0, 0, 0);
    expect(sample.slopeAngle).toBe(0);
    expect(sample.gravityComponent).toBeCloseTo(0, 10);
    expect(sample.elevation).toBe(0);
  });

  it('removeZone removes by id', () => {
    terrain.addZone({
      id: 'r1', shape: 'ramp',
      x: 0, z: 0, width: 5, depth: 5,
      slopeDirection: 0, elevationDelta: 1,
      label: 'R1',
    });
    terrain.removeZone('r1');
    expect(terrain.getZones()).toHaveLength(0);
    expect(terrain.getElevation(0, 0)).toBe(0);
  });

  it('clear removes all zones', () => {
    terrain.addZone({
      id: 'a', shape: 'ramp',
      x: 0, z: 0, width: 1, depth: 1,
      slopeDirection: 0, elevationDelta: 1,
      label: 'A',
    });
    terrain.clear();
    expect(terrain.getZones()).toHaveLength(0);
  });

  it('custom base elevation is used', () => {
    const elevated = new TerrainMap(10);
    expect(elevated.getElevation(0, 0)).toBe(10);
  });

  it('going downhill gives positive gravity component', () => {
    terrain.addZone({
      id: 'ramp',
      shape: 'ramp',
      x: 0, z: 0,
      width: 10, depth: 10,
      slopeDirection: 0,
      elevationDelta: 2,
      label: 'Hill',
    });

    // Heading = π (along -X) → going downhill
    const sample = terrain.sample(0, 0, Math.PI);
    expect(sample.gravityComponent).toBeGreaterThan(0);
  });
});
