import { describe, it, expect, beforeEach } from 'vitest';
import { FrictionMap, FRICTION_MATERIALS } from '../../core/simulation/FrictionMap';
import type { FrictionZone } from '../../core/simulation/FrictionMap';

describe('FrictionMap', () => {
  let map: FrictionMap;

  beforeEach(() => {
    map = new FrictionMap(0.8);
  });

  it('returns default friction when no zones exist', () => {
    expect(map.getFriction(0, 0)).toBe(0.8);
  });

  it('returns zone friction when point is inside a rect zone', () => {
    const zone: FrictionZone = {
      id: 'ice-patch',
      shape: 'rect',
      x: 5,
      z: 5,
      width: 4,
      height: 4,
      friction: 0.05,
      label: 'Ice Patch',
      priority: 1,
    };
    map.addZone(zone);
    expect(map.getFriction(5, 5)).toBe(0.05);
    expect(map.getFriction(3.5, 3.5)).toBe(0.05);
  });

  it('returns default for points outside rect zone', () => {
    const zone: FrictionZone = {
      id: 'ice',
      shape: 'rect',
      x: 0,
      z: 0,
      width: 2,
      height: 2,
      friction: 0.05,
      label: 'Ice',
      priority: 1,
    };
    map.addZone(zone);
    expect(map.getFriction(10, 10)).toBe(0.8);
  });

  it('returns zone friction for circle zone', () => {
    const zone: FrictionZone = {
      id: 'rubber',
      shape: 'circle',
      x: 0,
      z: 0,
      radius: 3,
      friction: 1.5,
      label: 'Rubber Mat',
      priority: 1,
    };
    map.addZone(zone);
    expect(map.getFriction(0, 0)).toBe(1.5);
    expect(map.getFriction(2, 0)).toBe(1.5);
    expect(map.getFriction(10, 10)).toBe(0.8);
  });

  it('higher-priority zone overrides lower', () => {
    map.addZone({
      id: 'low',
      shape: 'rect',
      x: 0, z: 0,
      width: 10, height: 10,
      friction: 0.4,
      label: 'Wood',
      priority: 1,
    });
    map.addZone({
      id: 'high',
      shape: 'rect',
      x: 0, z: 0,
      width: 2, height: 2,
      friction: 1.5,
      label: 'Rubber',
      priority: 5,
    });
    // Inside both → high priority wins
    expect(map.getFriction(0, 0)).toBe(1.5);
    // Inside only low
    expect(map.getFriction(4, 4)).toBe(0.4);
  });

  it('removeZone removes by id', () => {
    map.addZone({
      id: 'z1',
      shape: 'rect',
      x: 0, z: 0,
      width: 10, height: 10,
      friction: 0.1,
      label: 'Z1',
      priority: 1,
    });
    map.removeZone('z1');
    expect(map.getFriction(0, 0)).toBe(0.8);
    expect(map.getZones()).toHaveLength(0);
  });

  it('clear removes all zones', () => {
    map.addZone({
      id: 'a', shape: 'rect', x: 0, z: 0, width: 1, height: 1,
      friction: 0.1, label: 'A', priority: 1,
    });
    map.clear();
    expect(map.getZones()).toHaveLength(0);
  });

  it('FRICTION_MATERIALS contains expected presets', () => {
    expect(FRICTION_MATERIALS.concrete).toBe(0.8);
    expect(FRICTION_MATERIALS.ice).toBe(0.05);
    expect(FRICTION_MATERIALS.carpet).toBe(1.2);
    expect(FRICTION_MATERIALS['rubber-mat']).toBe(1.5);
  });

  it('custom default friction is used', () => {
    const custom = new FrictionMap(1.0);
    expect(custom.getFriction(0, 0)).toBe(1.0);
  });
});
