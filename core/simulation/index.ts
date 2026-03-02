export { SimulationLoop } from './SimulationLoop';
export type { SimulationConfig, SimulationSnapshot, DriverMotorMapping, ComponentWire } from './SimulationLoop';
export { SignalBus } from './SignalBus';
export { WiringGraph } from './WiringGraph';
export type { WireConnection } from './WiringGraph';
export { ComponentRegistry } from './ComponentRegistry';
export type { ComponentDescriptor } from './ComponentRegistry';
export { createPopulatedRegistry } from './registryBootstrap';
export { createDefaultConfig } from './createDefaultConfig';
export { CircuitValidator } from './CircuitValidator';
export type { CircuitError, ValidationResult, ValidatorInput } from './CircuitValidator';
export { FrictionMap, FRICTION_MATERIALS } from './FrictionMap';
export type { FrictionZone } from './FrictionMap';
export { WallWorld } from './WallWorld';
export type { Wall, CollisionResult, RaycastHit } from './WallWorld';
export { TerrainMap } from './TerrainMap';
export type { TerrainZone, TerrainSample } from './TerrainMap';
export { checkCompatibility } from './compatibilityChecker';
export type { CompatibilityIssue, CompatibilityInput } from './compatibilityChecker';
export {
  ENVIRONMENT_PRESETS,
  findEnvironmentPreset,
  PRESET_NAMES,
} from './environmentPresets';
export type { EnvironmentPreset } from './environmentPresets';
