import { describe, it, expect, beforeEach } from 'vitest';
import { WallWorld } from '../../core/simulation/WallWorld';
import type { Wall } from '../../core/simulation/WallWorld';

describe('WallWorld', () => {
  let world: WallWorld;

  beforeEach(() => {
    world = new WallWorld();
  });

  it('no collision when no walls', () => {
    const result = world.checkCollision(0, 0, 0.1);
    expect(result.collided).toBe(false);
    expect(result.distance).toBe(Infinity);
  });

  it('detects collision with a wall segment', () => {
    const wall: Wall = {
      id: 'w1',
      x1: -5, z1: 1,
      x2: 5, z2: 1,
      thickness: 0.05,
      label: 'North Wall',
    };
    world.addWall(wall);

    // Circle at (0, 0.9) with radius 0.2 — close to wall at z=1
    const result = world.checkCollision(0, 0.9, 0.2);
    expect(result.collided).toBe(true);
    expect(result.nearestZ).toBeCloseTo(1, 5);
  });

  it('no collision when circle is far from wall', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: 10, x2: 5, z2: 10,
      thickness: 0.05, label: 'Far Wall',
    });
    const result = world.checkCollision(0, 0, 0.1);
    expect(result.collided).toBe(false);
  });

  it('raycast hits a wall', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: 5, x2: 5, z2: 5,
      thickness: 0.05, label: 'Wall',
    });
    // Ray from origin pointing in +Z direction
    const hit = world.raycast(0, 0, 0, 1);
    expect(hit).not.toBeNull();
    expect(hit!.wallId).toBe('w1');
    expect(hit!.distance).toBeCloseTo(5, 1);
    expect(hit!.hitZ).toBeCloseTo(5, 1);
  });

  it('raycast misses when no wall in path', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: -5, x2: 5, z2: -5,
      thickness: 0.05, label: 'Behind',
    });
    // Ray from origin pointing in +Z direction
    const hit = world.raycast(0, 0, 0, 1);
    expect(hit).toBeNull();
  });

  it('raycast respects maxDistance', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: 100, x2: 5, z2: 100,
      thickness: 0.05, label: 'Distant',
    });
    const hit = world.raycast(0, 0, 0, 1, 50);
    expect(hit).toBeNull();
  });

  it('removeWall removes by id', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: 2, x2: 5, z2: 2,
      thickness: 0.05, label: 'Wall',
    });
    world.removeWall('w1');
    expect(world.getWalls()).toHaveLength(0);
  });

  it('clear removes all walls', () => {
    world.addWall({
      id: 'a', x1: 0, z1: 0, x2: 1, z2: 0,
      thickness: 0.05, label: 'A',
    });
    world.addWall({
      id: 'b', x1: 0, z1: 5, x2: 1, z2: 5,
      thickness: 0.05, label: 'B',
    });
    world.clear();
    expect(world.getWalls()).toHaveLength(0);
  });

  it('collision normal points away from wall', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: 0, x2: 5, z2: 0,
      thickness: 0.05, label: 'Wall at z=0',
    });
    // Circle above wall
    const result = world.checkCollision(0, 0.1, 0.2);
    expect(result.collided).toBe(true);
    // Normal should point in +Z direction (away from wall toward circle)
    expect(result.normalZ).toBeGreaterThan(0);
  });

  it('raycast returns null for zero-length direction', () => {
    world.addWall({
      id: 'w1', x1: -5, z1: 5, x2: 5, z2: 5,
      thickness: 0.05, label: 'Wall',
    });
    const hit = world.raycast(0, 0, 0, 0);
    expect(hit).toBeNull();
  });
});
