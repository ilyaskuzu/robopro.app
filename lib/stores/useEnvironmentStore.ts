import { create } from 'zustand';
import type { FrictionZone } from '@/core/simulation/FrictionMap';
import type { Wall } from '@/core/simulation/WallWorld';
import type { TerrainZone } from '@/core/simulation/TerrainMap';
import type { Obstacle } from '@/core/simulation/ObstacleWorld';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EnvironmentTool =
  | 'select'
  | 'place-wall'
  | 'place-friction'
  | 'place-ramp'
  | 'place-obstacle';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export type EntityType = 'friction' | 'wall' | 'ramp' | 'obstacle';

export interface EntityRef {
  type: EntityType;
  id: string;
}

/** Obstacle with string id for environment editor (core Obstacle has no id). */
export interface IdentifiedObstacle extends Obstacle {
  readonly id: string;
  readonly label: string;
}

export interface EnvironmentStoreState {
  /* ---- Tool state ---- */
  activeTool: EnvironmentTool;
  transformMode: TransformMode;
  snapToGrid: boolean;
  gridSize: number;

  /* ---- Selection ---- */
  selectedEntity: EntityRef | null;

  /* ---- Entity collections ---- */
  frictionZones: FrictionZone[];
  walls: Wall[];
  terrainZones: TerrainZone[];
  obstacles: IdentifiedObstacle[];

  /* ---- Actions ---- */
  setActiveTool: (tool: EnvironmentTool) => void;
  setTransformMode: (mode: TransformMode) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  selectEntity: (ref: EntityRef | null) => void;

  /* ---- Friction CRUD ---- */
  addFrictionZone: (zone: FrictionZone) => void;
  updateFrictionZone: (id: string, patch: Partial<FrictionZone>) => void;
  removeFrictionZone: (id: string) => void;

  /* ---- Wall CRUD ---- */
  addWall: (wall: Wall) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  removeWall: (id: string) => void;

  /* ---- Terrain CRUD ---- */
  addTerrainZone: (zone: TerrainZone) => void;
  updateTerrainZone: (id: string, patch: Partial<TerrainZone>) => void;
  removeTerrainZone: (id: string) => void;

  /* ---- Obstacle CRUD ---- */
  addObstacle: (obs: IdentifiedObstacle) => void;
  updateObstacle: (id: string, patch: Partial<IdentifiedObstacle>) => void;
  removeObstacle: (id: string) => void;

