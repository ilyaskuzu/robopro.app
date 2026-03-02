/**
 * Shared project load logic: restores assembly, wiring store, wiring editor wires, sketch, and simulation.
 * Does not change the current page — caller stays on Assembly / Wiring / Simulate.
 */

import type { ProjectData, ProjectDataV3, SavedAssemblyPlacement } from '@/core/simulation/ProjectSerializer';
import { useMcuStore } from '@/lib/stores/useMcuStore';
import { useAssemblyStore, type AssemblyPlacement } from '@/lib/stores/useAssemblyStore';
import { useWiringStore } from '@/lib/stores/useWiringStore';
import { useWiringEditorStore, generateWireId, getWireColor, type WireSegment } from '@/lib/stores/useWiringEditorStore';
import { useSimulationStore } from '@/lib/stores/useSimulationStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { DcMotor, TT_MOTOR_6V } from '@/core/components/motors/DcMotor';
import { StepperMotor } from '@/core/components/motors/StepperMotor';
import { L298N } from '@/core/components/drivers/L298N';
import { A4988 } from '@/core/components/drivers/A4988';
import { BatteryPack, BATTERY_4xAA } from '@/core/components/power/BatteryPack';
import { UltrasonicSensor } from '@/core/components/sensors/UltrasonicSensor';
import { IrLineSensor } from '@/core/components/sensors/IrLineSensor';
import { RotaryEncoder } from '@/core/components/sensors/RotaryEncoder';
import { LdrSensor } from '@/core/components/sensors/LdrSensor';
import { Dht11Sensor } from '@/core/components/sensors/Dht11Sensor';
import { findMotor } from '@/core/components/catalog/motorCatalog';
import { findBattery } from '@/core/components/catalog/batteryCatalog';
import { findStepper } from '@/core/components/catalog/stepperCatalog';
import type { IComponent } from '@/core/components/interfaces/IComponent';
import type { CatalogCategory } from '@/core/components/catalog';
import type { BoardType } from '@/core/mcu/McuFactory';
import { CircuitValidator } from '@/core/simulation/CircuitValidator';
import { useEnvironmentStore } from '@/lib/stores/useEnvironmentStore';
import type { ProjectDataV2 } from '@/core/simulation/ProjectSerializer';

function createComponent(type: string, id: string, specId?: string): IComponent | null {
  if (type.startsWith('stepper:')) {
    const stepperId = specId ?? type.replace('stepper:', '');
    const entry = findStepper(stepperId);
    return entry ? new StepperMotor(id, entry.specs) : null;
  }
  switch (type) {
    case 'dc-motor': {
      const entry = specId ? findMotor(specId) : undefined;
      return new DcMotor(id, entry?.specs ?? TT_MOTOR_6V);
    }
    case 'l298n': return new L298N(id);
    case 'a4988': return new A4988(id);
    case 'battery-4aa':
    case 'battery': {
      const entry = specId ? findBattery(specId) : undefined;
      return new BatteryPack(id, entry?.specs ?? BATTERY_4xAA);
    }
    case 'hc-sr04': return new UltrasonicSensor(id);
    case 'ir-line': return new IrLineSensor(id);
    case 'encoder': return new RotaryEncoder(id);
    case 'ldr': return new LdrSensor(id);
    case 'dht11': return new Dht11Sensor(id);
    default: return null;
  }
}

function componentTypeToCategory(type: string): CatalogCategory {
  if (type.startsWith('dc-motor') || type === 'dc-motor') return 'dc-motor';
  if (type.startsWith('stepper:')) return 'stepper';
  if (['l298n', 'l293d', 'tb6612fng', 'drv8833', 'a4988', 'uln2003'].includes(type)) return 'driver';
  if (['battery', 'battery-4aa'].includes(type) || type.includes('lipo')) return 'battery';
  return 'sensor';
}

/**
 * Load a project or preset: assembly, wiring store, wiring editor wires, sketch, environment, simulation.
 * Does not change the current page.
 */
