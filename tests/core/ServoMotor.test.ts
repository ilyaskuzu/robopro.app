import { describe, it, expect, beforeEach } from 'vitest';
import { ServoMotor } from '../../core/components/actuators/ServoMotor';
import type { ServoMotorSpecs } from '../../core/components/catalog/servoCatalog';

const SG90_SPECS: ServoMotorSpecs = {
  stallTorqueKgCm: 1.2,
  maxAngleDeg: 180,
  speedPer60Deg: 0.12,
  nominalVoltage: 4.8,
  deadBandUs: 10,
};

describe('ServoMotor', () => {
  let servo: ServoMotor;

  beforeEach(() => {
    servo = new ServoMotor('servo-1', SG90_SPECS);
  });

  it('starts at center angle', () => {
    expect(servo.getAngle()).toBe(90);
  });

  it('moves toward target angle over time', () => {
    servo.setAngle(180);
    // Speed = 60 / 0.12 = 500 deg/s. In 0.1s → 50°.
    servo.tick(0.1, { SIGNAL: 1.0 });
    expect(servo.getAngle()).toBeCloseTo(140, 0);
  });

  it('reaches target angle and stops', () => {
    servo.setAngle(0);
    // 90° / 500deg/s = 0.18s needed
    for (let i = 0; i < 20; i++) servo.tick(0.02, { SIGNAL: 0 });
    expect(servo.getAngle()).toBeCloseTo(0, 1);
  });

  it('clamps angle to max', () => {
    servo.setAngle(999);
    for (let i = 0; i < 100; i++) servo.tick(0.01, { SIGNAL: 1 });
    expect(servo.getAngle()).toBeLessThanOrEqual(180);
  });

  it('clamps angle to min', () => {
    servo.setAngle(-10);
    for (let i = 0; i < 100; i++) servo.tick(0.01, { SIGNAL: 0 });
    expect(servo.getAngle()).toBeGreaterThanOrEqual(0);
  });

  it('resets to center', () => {
    servo.setAngle(0);
    servo.tick(1, { SIGNAL: 0 });
    servo.reset();
    expect(servo.getAngle()).toBe(90);
  });

  it('has correct pin manifest', () => {
    expect(servo.pinManifest).toHaveLength(1);
    expect(servo.pinManifest[0].name).toBe('SIGNAL');
  });

  it('getOutput returns direction based on angle', () => {
    servo.setAngle(180);
    servo.tick(1, { SIGNAL: 1 });
    const out = servo.getOutput();
    expect(out.direction).toBe(1);
  });
});
