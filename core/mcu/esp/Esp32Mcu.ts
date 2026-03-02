import type { IMicrocontroller } from '../interfaces/IMicrocontroller';
import type { IPin, IPinListener, PinMode } from '../interfaces/IPin';

/**
 * ESP32 stub MCU implementation.
 *
 * The ESP32 cannot be emulated via avr8js (it's Xtensa, not AVR).
 * This provides the same IMicrocontroller interface with pin-level behavior
 * driven by the SketchInterpreter (which is platform-agnostic).
 *
 * For the simulation, pin values are written/read via the same SignalBus routing.
 */

class Esp32Pin implements IPin {
  mode: PinMode = 'unset';
  value = 0;
  pwmDutyCycle = 0;
  constructor(public readonly index: number, public readonly name: string) {}
}

const ESP32_PIN_COUNT = 34;
const ESP32_CLOCK_HZ = 240_000_000;

function makeEsp32Pins(): Esp32Pin[] {
  const pins: Esp32Pin[] = [];
  for (let i = 0; i < ESP32_PIN_COUNT; i++) {
    let label = `GPIO${i}`;
    if (i === 1) label = 'TX0';
    if (i === 3) label = 'RX0';
    if (i === 21) label = 'SDA';
    if (i === 22) label = 'SCL';
    pins.push(new Esp32Pin(i, label));
  }
  return pins;
}

export class Esp32Mcu implements IMicrocontroller {
  readonly boardName = 'ESP32 DevKit';
  readonly pins: Esp32Pin[];
  readonly serialOutput: string[] = [];
  private pinListeners: IPinListener[] = [];

  constructor() {
    this.pins = makeEsp32Pins();
  }

  get clockHz(): number {
    return ESP32_CLOCK_HZ;
  }

  loadFirmware(_hex: Uint8Array): void {
    // No-op: ESP32 firmware emulation not supported;
    // the SketchInterpreter drives pin state directly.
  }

  tick(_cpuCycles: number): void {
    // Driven by SketchInterpreter, not CPU emulation
  }

  reset(): void {
    this.serialOutput.length = 0;
    for (const p of this.pins) {
      p.mode = 'unset';
      p.value = 0;
      p.pwmDutyCycle = 0;
    }
  }

  getPin(index: number): IPin {
    return this.pins[index] ?? this.pins[0];
  }

  getPinByName(name: string): IPin | undefined {
    return this.pins.find(p => p.name === name);
  }

  writePin(index: number, value: number): void {
    const pin = this.pins[index];
    if (pin) {
      pin.value = value;
      pin.mode = 'output';
      for (const l of this.pinListeners) l.onPinChange(pin);
    }
  }

  addPinListener(l: IPinListener): void {
    this.pinListeners.push(l);
  }

  removePinListener(l: IPinListener): void {
    const i = this.pinListeners.indexOf(l);
    if (i >= 0) this.pinListeners.splice(i, 1);
  }

  getSerialOutput(): string {
    return this.serialOutput.join('\n');
  }

  clearSerialOutput(): void {
    this.serialOutput.length = 0;
  }
}

export { ESP32_CLOCK_HZ };
