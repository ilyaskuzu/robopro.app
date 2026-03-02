import { describe, it, expect, beforeEach } from 'vitest';
import { L293D } from '../../core/components/drivers/L293D';

describe('L293D', () => {
  let driver: L293D;

  beforeEach(() => {
    driver = new L293D('l293d-1');
  });

  it('starts with both channels off', () => {
    const channels = driver.getChannels();
    expect(channels[0].speed).toBe(0);
    expect(channels[1].speed).toBe(0);
  });

  it('forward on channel A: EN1=1, IN1=1, IN2=0', () => {
    driver.tick(0.016, { EN1: 1, IN1: 1, IN2: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(1);
    expect(ch[0].direction).toBe(1);
    expect(ch[0].enabled).toBe(true);
  });

  it('reverse on channel A: EN1=1, IN1=0, IN2=1', () => {
    driver.tick(0.016, { EN1: 1, IN1: 0, IN2: 1 });
    const ch = driver.getChannels();
    expect(ch[0].direction).toBe(-1);
  });

  it('brake on channel A: IN1=1, IN2=1', () => {
    driver.tick(0.016, { EN1: 1, IN1: 1, IN2: 1 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
    expect(ch[0].direction).toBe(0);
  });

  it('coast on channel A: IN1=0, IN2=0', () => {
    driver.tick(0.016, { EN1: 1, IN1: 0, IN2: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0);
  });

  it('PWM speed control via EN1', () => {
    driver.tick(0.016, { EN1: 0.6, IN1: 1, IN2: 0 });
    const ch = driver.getChannels();
    expect(ch[0].speed).toBe(0.6);
  });

  it('outputs correct values', () => {
    const out = driver.tick(0.016, { EN1: 1, IN1: 1, IN2: 0, EN2: 0.5, IN3: 0, IN4: 1 });
    expect(out.OUT_A).toBe(1);
    expect(out.DIR_A).toBe(1);
    expect(out.OUT_B).toBe(-0.5);
    expect(out.DIR_B).toBe(-1);
  });

  it('reset clears channels', () => {
    driver.tick(0.016, { EN1: 1, IN1: 1, IN2: 0 });
    driver.reset();
    expect(driver.getChannels()[0].speed).toBe(0);
  });

  it('has correct pin count', () => {
    expect(driver.pinManifest).toHaveLength(10);
  });

  it('has correct voltage drop constant', () => {
    expect(L293D.VOLTAGE_DROP).toBe(1.4);
  });

  it('has correct max current constant', () => {
    expect(L293D.MAX_CURRENT).toBe(0.6);
  });
});