  /* ---- Bulk ---- */
  clearAll: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let nextId = 1;
export function generateEntityId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

/** Snap a value to nearest grid increment. */
export function snapValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useEnvironmentStore = create<EnvironmentStoreState>((set, get) => ({
  activeTool: 'select',
  transformMode: 'translate',
  snapToGrid: true,
  gridSize: 0.05,
  selectedEntity: null,

  frictionZones: [],
  walls: [],
  terrainZones: [],
  obstacles: [],

  /* ---- Tool ---- */
  setActiveTool: (tool) => set({ activeTool: tool }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setGridSize: (size) => set({ gridSize: Math.max(0.01, size) }),
  selectEntity: (ref) => set({ selectedEntity: ref }),

  /* ---- Friction CRUD ---- */
  addFrictionZone: (zone) =>
    set((s) => ({ frictionZones: [...s.frictionZones, zone] })),

  updateFrictionZone: (id, patch) =>
    set((s) => ({
      frictionZones: s.frictionZones.map((z) =>
        z.id === id ? { ...z, ...patch, id } : z,
      ),
    })),

  removeFrictionZone: (id) =>
    set((s) => ({
      frictionZones: s.frictionZones.filter((z) => z.id !== id),
      selectedEntity:
        s.selectedEntity?.type === 'friction' && s.selectedEntity.id === id
          ? null
          : s.selectedEntity,
    })),

  /* ---- Wall CRUD ---- */
  addWall: (wall) => set((s) => ({ walls: [...s.walls, wall] })),

  updateWall: (id, patch) =>
    set((s) => ({
      walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch, id } : w)),
    })),

  removeWall: (id) =>
    set((s) => ({
      walls: s.walls.filter((w) => w.id !== id),
      selectedEntity:
        s.selectedEntity?.type === 'wall' && s.selectedEntity.id === id
          ? null
          : s.selectedEntity,
    })),

  /* ---- Terrain CRUD ---- */
  addTerrainZone: (zone) =>
    set((s) => ({ terrainZones: [...s.terrainZones, zone] })),

  updateTerrainZone: (id, patch) =>
    set((s) => ({
      terrainZones: s.terrainZones.map((z) =>
        z.id === id ? { ...z, ...patch, id } : z,
      ),
    })),

  removeTerrainZone: (id) =>
    set((s) => ({
      terrainZones: s.terrainZones.filter((z) => z.id !== id),
      selectedEntity:
        s.selectedEntity?.type === 'ramp' && s.selectedEntity.id === id
          ? null
          : s.selectedEntity,
    })),

  /* ---- Obstacle CRUD ---- */
  addObstacle: (obs) => set((s) => ({ obstacles: [...s.obstacles, obs] })),

  updateObstacle: (id, patch) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) =>
        o.id === id ? { ...o, ...patch, id } : o,
      ),
    })),

  removeObstacle: (id) =>
    set((s) => ({
      obstacles: s.obstacles.filter((o) => o.id !== id),
      selectedEntity:
        s.selectedEntity?.type === 'obstacle' && s.selectedEntity.id === id
          ? null
          : s.selectedEntity,
    })),

  /* ---- Bulk ---- */
  clearAll: () =>
    set({
      frictionZones: [],
      walls: [],
      terrainZones: [],
      obstacles: [],
      selectedEntity: null,
    }),

  deleteSelected: () => {
    const { selectedEntity } = get();
    if (!selectedEntity) return;
    const { type, id } = selectedEntity;
    switch (type) {
      case 'friction':
        get().removeFrictionZone(id);
        break;
      case 'wall':
        get().removeWall(id);
        break;
      case 'ramp':
        get().removeTerrainZone(id);
        break;
      case 'obstacle':
        get().removeObstacle(id);
        break;
    }
  },

  duplicateSelected: () => {
    const { selectedEntity, frictionZones, walls, terrainZones, obstacles } = get();
    if (!selectedEntity) return;
    const { type, id } = selectedEntity;

    switch (type) {
      case 'friction': {
        const src = frictionZones.find((z) => z.id === id);
        if (!src) return;
        const newId = generateEntityId('fz');
        get().addFrictionZone({ ...src, id: newId, x: src.x + 0.1, label: `${src.label} (copy)` });
        set({ selectedEntity: { type: 'friction', id: newId } });
        break;
      }
      case 'wall': {
        const src = walls.find((w) => w.id === id);
        if (!src) return;
        const newId = generateEntityId('wall');
        get().addWall({ ...src, id: newId, z1: src.z1 + 0.1, z2: src.z2 + 0.1, label: `${src.label} (copy)` });
        set({ selectedEntity: { type: 'wall', id: newId } });
        break;
      }
      case 'ramp': {
        const src = terrainZones.find((z) => z.id === id);
        if (!src) return;
        const newId = generateEntityId('ramp');
        get().addTerrainZone({ ...src, id: newId, x: src.x + 0.1, label: `${src.label} (copy)` });
        set({ selectedEntity: { type: 'ramp', id: newId } });
        break;
      }
      case 'obstacle': {
        const src = obstacles.find((o) => o.id === id);
        if (!src) return;
        const newId = generateEntityId('obs');
        get().addObstacle({ ...src, id: newId, x: src.x + 0.1, label: `${src.label} (copy)` });
        set({ selectedEntity: { type: 'obstacle', id: newId } });
        break;
      }
    }
  },
}));
