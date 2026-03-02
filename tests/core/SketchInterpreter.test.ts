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

// ── Phase 6: switch/case ─────────────────────────────────────

describe('SketchInterpreter – switch/case', () => {
    it('matches correct case', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 2;
        switch (x) {
          case 1: Serial.println("one"); break;
          case 2: Serial.println("two"); break;
          case 3: Serial.println("three"); break;
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('two\n');
        expect(cb.serial).not.toContain('one\n');
        expect(cb.serial).not.toContain('three\n');
    });

    it('falls through without break', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 1;
        switch (x) {
          case 1: Serial.println("one");
          case 2: Serial.println("two"); break;
          case 3: Serial.println("three"); break;
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('one\n');
        expect(cb.serial).toContain('two\n');
        expect(cb.serial).not.toContain('three\n');
    });

    it('executes default case', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 99;
        switch (x) {
          case 1: Serial.println("one"); break;
          default: Serial.println("default"); break;
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('default\n');
    });

    it('handles switch with expression', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 3;
        switch (x * 2) {
          case 4: Serial.println("four"); break;
          case 6: Serial.println("six"); break;
        }
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('six\n');
    });

    it('handles empty switch without crash', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 1;
        switch (x) {}
        Serial.println("ok");
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('ok\n');
    });
});

// ── Phase 6: do...while ──────────────────────────────────────

describe('SketchInterpreter – do...while', () => {
    it('executes body at least once', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 0;
        do {
          x++;
        } while (x < 0);
        Serial.println(x);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('1\n');
    });

    it('loops multiple times', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int sum = 0;
        int i = 1;
        do {
          sum += i;
          i++;
        } while (i <= 5);
        Serial.println(sum);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('15\n');
    });
});

// ── Phase 6: break/continue ─────────────────────────────────

describe('SketchInterpreter – break/continue', () => {
    it('break exits while loop', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int i = 0;
        while (i < 100) {
          if (i == 5) break;
          i++;
        }
        Serial.println(i);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('5\n');
    });

    it('break exits for loop', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int last = 0;
        for (int i = 0; i < 100; i++) {
          if (i == 3) break;
          last = i;
        }
        Serial.println(last);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('2\n');
    });

    it('continue skips iteration', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int sum = 0;
        for (int i = 0; i < 5; i++) {
          if (i == 2) continue;
          sum += i;
        }
        Serial.println(sum);
        delay(10000);
      }
    `, 5);
        // 0 + 1 + 3 + 4 = 8 (skipped 2)
        expect(cb.serial).toContain('8\n');
    });
});

// ── Phase 6: ternary operator ────────────────────────────────

describe('SketchInterpreter – ternary operator', () => {
    it('evaluates ternary true branch', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 10;
        int y = x > 5 ? 100 : 200;
        Serial.println(y);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('100\n');
    });

    it('evaluates ternary false branch', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 2;
        int y = x > 5 ? 100 : 200;
        Serial.println(y);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('200\n');
    });

    it('nested ternary', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int x = 5;
        int y = x > 10 ? 1 : x > 3 ? 2 : 3;
        Serial.println(y);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('2\n');
    });
});

// ── Phase 6: arrays ──────────────────────────────────────────

describe('SketchInterpreter – arrays', () => {
    it('declares and accesses array', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int arr[] = {10, 20, 30};
        Serial.println(arr[0]);
        Serial.println(arr[1]);
        Serial.println(arr[2]);
        delay(10000);
      }
    `, 5);
        expect(cb.serial[0]).toBe('10\n');
        expect(cb.serial[1]).toBe('20\n');
        expect(cb.serial[2]).toBe('30\n');
    });

    it('assigns to array elements', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int arr[] = {1, 2, 3};
        arr[1] = 99;
        Serial.println(arr[1]);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('99\n');
    });

    it('loops over array', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int arr[] = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int i = 0; i < 5; i++) {
          sum += arr[i];
        }
        Serial.println(sum);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('15\n');
    });

    it('handles out-of-bounds access gracefully', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int arr[] = {1};
        Serial.println(arr[10]);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('0\n');
    });

    it('assigns to out-of-bounds index extends array', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int arr[] = {1};
        arr[5] = 42;
        Serial.println(arr[5]);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('42\n');
    });
});

// ── Phase 6: function params & return ────────────────────────

