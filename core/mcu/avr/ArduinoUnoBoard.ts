import type { PinMode } from '../interfaces/IPin';
export interface BoardPinMapping { readonly arduinoPin: number; readonly portName: string; readonly portBit: number; readonly capabilities: PinMode[]; readonly label: string; }
const D: PinMode[] = ['input', 'output', 'input_pullup'];
const P: PinMode[] = ['input', 'output', 'input_pullup', 'pwm'];
export const ARDUINO_UNO_PINS: ReadonlyArray<BoardPinMapping> = [
  { arduinoPin: 0, portName: 'D', portBit: 0, capabilities: D, label: 'D0/RX' },
  { arduinoPin: 1, portName: 'D', portBit: 1, capabilities: D, label: 'D1/TX' },
  { arduinoPin: 2, portName: 'D', portBit: 2, capabilities: D, label: 'D2' },
  { arduinoPin: 3, portName: 'D', portBit: 3, capabilities: P, label: 'D3~' },
  { arduinoPin: 4, portName: 'D', portBit: 4, capabilities: D, label: 'D4' },
  { arduinoPin: 5, portName: 'D', portBit: 5, capabilities: P, label: 'D5~' },
  { arduinoPin: 6, portName: 'D', portBit: 6, capabilities: P, label: 'D6~' },
  { arduinoPin: 7, portName: 'D', portBit: 7, capabilities: D, label: 'D7' },
  { arduinoPin: 8, portName: 'B', portBit: 0, capabilities: D, label: 'D8' },
  { arduinoPin: 9, portName: 'B', portBit: 1, capabilities: P, label: 'D9~' },
  { arduinoPin: 10, portName: 'B', portBit: 2, capabilities: P, label: 'D10~' },
  { arduinoPin: 11, portName: 'B', portBit: 3, capabilities: P, label: 'D11~' },
  { arduinoPin: 12, portName: 'B', portBit: 4, capabilities: D, label: 'D12' },
  { arduinoPin: 13, portName: 'B', portBit: 5, capabilities: D, label: 'D13/LED' },
  { arduinoPin: 14, portName: 'C', portBit: 0, capabilities: D, label: 'A0' },
  { arduinoPin: 15, portName: 'C', portBit: 1, capabilities: D, label: 'A1' },
  { arduinoPin: 16, portName: 'C', portBit: 2, capabilities: D, label: 'A2' },
  { arduinoPin: 17, portName: 'C', portBit: 3, capabilities: D, label: 'A3' },
  { arduinoPin: 18, portName: 'C', portBit: 4, capabilities: D, label: 'A4/SDA' },
  { arduinoPin: 19, portName: 'C', portBit: 5, capabilities: D, label: 'A5/SCL' },
];
export const ARDUINO_UNO_CLOCK_HZ = 16_000_000;
export const ARDUINO_UNO_SRAM_BYTES = 2048;
