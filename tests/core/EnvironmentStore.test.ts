import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEnvironmentStore,
  generateEntityId,
  snapValue,
  type IdentifiedObstacle,
} from '@/lib/stores/useEnvironmentStore';
import type { FrictionZone } from '@/core/simulation/FrictionMap';
import type { Wall } from '@/core/simulation/WallWorld';
import type { TerrainZone } from '@/core/simulation/TerrainMap';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resetStore() {
  useEnvironmentStore.setState({
    activeTool: 'select',
    transformMode: 'translate',
    snapToGrid: true,
    gridSize: 0.05,
    selectedEntity: null,
    frictionZones: [],
    walls: [],
    terrainZones: [],
    obstacles: [],
  });
}

function makeFrictionZone(overrides: Partial<FrictionZone> = {}): FrictionZone {
  return {
    id: generateEntityId('fz'),
    shape: 'rect',
    x: 0,
    z: 0,
    width: 0.2,
    height: 0.2,
    friction: 0.8,
    label: 'concrete',
    priority: 1,
    ...overrides,
  };
}

function makeWall(overrides: Partial<Wall> = {}): Wall {
  return {
    id: generateEntityId('wall'),
    x1: 0,
    z1: 0,
    x2: 1,
    z2: 0,
    thickness: 0.01,
    label: 'Wall',
    ...overrides,
  };
}

function makeTerrainZone(overrides: Partial<TerrainZone> = {}): TerrainZone {
  return {
    id: generateEntityId('ramp'),
    shape: 'ramp',
    x: 0,
    z: 0,
    width: 0.2,
    depth: 0.2,
    slopeDirection: 0,
    elevationDelta: 0.05,
    label: 'Ramp',
    ...overrides,
  };
}

