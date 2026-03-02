import { describe, it, expect } from 'vitest';
import { createPopulatedRegistry } from '../../core/simulation/registryBootstrap';

describe('Registry Bootstrap', () => {
  const registry = createPopulatedRegistry();

  it('contains dc-motor type', () => {
    expect(registry.get('dc-motor')).toBeDefined();
  });

  it('contains all 4 driver types', () => {
    expect(registry.get('l298n')).toBeDefined();
    expect(registry.get('l293d')).toBeDefined();
    expect(registry.get('tb6612fng')).toBeDefined();
    expect(registry.get('drv8833')).toBeDefined();
  });

  it('contains all sensor types', () => {
    expect(registry.get('ultrasonic')).toBeDefined();
    expect(registry.get('ir-line')).toBeDefined();
    expect(registry.get('rotary-encoder')).toBeDefined();
    expect(registry.get('ldr')).toBeDefined();
    expect(registry.get('dht11')).toBeDefined();
    expect(registry.get('mpu6050')).toBeDefined();
  });

  it('contains actuator types', () => {
    expect(registry.get('led')).toBeDefined();
    expect(registry.get('buzzer')).toBeDefined();
  });

  it('contains servo variants', () => {
    expect(registry.get('servo:sg90')).toBeDefined();
    expect(registry.get('servo:mg996r')).toBeDefined();
  });

  it('contains battery type', () => {
    expect(registry.get('battery')).toBeDefined();
  });

  it('contains motor catalog variants', () => {
    expect(registry.get('dc-motor:fa-130-3v')).toBeDefined();
    expect(registry.get('dc-motor:n20-6v-100rpm')).toBeDefined();
  });

  it('can create instances by type', () => {
    const motor = registry.createInstance('dc-motor', 'test-motor');
    expect(motor.id).toBe('test-motor');
    expect(motor.pinManifest.length).toBeGreaterThan(0);
  });

  it('can create driver instances', () => {
    const driver = registry.createInstance('drv8833', 'test-drv');
    expect(driver.id).toBe('test-drv');
  });

  it('can create sensor instances', () => {
    const sensor = registry.createInstance('mpu6050', 'test-imu');
    expect(sensor.id).toBe('test-imu');
  });

  it('can create servo instances', () => {
    const servo = registry.createInstance('servo:sg90', 'test-servo');
    expect(servo.id).toBe('test-servo');
  });

  it('getByCategory returns correct counts', () => {
    const drivers = registry.getByCategory('driver');
    expect(drivers.length).toBe(6);
    const sensors = registry.getByCategory('sensor');
    expect(sensors.length).toBe(6);
  });

  it('throws for unknown type', () => {
    expect(() => registry.createInstance('unknown', 'x')).toThrow();
  });

  it('total registered types > 15', () => {
    expect(registry.getAll().length).toBeGreaterThan(15);
  });
});
