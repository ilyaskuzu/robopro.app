"use client";

import { create } from 'zustand';
import type { BoardType } from '@/core/mcu/McuFactory';
import { MOTOR_CATALOG, type MotorCatalogEntry } from '@/core/components/catalog/motorCatalog';
import { DRIVER_CATALOG, type DriverCatalogEntry } from '@/core/components/catalog/driverCatalog';
import { BATTERY_CATALOG, type BatteryCatalogEntry } from '@/core/components/catalog/batteryCatalog';
import { MCU_CATALOG, type McuCatalogEntry } from '@/core/components/catalog/mcuCatalog';
import { createDefaultConfig } from '@/core/simulation/createDefaultConfig';
import type { SimulationConfig } from '@/core/simulation/SimulationLoop';

/**
 * Catalog category used for UI tab display.
 */
export type CatalogTab = 'motors' | 'servos' | 'drivers' | 'sensors' | 'power' | 'actuators' | 'mcu';

export interface ProjectStoreState {
  /** Currently selected motor spec ID */
  selectedMotorId: string;
  /** Currently selected battery spec ID */
  selectedBatteryId: string;
  /** Currently selected driver spec ID */
  selectedDriverId: string;
  /** Currently selected MCU board type */
  selectedBoardType: BoardType;
  /** Active catalog tab */
  activeCatalogTab: CatalogTab;
  /** Component detail modal — spec ID to show, or null */
  detailSpecId: string | null;
  detailSpecCategory: CatalogTab | null;

  /* ---- Derived / computed ---- */

  /** Computed vehicle mass from component weights */
  computedMass: number;

  /* ---- Actions ---- */
  setMotor: (specId: string) => void;
  setBattery: (specId: string) => void;
  setDriver: (specId: string) => void;
  setBoardType: (boardType: BoardType) => void;
  setCatalogTab: (tab: CatalogTab) => void;
  showDetail: (specId: string, category: CatalogTab) => void;
  hideDetail: () => void;
  /** Build a SimulationConfig from current selections. */
  buildConfig: () => SimulationConfig;

  /* ---- Catalog accessors ---- */
  getMotorSpec: () => MotorCatalogEntry | undefined;
  getBatterySpec: () => BatteryCatalogEntry | undefined;
  getDriverSpec: () => DriverCatalogEntry | undefined;
  getMcuSpec: () => McuCatalogEntry | undefined;
}

function computeMass(motorId: string, batteryId: string, driverId: string): number {
  const motor = MOTOR_CATALOG.find(m => m.id === motorId);
  const battery = BATTERY_CATALOG.find(b => b.id === batteryId);
  const driver = DRIVER_CATALOG.find(d => d.id === driverId);
  let mass = 0.05; // chassis base weight (kg)
  if (motor) mass += (motor.weight / 1000) * 2; // 2 motors
  if (battery) mass += battery.weight / 1000;
  if (driver) mass += driver.weight / 1000;
  return mass;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  selectedMotorId: 'tt-motor-6v',
  selectedBatteryId: '4xaa-alkaline',
  selectedDriverId: 'l298n',
  selectedBoardType: 'arduino-uno',
  activeCatalogTab: 'motors',
  detailSpecId: null,
  detailSpecCategory: null,
  computedMass: computeMass('tt-motor-6v', '4xaa-alkaline', 'l298n'),

  setMotor: (specId) => {
    const mass = computeMass(specId, get().selectedBatteryId, get().selectedDriverId);
    set({ selectedMotorId: specId, computedMass: mass });
  },

  setBattery: (specId) => {
    const mass = computeMass(get().selectedMotorId, specId, get().selectedDriverId);
    set({ selectedBatteryId: specId, computedMass: mass });
  },

  setDriver: (specId) => {
    const mass = computeMass(get().selectedMotorId, get().selectedBatteryId, specId);
    set({ selectedDriverId: specId, computedMass: mass });
  },

  setBoardType: (boardType) => set({ selectedBoardType: boardType }),

  setCatalogTab: (tab) => set({ activeCatalogTab: tab }),

  showDetail: (specId, category) => set({ detailSpecId: specId, detailSpecCategory: category }),

  hideDetail: () => set({ detailSpecId: null, detailSpecCategory: null }),

  buildConfig: () => {
    const { selectedMotorId, selectedBatteryId, selectedDriverId, computedMass } = get();
    const motor = MOTOR_CATALOG.find(m => m.id === selectedMotorId);
    const battery = BATTERY_CATALOG.find(b => b.id === selectedBatteryId);
    const driver = DRIVER_CATALOG.find(d => d.id === selectedDriverId);

    // Wheel radius: proportional to motor width (mm).
    // Catalog widths range 10–28 mm → wheel radius 25–42 mm.
    const motorWidth = motor ? motor.dimensions[1] : 22;
    const wheelRadius = (20 + motorWidth * 0.8) / 1000;

    const backEmfConstant = motor
      ? motor.specs.nominalVoltage / (motor.specs.noLoadRpm * Math.PI / 30)
      : 0.01;

    return createDefaultConfig({
      ...(motor ? {
        motorSpec: {
          stallTorque: motor.specs.stallTorque,
          noLoadRpm: motor.specs.noLoadRpm,
          nominalVoltage: motor.specs.nominalVoltage,
          armatureResistance: motor.specs.armatureResistance,
          backEmfConstant,
        },
      } : {}),
      vehicleSpec: {
        mass: computedMass,
        momentOfInertia: (1 / 12) * computedMass * (0.19 ** 2 + 0.18 ** 2),
        wheelRadius,
        trackWidth: 0.11 + (motor ? motor.dimensions[1] / 1000 : 0.02),
        longitudinalDrag: 1.2,
        gravity: 9.81,
      },
      batteryVoltage: battery?.specs.nominalVoltage ?? 6,
      batteryInternalResistance: battery?.specs.internalResistance ?? 0.5,
      driverVoltageDrop: driver?.specs.voltageDrop ?? 1.4,
      driverCurrentLimitPerChannel: driver?.specs.maxCurrentPerChannel,
    });
  },

  getMotorSpec: () => MOTOR_CATALOG.find(m => m.id === get().selectedMotorId),
  getBatterySpec: () => BATTERY_CATALOG.find(b => b.id === get().selectedBatteryId),
  getDriverSpec: () => DRIVER_CATALOG.find(d => d.id === get().selectedDriverId),
  getMcuSpec: () => MCU_CATALOG.find(m => m.boardType === get().selectedBoardType),
}));
