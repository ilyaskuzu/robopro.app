import { ComponentRegistry } from './ComponentRegistry';
import { DcMotor, TT_MOTOR_6V } from '../components/motors/DcMotor';
import { StepperMotor } from '../components/motors/StepperMotor';
import { L298N } from '../components/drivers/L298N';
import { L293D } from '../components/drivers/L293D';
import { TB6612FNG } from '../components/drivers/TB6612FNG';
import { DRV8833 } from '../components/drivers/DRV8833';
import { A4988 } from '../components/drivers/A4988';
import { ULN2003 } from '../components/drivers/ULN2003';
import { BatteryPack, BATTERY_4xAA } from '../components/power/BatteryPack';
import { UltrasonicSensor } from '../components/sensors/UltrasonicSensor';
import { IrLineSensor } from '../components/sensors/IrLineSensor';
import { RotaryEncoder } from '../components/sensors/RotaryEncoder';
import { LdrSensor } from '../components/sensors/LdrSensor';
import { Dht11Sensor } from '../components/sensors/Dht11Sensor';
import { Mpu6050Sensor } from '../components/sensors/Mpu6050Sensor';
import { ServoMotor } from '../components/actuators/ServoMotor';
import { Led } from '../components/actuators/Led';
import { Buzzer } from '../components/actuators/Buzzer';
import { SERVO_CATALOG } from '../components/catalog/servoCatalog';
import { MOTOR_CATALOG } from '../components/catalog/motorCatalog';
import { STEPPER_CATALOG } from '../components/catalog/stepperCatalog';

/**
 * Creates a fully populated ComponentRegistry with all known component types.
 * Call once at application startup.
 */
export function createPopulatedRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();

  // ── Motors (DC) ──────────────────────────────────────────────
  // Default TT motor entry
  registry.register({
    type: 'dc-motor',
    category: 'actuator',
    displayName: 'DC Motor (TT 6V)',
    pinManifest: DcMotor.PIN_MANIFEST,
    factory: (id) => new DcMotor(id, TT_MOTOR_6V),
  });

  // Register each cataloged DC motor variant
  for (const entry of MOTOR_CATALOG) {
    if (entry.id === 'tt-motor-6v') continue; // already registered above
    registry.register({
      type: `dc-motor:${entry.id}`,
      category: 'actuator',
      displayName: entry.displayName,
      pinManifest: DcMotor.PIN_MANIFEST,
      factory: (id) => new DcMotor(id, entry.specs),
    });
  }

  // ── Servo Motors ─────────────────────────────────────────────
  for (const entry of SERVO_CATALOG) {
    registry.register({
      type: `servo:${entry.id}`,
      category: 'actuator',
      displayName: entry.displayName,
      pinManifest: ServoMotor.PIN_MANIFEST,
      factory: (id) => new ServoMotor(id, entry.specs),
    });
  }

  // ── Stepper Motors ─────────────────────────────────────────
  for (const entry of STEPPER_CATALOG) {
    registry.register({
      type: `stepper:${entry.id}`,
      category: 'actuator',
      displayName: entry.displayName,
      pinManifest: StepperMotor.PIN_MANIFEST,
      factory: (id) => new StepperMotor(id, entry.specs),
    });
  }

  // ── Actuators ────────────────────────────────────────────────
  registry.register({
    type: 'led',
    category: 'actuator',
    displayName: 'LED',
    pinManifest: Led.PIN_MANIFEST,
    factory: (id) => new Led(id),
  });

  registry.register({
    type: 'buzzer',
    category: 'actuator',
    displayName: 'Piezo Buzzer',
    pinManifest: Buzzer.PIN_MANIFEST,
    factory: (id) => new Buzzer(id),
  });

  // ── Drivers ──────────────────────────────────────────────────
  registry.register({
    type: 'l298n',
    category: 'driver',
    displayName: 'L298N Dual H-Bridge',
    pinManifest: L298N.PIN_MANIFEST,
    factory: (id) => new L298N(id),
  });

  registry.register({
    type: 'l293d',
    category: 'driver',
    displayName: 'L293D Dual H-Bridge',
    pinManifest: L293D.PIN_MANIFEST,
    factory: (id) => new L293D(id),
  });

  registry.register({
    type: 'tb6612fng',
    category: 'driver',
    displayName: 'TB6612FNG Dual Driver',
    pinManifest: TB6612FNG.PIN_MANIFEST,
    factory: (id) => new TB6612FNG(id),
  });

  registry.register({
    type: 'drv8833',
    category: 'driver',
    displayName: 'DRV8833 Dual Driver',
    pinManifest: DRV8833.PIN_MANIFEST,
    factory: (id) => new DRV8833(id),
  });

  registry.register({
    type: 'a4988',
    category: 'driver',
    displayName: 'A4988 Stepper Driver',
    pinManifest: A4988.PIN_MANIFEST,
    factory: (id) => new A4988(id),
  });

  registry.register({
    type: 'uln2003',
    category: 'driver',
    displayName: 'ULN2003 Darlington Array',
    pinManifest: ULN2003.PIN_MANIFEST,
    factory: (id) => new ULN2003(id),
  });

  // ── Sensors ──────────────────────────────────────────────────
  registry.register({
    type: 'ultrasonic',
    category: 'sensor',
    displayName: 'HC-SR04 Ultrasonic',
    pinManifest: UltrasonicSensor.PIN_MANIFEST,
    factory: (id) => new UltrasonicSensor(id),
  });

  registry.register({
    type: 'ir-line',
    category: 'sensor',
    displayName: 'IR Line Sensor (TCRT5000)',
    pinManifest: IrLineSensor.PIN_MANIFEST,
    factory: (id) => new IrLineSensor(id),
  });

  registry.register({
    type: 'rotary-encoder',
    category: 'sensor',
    displayName: 'Rotary Encoder',
    pinManifest: RotaryEncoder.PIN_MANIFEST,
    factory: (id) => new RotaryEncoder(id),
  });

  registry.register({
    type: 'ldr',
    category: 'sensor',
    displayName: 'LDR Light Sensor',
    pinManifest: LdrSensor.PIN_MANIFEST,
    factory: (id) => new LdrSensor(id),
  });

  registry.register({
    type: 'dht11',
    category: 'sensor',
    displayName: 'DHT11 Temperature & Humidity',
    pinManifest: Dht11Sensor.PIN_MANIFEST,
    factory: (id) => new Dht11Sensor(id),
  });

  registry.register({
    type: 'mpu6050',
    category: 'sensor',
    displayName: 'MPU-6050 6-Axis IMU',
    pinManifest: Mpu6050Sensor.PIN_MANIFEST,
    factory: (id) => new Mpu6050Sensor(id),
  });

  // ── Power ────────────────────────────────────────────────────
  registry.register({
    type: 'battery',
    category: 'power',
    displayName: '4×AA Battery Pack',
    pinManifest: BatteryPack.PIN_MANIFEST,
    factory: (id) => new BatteryPack(id, BATTERY_4xAA),
  });

  return registry;
}
