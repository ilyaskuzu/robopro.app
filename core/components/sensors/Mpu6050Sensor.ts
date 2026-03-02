import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * MPU-6050 6-axis IMU (accelerometer + gyroscope).
 *
 * Communicates via I2C (SDA + SCL). In the simulation we expose
 * accelerometer and gyroscope values directly from VehicleDynamics state.
 *
 * Environment keys:
 * - `accelX`, `accelY`, `accelZ` — acceleration in m/s² (default: 0, 0, 9.81)
 * - `gyroX`, `gyroY`, `gyroZ` — angular velocity in rad/s (default: 0)
 */
export class Mpu6050Sensor implements ISensor {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'SDA', direction: 'bidirectional', signalType: 'analog' },
    { name: 'SCL', direction: 'input', signalType: 'digital' },
  ];

  // Accelerometer values in m/s²
  private accelX = 0;
  private accelY = 0;
  private accelZ = 9.81;

  // Gyroscope values in rad/s
  private gyroX = 0;
  private gyroY = 0;
  private gyroZ = 0;

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return Mpu6050Sensor.PIN_MANIFEST;
  }

  setEnvironment(env: SensorEnvironment): void {
    if (env.accelX !== undefined) this.accelX = env.accelX;
    if (env.accelY !== undefined) this.accelY = env.accelY;
    if (env.accelZ !== undefined) this.accelZ = env.accelZ;
    if (env.gyroX !== undefined) this.gyroX = env.gyroX;
    if (env.gyroY !== undefined) this.gyroY = env.gyroY;
    if (env.gyroZ !== undefined) this.gyroZ = env.gyroZ;
  }

  tick(_dt: number, _inputs: PinValueMap): PinValueMap {
    // Encode accelerometer Z on SDA for simplified sketch reads
    // Full I2C emulation would be needed for real register reads,
    // but the interpreter can use getAccel/getGyro directly.
    return { SDA: this.accelZ / 9.81 };
  }

  /** Get accelerometer values [x, y, z] in m/s² */
  getAccel(): { x: number; y: number; z: number } {
    return { x: this.accelX, y: this.accelY, z: this.accelZ };
  }

  /** Get gyroscope values [x, y, z] in rad/s */
  getGyro(): { x: number; y: number; z: number } {
    return { x: this.gyroX, y: this.gyroY, z: this.gyroZ };
  }

  reset(): void {
    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 9.81;
    this.gyroX = 0;
    this.gyroY = 0;
    this.gyroZ = 0;
  }
}
