import { describe, it, expect, beforeEach } from 'vitest';
import { createMcu } from '../../core/mcu/McuFactory';
import { Esp32Mcu } from '../../core/mcu/esp/Esp32Mcu';

describe('McuFactory', () => {
  it('creates arduino-uno', () => {
    const mcu = createMcu('arduino-uno');
    expect(mcu.boardName).toBe('Arduino Uno');
  });

  it('creates arduino-nano (same emulator)', () => {
    const mcu = createMcu('arduino-nano');
    expect(mcu.boardName).toBe('Arduino Uno'); // shares AVR emulator
  });

  it('creates arduino-mega (same emulator)', () => {
    const mcu = createMcu('arduino-mega');
    expect(mcu.boardName).toBe('Arduino Uno'); // shares AVR emulator
  });

  it('creates esp32', () => {
    const mcu = createMcu('esp32');
    expect(mcu.boardName).toBe('ESP32 DevKit');
  });

  it('creates esp8266', () => {
    const mcu = createMcu('esp8266');
    expect(mcu.boardName).toBe('ESP32 DevKit'); // shares ESP stub
  });

  it('throws for unknown board', () => {
    expect(() => createMcu('unknown' as any)).toThrow('Unknown board');
  });
});

describe('Esp32Mcu', () => {
  let mcu: Esp32Mcu;

  beforeEach(() => {
    mcu = new Esp32Mcu();
  });

  it('has 34 pins', () => {
    expect(mcu.pins.length).toBe(34);
  });

  it('writePin sets value', () => {
    mcu.writePin(5, 1);
    expect(mcu.getPin(5).value).toBe(1);
  });

  it('reset clears pins', () => {
    mcu.writePin(5, 1);
    mcu.reset();
    expect(mcu.getPin(5).value).toBe(0);
  });

  it('serial output works', () => {
    mcu.serialOutput.push('hello');
    expect(mcu.getSerialOutput()).toBe('hello');
    mcu.clearSerialOutput();
    expect(mcu.getSerialOutput()).toBe('');
  });

  it('getPinByName finds TX0', () => {
    expect(mcu.getPinByName('TX0')).toBeDefined();
  });

  it('getPinByName returns undefined for missing', () => {
    expect(mcu.getPinByName('NONEXISTENT')).toBeUndefined();
  });

  it('pin listeners are notified', () => {
    let changed = false;
    mcu.addPinListener({ onPinChange: () => { changed = true; } });
    mcu.writePin(10, 1);
    expect(changed).toBe(true);
  });

  it('can remove pin listener', () => {
    let count = 0;
    const listener = { onPinChange: () => { count++; } };
    mcu.addPinListener(listener);
    mcu.writePin(10, 1);
    mcu.removePinListener(listener);
    mcu.writePin(10, 0);
    expect(count).toBe(1);
  });
});
