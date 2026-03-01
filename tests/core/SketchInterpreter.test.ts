import { describe, it, expect } from 'vitest';
import { SketchInterpreter, type SketchCallbacks, type PinMode } from '../../core/sketch/SketchInterpreter';

function makeCallbacks(overrides?: Partial<SketchCallbacks>): SketchCallbacks & {
    pins: Record<number, { mode?: PinMode; digital?: number; analog?: number }>;
    serial: string[];
    readValues: Record<number, number>;
} {
    const pins: Record<number, { mode?: PinMode; digital?: number; analog?: number }> = {};
    const serial: string[] = [];
    const readValues: Record<number, number> = {};
    return {
        pins, serial, readValues,
        onPinMode: (pin, mode) => { pins[pin] = { ...pins[pin], mode }; },
        onDigitalWrite: (pin, value) => { pins[pin] = { ...pins[pin], digital: value }; },
        onAnalogWrite: (pin, value) => { pins[pin] = { ...pins[pin], analog: value }; },
        onSerialPrint: (text) => { serial.push(text); },
        onDigitalRead: (pin) => readValues[pin] ?? 0,
        onAnalogRead: (pin) => readValues[pin] ?? 0,
        ...overrides,
    };
}

function runSketch(source: string, ticks: number, dtMs = 16.67, overrides?: Partial<SketchCallbacks>) {
    const cb = makeCallbacks(overrides);
    const interp = new SketchInterpreter(cb);
    interp.parse(source);
    for (let i = 0; i < ticks; i++) interp.tick(dtMs);
    return { cb, interp };
}

// ── Basic statements (backward compat) ──────────────────────

describe('SketchInterpreter – basic statements', () => {
    it('parses and executes pinMode + digitalWrite', () => {
        const { cb } = runSketch(`
      void setup() { pinMode(13, OUTPUT); digitalWrite(13, HIGH); }
      void loop() {}
    `, 2);
        expect(cb.pins[13]?.mode).toBe('OUTPUT');
        expect(cb.pins[13]?.digital).toBe(1);
    });

    it('parses and executes analogWrite', () => {
        const { cb } = runSketch(`
      void setup() { pinMode(5, OUTPUT); analogWrite(5, 128); }
      void loop() {}
    `, 2);
        expect(cb.pins[5]?.analog).toBe(128);
    });

    it('handles Serial.println', () => {
        const { cb } = runSketch(`
      void setup() { Serial.begin(9600); Serial.println("hello"); }
      void loop() {}
    `, 2);
        expect(cb.serial).toContain('hello\n');
    });

    it('handles delay correctly', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        digitalWrite(13, HIGH);
        delay(100);
        digitalWrite(13, LOW);
        delay(100);
      }
    `, 3, 16.67); // ~50ms of ticks, so still in first delay
        expect(cb.pins[13]?.digital).toBe(1); // Should still be HIGH (delay not complete)
    });
});

// ── Variables & Expressions ─────────────────────────────────

describe('SketchInterpreter – variables & expressions', () => {
    it('declares and uses int variables', () => {
        const { cb } = runSketch(`
      void setup() { Serial.begin(9600); }
      void loop() {
        int x = 10;
        int y = 20;
        int sum = x + y;
        Serial.println(sum);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('30\n');
    });

    it('supports arithmetic operators', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int a = 15 / 3;
        int b = 10 % 3;
        int c = 2 * 4;
        Serial.println(a);
        Serial.println(b);
        Serial.println(c);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('5\n');
        expect(cb.serial).toContain('1\n');
        expect(cb.serial).toContain('8\n');
    });

    it('supports compound assignment operators', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 10;
        x += 5;
        Serial.println(x);
        x -= 3;
        Serial.println(x);
        x *= 2;
        Serial.println(x);
        delay(10000);
      }
    `, 5);
        expect(cb.serial[0]).toBe('15\n');
        expect(cb.serial[1]).toBe('12\n');
        expect(cb.serial[2]).toBe('24\n');
    });

    it('supports increment and decrement', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 5;
        x++;
        Serial.println(x);
        x--;
        x--;
        Serial.println(x);
        delay(10000);
      }
    `, 5);
        expect(cb.serial[0]).toBe('6\n');
        expect(cb.serial[1]).toBe('4\n');
    });
});

// ── Control Flow ─────────────────────────────────────────────

describe('SketchInterpreter – control flow', () => {
    it('executes if/else correctly', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 10;
        if (x > 5) {
          Serial.println("big");
        } else {
          Serial.println("small");
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('big\n');
        expect(cb.serial).not.toContain('small\n');
    });

    it('executes else branch', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 2;
        if (x > 5) {
          Serial.println("big");
        } else {
          Serial.println("small");
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('small\n');
    });

    it('executes else if', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 5;
        if (x > 10) {
          Serial.println("A");
        } else if (x > 3) {
          Serial.println("B");
        } else {
          Serial.println("C");
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('B\n');
    });

    it('executes while loop', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int i = 0;
        while (i < 3) {
          i++;
        }
        Serial.println(i);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('3\n');
    });

    it('executes for loop', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int sum = 0;
        for (int i = 0; i < 5; i++) {
          sum += i;
        }
        Serial.println(sum);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('10\n');
    });

    it('handles nested if inside for loop', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int count = 0;
        for (int i = 0; i < 10; i++) {
          if (i % 2 == 0) {
            count++;
          }
        }
        Serial.println(count);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('5\n');
    });
});

