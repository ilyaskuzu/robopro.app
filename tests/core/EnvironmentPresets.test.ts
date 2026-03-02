import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_PRESETS,
  findEnvironmentPreset,
  PRESET_NAMES,
} from '../../core/simulation/environmentPresets';
describe('ENVIRONMENT_PRESETS', () => {
  it('contains exactly 6 presets', () => {
    expect(ENVIRONMENT_PRESETS).toHaveLength(6);
  });

  it('each preset has required fields', () => {
    for (const preset of ENVIRONMENT_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(typeof preset.id).toBe('string');
      expect(preset.name).toBeDefined();
      expect(typeof preset.name).toBe('string');
      expect(preset.description).toBeDefined();
      expect(typeof preset.description).toBe('string');
      expect(Array.isArray(preset.walls)).toBe(true);
      expect(Array.isArray(preset.frictionZones)).toBe(true);
      expect(Array.isArray(preset.terrainZones)).toBe(true);
      expect(Array.isArray(preset.obstacles)).toBe(true);
    }
  });

  it('empty-arena has 4 walls and no zones or obstacles', () => {
    const preset = findEnvironmentPreset('empty-arena');
    expect(preset).toBeDefined();
    expect(preset!.walls).toHaveLength(4);
    expect(preset!.frictionZones).toHaveLength(0);
    expect(preset!.terrainZones).toHaveLength(0);
    expect(preset!.obstacles).toHaveLength(0);
  });

  it('line-track has more walls than empty-arena', () => {
    const preset = findEnvironmentPreset('line-track');
    expect(preset).toBeDefined();
    expect(preset!.walls.length).toBeGreaterThan(4);
  });

  it('obstacle-course has 8-10 obstacles', () => {
    const preset = findEnvironmentPreset('obstacle-course');
    expect(preset).toBeDefined();
    expect(preset!.obstacles.length).toBeGreaterThanOrEqual(8);
    expect(preset!.obstacles.length).toBeLessThanOrEqual(10);
    for (const obs of preset!.obstacles) {
      expect(obs.id).toBeDefined();
      expect(obs.label).toBeDefined();
      expect(typeof obs.x).toBe('number');
      expect(typeof obs.z).toBe('number');
      expect(typeof obs.radius).toBe('number');
      expect(obs.radius).toBeGreaterThan(0);
    }
  });

  it('ramp-challenge has 3 terrain zones with ramp shape', () => {
    const preset = findEnvironmentPreset('ramp-challenge');
    expect(preset).toBeDefined();
    expect(preset!.terrainZones).toHaveLength(3);
    for (const zone of preset!.terrainZones) {
      expect(zone.shape).toBe('ramp');
      expect(zone.elevationDelta).toBeGreaterThan(0);
      expect(zone.width).toBeGreaterThan(0);
      expect(zone.depth).toBeGreaterThan(0);
    }
  });

  it('mixed-terrain has 4 friction zones with correct materials', () => {
    const preset = findEnvironmentPreset('mixed-terrain');
    expect(preset).toBeDefined();
    expect(preset!.frictionZones).toHaveLength(4);
    const frictions = preset!.frictionZones.map((z) => z.friction);
    expect(frictions).toContain(0.8); // concrete
    expect(frictions).toContain(0.05); // ice
    expect(frictions).toContain(0.6); // sand
    expect(frictions).toContain(1.2); // carpet
  });

  it('sumo-ring has octagon walls (8 segments) and center friction zone', () => {
    const preset = findEnvironmentPreset('sumo-ring');
    expect(preset).toBeDefined();
    expect(preset!.walls).toHaveLength(8);
    expect(preset!.frictionZones).toHaveLength(1);
    const centerZone = preset!.frictionZones[0];
    expect(centerZone.shape).toBe('circle');
    expect(centerZone.radius).toBeGreaterThan(0);
  });

  it('all wall objects have valid structure', () => {
    for (const preset of ENVIRONMENT_PRESETS) {
      for (const wall of preset.walls) {
        expect(wall.id).toBeDefined();
        expect(typeof wall.x1).toBe('number');
        expect(typeof wall.z1).toBe('number');
        expect(typeof wall.x2).toBe('number');
        expect(typeof wall.z2).toBe('number');
        expect(typeof wall.thickness).toBe('number');
        expect(wall.thickness).toBeGreaterThan(0);
        expect(wall.label).toBeDefined();
      }
    }
  });

  it('all friction zones have valid structure', () => {
    for (const preset of ENVIRONMENT_PRESETS) {
      for (const zone of preset.frictionZones) {
        expect(zone.id).toBeDefined();
        expect(['rect', 'circle']).toContain(zone.shape);
        expect(typeof zone.x).toBe('number');
        expect(typeof zone.z).toBe('number');
        expect(typeof zone.friction).toBe('number');
        expect(zone.friction).toBeGreaterThanOrEqual(0);
        expect(zone.label).toBeDefined();
        expect(typeof zone.priority).toBe('number');
      }
    }
  });
});

describe('findEnvironmentPreset', () => {
  it('returns preset by id', () => {
    expect(findEnvironmentPreset('empty-arena')?.id).toBe('empty-arena');
    expect(findEnvironmentPreset('sumo-ring')?.id).toBe('sumo-ring');
  });

  it('returns undefined for unknown id', () => {
    expect(findEnvironmentPreset('unknown-preset')).toBeUndefined();
  });
});

describe('PRESET_NAMES', () => {
  it('has same length as ENVIRONMENT_PRESETS', () => {
    expect(PRESET_NAMES).toHaveLength(ENVIRONMENT_PRESETS.length);
  });

  it('contains preset names', () => {
    expect(PRESET_NAMES).toContain('Empty Arena');
    expect(PRESET_NAMES).toContain('Sumo Ring');
  });
});
