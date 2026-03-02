import { describe, it, expect, beforeEach } from 'vitest';
import { Dht11Sensor } from '../../core/components/sensors/Dht11Sensor';

describe('Dht11Sensor', () => {
  let dht: Dht11Sensor;

  beforeEach(() => {
    dht = new Dht11Sensor('dht11-1');
  });

  it('defaults to 25°C, 50% RH', () => {
    expect(dht.getTemperature()).toBe(25);
    expect(dht.getHumidity()).toBe(50);
  });

  it('reads set temperature', () => {
    dht.setEnvironment({ temperature: 30 });
    expect(dht.getTemperature()).toBe(30);
  });

  it('reads set humidity', () => {
    dht.setEnvironment({ humidity: 70 });
    expect(dht.getHumidity()).toBe(70);
  });

  it('clamps temperature to [0, 50]', () => {
    dht.setEnvironment({ temperature: -10 });
    expect(dht.getTemperature()).toBe(0);
    dht.setEnvironment({ temperature: 80 });
    expect(dht.getTemperature()).toBe(50);
  });

  it('clamps humidity to [20, 90]', () => {
    dht.setEnvironment({ humidity: 5 });
    expect(dht.getHumidity()).toBe(20);
    dht.setEnvironment({ humidity: 100 });
    expect(dht.getHumidity()).toBe(90);
  });

  it('outputs normalized temperature on DATA pin', () => {
    dht.setEnvironment({ temperature: 25 });
    const out = dht.tick(0.016, {});
    expect(out.DATA).toBeCloseTo(0.25, 4);
  });

  it('reset restores defaults', () => {
    dht.setEnvironment({ temperature: 40, humidity: 80 });
    dht.reset();
    expect(dht.getTemperature()).toBe(25);
    expect(dht.getHumidity()).toBe(50);
  });

  it('has correct pin manifest', () => {
    expect(dht.pinManifest).toHaveLength(1);
    expect(dht.pinManifest[0].name).toBe('DATA');
    expect(dht.pinManifest[0].direction).toBe('bidirectional');
  });
});
