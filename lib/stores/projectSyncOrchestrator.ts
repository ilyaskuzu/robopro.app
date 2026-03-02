/**
 * Unified project sync orchestrator.
 *
 * Subscribes to the source-of-truth stores (Assembly, WiringEditor, Environment)
 * and propagates changes downward to derived stores (WiringStore, SimulationStore).
 *
 * Replaces assemblySyncBridge.ts, EnvironmentSync (ViewportPanel), and the
 * useBootstrapSimulation hooks in SimulationPage / SimulatorShell.
 */

import { useAssemblyStore, type AssemblyPlacement } from './useAssemblyStore';
import { useWiringStore } from './useWiringStore';
import { useWiringEditorStore } from './useWiringEditorStore';
import { useSimulationStore } from './useSimulationStore';
import { useEnvironmentStore } from './useEnvironmentStore';
import { useProjectStore } from './useProjectStore';
import { useMcuStore } from './useMcuStore';
import { createPopulatedRegistry } from '@/core/simulation/registryBootstrap';
import { BatteryPack } from '@/core/components/power/BatteryPack';
import { MCU_CATALOG } from '@/core/components/catalog/mcuCatalog';
import { BATTERY_CATALOG } from '@/core/components/catalog/batteryCatalog';
import { CircuitValidator } from '@/core/simulation/CircuitValidator';
import type { CatalogCategory } from '@/core/components/catalog';
import type { BoardType } from '@/core/mcu/McuFactory';

const registry = createPopulatedRegistry();

// ── Helpers ──────────────────────────────────────────────────

function catalogToRegistryType(category: CatalogCategory, catalogId: string): string {
  switch (category) {
    case 'dc-motor':
      return catalogId === 'tt-motor-6v' ? 'dc-motor' : `dc-motor:${catalogId}`;
    case 'servo':
      return `servo:${catalogId}`;
    case 'stepper':
      return `stepper:${catalogId}`;
    case 'driver':
      return catalogId;
    case 'sensor': {
      const sensorMap: Record<string, string> = {
        'hc-sr04': 'ultrasonic', 'hc-sr04p': 'ultrasonic',
        'tcrt5000': 'ir-line',
        'rotary-encoder-20': 'rotary-encoder',
        'ldr-module': 'ldr',
        'dht11': 'dht11',
        'mpu6050': 'mpu6050',
      };
      return sensorMap[catalogId] ?? 'ultrasonic';
    }
    case 'battery':
      return 'battery';
    case 'mcu':
      return '';
    default:
      return catalogId;
  }
}

const DRIVER_TYPES = new Set(['l298n', 'l293d', 'tb6612fng', 'drv8833', 'a4988', 'uln2003']);
const MOTOR_CATEGORIES: CatalogCategory[] = ['dc-motor', 'stepper'];
const BATTERY_CATEGORY: CatalogCategory = 'battery';

function categoryToProjectSelection(
  placements: AssemblyPlacement[],
): { motorId?: string; batteryId?: string; driverId?: string; boardType?: BoardType } {
  const result: { motorId?: string; batteryId?: string; driverId?: string; boardType?: BoardType } = {};
  for (const p of placements) {
    if (MOTOR_CATEGORIES.includes(p.category) && !result.motorId) {
      result.motorId = p.catalogId;
    }
    if (p.category === BATTERY_CATEGORY && !result.batteryId) {
      result.batteryId = p.catalogId;
    }
    if (p.category === 'driver' && !result.driverId) {
      result.driverId = p.catalogId;
    }
    if (p.category === 'mcu') {
      const mcuEntry = MCU_CATALOG.find((m) => m.id === p.catalogId);
      if (mcuEntry) result.boardType = mcuEntry.boardType as BoardType;
    }
  }
  return result;
}

// ── Sync: Assembly → Wiring components ───────────────────────

