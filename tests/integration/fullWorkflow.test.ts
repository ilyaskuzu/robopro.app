import { describe, it, expect } from 'vitest';
import { PRESETS, PRESET_NAMES } from '@/core/sketch/presets';
import type { PresetName } from '@/core/sketch/presets';
import type { WireConnection } from '@/core/simulation';

describe('Full workflow — preset templates structure', () => {
  for (const name of PRESET_NAMES) {
    describe(`preset: ${name}`, () => {
      const preset = PRESETS[name as PresetName];

      it('has sketch, components array, and wires array', () => {
        expect(typeof preset.sketch).toBe('string');
        expect(Array.isArray(preset.components)).toBe(true);
        expect(Array.isArray(preset.wires)).toBe(true);
      });

      it('each component has type and id', () => {
        for (const c of preset.components) {
          expect(typeof c.type).toBe('string');
          expect(typeof c.id).toBe('string');
          expect(c.type.length).toBeGreaterThan(0);
          expect(c.id.length).toBeGreaterThan(0);
        }
      });

      it('each wire has mcuPinIndex, componentId, componentPinName', () => {
        for (const w of preset.wires as WireConnection[]) {
          expect(typeof w.mcuPinIndex).toBe('number');
          expect(typeof w.componentId).toBe('string');
          expect(typeof w.componentPinName).toBe('string');
        }
      });

      it('all referenced componentIds in wires exist in components array', () => {
        const componentIds = new Set(preset.components.map((c) => c.id));
        for (const w of preset.wires as WireConnection[]) {
          expect(componentIds.has(w.componentId)).toBe(true);
        }
      });
    });
  }
});
