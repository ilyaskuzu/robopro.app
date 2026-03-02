/**
 * MCU board specifications from datasheets.
 */
export interface McuBoardSpecs {
  readonly chipName: string;
  readonly clockHz: number;
  readonly digitalPinCount: number;
  readonly analogPinCount: number;
  readonly pwmPins: readonly number[];
  readonly operatingVoltage: number;
  readonly flashKB: number;
  readonly sramKB: number;
}

export interface McuCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'mcu';
  readonly specs: McuBoardSpecs;
  /** Weight in grams */
  readonly weight: number;
  /** Dimensions [length, width, height] in mm */
  readonly dimensions: readonly [number, number, number];
  /** Internal board type key used by McuFactory */
  readonly boardType: string;
}

export const MCU_CATALOG: readonly McuCatalogEntry[] = [
  {
    id: 'arduino-uno',
    displayName: 'Arduino Uno',
    category: 'mcu',
    specs: {
      chipName: 'ATmega328P',
      clockHz: 16_000_000,
      digitalPinCount: 14,
      analogPinCount: 6,
      pwmPins: [3, 5, 6, 9, 10, 11],
      operatingVoltage: 5,
      flashKB: 32,
      sramKB: 2,
    },
    weight: 25,
    dimensions: [69, 53, 15],
    boardType: 'arduino-uno',
  },
  {
    id: 'arduino-nano',
    displayName: 'Arduino Nano',
    category: 'mcu',
    specs: {
      chipName: 'ATmega328P',
      clockHz: 16_000_000,
      digitalPinCount: 14,
      analogPinCount: 8,
      pwmPins: [3, 5, 6, 9, 10, 11],
      operatingVoltage: 5,
      flashKB: 32,
      sramKB: 2,
    },
    weight: 7,
    dimensions: [45, 18, 5],
    boardType: 'arduino-nano',
  },
  {
    id: 'arduino-mega',
    displayName: 'Arduino Mega 2560',
    category: 'mcu',
    specs: {
      chipName: 'ATmega2560',
      clockHz: 16_000_000,
      digitalPinCount: 54,
      analogPinCount: 16,
      pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      operatingVoltage: 5,
      flashKB: 256,
      sramKB: 8,
    },
    weight: 37,
    dimensions: [101, 53, 15],
    boardType: 'arduino-mega',
  },
  {
    id: 'esp32-devkit',
    displayName: 'ESP32 DevKit V1',
    category: 'mcu',
    specs: {
      chipName: 'ESP32 (Xtensa LX6)',
      clockHz: 240_000_000,
      digitalPinCount: 34,
      analogPinCount: 18,
      pwmPins: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
      operatingVoltage: 3.3,
      flashKB: 4096,
      sramKB: 520,
    },
    weight: 10,
    dimensions: [55, 28, 12],
    boardType: 'esp32',
  },
  {
    id: 'esp8266-nodemcu',
    displayName: 'ESP8266 NodeMCU',
    category: 'mcu',
    specs: {
      chipName: 'ESP8266 (Xtensa L106)',
      clockHz: 80_000_000,
      digitalPinCount: 17,
      analogPinCount: 1,
      pwmPins: [0, 2, 4, 5, 12, 13, 14, 15],
      operatingVoltage: 3.3,
      flashKB: 4096,
      sramKB: 80,
    },
    weight: 8,
    dimensions: [49, 26, 12],
    boardType: 'esp8266',
  },
  {
    id: 'arduino-leonardo',
    displayName: 'Arduino Leonardo',
    category: 'mcu',
    specs: {
      chipName: 'ATmega32U4',
      clockHz: 16_000_000,
      digitalPinCount: 20,
      analogPinCount: 12,
      pwmPins: [3, 5, 6, 9, 10, 11, 13],
      operatingVoltage: 5,
      flashKB: 32,
      sramKB: 2.5,
    },
    weight: 20,
    dimensions: [69, 53, 12],
    boardType: 'arduino-uno',
  },
  {
    id: 'rpi-pico',
    displayName: 'Raspberry Pi Pico',
    category: 'mcu',
    specs: {
      chipName: 'RP2040',
      clockHz: 133_000_000,
      digitalPinCount: 26,
      analogPinCount: 3,
      pwmPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      operatingVoltage: 3.3,
      flashKB: 2048,
      sramKB: 264,
    },
    weight: 3,
    dimensions: [51, 21, 4],
    boardType: 'esp32',
  },
] as const;

export function findMcu(id: string): McuCatalogEntry | undefined {
  return MCU_CATALOG.find(m => m.id === id);
}
