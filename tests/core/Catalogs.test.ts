import { describe, it, expect } from 'vitest';
import {
  MOTOR_CATALOG, findMotor,
  SERVO_CATALOG, findServo,
  DRIVER_CATALOG, findDriver,
  SENSOR_CATALOG, findSensor,
  BATTERY_CATALOG, findBattery,
  MCU_CATALOG, findMcu,
  findComponentSpec,
} from '../../core/components/catalog/index';

describe('Component Catalogs', () => {
  describe('Motor Catalog', () => {
    it('has 16 entries', () => {
      expect(MOTOR_CATALOG.length).toBe(16);
    });

    it('each entry has valid specs', () => {
      for (const m of MOTOR_CATALOG) {
        expect(m.specs.stallTorque).toBeGreaterThan(0);
        expect(m.specs.noLoadRpm).toBeGreaterThan(0);
        expect(m.specs.nominalVoltage).toBeGreaterThan(0);
        expect(m.specs.armatureResistance).toBeGreaterThan(0);
      }
    });

    it('findMotor returns correct entry', () => {
      expect(findMotor('tt-motor-6v')?.displayName).toBe('TT Motor (6V, 1:48)');
    });

    it('findMotor returns undefined for missing', () => {
      expect(findMotor('nonexistent')).toBeUndefined();
    });

    it('TT Motor matches existing TT_MOTOR_6V specs', () => {
      const tt = findMotor('tt-motor-6v')!;
      expect(tt.specs.stallTorque).toBe(0.078);
      expect(tt.specs.noLoadRpm).toBe(200);
      expect(tt.specs.nominalVoltage).toBe(6);
      expect(tt.specs.armatureResistance).toBe(7.5);
    });

    it('all IDs are unique', () => {
      const ids = MOTOR_CATALOG.map(m => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Servo Catalog', () => {
    it('has 8 entries', () => {
      expect(SERVO_CATALOG.length).toBe(8);
    });

    it('findServo works', () => {
      expect(findServo('sg90')?.specs.maxAngleDeg).toBe(180);
    });

    it('MG996R has high torque', () => {
      expect(findServo('mg996r')?.specs.stallTorqueKgCm).toBe(10);
    });
  });

  describe('Driver Catalog', () => {
    it('has 7 entries', () => {
      expect(DRIVER_CATALOG.length).toBe(7);
    });

    it('findDriver works', () => {
      expect(findDriver('l298n')?.specs.voltageDrop).toBe(1.4);
    });

    it('DRV8833 has lowest voltage drop', () => {
      const drops = DRIVER_CATALOG.map(d => d.specs.voltageDrop);
      expect(Math.min(...drops)).toBe(0.2);
    });
  });

  describe('Sensor Catalog', () => {
    it('has 15 entries', () => {
      expect(SENSOR_CATALOG.length).toBe(15);
    });

    it('findSensor works', () => {
      expect(findSensor('hc-sr04')?.specs.sensorType).toBe('ultrasonic');
    });
  });

  describe('Battery Catalog', () => {
    it('has 12 entries', () => {
      expect(BATTERY_CATALOG.length).toBe(12);
    });

    it('findBattery works', () => {
      expect(findBattery('4xaa-alkaline')?.specs.nominalVoltage).toBe(6);
    });

    it('USB supply has infinite capacity', () => {
      const usb = findBattery('usb-5v')!;
      expect(usb.specs.capacityAh).toBe(Infinity);
    });
  });

  describe('MCU Catalog', () => {
    it('has 7 entries', () => {
      expect(MCU_CATALOG.length).toBe(7);
    });

    it('findMcu works', () => {
      expect(findMcu('arduino-uno')?.specs.chipName).toBe('ATmega328P');
    });

    it('ESP32 has highest clock', () => {
      const esp = findMcu('esp32-devkit')!;
      expect(esp.specs.clockHz).toBe(240_000_000);
    });

    it('Mega has most digital pins', () => {
      const mega = findMcu('arduino-mega')!;
      expect(mega.specs.digitalPinCount).toBe(54);
    });
  });

  describe('Generic lookup', () => {
    it('findComponentSpec finds by category + id', () => {
      expect(findComponentSpec('dc-motor', 'tt-motor-6v')).toBeDefined();
      expect(findComponentSpec('battery', 'usb-5v')).toBeDefined();
      expect(findComponentSpec('mcu', 'esp32-devkit')).toBeDefined();
    });

    it('returns undefined for missing entries', () => {
      expect(findComponentSpec('dc-motor', 'doesnt-exist')).toBeUndefined();
    });
  });
});