// ── Sensor Read Functions ────────────────────────────────────

describe('SketchInterpreter – sensor reading', () => {
    it('reads digitalRead values', () => {
        const { cb } = runSketch(`
      void setup() { pinMode(2, INPUT); }
      void loop() {
        int val = digitalRead(2);
        if (val == 1) {
          Serial.println("triggered");
        }
        delay(10000);
      }
    `, 5, 16.67, { onDigitalRead: (pin) => pin === 2 ? 1 : 0 });
        expect(cb.serial).toContain('triggered\n');
    });

    it('reads analogRead values', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int val = analogRead(A0);
        Serial.println(val);
        delay(10000);
      }
    `, 5, 16.67, { onAnalogRead: (pin) => pin === 14 ? 512 : 0 }); // A0 = pin 14
        expect(cb.serial).toContain('512\n');
    });

    it('uses analogRead in control flow (obstacle avoidance pattern)', () => {
        const { cb } = runSketch(`
      void setup() { pinMode(5, OUTPUT); }
      void loop() {
        int distance = analogRead(A0);
        if (distance < 200) {
          analogWrite(5, 0);
          Serial.println("stop");
        } else {
          analogWrite(5, 255);
          Serial.println("go");
        }
        delay(10000);
      }
    `, 5, 16.67, { onAnalogRead: (pin) => pin === 14 ? 100 : 0 });
        expect(cb.serial).toContain('stop\n');
        expect(cb.pins[5]?.analog).toBe(0);
    });
});

// ── millis() ─────────────────────────────────────────────────

describe('SketchInterpreter – millis()', () => {
    it('returns elapsed time', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int t = millis();
        Serial.println(t);
        delay(10000);
      }
    `, 10, 100); // 10 ticks × 100ms = 1000ms elapsed. Loop runs once setup's done.
        expect(cb.serial.length).toBeGreaterThan(0);
        const val = parseInt(cb.serial[0]);
        expect(val).toBeGreaterThan(0);
    });
});

// ── Utility Functions ────────────────────────────────────────

describe('SketchInterpreter – utility functions', () => {
    it('map() scales values', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int val = map(512, 0, 1023, 0, 255);
        Serial.println(val);
        delay(10000);
      }
    `, 5);
        // 512/1023 * 255 ≈ 127.5 → floor to 127
        const printed = parseInt(cb.serial[0]);
        expect(printed).toBeGreaterThanOrEqual(126);
        expect(printed).toBeLessThanOrEqual(129);
    });

    it('constrain() clamps values', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        Serial.println(constrain(150, 0, 100));
        Serial.println(constrain(-5, 0, 100));
        Serial.println(constrain(50, 0, 100));
        delay(10000);
      }
    `, 5);
        expect(cb.serial[0]).toBe('100\n');
        expect(cb.serial[1]).toBe('0\n');
        expect(cb.serial[2]).toBe('50\n');
    });

    it('abs(), min(), max()', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        Serial.println(abs(-42));
        Serial.println(min(3, 7));
        Serial.println(max(3, 7));
        delay(10000);
      }
    `, 5);
        expect(cb.serial[0]).toBe('42\n');
        expect(cb.serial[1]).toBe('3\n');
        expect(cb.serial[2]).toBe('7\n');
    });
});

// ── #define and const ────────────────────────────────────────

describe('SketchInterpreter – #define and const', () => {
    it('substitutes #define values', () => {
        const { cb } = runSketch(`
      #define LED_PIN 13
      #define SPEED 200
      void setup() { pinMode(LED_PIN, OUTPUT); }
      void loop() {
        analogWrite(LED_PIN, SPEED);
        delay(10000);
      }
    `, 5);
        expect(cb.pins[13]?.mode).toBe('OUTPUT');
        expect(cb.pins[13]?.analog).toBe(200);
    });

    it('handles const int declarations', () => {
        const { cb } = runSketch(`
      const int THRESHOLD = 300;
      void setup() {}
      void loop() {
        int val = THRESHOLD + 50;
        Serial.println(val);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('350\n');
    });
});

// ── User-defined Functions ───────────────────────────────────

describe('SketchInterpreter – user-defined functions', () => {
    it('calls a user-defined void function', () => {
        const { cb } = runSketch(`
      void blinkOn() {
        digitalWrite(13, HIGH);
      }
      void blinkOff() {
        digitalWrite(13, LOW);
      }
      void setup() { pinMode(13, OUTPUT); }
      void loop() {
        blinkOn();
        delay(10000);
      }
    `, 5);
        expect(cb.pins[13]?.digital).toBe(1);
    });
});

// ── Comparison and Logical Operators ─────────────────────────

describe('SketchInterpreter – operators', () => {
    it('comparison operators', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        Serial.println(5 < 10);
        Serial.println(10 <= 10);
        Serial.println(5 > 10);
        Serial.println(5 == 5);
        Serial.println(5 != 3);
        delay(10000);
      }
    `, 5);
        expect(cb.serial[0]).toBe('1\n');
        expect(cb.serial[1]).toBe('1\n');
        expect(cb.serial[2]).toBe('0\n');
        expect(cb.serial[3]).toBe('1\n');
        expect(cb.serial[4]).toBe('1\n');
    });

    it('logical operators', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int a = 1;
        int b = 0;
        if (a && !b) {
          Serial.println("yes");
        }
        if (a || b) {
          Serial.println("or");
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('yes\n');
        expect(cb.serial).toContain('or\n');
    });
});
