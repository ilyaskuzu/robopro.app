"use client";

import { useEffect } from "react";
import { Header } from "./Header";
import { StatusBar } from "./StatusBar";
import { SaveMotionLogOnStop } from "@/components/motion/SaveMotionLogOnStop";
import { useMcuStore } from "@/lib/stores/useMcuStore";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useWiringStore } from "@/lib/stores/useWiringStore";
import { DcMotor, TT_MOTOR_6V } from "@/core/components/motors/DcMotor";
import { L298N } from "@/core/components/drivers/L298N";
import { BatteryPack, BATTERY_4xAA } from "@/core/components/power/BatteryPack";
import type { SimulationConfig } from "@/core/simulation/SimulationLoop";
import { ARDUINO_UNO_CLOCK_HZ } from "@/core/mcu/avr/ArduinoUnoBoard";
import dynamic from "next/dynamic";

const CodeEditorPanel = dynamic(
  () => import("@/components/editor/CodeEditorPanel").then((m) => m.CodeEditorPanel),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const ViewportPanel = dynamic(
  () => import("@/components/scene/ViewportPanel").then((m) => m.ViewportPanel),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const BottomPanel = dynamic(
  () => import("@/components/layout/BottomPanel").then((m) => m.BottomPanel),
  { ssr: false }
);

const FIXED_DT = 1 / 60;

function useBootstrapSimulation() {
  const initBoard = useMcuStore((s) => s.initBoard);
  const mcu = useMcuStore((s) => s.mcu);
  const initialize = useSimulationStore((s) => s.initialize);
  const addWire = useWiringStore((s) => s.addWire);
  const wiring = useWiringStore((s) => s.wiring);

  useEffect(() => {
    initBoard("arduino-uno");
  }, [initBoard]);

  useEffect(() => {
    if (!mcu) return;

    const motorLeft = new DcMotor("motor-left", TT_MOTOR_6V);
    const motorRight = new DcMotor("motor-right", TT_MOTOR_6V);
    const driver = new L298N("driver");
    const battery = new BatteryPack("battery", BATTERY_4xAA);

    const components = new Map<string, import("@/core/components/interfaces/IComponent").IComponent>([
      ["driver", driver],
      ["motor-left", motorLeft],
      ["motor-right", motorRight],
      ["battery", battery],
    ]);

    addWire(5, "driver", "ENA");
    addWire(6, "driver", "ENB");
    addWire(7, "driver", "IN1");
    addWire(8, "driver", "IN2");
    addWire(9, "driver", "IN3");
    addWire(10, "driver", "IN4");

    const backEmfConstant = TT_MOTOR_6V.nominalVoltage / (TT_MOTOR_6V.noLoadRpm * Math.PI / 30);

    const mass = 0.3;
    const wheelRadius = 0.033;
    const trackWidth = 0.13;
    const chassisLength = 0.19;
    const chassisWidth = 0.18;
    const momentOfInertia = (1 / 12) * mass * (chassisLength * chassisLength + chassisWidth * chassisWidth);

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
        longitudinalDrag: 1.2, // so v → ~0 within 1 s stop (log verification: pivot starts from rest)
        gravity: 9.81,
      },
      batteryVoltage: BATTERY_4xAA.nominalVoltage,
      batteryInternalResistance: BATTERY_4xAA.internalResistance,
      driverVoltageDrop: L298N.VOLTAGE_DROP,
    };

    initialize(mcu, components, wiring, config);

    const loop = useSimulationStore.getState().simulationLoop;
    if (loop) {
      loop.setDriverMotorMappings([
        { driverId: "driver", channelIndex: 0, motorId: "motor-left" },
        { driverId: "driver", channelIndex: 1, motorId: "motor-right" },
      ]);
    }
  }, [mcu, initialize, addWire, wiring]);
}

export function SimulatorShell() {
  useBootstrapSimulation();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <SaveMotionLogOnStop />
      <Header />
      <div className="flex flex-1 min-h-0">
        <div className="w-[380px] min-w-[300px] border-r border-border flex flex-col">
          <CodeEditorPanel />
        </div>
        <div className="flex flex-1 flex-col min-w-[400px]">
          <div className="flex-1 min-h-0">
            <ViewportPanel />
          </div>
          <div className="h-[200px] border-t border-border">
            <BottomPanel />
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
