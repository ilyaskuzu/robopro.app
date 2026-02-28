/**
 * Runs the full simulation with the default sketch and verifies the motion log
 * matches expected behaviour: Forward 2s → Stop 1s → Pivot 2s → Stop 1s (loop).
 * Uses core + sketch only (no Zustand stores) so path aliases are not required.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createMcu } from '../../core/mcu/McuFactory';
import type { IMicrocontroller } from '../../core/mcu/interfaces/IMicrocontroller';
import { DcMotor, TT_MOTOR_6V } from '../../core/components/motors/DcMotor';
import { L298N } from '../../core/components/drivers/L298N';
import { BatteryPack, BATTERY_4xAA } from '../../core/components/power/BatteryPack';
import { WiringGraph } from '../../core/simulation/WiringGraph';
import { SimulationLoop } from '../../core/simulation/SimulationLoop';
import type { SimulationConfig } from '../../core/simulation/SimulationLoop';
import { SketchInterpreter } from '../../core/sketch/SketchInterpreter';
import type { SketchCallbacks } from '../../core/sketch/SketchInterpreter';
import { ARDUINO_UNO_CLOCK_HZ } from '../../core/mcu/avr/ArduinoUnoBoard';
import type { IComponent } from '../../core/components/interfaces/IComponent';

const FIXED_DT = 1 / 60;
const TICKS_PER_SEC = 60;
const DT_MS = FIXED_DT * 1000;

const DEFAULT_SKETCH = `void setup() {
  pinMode(5, OUTPUT);
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  digitalWrite(7, HIGH);
  digitalWrite(8, LOW);
  digitalWrite(9, HIGH);
  digitalWrite(10, LOW);
  analogWrite(5, 200);
  analogWrite(6, 200);
  delay(2000);
  analogWrite(5, 0);
  analogWrite(6, 0);
  delay(1000);
  digitalWrite(7, LOW);
  digitalWrite(8, HIGH);
  digitalWrite(9, HIGH);
  digitalWrite(10, LOW);
  analogWrite(5, 200);
  analogWrite(6, 200);
  delay(2000);
  analogWrite(5, 0);
  analogWrite(6, 0);
  delay(1000);
}
`;

interface LogEntry {
  tick: number;
  x: number;
  z: number;
  thetaDeg: number;
  v: number;
}

function bootstrap(): { loop: SimulationLoop; interpreter: SketchInterpreter; config: SimulationConfig } {
  const mcu: IMicrocontroller = createMcu('arduino-uno');

  const motorLeft = new DcMotor('motor-left', TT_MOTOR_6V);
  const motorRight = new DcMotor('motor-right', TT_MOTOR_6V);
  const driver = new L298N('driver');
  const battery = new BatteryPack('battery', BATTERY_4xAA);
  const components = new Map<string, IComponent>([
    ['driver', driver],
    ['motor-left', motorLeft],
    ['motor-right', motorRight],
    ['battery', battery],
  ]);

  const wiring = new WiringGraph();
  [[5, 'driver', 'ENA'], [6, 'driver', 'ENB'], [7, 'driver', 'IN1'], [8, 'driver', 'IN2'], [9, 'driver', 'IN3'], [10, 'driver', 'IN4']].forEach(([m, c, p]) => {
    wiring.addConnection(m as number, c as string, p as string);
  });

  const backEmfConstant = TT_MOTOR_6V.nominalVoltage / (TT_MOTOR_6V.noLoadRpm * Math.PI / 30);
  const mass = 0.3;
  const wheelRadius = 0.033;
  const trackWidth = 0.13;
  const chassisLength = 0.19;
  const chassisWidth = 0.18;
  const momentOfInertia = (1 / 12) * mass * (chassisLength ** 2 + chassisWidth ** 2);

  const config: SimulationConfig = {
    fixedDt: FIXED_DT,
    mcuCyclesPerStep: Math.round(ARDUINO_UNO_CLOCK_HZ * FIXED_DT),
    motorSpec: {
      stallTorque: TT_MOTOR_6V.stallTorque,
      noLoadRpm: TT_MOTOR_6V.noLoadRpm,
      nominalVoltage: TT_MOTOR_6V.nominalVoltage,
      armatureResistance: TT_MOTOR_6V.armatureResistance,
      backEmfConstant,
    },
    loadSpec: { mass, wheelRadius, staticFrictionCoeff: 0.15, kineticFrictionCoeff: 0.12 },
    environment: { gravity: 9.81, dt: FIXED_DT },
    vehicleSpec: {
      mass,
      momentOfInertia,
      wheelRadius,
      trackWidth,
      longitudinalDrag: 0.05,
      gravity: 9.81,
    },
    batteryVoltage: BATTERY_4xAA.nominalVoltage,
    batteryInternalResistance: BATTERY_4xAA.internalResistance,
    driverVoltageDrop: L298N.VOLTAGE_DROP,
  };

  const loop = new SimulationLoop(mcu, components, wiring, config);
  loop.setDriverMotorMappings([
    { driverId: 'driver', channelIndex: 0, motorId: 'motor-left' },
    { driverId: 'driver', channelIndex: 1, motorId: 'motor-right' },
  ]);

  const callbacks: SketchCallbacks = {
    onPinMode: () => {},
    onDigitalWrite: (pin, value) => mcu.writePin(pin, value),
    onAnalogWrite: (pin, value) => {
      const normalized = value / 255;
      mcu.writePin(pin, normalized);
      const mcuPin = mcu.getPin(pin);
      if (mcuPin) {
        mcuPin.pwmDutyCycle = normalized;
        mcuPin.mode = 'pwm';
        mcuPin.value = normalized;
      }
    },
    onSerialPrint: () => {},
  };
  const interpreter = new SketchInterpreter(callbacks);
  interpreter.parse(DEFAULT_SKETCH);

  return { loop, interpreter, config };
}

function entryAtTick(log: LogEntry[], tick: number): LogEntry | undefined {
  return log.find((e) => e.tick >= tick);
}

describe('Simulation motion log vs expected behaviour', () => {
  let motionLog: LogEntry[];

  beforeAll(() => {
    const { loop, interpreter, config } = bootstrap();
    motionLog = [];
    const totalTicks = 8 * TICKS_PER_SEC;
    for (let tick = 1; tick <= totalTicks; tick++) {
      interpreter.tick(DT_MS);
      const snapshot = loop.step();
      const body = snapshot.rigidBodyState;
      if (body) {
        motionLog.push({
          tick,
          x: body.x,
          z: body.z,
          thetaDeg: (body.theta * 180) / Math.PI,
          v: body.v,
        });
      }
    }
  });

  it('has motion log entries after running', () => {
    expect(motionLog.length).toBeGreaterThan(100);
  });

  it('phase 1 (0–2s forward): x increases, heading ~0°', () => {
    const at1s = entryAtTick(motionLog, 1 * TICKS_PER_SEC);
    const at2s = entryAtTick(motionLog, 2 * TICKS_PER_SEC);
    expect(at1s).toBeDefined();
    expect(at2s).toBeDefined();
    expect(at2s!.x).toBeGreaterThan(at1s!.x);
    expect(Math.abs(at1s!.thetaDeg)).toBeLessThan(15);
    expect(Math.abs(at2s!.thetaDeg)).toBeLessThan(15);
  });

  it('phase 2 (2–3s stop): velocity decreases (motors off, drag)', () => {
    const at2s = entryAtTick(motionLog, 2 * TICKS_PER_SEC);
    const at3s = entryAtTick(motionLog, 3 * TICKS_PER_SEC);
    expect(at2s).toBeDefined();
    expect(at3s).toBeDefined();
    expect(Math.abs(at3s!.v)).toBeLessThanOrEqual(Math.abs(at2s!.v) + 0.02);
  });

  it('phase 3 (3–5s pivot): heading increases (turn left)', () => {
    const at3s = entryAtTick(motionLog, 3 * TICKS_PER_SEC);
    const at4s = entryAtTick(motionLog, 4 * TICKS_PER_SEC);
    const at5s = entryAtTick(motionLog, 5 * TICKS_PER_SEC);
    expect(at3s).toBeDefined();
    expect(at5s).toBeDefined();
    expect(at5s!.thetaDeg).toBeGreaterThan(at3s!.thetaDeg);
    if (at4s) expect(at4s!.thetaDeg).toBeGreaterThan(at3s!.thetaDeg);
  });

  it('phase 4 (5–6s stop): velocity near zero', () => {
    const at5s = entryAtTick(motionLog, 5 * TICKS_PER_SEC);
    const at6s = entryAtTick(motionLog, 6 * TICKS_PER_SEC);
    expect(at5s).toBeDefined();
    expect(at6s).toBeDefined();
    expect(Math.abs(at6s!.v)).toBeLessThan(0.15);
  });

  it('second cycle (6–8s): forward again, x does not decrease', () => {
    const at6s = entryAtTick(motionLog, 6 * TICKS_PER_SEC);
    const at8s = entryAtTick(motionLog, 8 * TICKS_PER_SEC);
    expect(at6s).toBeDefined();
    expect(at8s).toBeDefined();
    expect(at8s!.x).toBeGreaterThanOrEqual(at6s!.x - 0.02);
  });
});
