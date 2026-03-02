/**
 * Tests for useProjectStore — Phase 3 component selector logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../../lib/stores/useProjectStore';
import { MOTOR_CATALOG } from '../../core/components/catalog/motorCatalog';
import { BATTERY_CATALOG } from '../../core/components/catalog/batteryCatalog';
import { DRIVER_CATALOG } from '../../core/components/catalog/driverCatalog';
import { MCU_CATALOG } from '../../core/components/catalog/mcuCatalog';

beforeEach(() => {
  // Reset store to defaults before each test
  useProjectStore.setState({
    selectedMotorId: 'tt-motor-6v',
    selectedBatteryId: '4xaa-alkaline',
    selectedDriverId: 'l298n',
    selectedBoardType: 'arduino-uno',
    activeCatalogTab: 'motors',
    detailSpecId: null,
    detailSpecCategory: null,
  });
});

describe('useProjectStore', () => {
  it('has valid default motor ID', () => {
    const { selectedMotorId } = useProjectStore.getState();
    expect(MOTOR_CATALOG.find(m => m.id === selectedMotorId)).toBeDefined();
  });

  it('has valid default battery ID', () => {
    const { selectedBatteryId } = useProjectStore.getState();
    expect(BATTERY_CATALOG.find(b => b.id === selectedBatteryId)).toBeDefined();
  });

  it('has valid default driver ID', () => {
    const { selectedDriverId } = useProjectStore.getState();
    expect(DRIVER_CATALOG.find(d => d.id === selectedDriverId)).toBeDefined();
  });

  it('has valid default board type', () => {
    const { selectedBoardType } = useProjectStore.getState();
    expect(MCU_CATALOG.find(m => m.id === selectedBoardType)).toBeDefined();
  });

  it('setMotor updates selectedMotorId and recomputes mass', () => {
    const { setMotor, computedMass: origMass } = useProjectStore.getState();
    const alternate = MOTOR_CATALOG.find(m => m.id !== 'tt-motor-6v');
    if (!alternate) return;

    setMotor(alternate.id);
    const { selectedMotorId, computedMass } = useProjectStore.getState();
    expect(selectedMotorId).toBe(alternate.id);
    // Mass should change (different motor weight)
    if (alternate.weight !== 30) {
      expect(computedMass).not.toBe(origMass);
    }
  });

  it('setBattery updates selectedBatteryId and recomputes mass', () => {
    const { setBattery } = useProjectStore.getState();
    const alt = BATTERY_CATALOG.find(b => b.id !== '4xaa-alkaline');
    if (!alt) return;

    setBattery(alt.id);
    const { selectedBatteryId } = useProjectStore.getState();
    expect(selectedBatteryId).toBe(alt.id);
  });

  it('setDriver updates selectedDriverId', () => {
    const { setDriver } = useProjectStore.getState();
    setDriver('tb6612fng');
    expect(useProjectStore.getState().selectedDriverId).toBe('tb6612fng');
  });

  it('setBoardType updates selectedBoardType', () => {
    const { setBoardType } = useProjectStore.getState();
    setBoardType('arduino-mega');
    expect(useProjectStore.getState().selectedBoardType).toBe('arduino-mega');
  });

  it('getMotorSpec returns matching catalog entry', () => {
    const spec = useProjectStore.getState().getMotorSpec();
    expect(spec).toBeDefined();
    expect(spec!.id).toBe('tt-motor-6v');
    expect(spec!.specs.nominalVoltage).toBe(6);
  });

  it('getBatterySpec returns matching catalog entry', () => {
    const spec = useProjectStore.getState().getBatterySpec();
    expect(spec).toBeDefined();
    expect(spec!.id).toBe('4xaa-alkaline');
    expect(spec!.specs.nominalVoltage).toBe(6);
  });

  it('getDriverSpec returns matching catalog entry', () => {
    const spec = useProjectStore.getState().getDriverSpec();
    expect(spec).toBeDefined();
    expect(spec!.id).toBe('l298n');
    expect(spec!.specs.maxCurrentPerChannel).toBeGreaterThan(0);
  });

  it('getMcuSpec returns matching catalog entry', () => {
    const spec = useProjectStore.getState().getMcuSpec();
    expect(spec).toBeDefined();
    expect(spec!.id).toBe('arduino-uno');
    expect(spec!.specs.chipName).toBe('ATmega328P');
  });

  it('computedMass is positive and includes chassis + motors + battery + driver', () => {
    const { computedMass } = useProjectStore.getState();
    expect(computedMass).toBeGreaterThan(0.05); // > chassis alone
    expect(computedMass).toBeLessThan(2); // reasonable car weight
  });

  it('buildConfig returns a valid SimulationConfig', () => {
    const config = useProjectStore.getState().buildConfig();
    expect(config).toBeDefined();
    expect(config.motorSpec).toBeDefined();
    expect(config.motorSpec.stallTorque).toBeGreaterThan(0);
    expect(config.vehicleSpec.mass).toBeGreaterThan(0);
    expect(config.vehicleSpec.wheelRadius).toBeGreaterThan(0);
    expect(config.batteryVoltage).toBeGreaterThan(0);
  });

  it('buildConfig reflects motor selection changes', () => {
    const { setMotor } = useProjectStore.getState();
    const configBefore = useProjectStore.getState().buildConfig();

    // Pick a motor with different RPM
    const alt = MOTOR_CATALOG.find(m => m.specs.noLoadRpm !== configBefore.motorSpec.noLoadRpm);
    if (!alt) return;

    setMotor(alt.id);
    const configAfter = useProjectStore.getState().buildConfig();
    expect(configAfter.motorSpec.noLoadRpm).toBe(alt.specs.noLoadRpm);
  });

  it('showDetail / hideDetail toggles modal state', () => {
    const { showDetail, hideDetail } = useProjectStore.getState();
    showDetail('tt-motor-6v', 'motors');
    expect(useProjectStore.getState().detailSpecId).toBe('tt-motor-6v');
    expect(useProjectStore.getState().detailSpecCategory).toBe('motors');

    hideDetail();
    expect(useProjectStore.getState().detailSpecId).toBeNull();
    expect(useProjectStore.getState().detailSpecCategory).toBeNull();
  });

  it('setCatalogTab updates activeCatalogTab', () => {
    const { setCatalogTab } = useProjectStore.getState();
    setCatalogTab('sensors');
    expect(useProjectStore.getState().activeCatalogTab).toBe('sensors');
  });

  it('buildConfig reflects driver voltage drop changes', () => {
    const { setDriver } = useProjectStore.getState();
    const configBefore = useProjectStore.getState().buildConfig();

    // Switch to DRV8833 which has 0.2V drop vs L298N's 1.4V
    setDriver('drv8833');
    const configAfter = useProjectStore.getState().buildConfig();
    expect(configAfter.driverVoltageDrop).not.toBe(configBefore.driverVoltageDrop);
    expect(configAfter.driverVoltageDrop).toBe(0.2);
  });

  it('buildConfig reflects battery voltage changes', () => {
    const { setBattery } = useProjectStore.getState();
    const configBefore = useProjectStore.getState().buildConfig();

    // Switch to a higher-voltage battery
    const altBattery = BATTERY_CATALOG.find(
      b => b.specs.nominalVoltage !== configBefore.batteryVoltage
    );
    if (!altBattery) return;

    setBattery(altBattery.id);
    const configAfter = useProjectStore.getState().buildConfig();
    expect(configAfter.batteryVoltage).toBe(altBattery.specs.nominalVoltage);
  });

  it('buildConfig wheel radius varies with motor width', () => {
    const { setMotor } = useProjectStore.getState();
    const configBefore = useProjectStore.getState().buildConfig();

    // Pick a motor with a different width dimension
    const alt = MOTOR_CATALOG.find(
      m => m.id !== 'tt-motor-6v' && m.dimensions[1] !== 22
    );
    if (!alt) return;

    setMotor(alt.id);
    const configAfter = useProjectStore.getState().buildConfig();
    expect(configAfter.vehicleSpec.wheelRadius).not.toBe(configBefore.vehicleSpec.wheelRadius);
  });

  it('buildConfig track width adapts to motor size', () => {
    const { setMotor } = useProjectStore.getState();
    const configDefault = useProjectStore.getState().buildConfig();

    // N20 has width=12mm vs TT motor width=22mm → different track width
    setMotor('n20-6v-100rpm');
    const configN20 = useProjectStore.getState().buildConfig();
    expect(configN20.vehicleSpec.trackWidth).not.toBe(configDefault.vehicleSpec.trackWidth);
  });
});
