import { useEffect } from 'react';
import { Layout } from './ui/Layout';
import { useMcuStore } from './state/useMcuStore';
import { useSimulationStore } from './state/useSimulationStore';
import { useWiringStore } from './state/useWiringStore';
import { DcMotor, TT_MOTOR_6V } from './core/components/motors/DcMotor';
import { L298N } from './core/components/drivers/L298N';
import { BatteryPack, BATTERY_4xAA } from './core/components/power/BatteryPack';
import type { SimulationConfig } from './core/simulation/SimulationLoop';
import { ARDUINO_UNO_CLOCK_HZ } from './core/mcu/avr/ArduinoUnoBoard';

const FIXED_DT = 1 / 60;

function useBootstrapSimulation() {
  const initBoard = useMcuStore(s => s.initBoard);
  const mcu = useMcuStore(s => s.mcu);
  const initialize = useSimulationStore(s => s.initialize);
  const addWire = useWiringStore(s => s.addWire);
  const wiring = useWiringStore(s => s.wiring);

  useEffect(() => { initBoard('arduino-uno'); }, [initBoard]);

  useEffect(() => {
    if (!mcu) return;
    const motorLeft = new DcMotor('motor-left', TT_MOTOR_6V);
    const motorRight = new DcMotor('motor-right', TT_MOTOR_6V);
    const driver = new L298N('driver');
    const battery = new BatteryPack('battery', BATTERY_4xAA);
    const components = new Map([['driver', driver], ['motor-left', motorLeft], ['motor-right', motorRight], ['battery', battery]]);

    addWire(5, 'driver', 'ENA');
    addWire(6, 'driver', 'ENB');
    addWire(7, 'driver', 'IN1');
    addWire(8, 'driver', 'IN2');
    addWire(9, 'driver', 'IN3');
    addWire(10, 'driver', 'IN4');

    const config: SimulationConfig = {
      fixedDt: FIXED_DT,
      mcuCyclesPerStep: Math.round(ARDUINO_UNO_CLOCK_HZ * FIXED_DT),
      motorSpec: { stallTorque: TT_MOTOR_6V.stallTorque, noLoadRpm: TT_MOTOR_6V.noLoadRpm, nominalVoltage: TT_MOTOR_6V.nominalVoltage, armatureResistance: TT_MOTOR_6V.armatureResistance, backEmfConstant: TT_MOTOR_6V.nominalVoltage / (TT_MOTOR_6V.noLoadRpm * Math.PI / 30) },
      loadSpec: { mass: 0.5, wheelRadius: 0.033, staticFrictionCoeff: 0.05, kineticFrictionCoeff: 0.03 },
      environment: { gravity: 9.81, dt: FIXED_DT },
      batteryVoltage: BATTERY_4xAA.nominalVoltage,
      batteryInternalResistance: BATTERY_4xAA.internalResistance,
      driverVoltageDrop: L298N.VOLTAGE_DROP,
    };
    initialize(mcu, components, wiring, config);
  }, [mcu, initialize, addWire, wiring]);
}

export default function App() {
  useBootstrapSimulation();
  return <Layout />;
}