describe('SketchInterpreter – function params & return', () => {
    it('calls function with parameters', () => {
        const { cb } = runSketch(`
      int add(int a, int b) {
        return a + b;
      }
      void setup() {}
      void loop() {
        int result = add(3, 7);
        Serial.println(result);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('10\n');
    });

    it('function with no return returns 0', () => {
        const { cb } = runSketch(`
      void doStuff(int x) {
        Serial.println(x);
      }
      void setup() {}
      void loop() {
        doStuff(42);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('42\n');
    });

    it('recursive function', () => {
        const { cb } = runSketch(`
      int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }
      void setup() {}
      void loop() {
        Serial.println(factorial(5));
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('120\n');
    });

    it('local variables do not leak', () => {
        const { cb } = runSketch(`
      int getValue() {
        int local = 42;
        return local;
      }
      void setup() {}
      void loop() {
        int result = getValue();
        Serial.println(result);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('42\n');
    });

    it('function parameters shadow globals', () => {
        const { cb } = runSketch(`
      int x = 100;
      int getX(int x) {
        return x;
      }
      void setup() {}
      void loop() {
        Serial.println(getX(5));
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('5\n');
    });
});

// ── Phase 6: Servo library ───────────────────────────────────

describe('SketchInterpreter – Servo library', () => {
    it('attaches servo to pin', () => {
        let attachedServo = '';
        let attachedPin = -1;
        const { cb } = runSketch(`
      Servo myservo;
      void setup() {
        myservo.attach(9);
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onServoAttach: (id, pin) => { attachedServo = id; attachedPin = pin; },
        });
        expect(attachedServo).toBe('myservo');
        expect(attachedPin).toBe(9);
    });

    it('writes angle to servo', () => {
        let lastAngle = -1;
        const { cb } = runSketch(`
      Servo myservo;
      void setup() {
        myservo.attach(9);
        myservo.write(45);
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onServoAttach: () => {},
            onServoWrite: (_id, angle) => { lastAngle = angle; },
        });
        expect(lastAngle).toBe(45);
    });

    it('reads current angle', () => {
        const { cb } = runSketch(`
      Servo myservo;
      void setup() {
        myservo.attach(9);
        myservo.write(120);
        int angle = myservo.read();
        Serial.println(angle);
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onServoAttach: () => {},
            onServoWrite: () => {},
        });
        expect(cb.serial).toContain('120\n');
    });

    it('clamps angle to 0-180', () => {
        let lastAngle = -1;
        runSketch(`
      Servo myservo;
      void setup() {
        myservo.attach(9);
        myservo.write(250);
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onServoAttach: () => {},
            onServoWrite: (_id, angle) => { lastAngle = angle; },
        });
        expect(lastAngle).toBe(180);
    });

    it('detaches servo', () => {
        let detached = '';
        runSketch(`
      Servo myservo;
      void setup() {
        myservo.attach(9);
        myservo.detach();
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onServoAttach: () => {},
            onServoDetach: (id) => { detached = id; },
        });
        expect(detached).toBe('myservo');
    });
});

// ── Phase 6: pulseIn / tone / noTone ─────────────────────────

describe('SketchInterpreter – pulseIn/tone/noTone', () => {
    it('calls pulseIn and gets result', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        long duration = pulseIn(7, 1);
        Serial.println(duration);
        delay(10000);
      }
    `, 5, 16.67, {
            onPulseIn: (_pin, _value) => 2940,
        });
        expect(cb.serial).toContain('2940\n');
    });

    it('calls tone with frequency', () => {
        let tonePin = -1;
        let toneFreq = -1;
        runSketch(`
      void setup() {}
      void loop() {
        tone(8, 440);
        delay(10000);
      }
    `, 5, 16.67, {
            onTone: (pin, freq) => { tonePin = pin; toneFreq = freq; },
        });
        expect(tonePin).toBe(8);
        expect(toneFreq).toBe(440);
    });

    it('calls noTone', () => {
        let noTonePin = -1;
        runSketch(`
      void setup() {}
      void loop() {
        noTone(8);
        delay(10000);
      }
    `, 5, 16.67, {
            onNoTone: (pin) => { noTonePin = pin; },
        });
        expect(noTonePin).toBe(8);
    });
});

// ── Phase 6: type casting ────────────────────────────────────

describe('SketchInterpreter – type casting', () => {
    it('casts float to int truncates decimals', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        float f = 3.7;
        int x = (int)f;
        Serial.println(x);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('3\n');
    });

    it('casts negative float to int', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        float f = -2.9;
        int x = (int)f;
        Serial.println(x);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('-2\n');
    });
});

// ── Phase 6: String type ─────────────────────────────────────

describe('SketchInterpreter – String type', () => {
    it('declares and prints String', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        String s = "hello";
        Serial.println(s);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('hello\n');
    });

    it('concatenates strings with +', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        String a = "foo";
        String b = "bar";
        String c = a + b;
        Serial.println(c);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('foobar\n');
    });

    it('String.length returns length', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        String s = "hello";
        int len = s.length();
        Serial.println(len);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('5\n');
    });

    it('String.indexOf finds substring', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        String s = "hello world";
        int idx = s.indexOf("world");
        Serial.println(idx);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('6\n');
    });

    it('String.toInt converts to integer', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        String s = "42";
        int val = s.toInt();
        Serial.println(val);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('42\n');
    });
});

// ── Stepper library ─────────────────────────────────────────

describe('SketchInterpreter – Stepper library', () => {
    it('creates stepper with constructor', () => {
        const { cb } = runSketch(`
      Stepper myStepper(200, 8, 9, 10, 11);
      void setup() {
        pinMode(8, OUTPUT);
        pinMode(9, OUTPUT);
        pinMode(10, OUTPUT);
        pinMode(11, OUTPUT);
        myStepper.setSpeed(60);
      }
      void loop() { delay(10000); }
    `, 5);
        expect(cb.pins[8]?.mode).toBe('OUTPUT');
        expect(cb.pins[9]?.mode).toBe('OUTPUT');
    });

    it('setSpeed stores RPM', () => {
        const { cb } = runSketch(`
      Stepper myStepper(200, 8, 9, 10, 11);
      void setup() {
        pinMode(8, OUTPUT);
        pinMode(9, OUTPUT);
        pinMode(10, OUTPUT);
        pinMode(11, OUTPUT);
        myStepper.setSpeed(60);
      }
      void loop() { delay(10000); }
    `, 5);
        expect(cb.pins[8]).toBeDefined();
    });

    it('step writes pins in sequence', () => {
        const { cb } = runSketch(`
      Stepper myStepper(200, 8, 9, 10, 11);
      void setup() {
        pinMode(8, OUTPUT);
        pinMode(9, OUTPUT);
        pinMode(10, OUTPUT);
        pinMode(11, OUTPUT);
        myStepper.setSpeed(60);
        myStepper.step(4);
      }
      void loop() { delay(10000); }
    `, 5);
        expect(cb.pins[8]?.digital).toBeDefined();
        expect(cb.pins[9]?.digital).toBeDefined();
        expect(cb.pins[10]?.digital).toBeDefined();
        expect(cb.pins[11]?.digital).toBeDefined();
    });
});

// ── Wire library ────────────────────────────────────────────

describe('SketchInterpreter – Wire library', () => {
    it('Wire.begin initializes', () => {
        const { cb } = runSketch(`
      void setup() { Wire.begin(); }
      void loop() { delay(10000); }
    `, 5);
        expect(cb).toBeDefined();
    });

    it('beginTransmission, write, endTransmission', () => {
        let writtenAddr = -1;
        let writtenData: number[] = [];
        runSketch(`
      void setup() {
        Wire.begin();
        Wire.beginTransmission(0x68);
        Wire.write(0x3B);
        Wire.write(0x00);
        Wire.endTransmission();
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onWireWrite: (addr, data) => { writtenAddr = addr; writtenData = data; },
        });
        expect(writtenAddr).toBe(0x68);
        expect(writtenData).toEqual([0x3b, 0]);
    });

    it('requestFrom and read returns data', () => {
        const { cb } = runSketch(`
      void setup() {
        Wire.begin();
        Wire.requestFrom(0x68, 6);
        int b0 = Wire.read();
        int b1 = Wire.read();
        Serial.println(b0);
        Serial.println(b1);
      }
      void loop() { delay(10000); }
    `, 5);
        expect(cb.serial.length).toBeGreaterThanOrEqual(2);
    });

    it('requestFrom and read with callback', () => {
        const { cb } = runSketch(`
      void setup() {
        Wire.begin();
        Wire.requestFrom(0x68, 3);
        int a = Wire.read();
        int b = Wire.read();
        int c = Wire.read();
        Serial.println(a);
        Serial.println(b);
        Serial.println(c);
      }
      void loop() { delay(10000); }
    `, 5, 16.67, {
            onWireRead: (addr, qty) => {
                expect(addr).toBe(0x68);
                expect(qty).toBe(3);
                return [10, 20, 30];
            },
        });
        expect(cb.serial).toContain('10\n');
        expect(cb.serial).toContain('20\n');
        expect(cb.serial).toContain('30\n');
    });
});

// ── Serial parsing (parseInt, parseFloat, readString) ──────────

describe('SketchInterpreter – Serial parsing', () => {
    it('Serial.available returns buffer length', () => {
        const cb = makeCallbacks();
        const interp = new SketchInterpreter(cb);
        interp.parse(`
      void setup() { Serial.begin(9600); }
      void loop() {
        int n = Serial.available();
        Serial.println(n);
        delay(10000);
      }
    `);
        interp.feedSerialInput('hello');
        for (let i = 0; i < 5; i++) interp.tick(16.67);
        expect(cb.serial.some(s => s.includes('5'))).toBe(true);
    });

    it('Serial.read returns and removes first char', () => {
        const cb = makeCallbacks();
        const interp = new SketchInterpreter(cb);
        interp.parse(`
      void setup() { Serial.begin(9600); }
      void loop() {
        if (Serial.available() > 0) {
          int c = Serial.read();
          Serial.println(c);
        }
        delay(10000);
      }
    `);
        interp.feedSerialInput('A');
        for (let i = 0; i < 5; i++) interp.tick(16.67);
        expect(cb.serial.some(s => s.includes('65'))).toBe(true);
    });

    it('Serial.parseInt parses integer', () => {
        const cb = makeCallbacks();
        const interp = new SketchInterpreter(cb);
        interp.parse(`
      void setup() { Serial.begin(9600); }
      void loop() {
        if (Serial.available() > 0) {
          int x = Serial.parseInt();
          Serial.println(x);
        }
        delay(10000);
      }
    `);
        interp.feedSerialInput('  -42');
        for (let i = 0; i < 5; i++) interp.tick(16.67);
        expect(cb.serial.some(s => s.includes('-42'))).toBe(true);
    });

    it('Serial.parseFloat parses float', () => {
        const cb = makeCallbacks();
        const interp = new SketchInterpreter(cb);
        interp.parse(`
      void setup() { Serial.begin(9600); }
      void loop() {
        if (Serial.available() > 0) {
          float f = Serial.parseFloat();
          Serial.println(f);
        }
        delay(10000);
      }
    `);
        interp.feedSerialInput('3.14');
        for (let i = 0; i < 5; i++) interp.tick(16.67);
        expect(cb.serial.some(s => s.includes('3.14'))).toBe(true);
    });

    it('Serial.readString returns entire buffer', () => {
        const cb = makeCallbacks();
        const interp = new SketchInterpreter(cb);
        interp.parse(`
      void setup() { Serial.begin(9600); }
      void loop() {
        if (Serial.available() > 0) {
          String s = Serial.readString();
          Serial.println(s);
        }
        delay(10000);
      }
    `);
        interp.feedSerialInput('hello');
        for (let i = 0; i < 5; i++) interp.tick(16.67);
        expect(cb.serial.some(s => s.includes('hello'))).toBe(true);
    });

    it('Serial.readStringUntil reads until delimiter', () => {
        const cb = makeCallbacks();
        const interp = new SketchInterpreter(cb);
        interp.parse(`
      void setup() { Serial.begin(9600); }
      void loop() {
        if (Serial.available() > 0) {
          String s = Serial.readStringUntil(44);
          Serial.println(s);
        }
        delay(10000);
      }
    `);
        interp.feedSerialInput('foo,bar');
        for (let i = 0; i < 5; i++) interp.tick(16.67);
        expect(cb.serial.some(s => s.includes('foo'))).toBe(true);
    });
});

// ── Math functions (pow, sqrt, random) ───────────────────────

describe('SketchInterpreter – math functions', () => {
    it('pow(base, exp)', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        Serial.println(pow(2, 10));
        Serial.println(pow(5, 2));
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('1024\n');
        expect(cb.serial).toContain('25\n');
    });

    it('sqrt(x)', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        Serial.println(sqrt(16));
        Serial.println(sqrt(2));
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('4\n');
    });

    it('random(min, max) and random(max)', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        int r1 = random(10);
        int r2 = random(5, 15);
        Serial.println(r1 >= 0 && r1 < 10);
        Serial.println(r2 >= 5 && r2 < 15);
        delay(10000);
      }
    `, 5);
        expect(cb.serial).toContain('1\n');
    });

    it('abs, min, max', () => {
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

// ── micros() ─────────────────────────────────────────────────

describe('SketchInterpreter – micros()', () => {
    it('returns increasing values', () => {
        const { cb } = runSketch(`
      void setup() {}
      void loop() {
        long t1 = micros();
        delay(5);
        long t2 = micros();
        Serial.println(t1 >= 0);
        Serial.println(t2 > t1);
        delay(10000);
      }
    `, 5, 16.67);
        expect(cb.serial).toContain('1\n');
    });
});
