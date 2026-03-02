import { describe, it, expect, beforeEach } from 'vitest';
import { LdrSensor } from '../../core/components/sensors/LdrSensor';

describe('LdrSensor', () => {
  let ldr: LdrSensor;

  beforeEach(() => {
    ldr = new LdrSensor('ldr-1');
  });

  it('defaults to 0.5 ambient light', () => {
    const out = ldr.tick(0.016, {});
    expect(out.OUT).toBe(0.5);
  });

  it('reads set light level', () => {
    ldr.setEnvironment({ lightLevel: 0.8 });
    const out = ldr.tick(0.016, {});
    expect(out.OUT).toBe(0.8);
  });

  it('clamps to [0, 1]', () => {
    ldr.setEnvironment({ lightLevel: 1.5 });
    expect(ldr.tick(0.016, {}).OUT).toBe(1);
    ldr.setEnvironment({ lightLevel: -0.3 });
    expect(ldr.tick(0.016, {}).OUT).toBe(0);
  });

  it('reset restores default', () => {
    ldr.setEnvironment({ lightLevel: 0.1 });
    ldr.reset();
    expect(ldr.tick(0.016, {}).OUT).toBe(0.5);
  });

  it('has correct pin manifest', () => {
    expect(ldr.pinManifest).toHaveLength(1);
    expect(ldr.pinManifest[0].name).toBe('OUT');
    expect(ldr.pinManifest[0].signalType).toBe('analog');
  });
});
