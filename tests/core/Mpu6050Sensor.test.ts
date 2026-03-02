import { describe, it, expect, beforeEach } from 'vitest';
import { Mpu6050Sensor } from '../../core/components/sensors/Mpu6050Sensor';

describe('Mpu6050Sensor', () => {
  let imu: Mpu6050Sensor;

  beforeEach(() => {
    imu = new Mpu6050Sensor('imu-1');
  });

  it('defaults to gravity on Z axis', () => {
    const accel = imu.getAccel();
    expect(accel.x).toBe(0);
    expect(accel.y).toBe(0);
    expect(accel.z).toBe(9.81);
  });

  it('defaults to zero gyro', () => {
    const gyro = imu.getGyro();
    expect(gyro.x).toBe(0);
    expect(gyro.y).toBe(0);
    expect(gyro.z).toBe(0);
  });

  it('reads set accelerometer values', () => {
    imu.setEnvironment({ accelX: 1.5, accelY: -0.3, accelZ: 9.5 });
    const accel = imu.getAccel();
    expect(accel.x).toBe(1.5);
    expect(accel.y).toBe(-0.3);
    expect(accel.z).toBe(9.5);
  });

  it('reads set gyro values', () => {
    imu.setEnvironment({ gyroX: 0.1, gyroY: -0.2, gyroZ: 3.14 });
    const gyro = imu.getGyro();
    expect(gyro.x).toBe(0.1);
    expect(gyro.y).toBe(-0.2);
    expect(gyro.z).toBe(3.14);
  });

  it('outputs normalized accelZ on SDA', () => {
    imu.setEnvironment({ accelZ: 9.81 });
    const out = imu.tick(0.016, {});
    expect(out.SDA).toBeCloseTo(1.0, 4);
  });

  it('reset restores defaults', () => {
    imu.setEnvironment({ accelX: 5, gyroZ: 2 });
    imu.reset();
    expect(imu.getAccel().x).toBe(0);
    expect(imu.getAccel().z).toBe(9.81);
    expect(imu.getGyro().z).toBe(0);
  });

  it('has correct pin manifest', () => {
    expect(imu.pinManifest).toHaveLength(2);
    expect(imu.pinManifest.map(p => p.name)).toEqual(['SDA', 'SCL']);
  });
});