export function loadProjectData(data: ProjectData): void {
  const v3 = (data.version === 2 || data.version === 3) ? (data as ProjectDataV3) : undefined;
  const { initBoard } = useMcuStore.getState();
  const { setPlacements: setAssemblyPlacements } = useAssemblyStore.getState();
  const { clearAll: clearWiring, addComponent, addWire, getComponentMap, wiring } = useWiringStore.getState();
  const { setWires: setEditorWires } = useWiringEditorStore.getState();
  const { loadSketch, initialize, obstacleWorld, lineTrack } = useSimulationStore.getState();
  const { buildConfig } = useProjectStore.getState();

  // Clear serial monitor so old errors from a previous preset don't persist
  useMcuStore.getState().clearSerial();

  const boardType = (v3?.catalogSelections?.boardType as BoardType) ?? 'arduino-uno';
  initBoard(boardType);
  const mcu = useMcuStore.getState().mcu;
  if (!mcu) return;

  // Sync project store selections so buildConfig() produces matching specs
  const projectStore = useProjectStore.getState();
  projectStore.setBoardType(boardType);
  if (v3?.catalogSelections?.motorId) projectStore.setMotor(v3.catalogSelections.motorId);
  if (v3?.catalogSelections?.batteryId) projectStore.setBattery(v3.catalogSelections.batteryId);
  if (v3?.catalogSelections?.driverId) projectStore.setDriver(v3.catalogSelections.driverId);
  // For v1/v2 presets, derive selections from component types
  if (!v3?.catalogSelections) {
    const driverComp = data.components.find(c => ['l298n', 'l293d', 'tb6612fng', 'drv8833', 'a4988', 'uln2003'].includes(c.type));
    if (driverComp) projectStore.setDriver(driverComp.type);
    const motorComp = data.components.find(c => c.type === 'dc-motor' || c.type.startsWith('dc-motor'));
    if (motorComp) {
      const specId = 'specId' in motorComp && typeof motorComp.specId === 'string' ? motorComp.specId : 'tt-motor-6v';
      projectStore.setMotor(specId);
    }
    const battComp = data.components.find(c => c.type.includes('battery'));
    if (battComp) {
      const specId = 'specId' in battComp && typeof battComp.specId === 'string' ? battComp.specId : '4xaa-alkaline';
      projectStore.setBattery(specId);
    }
  }

  const assemblyPlacements: AssemblyPlacement[] = [];
  if (v3?.assemblyPlacements?.length) {
    for (const p of v3.assemblyPlacements) {
      assemblyPlacements.push({
        id: p.id,
        catalogId: p.catalogId,
        category: p.category as CatalogCategory,
        position: { x: 0, y: 0 },
        connections: [],
      });
    }
  } else {
    assemblyPlacements.push({
      id: '__mcu__',
      catalogId: 'arduino-uno',
      category: 'mcu',
      position: { x: 0, y: 0 },
      connections: [],
    });
    for (const comp of data.components) {
      const category = componentTypeToCategory(comp.type);
      const catalogId = 'specId' in comp && comp.specId ? comp.specId : comp.type;
      assemblyPlacements.push({
        id: comp.id,
        catalogId,
        category,
        position: { x: 0, y: 0 },
        connections: [],
      });
    }
  }
  setAssemblyPlacements(assemblyPlacements);

  clearWiring();
  for (const comp of data.components) {
    const specId = 'specId' in comp ? comp.specId : undefined;
    const instance = createComponent(comp.type, comp.id, specId);
    if (instance) {
      addComponent({
        id: comp.id,
        type: comp.type,
        displayName: comp.type,
        instance,
        pinManifest: instance.pinManifest,
      });
    }
  }
  for (const wire of data.wires) {
    addWire(wire.mcuPinIndex, wire.componentId, wire.componentPinName);
  }

  // MCU signal wires (from preset's wires array)
  const editorSegments: WireSegment[] = data.wires.map((w) => {
    const pinName = mcu.pins[w.mcuPinIndex]?.name ?? `D${w.mcuPinIndex}`;
    return {
      id: generateWireId(),
      fromComponentId: '__mcu__',
      fromPinName: pinName,
      toComponentId: w.componentId,
      toPinName: w.componentPinName,
      color: getWireColor('digital'),
      path: [],
    };
  });

  // Component-to-component wires: use explicit editorWires if present in the data
  const dataWithEditorWires = (data.version === 2 || data.version === 3) ? (data as ProjectDataV2) : undefined;
  const explicitEditorWires = dataWithEditorWires?.editorWires;

  if (explicitEditorWires && explicitEditorWires.length > 0) {
    for (const ew of explicitEditorWires) {
      const isPower = ew.fromPinName === 'V_OUT' || ew.toPinName === 'VCC' || ew.toPinName === 'VIN';
      const isMotor = ew.toPinName === 'POWER' || ew.fromPinName === 'POWER';
      const wireType = isPower ? 'power' : isMotor ? 'analog' : 'digital';
      editorSegments.push({
        id: generateWireId(),
        fromComponentId: ew.fromComponentId,
        fromPinName: ew.fromPinName,
        toComponentId: ew.toComponentId,
        toPinName: ew.toPinName,
        color: getWireColor(wireType),
        path: [],
      });
    }
  } else {
    // Legacy fallback: synthesize wires for old presets without explicit editorWires
    const compIds = new Set(data.components.map((c) => c.id));
    if (compIds.has('battery') && compIds.has('driver')) {
      editorSegments.push({
        id: generateWireId(),
        fromComponentId: 'battery',
        fromPinName: 'V_OUT',
        toComponentId: 'driver',
        toPinName: 'VCC',
        color: getWireColor('power'),
        path: [],
      });
    }
    if (compIds.has('driver') && compIds.has('motor-left')) {
      editorSegments.push({
        id: generateWireId(),
        fromComponentId: 'driver',
        fromPinName: 'OUT_A',
        toComponentId: 'motor-left',
        toPinName: 'POWER',
        color: getWireColor('analog'),
        path: [],
      });
    }
    if (compIds.has('driver') && compIds.has('motor-right')) {
      editorSegments.push({
        id: generateWireId(),
        fromComponentId: 'driver',
        fromPinName: 'OUT_B',
        toComponentId: 'motor-right',
        toPinName: 'POWER',
        color: getWireColor('analog'),
        path: [],
      });
    }
  }
  setEditorWires(editorSegments);

  const componentWires = useWiringEditorStore.getState().wires
    .filter((w) => {
      // Keep all component-to-component wires
      if (w.fromComponentId !== '__mcu__' && w.toComponentId !== '__mcu__') return true;
      // Also keep battery power wires to/from MCU (direct battery → MCU VIN)
      return w.fromPinName === 'V_OUT' || w.toPinName === 'V_OUT';
    })
    .map((w) => ({
      fromComponentId: w.fromComponentId,
      fromPinName: w.fromPinName,
      toComponentId: w.toComponentId,
      toPinName: w.toPinName,
    }));

  obstacleWorld.clear();
  for (const obs of data.obstacles) {
    obstacleWorld.addObstacle(obs);
  }
  lineTrack.clear();
  if (data.lineTrack) {
    lineTrack.setPoints(data.lineTrack.points);
    lineTrack.setLineWidth(data.lineTrack.lineWidth);
  }

  // Sync v2 environment data to the environment store (for visual rendering)
  const envStore = useEnvironmentStore.getState();
  envStore.clearAll();
  const v2 = data.version >= 2 ? (data as ProjectDataV2) : undefined;
  if (v2) {
    for (const zone of v2.frictionZones ?? []) envStore.addFrictionZone(zone);
    for (const wall of v2.walls ?? []) envStore.addWall(wall);
    for (const tz of v2.terrainZones ?? []) envStore.addTerrainZone(tz);
  }
  for (const obs of data.obstacles) {
    envStore.addObstacle({ ...obs, id: `obs-${obs.x}-${obs.z}`, label: 'Obstacle' });
  }

  const componentsMap = getComponentMap();
  const { placedComponents } = useWiringStore.getState();
  const mcuConnections = wiring.getAllConnections();

  const validation = CircuitValidator.validate({
    placedComponents,
    mcuConnections,
    editorWires: componentWires,
  });

  const config = buildConfig();
  initialize(mcu, componentsMap, wiring, config, validation.resolvedComponentWires);

  const loop = useSimulationStore.getState().simulationLoop;
  if (loop) {
    loop.setDriverMotorMappings(validation.resolvedMappings);
  }

  loadSketch(data.sketch);
}
