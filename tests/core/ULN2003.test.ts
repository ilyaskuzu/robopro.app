import { describe, it, expect, beforeEach } from 'vitest';
import { ULN2003 } from '../../core/components/drivers/ULN2003';

describe('ULN2003', () => {
  let driver: ULN2003;

  beforeEach(() => {
    driver = new ULN2003('uln2003-1');
  });

  it('starts with all channels off', () => {
    const ch = driver.getChannels();
    expect(ch).toHaveLength(4);
    ch.forEach(c => {
      expect(c.speed).toBe(0);
      expect(c.direction).toBe(0);
      expect(c.enabled).toBe(true);
    });
  });

  it('OUT follows IN for each channel', () => {
    const out = driver.tick(0.016, { IN1: 1, IN2: 0, IN3: 1, IN4: 0 });
    expect(out.OUT1).toBe(1);
    expect(out.OUT2).toBe(0);
    expect(out.OUT3).toBe(1);
    expect(out.OUT4).toBe(0);
  });

  it('getChannels returns 4 channels with speed 1 or 0', () => {
    driver.tick(0.016, { IN1: 1, IN2: 0, IN3: 1, IN4: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(1);
    expect(ch[0].direction).toBe(1);
    expect(ch[0].enabled).toBe(true);
    expect(ch[1].speed).toBe(0);
    expect(ch[1].direction).toBe(0);
    expect(ch[2].speed).toBe(1);
    expect(ch[2].direction).toBe(1);
    expect(ch[3].speed).toBe(1);
    expect(ch[3].direction).toBe(1);
  });

  it('direction 1 when HIGH, 0 when LOW', () => {
    driver.tick(0.016, { IN1: 0.6, IN2: 0.3, IN3: 1, IN4: 0 });
    const ch = driver.getChannels();
    expect(ch[0].direction).toBe(1);
    expect(ch[1].direction).toBe(0);
    expect(ch[2].direction).toBe(1);
    expect(ch[3].direction).toBe(0);
  });

  it('reset zeros all state', () => {
    driver.tick(0.016, { IN1: 1, IN2: 1, IN3: 1, IN4: 1 });
    driver.reset();
    const ch = driver.getChannels();
    ch.forEach(c => {
      expect(c.speed).toBe(0);
      expect(c.direction).toBe(0);
    });
  });

  it('has correct voltage drop', () => {
    expect(ULN2003.VOLTAGE_DROP).toBe(0.9);
  });

  it('has IN1–IN4 and OUT1–OUT4 in pin manifest', () => {
    const names = driver.pinManifest.map(p => p.name);
    expect(names).toContain('IN1');
    expect(names).toContain('IN4');
    expect(names).toContain('OUT1');
    expect(names).toContain('OUT4');
  });
});
