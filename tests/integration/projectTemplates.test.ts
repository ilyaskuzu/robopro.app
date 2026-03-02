import { describe, it, expect } from 'vitest';
import { PRESETS, PRESET_NAMES } from '@/core/sketch/presets';
import type { PresetName } from '@/core/sketch/presets';

describe('Project Presets', () => {
  /* ---------- registry ---------- */

  it('has at least 6 presets', () => {
    expect(PRESET_NAMES.length).toBeGreaterThanOrEqual(6);
  });

  it('includes all expected preset keys', () => {
    const expected: PresetName[] = [
      'blink',
      'motor-drive',
      'obstacle-avoider',
      'line-follower',
      'remote-control',
      'encoder-pid',
      'stepper-control',
      'light-follower',
      'temp-logger',
      'maze-solver',
    ];
    for (const k of expected) {
      expect(PRESET_NAMES).toContain(k);
    }
  });

  /* ---------- structure ---------- */

  for (const name of PRESET_NAMES) {
    describe(`preset: ${name}`, () => {
      const preset = PRESETS[name as PresetName];

      it('has a non-empty sketch string', () => {
        expect(typeof preset.sketch).toBe('string');
        expect(preset.sketch.length).toBeGreaterThan(10);
      });

      it('has a components array', () => {
        expect(Array.isArray(preset.components)).toBe(true);
      });

      it('has a wires array', () => {
        expect(Array.isArray(preset.wires)).toBe(true);
      });

      it('has obstacles array', () => {
        expect(Array.isArray(preset.obstacles)).toBe(true);
      });

      it('has a lineTrack with points and lineWidth', () => {
        expect(preset.lineTrack).toBeDefined();
        expect(Array.isArray(preset.lineTrack.points)).toBe(true);
        expect(typeof preset.lineTrack.lineWidth).toBe('number');
      });

      it('every component has id and type', () => {
        for (const c of preset.components) {
          expect(typeof c.id).toBe('string');
          expect(typeof c.type).toBe('string');
        }
      });

      it('every wire references existing component ids or mcu', () => {
        const ids = new Set(preset.components.map((c: { id: string }) => c.id));
        ids.add('mcu'); // MCU is always implicit
        for (const w of preset.wires) {
          expect(ids.has(w.componentId)).toBe(true);
        }
      });
    });
  }

  /* ---------- remote-control specifics ---------- */

  describe('remote-control preset', () => {
    const rc = PRESETS['remote-control'];

    it('sketch contains Serial.println', () => {
      expect(rc.sketch).toContain('Serial.println');
    });

    it('has at least 2 motors plus driver and battery', () => {
      const types = rc.components.map((c: { type: string }) => c.type);
      expect(types.filter((t: string) => t === 'dc-motor').length).toBeGreaterThanOrEqual(2);
      expect(types).toContain('l298n');
      expect(types.some((t: string) => t.includes('battery'))).toBe(true);
    });
  });

  /* ---------- encoder-pid specifics ---------- */

  describe('encoder-pid preset', () => {
    const ep = PRESETS['encoder-pid'];

    it('sketch contains analogRead', () => {
      expect(ep.sketch).toContain('analogRead');
    });

    it('has encoder components', () => {
      const types = ep.components.map((c: { type: string }) => c.type);
      expect(types.filter((t: string) => t === 'encoder').length).toBeGreaterThanOrEqual(2);
    });
  });
});
