import type { IDriver, DriverChannel } from '../interfaces/IDriver';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';

/**
 * A4988 Bipolar Stepper Motor Driver.
 *
 * STEP/DIR interface with microstepping (MS1/MS2/MS3).
 * ENABLE and SLEEP are active LOW. Voltage drop 0.4V.
 *
 * Control logic:
 * - Rising edge on STEP triggers a step
 * - DIR sets direction (HIGH = forward)
 * - ENABLE low = outputs disabled
 * - SLEEP low = chip in sleep mode
 */
export class A4988 implements IDriver {
  readonly id: string;

  static readonly PIN_MANIFEST: PinManifest[] = [
    { name: 'STEP', direction: 'input', signalType: 'digital' },
    { name: 'DIR', direction: 'input', signalType: 'digital' },
    { name: 'ENABLE', direction: 'input', signalType: 'digital' },
    { name: 'MS1', direction: 'input', signalType: 'digital' },
    { name: 'MS2', direction: 'input', signalType: 'digital' },
    { name: 'MS3', direction: 'input', signalType: 'digital' },
    { name: 'SLEEP', direction: 'input', signalType: 'digital' },
    { name: 'OUT_STEP', direction: 'output', signalType: 'digital' },
    { name: 'OUT_DIR', direction: 'output', signalType: 'digital' },
  ];

  static readonly VOLTAGE_DROP = 0.4;
  static readonly MAX_STEP_FREQ = 10000; // Hz

  private channel: DriverChannel = { speed: 0, direction: 0, enabled: false };
  private lastStepPin = 0;
  private stepTimer = 0;
  private stepInterval = 0;

  constructor(id: string) {
    this.id = id;
  }

  get pinManifest(): PinManifest[] {
    return A4988.PIN_MANIFEST;
  }

  tick(dt: number, inputs: PinValueMap): PinValueMap {
    const enable = inputs['ENABLE'] ?? 1;   // active LOW
    const sleep = inputs['SLEEP'] ?? 1;     // active LOW
    const stepPin = inputs['STEP'] ?? 0;
    const dirPin = inputs['DIR'] ?? 0;

    const enabled = enable > 0.5 && sleep > 0.5;
    const risingEdge = this.lastStepPin < 0.5 && stepPin >= 0.5;

    this.lastStepPin = stepPin;

    let stepOutput = 0;
    let speed = 0;
    let direction: 0 | 1 | -1 = 0;

    if (!enabled) {
      this.channel = { speed: 0, direction: 0, enabled: false };
      return { OUT_STEP: 0, OUT_DIR: 0 };
    }

    if (risingEdge) {
      this.stepInterval = this.stepTimer;
      this.stepTimer = 0;
      stepOutput = 1;

      const freq = this.stepInterval > 0 ? 1 / this.stepInterval : 0;
      speed = Math.min(1, freq / A4988.MAX_STEP_FREQ);
      direction = dirPin > 0.5 ? 1 : -1;
    } else {
      this.stepTimer += dt;
      const freq = this.stepInterval > 0 ? 1 / this.stepInterval : 0;
      speed = Math.min(1, freq / A4988.MAX_STEP_FREQ);
      direction = dirPin > 0.5 ? 1 : -1;
    }

    this.channel = { speed, direction, enabled: true };

    return {
      OUT_STEP: stepOutput,
      OUT_DIR: dirPin > 0.5 ? 1 : 0,
    };
  }

  getChannels(): DriverChannel[] {
    return [this.channel];
  }

  reset(): void {
    this.channel = { speed: 0, direction: 0, enabled: false };
    this.lastStepPin = 0;
    this.stepTimer = 0;
    this.stepInterval = 0;
  }
}
