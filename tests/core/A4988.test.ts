import { describe, it, expect, beforeEach } from 'vitest';
import { A4988 } from '../../core/components/drivers/A4988';

describe('A4988', () => {
  let driver: A4988;

  beforeEach(() => {
    driver = new A4988('a4988-1');
  });

  it('starts with channel off', () => {
    const ch = driver.getChannels();
    expect(ch).toHaveLength(1);
    expect(ch[0].speed).toBe(0);
    expect(ch[0].direction).toBe(0);
    expect(ch[0].enabled).toBe(false);
  });

  it('detects rising edge on STEP and outputs pulse', () => {
    driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 1, SLEEP: 1 });
    const out1 = driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 1, SLEEP: 1 });
    expect(out1.OUT_STEP).toBe(1);
    expect(out1.OUT_DIR).toBe(1);
  });

  it('passes through DIR to OUT_DIR', () => {
    driver.tick(0.001, { STEP: 0, DIR: 0, ENABLE: 1, SLEEP: 1 });
    driver.tick(0.001, { STEP: 1, DIR: 0, ENABLE: 1, SLEEP: 1 });
    const out = driver.tick(0.001, { STEP: 0, DIR: 0, ENABLE: 1, SLEEP: 1 });
    expect(out.OUT_DIR).toBe(0);

    driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 1, SLEEP: 1 });
    driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 1, SLEEP: 1 });
    const out2 = driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 1, SLEEP: 1 });
    expect(out2.OUT_DIR).toBe(1);
  });

  it('ENABLE low disables outputs', () => {
    driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 0, SLEEP: 1 });
    const out = driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 0, SLEEP: 1 });
    expect(out.OUT_STEP).toBe(0);
    expect(out.OUT_DIR).toBe(0);
    const ch = driver.getChannels();
    expect(ch[0].enabled).toBe(false);
  });

  it('SLEEP low disables outputs', () => {
    driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 1, SLEEP: 0 });
    const out = driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 1, SLEEP: 0 });
    expect(out.OUT_STEP).toBe(0);
    const ch = driver.getChannels();
    expect(ch[0].enabled).toBe(false);
  });

  it('getChannels returns speed from step frequency', () => {
    driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 1, SLEEP: 1 });
    driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 1, SLEEP: 1 });
    driver.tick(0.001, { STEP: 0, DIR: 1, ENABLE: 1, SLEEP: 1 });
    driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 1, SLEEP: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBeGreaterThan(0);
    expect(ch[0].direction).toBe(1);
    expect(ch[0].enabled).toBe(true);
  });

  it('reset zeros all state', () => {
    driver.tick(0.001, { STEP: 1, DIR: 1, ENABLE: 1, SLEEP: 1 });
    driver.reset();
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[0].direction).toBe(0);
    expect(ch[0].enabled).toBe(false);
  });

  it('has correct voltage drop', () => {
    expect(A4988.VOLTAGE_DROP).toBe(0.4);
  });

  it('has STEP, DIR, ENABLE, MS1, MS2, MS3, SLEEP in pin manifest', () => {
    const names = driver.pinManifest.map(p => p.name);
    expect(names).toContain('STEP');
    expect(names).toContain('DIR');
    expect(names).toContain('ENABLE');
    expect(names).toContain('MS1');
    expect(names).toContain('MS2');
    expect(names).toContain('MS3');
    expect(names).toContain('SLEEP');
  });
});
