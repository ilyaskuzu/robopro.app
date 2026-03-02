import { describe, it, expect, beforeEach } from 'vitest';
import { DRV8833 } from '../../core/components/drivers/DRV8833';

describe('DRV8833', () => {
  let driver: DRV8833;

  beforeEach(() => {
    driver = new DRV8833('drv8833-1');
  });

  it('starts with both channels off', () => {
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[1].speed).toBe(0);
  });

  it('forward: AIN1=PWM, AIN2=0', () => {
    driver.tick(0.016, { AIN1: 0.8, AIN2: 0, nSLEEP: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0.8);
    expect(ch[0].direction).toBe(1);
  });

  it('reverse: AIN1=0, AIN2=PWM', () => {
    driver.tick(0.016, { AIN1: 0, AIN2: 0.7, nSLEEP: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0.7);
    expect(ch[0].direction).toBe(-1);
  });

  it('coast: both low', () => {
    driver.tick(0.016, { AIN1: 0, AIN2: 0, nSLEEP: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[0].enabled).toBe(false);
  });

  it('brake: both high', () => {
    driver.tick(0.016, { AIN1: 1, AIN2: 1, nSLEEP: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[0].enabled).toBe(true);
  });

  it('sleep mode disables all outputs', () => {
    driver.tick(0.016, { AIN1: 1, AIN2: 0, nSLEEP: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[0].enabled).toBe(false);
  });

  it('nSLEEP defaults HIGH', () => {
    driver.tick(0.016, { AIN1: 0.9, AIN2: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0.9);
  });

  it('channel B works independently', () => {
    driver.tick(0.016, { BIN1: 0, BIN2: 0.5, nSLEEP: 1 });
    const ch = driver.getChannels();
    expect(ch[1].speed).toBe(0.5);
    expect(ch[1].direction).toBe(-1);
  });

  it('outputs correct pin values', () => {
    const out = driver.tick(0.016, { AIN1: 1, AIN2: 0, BIN1: 0, BIN2: 0.6, nSLEEP: 1 });
    expect(out.OUT_A).toBe(1);
    expect(out.DIR_A).toBe(1);
    expect(out.OUT_B).toBeCloseTo(-0.6);
    expect(out.DIR_B).toBe(-1);
  });

  it('reset clears channels', () => {
    driver.tick(0.016, { AIN1: 1, AIN2: 0, nSLEEP: 1 });
    driver.reset();
    expect(driver.getChannels()[0].speed).toBe(0);
  });

  it('has correct voltage drop', () => {
    expect(DRV8833.VOLTAGE_DROP).toBe(0.2);
  });

  it('has correct max current', () => {
    expect(DRV8833.MAX_CURRENT).toBe(1.5);
  });
});
