/**
 * Predefined environment templates for simulation.
 */

import type { FrictionZone } from './FrictionMap';
import type { Wall } from './WallWorld';
import type { TerrainZone } from './TerrainMap';

export interface EnvironmentPreset {
  id: string;
  name: string;
  description: string;
  walls: Wall[];
  frictionZones: FrictionZone[];
  terrainZones: TerrainZone[];
  obstacles: Array<{
    id: string;
    label: string;
    x: number;
    z: number;
    radius: number;
  }>;
}

// 2m x 2m arena: walls from -1 to 1 in world units
const ARENA_HALF = 1;
const WALL_THICKNESS = 0.02;

const emptyArenaWalls: Wall[] = [
  { id: 'wall-south', x1: -ARENA_HALF, z1: -ARENA_HALF, x2: ARENA_HALF, z2: -ARENA_HALF, thickness: WALL_THICKNESS, label: 'South' },
  { id: 'wall-east', x1: ARENA_HALF, z1: -ARENA_HALF, x2: ARENA_HALF, z2: ARENA_HALF, thickness: WALL_THICKNESS, label: 'East' },
  { id: 'wall-north', x1: ARENA_HALF, z1: ARENA_HALF, x2: -ARENA_HALF, z2: ARENA_HALF, thickness: WALL_THICKNESS, label: 'North' },
  { id: 'wall-west', x1: -ARENA_HALF, z1: ARENA_HALF, x2: -ARENA_HALF, z2: -ARENA_HALF, thickness: WALL_THICKNESS, label: 'West' },
];

// Octagon vertices (circumradius 1, centered at origin)
function octagonVertices(cx: number, cz: number, r: number): Array<[number, number]> {
  const verts: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 * Math.PI) / 180;
    verts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return verts;
}

