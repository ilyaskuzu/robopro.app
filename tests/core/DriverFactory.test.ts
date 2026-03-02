import { describe, it, expect } from 'vitest';
import { createDriver, getDriverWiring, getSupportedDriverIds } from '../../core/components/drivers/DriverFactory';
import { L298N } from '../../core/components/drivers/L298N';
import { L293D } from '../../core/components/drivers/L293D';
import { TB6612FNG } from '../../core/components/drivers/TB6612FNG';
import { DRV8833 } from '../../core/components/drivers/DRV8833';
import { A4988 } from '../../core/components/drivers/A4988';
import { ULN2003 } from '../../core/components/drivers/ULN2003';

describe('DriverFactory', () => {
  describe('createDriver', () => {
    it('creates L298N from catalog ID', () => {
      const driver = createDriver('l298n', 'test-driver');
      expect(driver).toBeInstanceOf(L298N);
      expect(driver.id).toBe('test-driver');
    });

    it('creates L293D from catalog ID', () => {
      const driver = createDriver('l293d', 'test-driver');
      expect(driver).toBeInstanceOf(L293D);
      expect(driver.id).toBe('test-driver');
    });

    it('creates TB6612FNG from catalog ID', () => {
      const driver = createDriver('tb6612fng', 'test-driver');
      expect(driver).toBeInstanceOf(TB6612FNG);
      expect(driver.id).toBe('test-driver');
    });

    it('creates DRV8833 from catalog ID', () => {
      const driver = createDriver('drv8833', 'test-driver');
      expect(driver).toBeInstanceOf(DRV8833);
      expect(driver.id).toBe('test-driver');
    });

    it('creates A4988 from catalog ID', () => {
      const driver = createDriver('a4988', 'test-driver');
      expect(driver).toBeInstanceOf(A4988);
      expect(driver.id).toBe('test-driver');
    });

    it('creates ULN2003 from catalog ID', () => {
      const driver = createDriver('uln2003', 'test-driver');
      expect(driver).toBeInstanceOf(ULN2003);
      expect(driver.id).toBe('test-driver');
    });

    it('throws for unknown catalog ID', () => {
      expect(() => createDriver('unknown', 'x')).toThrow('Unknown driver catalog ID');
    });
  });

  describe('getDriverWiring', () => {
    it('returns L298N wiring with 6 connections', () => {
      const wiring = getDriverWiring('l298n');
      expect(wiring.pinMap).toHaveLength(6);
      const pinNames = wiring.pinMap.map(p => p.driverPin);
      expect(pinNames).toContain('ENA');
      expect(pinNames).toContain('ENB');
      expect(pinNames).toContain('IN1');
      expect(pinNames).toContain('IN2');
      expect(pinNames).toContain('IN3');
      expect(pinNames).toContain('IN4');
    });

    it('returns L293D wiring with EN1/EN2 pin names', () => {
      const wiring = getDriverWiring('l293d');
      const pinNames = wiring.pinMap.map(p => p.driverPin);
      expect(pinNames).toContain('EN1');
      expect(pinNames).toContain('EN2');
    });

    it('returns TB6612FNG wiring with 7 connections including STBY', () => {
      const wiring = getDriverWiring('tb6612fng');
      expect(wiring.pinMap).toHaveLength(7);
      const pinNames = wiring.pinMap.map(p => p.driverPin);
      expect(pinNames).toContain('PWMA');
      expect(pinNames).toContain('STBY');
    });

    it('returns DRV8833 wiring with 5 connections including nSLEEP', () => {
      const wiring = getDriverWiring('drv8833');
      expect(wiring.pinMap).toHaveLength(5);
      const pinNames = wiring.pinMap.map(p => p.driverPin);
      expect(pinNames).toContain('nSLEEP');
    });

    it('returns A4988 wiring with 7 connections including STEP and DIR', () => {
      const wiring = getDriverWiring('a4988');
      expect(wiring.pinMap).toHaveLength(7);
      const pinNames = wiring.pinMap.map(p => p.driverPin);
      expect(pinNames).toContain('STEP');
      expect(pinNames).toContain('DIR');
    });

    it('returns ULN2003 wiring with 4 connections (IN1–IN4)', () => {
      const wiring = getDriverWiring('uln2003');
      expect(wiring.pinMap).toHaveLength(4);
      const pinNames = wiring.pinMap.map(p => p.driverPin);
      expect(pinNames).toContain('IN1');
      expect(pinNames).toContain('IN4');
    });

    it('throws for unknown driver ID', () => {
      expect(() => getDriverWiring('unknown')).toThrow('No default wiring');
    });
  });

  describe('getSupportedDriverIds', () => {
    it('returns all six driver types', () => {
      const ids = getSupportedDriverIds();
      expect(ids).toHaveLength(6);
      expect(ids).toContain('l298n');
      expect(ids).toContain('l293d');
      expect(ids).toContain('tb6612fng');
      expect(ids).toContain('drv8833');
      expect(ids).toContain('a4988');
      expect(ids).toContain('uln2003');
    });
  });

  describe('driver pin manifests', () => {
    it('DC motor drivers expose OUT_A, OUT_B, DIR_A, DIR_B outputs', () => {
      const dcDriverIds = ['l298n', 'l293d', 'tb6612fng', 'drv8833'];
      for (const id of dcDriverIds) {
        const driver = createDriver(id, `test-${id}`);
        const outputNames = driver.pinManifest
          .filter(p => p.direction === 'output')
          .map(p => p.name);
        expect(outputNames).toContain('OUT_A');
        expect(outputNames).toContain('OUT_B');
        expect(outputNames).toContain('DIR_A');
        expect(outputNames).toContain('DIR_B');
      }
    });

    it('A4988 exposes OUT_STEP and OUT_DIR outputs', () => {
      const driver = createDriver('a4988', 'test-a4988');
      const outputNames = driver.pinManifest
        .filter(p => p.direction === 'output')
        .map(p => p.name);
      expect(outputNames).toContain('OUT_STEP');
      expect(outputNames).toContain('OUT_DIR');
    });

    it('ULN2003 exposes OUT1–OUT4 outputs', () => {
      const driver = createDriver('uln2003', 'test-uln2003');
      const outputNames = driver.pinManifest
        .filter(p => p.direction === 'output')
        .map(p => p.name);
      expect(outputNames).toContain('OUT1');
      expect(outputNames).toContain('OUT4');
    });

    it('driver wiring only maps input pins', () => {
      for (const id of getSupportedDriverIds()) {
        const driver = createDriver(id, `test-${id}`);
        const wiring = getDriverWiring(id);
        const inputPinNames = driver.pinManifest
          .filter(p => p.direction === 'input')
          .map(p => p.name);
        for (const { driverPin } of wiring.pinMap) {
          expect(inputPinNames).toContain(driverPin);
        }
      }
    });
  });
});
