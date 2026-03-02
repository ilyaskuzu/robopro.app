import type { IMicrocontroller } from './interfaces/IMicrocontroller';
import { AvrMcu } from './avr/AvrMcu';
import { Esp32Mcu } from './esp/Esp32Mcu';

export type BoardType = 'arduino-uno' | 'arduino-nano' | 'arduino-mega' | 'esp32' | 'esp8266';

const BOARD_FACTORIES: Record<BoardType, () => IMicrocontroller> = {
  'arduino-uno': () => new AvrMcu(),
  'arduino-nano': () => new AvrMcu(),   // same ATmega328P emulator
  'arduino-mega': () => new AvrMcu(),   // shares AVR emulator (pin map differs in board def)
  'esp32': () => new Esp32Mcu(),
  'esp8266': () => new Esp32Mcu(),      // close-enough stub for now
};

export function createMcu(board: BoardType): IMicrocontroller {
  const factory = BOARD_FACTORIES[board];
  if (!factory) throw new Error(`Unknown board: ${board}`);
  return factory();
}