export const ENVIRONMENT_PRESETS: readonly EnvironmentPreset[] = [
  {
    id: 'empty-arena',
    name: 'Empty Arena',
    description: 'Flat ground with 4 boundary walls forming a 2m x 2m square',
    walls: [...emptyArenaWalls],
    frictionZones: [],
    terrainZones: [],
    obstacles: [],
  },
  {
    id: 'line-track',
    name: 'Line Track',
    description: 'Empty arena with a line track path defined by walls',
    walls: [
      ...emptyArenaWalls,
      // Inner track boundary - oval path
      { id: 'track-inner-s1', x1: -0.6, z1: -0.6, x2: 0.6, z2: -0.6, thickness: WALL_THICKNESS, label: 'Track inner' },
      { id: 'track-inner-s2', x1: 0.6, z1: -0.6, x2: 0.6, z2: 0.6, thickness: WALL_THICKNESS, label: 'Track inner' },
      { id: 'track-inner-s3', x1: 0.6, z1: 0.6, x2: -0.6, z2: 0.6, thickness: WALL_THICKNESS, label: 'Track inner' },
      { id: 'track-inner-s4', x1: -0.6, z1: 0.6, x2: -0.6, z2: -0.6, thickness: WALL_THICKNESS, label: 'Track inner' },
    ],
    frictionZones: [],
    terrainZones: [],
    obstacles: [],
  },
  {
    id: 'obstacle-course',
    name: 'Obstacle Course',
    description: '2m x 2m arena with 8-10 scattered cylinder obstacles of varying radius',
    walls: [...emptyArenaWalls],
    frictionZones: [],
    terrainZones: [],
    obstacles: [
      { id: 'obs-1', label: 'Pylon 1', x: -0.5, z: -0.5, radius: 0.08 },
      { id: 'obs-2', label: 'Pylon 2', x: 0.4, z: -0.6, radius: 0.06 },
      { id: 'obs-3', label: 'Pylon 3', x: 0.6, z: 0.3, radius: 0.1 },
      { id: 'obs-4', label: 'Pylon 4', x: -0.3, z: 0.5, radius: 0.07 },
      { id: 'obs-5', label: 'Pylon 5', x: 0, z: 0, radius: 0.05 },
      { id: 'obs-6', label: 'Pylon 6', x: -0.7, z: 0.2, radius: 0.09 },
      { id: 'obs-7', label: 'Pylon 7', x: 0.5, z: -0.2, radius: 0.06 },
      { id: 'obs-8', label: 'Pylon 8', x: -0.2, z: -0.7, radius: 0.08 },
      { id: 'obs-9', label: 'Pylon 9', x: 0.7, z: 0.6, radius: 0.07 },
      { id: 'obs-10', label: 'Pylon 10', x: 0.2, z: 0.7, radius: 0.05 },
    ],
  },
  {
    id: 'ramp-challenge',
    name: 'Ramp Challenge',
    description: 'Arena with 3 ramp TerrainZones at different slopes (5°, 10°, 15°)',
    walls: [...emptyArenaWalls],
    frictionZones: [],
    terrainZones: [
      {
        id: 'ramp-5deg',
        shape: 'ramp',
        x: -0.5,
        z: 0,
        width: 0.8,
        depth: 0.6,
        slopeDirection: 0,
        elevationDelta: 0.8 * Math.tan((5 * Math.PI) / 180),
        label: '5° Ramp',
      },
      {
        id: 'ramp-10deg',
        shape: 'ramp',
        x: 0,
        z: 0,
        width: 0.8,
        depth: 0.6,
        slopeDirection: Math.PI / 2,
        elevationDelta: 0.8 * Math.tan((10 * Math.PI) / 180),
        label: '10° Ramp',
      },
      {
        id: 'ramp-15deg',
        shape: 'ramp',
        x: 0.5,
        z: 0,
        width: 0.8,
        depth: 0.6,
        slopeDirection: Math.PI,
        elevationDelta: 0.8 * Math.tan((15 * Math.PI) / 180),
        label: '15° Ramp',
      },
    ],
    obstacles: [],
  },
  {
    id: 'mixed-terrain',
    name: 'Mixed Terrain',
    description: 'Arena with 4 friction zones: concrete, ice, sand, carpet',
    walls: [...emptyArenaWalls],
    frictionZones: [
      { id: 'zone-concrete', shape: 'rect', x: -0.5, z: -0.5, width: 1, height: 1, friction: 0.8, label: 'Concrete', priority: 1 },
      { id: 'zone-ice', shape: 'rect', x: 0.5, z: -0.5, width: 1, height: 1, friction: 0.05, label: 'Ice', priority: 2 },
      { id: 'zone-sand', shape: 'rect', x: -0.5, z: 0.5, width: 1, height: 1, friction: 0.6, label: 'Sand', priority: 3 },
      { id: 'zone-carpet', shape: 'rect', x: 0.5, z: 0.5, width: 1, height: 1, friction: 1.2, label: 'Carpet', priority: 4 },
    ],
    terrainZones: [],
    obstacles: [],
  },
  {
    id: 'sumo-ring',
    name: 'Sumo Ring',
    description: 'Circular arena with walls forming an octagon, friction zone in center',
    walls: (() => {
      const verts = octagonVertices(0, 0, ARENA_HALF);
      return verts.map((_, i) => {
        const next = (i + 1) % 8;
        return {
          id: `sumo-wall-${i}`,
          x1: verts[i][0],
          z1: verts[i][1],
          x2: verts[next][0],
          z2: verts[next][1],
          thickness: WALL_THICKNESS,
          label: `Octagon ${i + 1}`,
        };
      });
    })(),
    frictionZones: [
      { id: 'sumo-center', shape: 'circle', x: 0, z: 0, radius: 0.5, friction: 0.8, label: 'Center ring', priority: 1 },
    ],
    terrainZones: [],
    obstacles: [],
  },
] as const;

export const PRESET_NAMES: readonly string[] = ENVIRONMENT_PRESETS.map((p) => p.name);

export function findEnvironmentPreset(id: string): EnvironmentPreset | undefined {
  return ENVIRONMENT_PRESETS.find((p) => p.id === id);
}
