import { describe, it, expect, beforeEach } from 'vitest';
import { TB6612FNG } from '../../core/components/drivers/TB6612FNG';

describe('TB6612FNG', () => {
  let driver: TB6612FNG;

  beforeEach(() => {
    driver = new TB6612FNG('tb6612-1');
  });

  it('starts with both channels off', () => {
    const channels = driver.getChannels();
    expect(channels[0].speed).toBe(0);
    expect(channels[1].speed).toBe(0);
  });

  it('forward on channel A: PWMA=1, AIN1=1, AIN2=0, STBY=1', () => {
    driver.tick(0.016, { PWMA: 1, AIN1: 1, AIN2: 0, STBY: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(1);
    expect(ch[0].direction).toBe(1);
  });

  it('reverse on channel A: PWMA=1, AIN1=0, AIN2=1', () => {
    driver.tick(0.016, { PWMA: 1, AIN1: 0, AIN2: 1, STBY: 1 });
    const ch = driver.getChannels();
    expect(ch[0].direction).toBe(-1);
  });

  it('standby mode disables all outputs', () => {
    driver.tick(0.016, { PWMA: 1, AIN1: 1, AIN2: 0, STBY: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[0].enabled).toBe(false);
  });

  it('outputs are zero in standby', () => {
    const out = driver.tick(0.016, { PWMA: 1, AIN1: 1, AIN2: 0, STBY: 0 });
    expect(out.OUT_A).toBe(0);
    expect(out.OUT_B).toBe(0);
  });

  it('STBY defaults HIGH when not wired', () => {
    driver.tick(0.016, { PWMA: 1, AIN1: 1, AIN2: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(1);
  });

  it('channel B operates independently', () => {
    driver.tick(0.016, { PWMB: 0.7, BIN1: 0, BIN2: 1, STBY: 1 });
    const ch = driver.getChannels();
    expect(ch[1].speed).toBe(0.7);
    expect(ch[1].direction).toBe(-1);
  });

  it('reset clears channels', () => {
    driver.tick(0.016, { PWMA: 1, AIN1: 1, AIN2: 0, STBY: 1 });
    driver.reset();
    expect(driver.getChannels()[0].speed).toBe(0);
  });

  it('has correct voltage drop', () => {
    expect(TB6612FNG.VOLTAGE_DROP).toBe(0.5);
  });

  it('has correct max current', () => {
    expect(TB6612FNG.MAX_CURRENT).toBe(1.2);
  });

  it('has standby pin in manifest', () => {
    expect(driver.pinManifest.find(p => p.name === 'STBY')).toBeDefined();
  });
});
