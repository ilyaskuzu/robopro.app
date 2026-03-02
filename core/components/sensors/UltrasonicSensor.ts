import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * HC-SR04 Ultrasonic Distance Sensor
 *
 * Behavior:
 * 1. MCU sends a 10µs HIGH pulse on TRIG
 * 2. Sensor waits a small propagation delay (~10µs)
 * 3. ECHO goes HIGH for a duration proportional to distance:
 *    echoDuration = 2 * distance / speedOfSound (343 m/s)
 * 4. ECHO goes LOW when round-trip is complete
 *
 * The echo measurement continues regardless of TRIG state after initiation.
 * A new measurement can only start after the previous one completes.
 */
export class UltrasonicSensor implements ISensor {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'TRIG', direction: 'input', signalType: 'digital' },
    { name: 'ECHO', direction: 'output', signalType: 'digital' },
  ];

  private dist = 4.0;             // distance to obstacle in meters
  private measuring = false;       // currently in a measurement cycle
  private elapsedTime = 0;         // time since trigger
  private echoDuration = 0;        // calculated echo pulse width
  private prevTrig = false;        // previous trigger state (for rising-edge detection)

  private static readonly PROPAGATION_DELAY = 0.00001; // 10µs
  private static readonly SPEED_OF_SOUND = 343;        // m/s

  constructor(id: string) { this.id = id; }

  get pinManifest(): PinManifest[] { return UltrasonicSensor.PIN_MANIFEST; }

  setEnvironment(env: SensorEnvironment): void {
    if (env.distanceToObstacle !== undefined) {
      this.dist = Math.max(0.02, Math.min(4.0, env.distanceToObstacle));
    }
  }

  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const trig = (inputs['TRIG'] ?? 0) > 0.5;

    // Detect rising edge of TRIG to start a new measurement
    if (trig && !this.prevTrig && !this.measuring) {
      this.measuring = true;
      this.elapsedTime = 0;
      this.echoDuration = 2 * this.dist / UltrasonicSensor.SPEED_OF_SOUND;
    }
    this.prevTrig = trig;

    let echo = 0;
    if (this.measuring) {
      this.elapsedTime += dt;
      const d = UltrasonicSensor.PROPAGATION_DELAY;
      if (this.elapsedTime > d && this.elapsedTime < d + this.echoDuration) {
        echo = 1;
      }
      if (this.elapsedTime >= d + this.echoDuration) {
        this.measuring = false;
      }
    }

    return { ECHO: echo };
  }

  reset(): void {
    this.dist = 4.0;
    this.measuring = false;
    this.elapsedTime = 0;
    this.echoDuration = 0;
    this.prevTrig = false;
  }
}
