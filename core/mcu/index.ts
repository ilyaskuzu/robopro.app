export { AvrMcu } from './avr/AvrMcu';
export { Esp32Mcu } from './esp/Esp32Mcu';
export { createMcu } from './McuFactory';
export type { BoardType } from './McuFactory';
export { ARDUINO_UNO_PINS, ARDUINO_UNO_CLOCK_HZ } from './avr/ArduinoUnoBoard';
export { ARDUINO_NANO_PINS, ARDUINO_NANO_CLOCK_HZ } from './avr/ArduinoNanoBoard';
export { ARDUINO_MEGA_PINS, ARDUINO_MEGA_CLOCK_HZ } from './avr/ArduinoMegaBoard';
