import type { PinMode } from '../interfaces/IPin';
import type { BoardPinMapping } from './ArduinoUnoBoard';

/**
 * Arduino Mega 2560 — ATmega2560 with 54 digital + 16 analog pins.
 *
 * We map the most commonly used pins here. The AVR emulator underneath
 * uses the same avr8js CPU but with port mappings for the 2560.
 * For the simulation, we define all 70 pins (54 digital + 16 analog).
 */

const D: PinMode[] = ['input', 'output', 'input_pullup'];
const P: PinMode[] = ['input', 'output', 'input_pullup', 'pwm'];

// Mega PWM pins: 2–13, 44–46
const megaPwmPins = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46]);

function makeMegaPins(): BoardPinMapping[] {
  const pins: BoardPinMapping[] = [];

  // Digital pins 0–53
  for (let i = 0; i < 54; i++) {
    const port = i < 8 ? 'E' : i < 16 ? 'H' : i < 24 ? 'B' : i < 32 ? 'A' : i < 40 ? 'C' : i < 48 ? 'L' : 'K';
    const bit = i % 8;
    const cap = megaPwmPins.has(i) ? P : D;
    let label = `D${i}`;
    if (i === 0) label = 'D0/RX0';
    if (i === 1) label = 'D1/TX0';
    if (i === 13) label = 'D13/LED';
    if (i === 20) label = 'D20/SDA';
    if (i === 21) label = 'D21/SCL';
    pins.push({ arduinoPin: i, portName: port, portBit: bit, capabilities: cap, label });
  }

  // Analog pins A0–A15 (arduino pins 54–69)
  for (let i = 0; i < 16; i++) {
    pins.push({
      arduinoPin: 54 + i,
      portName: 'F',
      portBit: i % 8,
      capabilities: D,
      label: `A${i}`,
    });
  }

  return pins;
}

export const ARDUINO_MEGA_PINS: ReadonlyArray<BoardPinMapping> = makeMegaPins();
export const ARDUINO_MEGA_CLOCK_HZ = 16_000_000;
export const ARDUINO_MEGA_SRAM_BYTES = 8192;