function makeObstacle(overrides: Partial<IdentifiedObstacle> = {}): IdentifiedObstacle {
  return {
    id: generateEntityId('obs'),
    x: 0,
    z: 0,
    radius: 0.03,
    label: 'Obstacle',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('EnvironmentStore', () => {
  beforeEach(resetStore);

  /* ---------- Tool state ---------- */

  it('defaults to select tool', () => {
    expect(useEnvironmentStore.getState().activeTool).toBe('select');
  });

  it('changes active tool', () => {
    const s = useEnvironmentStore.getState();
    s.setActiveTool('place-wall');
    expect(useEnvironmentStore.getState().activeTool).toBe('place-wall');
  });

  it('changes transform mode', () => {
    const s = useEnvironmentStore.getState();
    s.setTransformMode('rotate');
    expect(useEnvironmentStore.getState().transformMode).toBe('rotate');
  });

  it('toggles snap-to-grid', () => {
    const s = useEnvironmentStore.getState();
    s.setSnapToGrid(false);
    expect(useEnvironmentStore.getState().snapToGrid).toBe(false);
  });

  it('clamps grid size minimum', () => {
    const s = useEnvironmentStore.getState();
    s.setGridSize(0.001);
    expect(useEnvironmentStore.getState().gridSize).toBeCloseTo(0.01);
  });

  /* ---------- Friction CRUD ---------- */

  it('adds friction zone', () => {
    const zone = makeFrictionZone();
    useEnvironmentStore.getState().addFrictionZone(zone);
    expect(useEnvironmentStore.getState().frictionZones).toHaveLength(1);
    expect(useEnvironmentStore.getState().frictionZones[0].id).toBe(zone.id);
  });

  it('updates friction zone', () => {
    const zone = makeFrictionZone();
    useEnvironmentStore.getState().addFrictionZone(zone);
    useEnvironmentStore.getState().updateFrictionZone(zone.id, { friction: 0.05, label: 'ice' });
    const updated = useEnvironmentStore.getState().frictionZones[0];
    expect(updated.friction).toBe(0.05);
    expect(updated.label).toBe('ice');
  });

  it('removes friction zone and clears selection', () => {
    const zone = makeFrictionZone();
    const s = useEnvironmentStore.getState();
    s.addFrictionZone(zone);
    s.selectEntity({ type: 'friction', id: zone.id });
    expect(useEnvironmentStore.getState().selectedEntity).not.toBeNull();

    useEnvironmentStore.getState().removeFrictionZone(zone.id);
    expect(useEnvironmentStore.getState().frictionZones).toHaveLength(0);
    expect(useEnvironmentStore.getState().selectedEntity).toBeNull();
  });

  /* ---------- Wall CRUD ---------- */

  it('adds wall', () => {
    const wall = makeWall();
    useEnvironmentStore.getState().addWall(wall);
    expect(useEnvironmentStore.getState().walls).toHaveLength(1);
  });

  it('updates wall', () => {
    const wall = makeWall();
    useEnvironmentStore.getState().addWall(wall);
    useEnvironmentStore.getState().updateWall(wall.id, { x2: 2, label: 'Long wall' });
    const updated = useEnvironmentStore.getState().walls[0];
    expect(updated.x2).toBe(2);
    expect(updated.label).toBe('Long wall');
  });

  it('removes wall and clears selection', () => {
    const wall = makeWall();
    const s = useEnvironmentStore.getState();
    s.addWall(wall);
    s.selectEntity({ type: 'wall', id: wall.id });
    useEnvironmentStore.getState().removeWall(wall.id);
    expect(useEnvironmentStore.getState().walls).toHaveLength(0);
    expect(useEnvironmentStore.getState().selectedEntity).toBeNull();
  });

  /* ---------- Terrain CRUD ---------- */

  it('adds terrain zone', () => {
    const zone = makeTerrainZone();
    useEnvironmentStore.getState().addTerrainZone(zone);
    expect(useEnvironmentStore.getState().terrainZones).toHaveLength(1);
  });

  it('updates terrain zone', () => {
    const zone = makeTerrainZone();
    useEnvironmentStore.getState().addTerrainZone(zone);
    useEnvironmentStore.getState().updateTerrainZone(zone.id, { elevationDelta: 0.1 });
    expect(useEnvironmentStore.getState().terrainZones[0].elevationDelta).toBe(0.1);
  });

  it('removes terrain zone', () => {
    const zone = makeTerrainZone();
    useEnvironmentStore.getState().addTerrainZone(zone);
    useEnvironmentStore.getState().removeTerrainZone(zone.id);
    expect(useEnvironmentStore.getState().terrainZones).toHaveLength(0);
  });

  /* ---------- Obstacle CRUD ---------- */

  it('adds obstacle', () => {
    const obs = makeObstacle();
    useEnvironmentStore.getState().addObstacle(obs);
    expect(useEnvironmentStore.getState().obstacles).toHaveLength(1);
  });

  it('updates obstacle', () => {
    const obs = makeObstacle();
    useEnvironmentStore.getState().addObstacle(obs);
    useEnvironmentStore.getState().updateObstacle(obs.id, { radius: 0.05 });
    expect(useEnvironmentStore.getState().obstacles[0].radius).toBe(0.05);
  });

  it('removes obstacle', () => {
    const obs = makeObstacle();
    useEnvironmentStore.getState().addObstacle(obs);
    useEnvironmentStore.getState().removeObstacle(obs.id);
    expect(useEnvironmentStore.getState().obstacles).toHaveLength(0);
  });

  /* ---------- Bulk operations ---------- */

  it('clearAll removes everything', () => {
    const s = useEnvironmentStore.getState();
    s.addFrictionZone(makeFrictionZone());
    s.addWall(makeWall());
    s.addTerrainZone(makeTerrainZone());
    s.addObstacle(makeObstacle());
    s.selectEntity({ type: 'wall', id: useEnvironmentStore.getState().walls[0].id });

    useEnvironmentStore.getState().clearAll();
    const state = useEnvironmentStore.getState();
    expect(state.frictionZones).toHaveLength(0);
    expect(state.walls).toHaveLength(0);
    expect(state.terrainZones).toHaveLength(0);
    expect(state.obstacles).toHaveLength(0);
    expect(state.selectedEntity).toBeNull();
  });

  it('deleteSelected removes the selected entity', () => {
    const wall = makeWall();
    const s = useEnvironmentStore.getState();
    s.addWall(wall);
    s.selectEntity({ type: 'wall', id: wall.id });
    useEnvironmentStore.getState().deleteSelected();
    expect(useEnvironmentStore.getState().walls).toHaveLength(0);
    expect(useEnvironmentStore.getState().selectedEntity).toBeNull();
  });

  it('deleteSelected is no-op when nothing selected', () => {
    const wall = makeWall();
    useEnvironmentStore.getState().addWall(wall);
    useEnvironmentStore.getState().deleteSelected();
    expect(useEnvironmentStore.getState().walls).toHaveLength(1);
  });

  it('duplicateSelected duplicates friction zone with offset', () => {
    const zone = makeFrictionZone({ x: 0.3 });
    const s = useEnvironmentStore.getState();
    s.addFrictionZone(zone);
    s.selectEntity({ type: 'friction', id: zone.id });
    useEnvironmentStore.getState().duplicateSelected();

    const zones = useEnvironmentStore.getState().frictionZones;
    expect(zones).toHaveLength(2);
    expect(zones[1].id).not.toBe(zone.id);
    expect(zones[1].x).toBeCloseTo(0.4); // offset +0.1
    expect(zones[1].label).toContain('(copy)');
    expect(useEnvironmentStore.getState().selectedEntity?.id).toBe(zones[1].id);
  });

  it('duplicateSelected duplicates wall', () => {
    const wall = makeWall({ z1: 0, z2: 0.5 });
    const s = useEnvironmentStore.getState();
    s.addWall(wall);
    s.selectEntity({ type: 'wall', id: wall.id });
    useEnvironmentStore.getState().duplicateSelected();

    const walls = useEnvironmentStore.getState().walls;
    expect(walls).toHaveLength(2);
    expect(walls[1].z1).toBeCloseTo(0.1); // offset
  });

  it('duplicateSelected duplicates obstacle', () => {
    const obs = makeObstacle({ x: 0.5 });
    const s = useEnvironmentStore.getState();
    s.addObstacle(obs);
    s.selectEntity({ type: 'obstacle', id: obs.id });
    useEnvironmentStore.getState().duplicateSelected();

    expect(useEnvironmentStore.getState().obstacles).toHaveLength(2);
    expect(useEnvironmentStore.getState().obstacles[1].x).toBeCloseTo(0.6);
  });

  /* ---------- Selection ---------- */

  it('select / deselect entity', () => {
    const zone = makeFrictionZone();
    useEnvironmentStore.getState().addFrictionZone(zone);
    useEnvironmentStore.getState().selectEntity({ type: 'friction', id: zone.id });
    expect(useEnvironmentStore.getState().selectedEntity).toEqual({ type: 'friction', id: zone.id });

    useEnvironmentStore.getState().selectEntity(null);
    expect(useEnvironmentStore.getState().selectedEntity).toBeNull();
  });

  /* ---------- Helpers ---------- */

  it('generateEntityId produces unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(generateEntityId('test'));
    expect(ids.size).toBe(50);
  });

  it('snapValue snaps correctly', () => {
    expect(snapValue(0.123, 0.05)).toBeCloseTo(0.1);
    expect(snapValue(0.126, 0.05)).toBeCloseTo(0.15);
    expect(snapValue(0.5, 0.1)).toBeCloseTo(0.5);
    expect(snapValue(-0.07, 0.05)).toBeCloseTo(-0.05);
  });

  /* ---------- Multiple entity types coexist ---------- */

  it('CRUD on different entity types are independent', () => {
    const s = useEnvironmentStore.getState();
    const fz = makeFrictionZone();
    const wall = makeWall();
    const terrain = makeTerrainZone();
    const obs = makeObstacle();

    s.addFrictionZone(fz);
    s.addWall(wall);
    s.addTerrainZone(terrain);
    s.addObstacle(obs);

    expect(useEnvironmentStore.getState().frictionZones).toHaveLength(1);
    expect(useEnvironmentStore.getState().walls).toHaveLength(1);
    expect(useEnvironmentStore.getState().terrainZones).toHaveLength(1);
    expect(useEnvironmentStore.getState().obstacles).toHaveLength(1);

    useEnvironmentStore.getState().removeWall(wall.id);
    expect(useEnvironmentStore.getState().walls).toHaveLength(0);
    expect(useEnvironmentStore.getState().frictionZones).toHaveLength(1);
    expect(useEnvironmentStore.getState().obstacles).toHaveLength(1);
  });

  /* ---------- Update preserves ID ---------- */

  it('update does not change entity ID', () => {
    const zone = makeFrictionZone();
    useEnvironmentStore.getState().addFrictionZone(zone);
    useEnvironmentStore.getState().updateFrictionZone(zone.id, { id: 'hacked', friction: 0.1 });
    // ID should remain the original (patch id is overridden)
    expect(useEnvironmentStore.getState().frictionZones[0].id).toBe(zone.id);
    expect(useEnvironmentStore.getState().frictionZones[0].friction).toBe(0.1);
  });
});
