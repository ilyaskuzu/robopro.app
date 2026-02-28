import { CPU, avrInstruction, AVRTimer, timer0Config, timer1Config, timer2Config, AVRIOPort, portBConfig, portCConfig, portDConfig, PinState, AVRUSART, usart0Config } from 'avr8js';
import type { IMicrocontroller } from '../interfaces/IMicrocontroller';
import type { IPin, IPinListener, PinMode } from '../interfaces/IPin';
import { ARDUINO_UNO_PINS, ARDUINO_UNO_CLOCK_HZ, ARDUINO_UNO_SRAM_BYTES, type BoardPinMapping } from './ArduinoUnoBoard';

class AvrPin implements IPin { mode: PinMode = 'unset'; value = 0; pwmDutyCycle = 0; constructor(public readonly index: number, public readonly name: string) {} }

export class AvrMcu implements IMicrocontroller {
  readonly boardName = 'Arduino Uno';
  readonly pins: AvrPin[];
  readonly serialOutput: string[] = [];
  private cpu!: CPU;
  private portB!: AVRIOPort;
  private portC!: AVRIOPort;
  private portD!: AVRIOPort;
  private _t0!: AVRTimer;
  private _t1!: AVRTimer;
  private _t2!: AVRTimer;
  private usart!: AVRUSART;
  private pinListeners: IPinListener[] = [];
  private pinMap: ReadonlyArray<BoardPinMapping>;
  private firmwareLoaded = false;

  constructor() {
    this.pinMap = ARDUINO_UNO_PINS;
    this.pins = this.pinMap.map(p => new AvrPin(p.arduinoPin, p.label));
    this.initCpu(new Uint16Array(ARDUINO_UNO_SRAM_BYTES));
  }

  private initCpu(progMem: Uint16Array): void {
    this.cpu = new CPU(progMem, ARDUINO_UNO_SRAM_BYTES);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this._t0 = new AVRTimer(this.cpu, timer0Config);
    this._t1 = new AVRTimer(this.cpu, timer1Config);
    this._t2 = new AVRTimer(this.cpu, timer2Config);
    this.usart = new AVRUSART(this.cpu, usart0Config, ARDUINO_UNO_CLOCK_HZ);
    this.usart.onLineTransmit = (line: string) => { this.serialOutput.push(line); };
    this.setupGpioListeners();
  }

  private setupGpioListeners(): void {
    const pm: Record<string, AVRIOPort> = { B: this.portB, C: this.portC, D: this.portD };
    for (const m of this.pinMap) {
      const port = pm[m.portName]; if (!port) continue;
      port.addListener(() => {
        const ps = port.pinState(m.portBit); const pin = this.pins[m.arduinoPin];
        if (ps === PinState.High) { pin.value = 1; pin.mode = 'output'; }
        else if (ps === PinState.Low) { pin.value = 0; pin.mode = 'output'; }
        else if (ps === PinState.Input) { pin.mode = 'input'; }
        else if (ps === PinState.InputPullUp) { pin.mode = 'input_pullup'; }
        for (const l of this.pinListeners) l.onPinChange(pin);
      });
    }
  }

  loadFirmware(hex: Uint8Array): void { this.initCpu(new Uint16Array(hex.buffer)); this.firmwareLoaded = true; }
  tick(cpuCycles: number): void { if (!this.firmwareLoaded) return; const t = this.cpu.cycles + cpuCycles; while (this.cpu.cycles < t) { avrInstruction(this.cpu); this.cpu.tick(); } }
  reset(): void { this.cpu.reset(); this.serialOutput.length = 0; for (const p of this.pins) { p.mode = 'unset'; p.value = 0; p.pwmDutyCycle = 0; } this.firmwareLoaded = false; }
  getPin(index: number): IPin { return this.pins[index]; }
  getPinByName(name: string): IPin | undefined { return this.pins.find(p => p.name === name); }
  writePin(index: number, value: number): void {
    const pin = this.pins[index];
    if (pin) {
      pin.value = value;
      pin.mode = 'output';
    }
    const m = this.pinMap[index];
    if (!m) return;
    const pm: Record<string, AVRIOPort> = { B: this.portB, C: this.portC, D: this.portD };
    const port = pm[m.portName];
    if (port) port.setPin(m.portBit, value > 0);
  }
  addPinListener(l: IPinListener): void { this.pinListeners.push(l); }
  removePinListener(l: IPinListener): void { const i = this.pinListeners.indexOf(l); if (i >= 0) this.pinListeners.splice(i, 1); }
  getSerialOutput(): string { return this.serialOutput.join('\n'); }
  clearSerialOutput(): void { this.serialOutput.length = 0; }
  get clockHz(): number { return ARDUINO_UNO_CLOCK_HZ; }
}