function syncAssemblyToWiring(assemblyPlacements: AssemblyPlacement[]): void {
  const { addComponent, removeComponent, placedComponents } = useWiringStore.getState();
  const { initBoard, mcu } = useMcuStore.getState();

  const currentIds = new Set<string>();
  const wiringIds = new Set(placedComponents.map((c) => c.id));

  for (const ap of assemblyPlacements) {
    if (ap.category === 'mcu') {
      const mcuEntry = MCU_CATALOG.find((m) => m.id === ap.catalogId);
      const boardType = (mcuEntry?.boardType ?? 'arduino-uno') as BoardType;
      if (!mcu) initBoard(boardType);
      continue;
    }

    currentIds.add(ap.id);
    if (wiringIds.has(ap.id)) continue;

    if (ap.category === 'battery') {
      const batterySpec = BATTERY_CATALOG.find((b) => b.id === ap.catalogId);
      if (batterySpec) {
        const instance = new BatteryPack(ap.id, batterySpec.specs);
        addComponent({
          id: ap.id,
          type: ap.catalogId,
          displayName: batterySpec.displayName,
          instance,
          pinManifest: BatteryPack.PIN_MANIFEST,
        });
      }
    } else {
      const regType = catalogToRegistryType(ap.category, ap.catalogId);
      const desc = registry.get(regType);
      if (desc) {
        const instance = desc.factory(ap.id);
        addComponent({
          id: ap.id,
          type: ap.catalogId,
          displayName: desc.displayName,
          instance,
          pinManifest: desc.pinManifest,
        });
      }
    }
  }

  for (const w of placedComponents) {
    if (!currentIds.has(w.id)) {
      removeComponent(w.id);
    }
  }
}

// ── Sync: Assembly → Project store ───────────────────────────

function syncAssemblyToProjectStore(placements: AssemblyPlacement[]): void {
  const projectStore = useProjectStore.getState();
  const selections = categoryToProjectSelection(placements);

  if (selections.motorId && selections.motorId !== projectStore.selectedMotorId) {
    projectStore.setMotor(selections.motorId);
  }
  if (selections.batteryId && selections.batteryId !== projectStore.selectedBatteryId) {
    projectStore.setBattery(selections.batteryId);
  }
  if (selections.driverId && selections.driverId !== projectStore.selectedDriverId) {
    projectStore.setDriver(selections.driverId);
  }
  if (selections.boardType && selections.boardType !== projectStore.selectedBoardType) {
    projectStore.setBoardType(selections.boardType);
  }
}

// ── Sync: Validate + initialize simulation ───────────────────

function syncSimulation(): void {
  const mcu = useMcuStore.getState().mcu;
  if (!mcu) return;

  const { placedComponents, getComponentMap, wiring } = useWiringStore.getState();
  const editorWires = useWiringEditorStore.getState().wires;

  const componentWires = editorWires
    .filter((w) => {
      if (w.fromComponentId !== '__mcu__' && w.toComponentId !== '__mcu__') return true;
      // Keep battery power wires to/from MCU (direct battery → MCU VIN)
      return w.fromPinName === 'V_OUT' || w.toPinName === 'V_OUT';
    })
    .map((w) => ({
      fromComponentId: w.fromComponentId,
      fromPinName: w.fromPinName,
      toComponentId: w.toComponentId,
      toPinName: w.toPinName,
    }));

  const validation = CircuitValidator.validate({
    placedComponents,
    mcuConnections: wiring.getAllConnections(),
    editorWires: componentWires,
  });

  const config = useProjectStore.getState().buildConfig();
  const { initialize } = useSimulationStore.getState();

  initialize(mcu, getComponentMap(), wiring, config, validation.resolvedComponentWires);

  const loop = useSimulationStore.getState().simulationLoop;
  if (loop) loop.setDriverMotorMappings(validation.resolvedMappings);

  useSimulationStore.setState({
    circuitErrors: [...validation.errors, ...validation.warnings],
  });
}

// ── Debounced full sync ──────────────────────────────────────

let syncScheduled = false;

function scheduleSync(): void {
  if (syncScheduled) return;
  syncScheduled = true;
  queueMicrotask(() => {
    syncScheduled = false;
    runFullSync();
  });
}

function runFullSync(): void {
  const placements = useAssemblyStore.getState().placements;

  syncAssemblyToWiring(placements);
  syncAssemblyToProjectStore(placements);
  syncSimulation();
}

// ── Public: one-time initialization ──────────────────────────

let initialized = false;

/**
 * Call once at app startup to wire up all store subscriptions.
 * Safe to call multiple times (idempotent).
 */
export function initProjectSync(): void {
  if (initialized) return;
  initialized = true;

  // Run once with current state
  runFullSync();

  // Subscribe to source-of-truth stores
  useAssemblyStore.subscribe(() => scheduleSync());
  useWiringEditorStore.subscribe(
    (state, prev) => {
      if (state.wires !== prev.wires) scheduleSync();
    },
  );
  useEnvironmentStore.subscribe(
    (state, prev) => {
      if (
        state.walls !== prev.walls ||
        state.obstacles !== prev.obstacles ||
        state.frictionZones !== prev.frictionZones ||
        state.terrainZones !== prev.terrainZones
      ) {
        scheduleSync();
      }
    },
  );
}
