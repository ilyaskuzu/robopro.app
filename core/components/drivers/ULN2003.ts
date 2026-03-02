import type { IDriver, DriverChannel } from '../interfaces/IDriver';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * ULN2003 Darlington Array for Unipolar Stepper Motors.
 *
 * IN1–IN4 drive OUT1–OUT4. Each output follows its input.
 * Voltage drop 0.9V per channel. Used for 28BYJ-48 and similar.
 */
export class ULN2003 implements IDriver {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'IN1', direction: 'input', signalType: 'digital' },
    { name: 'IN2', direction: 'input', signalType: 'digital' },
    { name: 'IN3', direction: 'input', signalType: 'digital' },
    { name: 'IN4', direction: 'input', signalType: 'digital' },
    { name: 'OUT1', direction: 'output', signalType: 'digital' },
    { name: 'OUT2', direction: 'output', signalType: 'digital' },
    { name: 'OUT3', direction: 'output', signalType: 'digital' },
    { name: 'OUT4', direction: 'output', signalType: 'digital' },
  ];

  static readonly VOLTAGE_DROP = 0.9;

  private channels: DriverChannel[] = [
    { speed: 0, direction: 0, enabled: true },
    { speed: 0, direction: 0, enabled: true },
    { speed: 0, direction: 0, enabled: true },
    { speed: 0, direction: 0, enabled: true },
  ];

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return ULN2003.PIN_MANIFEST;
  }

  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    const in1 = (inputs['IN1'] ?? 0) > 0.5 ? 1 : 0;
    const in2 = (inputs['IN2'] ?? 0) > 0.5 ? 1 : 0;
    const in3 = (inputs['IN3'] ?? 0) > 0.5 ? 1 : 0;
    const in4 = (inputs['IN4'] ?? 0) > 0.5 ? 1 : 0;

    this.channels = [
      { speed: in1, direction: in1 ? 1 : 0, enabled: true },
      { speed: in2, direction: in2 ? 1 : 0, enabled: true },
      { speed: in3, direction: in3 ? 1 : 0, enabled: true },
      { speed: in4, direction: in4 ? 1 : 0, enabled: true },
    ];

    return {
      OUT1: in1,
      OUT2: in2,
      OUT3: in3,
      OUT4: in4,
    };
  }

  getChannels(): DriverChannel[] {
    return this.channels;
  }

  reset(): void {
    this.channels = [
      { speed: 0, direction: 0, enabled: true },
      { speed: 0, direction: 0, enabled: true },
      { speed: 0, direction: 0, enabled: true },
      { speed: 0, direction: 0, enabled: true },
    ];
  }
}
