import { describe, it, expect, beforeEach } from 'vitest';
import { Led } from '../../core/components/actuators/Led';

describe('Led', () => {
  let led: Led;

  beforeEach(() => {
    led = new Led('led-1');
  });

  it('starts off', () => {
    expect(led.getBrightness()).toBe(0);
  });

  it('turns on with digital HIGH', () => {
    led.tick(0.016, { ANODE: 1 });
    expect(led.getBrightness()).toBe(1);
  });

  it('supports PWM dimming', () => {
    led.tick(0.016, { ANODE: 0.5 });
    expect(led.getBrightness()).toBe(0.5);
  });

  it('turns off with LOW', () => {
    led.tick(0.016, { ANODE: 1 });
    led.tick(0.016, { ANODE: 0 });
    expect(led.getBrightness()).toBe(0);
  });

  it('clamps brightness to [0, 1]', () => {
    led.tick(0.016, { ANODE: 2 });
    expect(led.getBrightness()).toBe(1);
    led.tick(0.016, { ANODE: -1 });
    expect(led.getBrightness()).toBe(0);
  });

  it('reset turns off', () => {
    led.tick(0.016, { ANODE: 1 });
    led.reset();
    expect(led.getBrightness()).toBe(0);
  });

  it('getOutput direction reflects on/off', () => {
    led.tick(0.016, { ANODE: 1 });
    expect(led.getOutput().direction).toBe(1);
    led.tick(0.016, { ANODE: 0 });
    expect(led.getOutput().direction).toBe(0);
  });

  it('has correct pin manifest', () => {
    expect(led.pinManifest).toHaveLength(1);
    expect(led.pinManifest[0].name).toBe('ANODE');
    expect(led.pinManifest[0].signalType).toBe('pwm');
  });
});
