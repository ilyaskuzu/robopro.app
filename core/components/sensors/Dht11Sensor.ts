import type { ISensor, SensorEnvironment } from '../interfaces/ISensor';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * DHT11 temperature + humidity sensor.
 *
 * Simplified model: reads temperature and humidity from environment.
 * Outputs a single digital pin that encodes temperature in the analog value
 * (the sketch interpreter handles the DHT library abstraction).
 *
 * Environment keys: `temperature` (°C), `humidity` (% RH).
 */
export class Dht11Sensor implements ISensor {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'DATA', direction: 'bidirectional', signalType: 'digital' },
  ];

  private temperature = 25; // °C
  private humidity = 50;    // % RH

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return Dht11Sensor.PIN_MANIFEST;
  }

  setEnvironment(env: SensorEnvironment): void {
    if (env.temperature !== undefined) {
      this.temperature = Math.max(0, Math.min(50, env.temperature));
    }
    if (env.humidity !== undefined) {
      this.humidity = Math.max(20, Math.min(90, env.humidity));
    }
  }

  tick(_dt: number, _inputs: PinValueMap): PinValueMap {
    // Encode temperature as normalized value for sketch interpreter access
    // The interpreter's dht.readTemperature() will read this directly
    return { DATA: this.temperature / 100 };
  }

  /** Get current temperature in °C */
  getTemperature(): number {
    return this.temperature;
  }

  /** Get current humidity in % RH */
  getHumidity(): number {
    return this.humidity;
  }

  reset(): void {
    this.temperature = 25;
    this.humidity = 50;
  }
}
