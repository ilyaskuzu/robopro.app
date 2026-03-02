import type { SimulationConfig } from './SimulationLoop';
import { TT_MOTOR_6V } from '../components/motors/DcMotor';
import { L298N } from '../components/drivers/L298N';
import { BATTERY_4xAA } from '../components/power/BatteryPack';
import { ARDUINO_UNO_CLOCK_HZ } from '../mcu/avr/ArduinoUnoBoard';

const FIXED_DT = 1 / 60;

/**
 * Creates the default SimulationConfig for a standard TT-motor robot car.
 * Centralised here to avoid duplication across SimulatorShell, Header, and presets.
 */
export function createDefaultConfig(overrides?: Partial<SimulationConfig>): SimulationConfig {
    const mass = 0.3;
    const wheelRadius = 0.033;
    const trackWidth = 0.13;
    const chassisLength = 0.19;
    const chassisWidth = 0.18;
    const momentOfInertia = (1 / 12) * mass * (chassisLength ** 2 + chassisWidth ** 2);
    const backEmfConstant = TT_MOTOR_6V.nominalVoltage / (TT_MOTOR_6V.noLoadRpm * Math.PI / 30);

    const base: SimulationConfig = {
        fixedDt: FIXED_DT,
        mcuCyclesPerStep: Math.round(ARDUINO_UNO_CLOCK_HZ * FIXED_DT),
        motorSpec: {
            stallTorque: TT_MOTOR_6V.stallTorque,
            noLoadRpm: TT_MOTOR_6V.noLoadRpm,
            nominalVoltage: TT_MOTOR_6V.nominalVoltage,
            armatureResistance: TT_MOTOR_6V.armatureResistance,
            backEmfConstant,
        },
        loadSpec: {
            mass,
            wheelRadius,
            staticFrictionCoeff: 0.15,
            kineticFrictionCoeff: 0.12,
        },
        environment: { gravity: 9.81, dt: FIXED_DT },
        vehicleSpec: {
            mass,
            momentOfInertia,
            wheelRadius,
            trackWidth,
            longitudinalDrag: 1.2,
            gravity: 9.81,
        },
        batteryVoltage: BATTERY_4xAA.nominalVoltage,
        batteryInternalResistance: BATTERY_4xAA.internalResistance,
        driverVoltageDrop: L298N.VOLTAGE_DROP,
        driverCurrentLimitPerChannel: 2.0, // L298N max per channel
    };

    return overrides ? { ...base, ...overrides } : base;
}
