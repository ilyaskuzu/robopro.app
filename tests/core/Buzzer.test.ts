import { describe, it, expect, beforeEach } from 'vitest';
import { Buzzer } from '../../core/components/actuators/Buzzer';

describe('Buzzer', () => {
  let buzzer: Buzzer;

  beforeEach(() => {
    buzzer = new Buzzer('buzzer-1');
  });

  it('starts inactive', () => {
    expect(buzzer.isActive()).toBe(false);
  });

  it('activates on HIGH signal', () => {
    buzzer.tick(0.016, { SIGNAL: 1 });
    expect(buzzer.isActive()).toBe(true);
  });

  it('deactivates on LOW signal', () => {
    buzzer.tick(0.016, { SIGNAL: 1 });
    buzzer.tick(0.016, { SIGNAL: 0 });
    expect(buzzer.isActive()).toBe(false);
  });

  it('has default frequency of 440 Hz', () => {
    expect(buzzer.getFrequency()).toBe(440);
  });

  it('allows setting frequency', () => {
    buzzer.setFrequency(1000);
    expect(buzzer.getFrequency()).toBe(1000);
  });

  it('clamps frequency to valid range', () => {
    buzzer.setFrequency(10);
    expect(buzzer.getFrequency()).toBe(31);
    buzzer.setFrequency(100000);
    expect(buzzer.getFrequency()).toBe(65535);
  });

  it('reset restores defaults', () => {
    buzzer.tick(0.016, { SIGNAL: 1 });
    buzzer.setFrequency(2000);
    buzzer.reset();
    expect(buzzer.isActive()).toBe(false);
    expect(buzzer.getFrequency()).toBe(440);
  });

  it('getOutput direction reflects active state', () => {
    buzzer.tick(0.016, { SIGNAL: 1 });
    expect(buzzer.getOutput().direction).toBe(1);
    buzzer.tick(0.016, { SIGNAL: 0 });
    expect(buzzer.getOutput().direction).toBe(0);
  });

  it('has correct pin manifest', () => {
    expect(buzzer.pinManifest).toHaveLength(1);
    expect(buzzer.pinManifest[0].name).toBe('SIGNAL');
    expect(buzzer.pinManifest[0].signalType).toBe('digital');
  });
});
