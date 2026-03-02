/**
 * ProjectSerializer — save and load complete project state as JSON.
 *
 * v1: sketch, components, wires, obstacles, lineTrack
 * v2: adds frictionZones, walls, terrainZones, componentSpecIds
 */

import type { WireConnection } from './WiringGraph';
import type { Obstacle } from './ObstacleWorld';
import type { TrackPoint } from './LineTrack';
import type { FrictionZone } from './FrictionMap';
import type { Wall } from './WallWorld';
import type { TerrainZone } from './TerrainMap';

export interface ProjectDataV1 {
    readonly version: 1;
    readonly name: string;
    readonly sketch: string;
    readonly components: Array<{ type: string; id: string }>;
    readonly wires: WireConnection[];
    readonly obstacles: Obstacle[];
    readonly lineTrack: { points: TrackPoint[]; lineWidth: number };
}

/** Explicit component-to-component wire (battery→driver, driver→motor, battery→MCU, etc.) */
export interface SavedEditorWire {
    readonly fromComponentId: string;
    readonly fromPinName: string;
    readonly toComponentId: string;
    readonly toPinName: string;
}

export interface ProjectDataV2 {
    readonly version: 2;
    readonly name: string;
    readonly sketch: string;
    readonly components: Array<{ type: string; id: string; specId?: string }>;
    readonly wires: WireConnection[];
    readonly obstacles: Obstacle[];
    readonly lineTrack: { points: TrackPoint[]; lineWidth: number };
    readonly frictionZones: FrictionZone[];
    readonly walls: Wall[];
    readonly terrainZones: TerrainZone[];
    /** Explicit component-to-component wires. When present, no synthetic wires are generated. */
    readonly editorWires?: SavedEditorWire[];
}

/** Assembly placement for restore (id, catalogId, category). */
export interface SavedAssemblyPlacement {
    readonly id: string;
    readonly catalogId: string;
    readonly category: string;
}

export interface ProjectDataV3 extends Omit<ProjectDataV2, 'version'> {
    readonly version: 3;
    readonly catalogSelections: {
        motorId: string;
        driverId: string;
        batteryId: string;
        boardType: string;
    };
    readonly environmentPresetId?: string;
    /** Optional: assembly page placements so Load restores Assembly + Wiring view */
    readonly assemblyPlacements?: SavedAssemblyPlacement[];
    /** Explicit component-to-component wires (saved from wiring editor). */
    readonly editorWires?: SavedEditorWire[];
}

/** Union type for backward compat */
export type ProjectData = ProjectDataV1 | ProjectDataV2 | ProjectDataV3;

/** Migrate v1 → v2 */
function migrateV1toV2(v1: ProjectDataV1): ProjectDataV2 {
    return {
        ...v1,
        version: 2,
        components: v1.components.map(c => ({ ...c })),
        frictionZones: [],
        walls: [],
        terrainZones: [],
    };
}

/** Migrate v2 → v3 */
function migrateV2toV3(v2: ProjectDataV2): ProjectDataV3 {
    return {
        ...v2,
        version: 3,
        catalogSelections: {
            motorId: '',
            driverId: '',
            batteryId: '',
            boardType: '',
        },
        environmentPresetId: undefined,
    };
}

export interface SerializeProjectOptions {
    catalogSelections?: {
        motorId: string;
        driverId: string;
        batteryId: string;
        boardType: string;
    };
    environmentPresetId?: string;
    /** Assembly placements for full project save (assembly + wiring + code) */
    assemblyPlacements?: ReadonlyArray<SavedAssemblyPlacement>;
    /** Explicit component-to-component wires (power, motor, etc.) */
    editorWires?: ReadonlyArray<SavedEditorWire>;
}

export function serializeProject(
    name: string,
    sketch: string,
    components: Array<{ type: string; id: string; specId?: string }>,
    wires: ReadonlyArray<WireConnection>,
    obstacles: ReadonlyArray<Obstacle>,
    lineTrackPoints: ReadonlyArray<TrackPoint>,
    lineTrackWidth: number,
    frictionZones: ReadonlyArray<FrictionZone> = [],
    walls: ReadonlyArray<Wall> = [],
    terrainZones: ReadonlyArray<TerrainZone> = [],
    options?: SerializeProjectOptions,
): string {
    const catalogSelections = options?.catalogSelections;
    const environmentPresetId = options?.environmentPresetId;
    const assemblyPlacements = options?.assemblyPlacements;

    if (catalogSelections || assemblyPlacements) {
        const savedEditorWires = options?.editorWires ? [...options.editorWires] : undefined;
        const data: ProjectDataV3 = {
            version: 3,
            name,
            sketch,
            components: components.map(c => ({ ...c })),
            wires: [...wires],
            obstacles: [...obstacles],
            lineTrack: { points: [...lineTrackPoints], lineWidth: lineTrackWidth },
            frictionZones: [...frictionZones],
            walls: [...walls],
            terrainZones: [...terrainZones],
            catalogSelections: catalogSelections ?? {
                motorId: '',
                driverId: '',
                batteryId: '',
                boardType: '',
            },
            environmentPresetId,
            assemblyPlacements: assemblyPlacements ? [...assemblyPlacements] : undefined,
            editorWires: savedEditorWires,
        };
        return JSON.stringify(data, null, 2);
    }

    const data: ProjectDataV2 = {
        version: 2,
        name,
        sketch,
        components: components.map(c => ({ ...c })),
        wires: [...wires],
        obstacles: [...obstacles],
        lineTrack: { points: [...lineTrackPoints], lineWidth: lineTrackWidth },
        frictionZones: [...frictionZones],
        walls: [...walls],
        terrainZones: [...terrainZones],
    };
    return JSON.stringify(data, null, 2);
}

/** Deserialize any version and auto-migrate to v3. */
export function deserializeProject(json: string): ProjectDataV3 {
    const data = JSON.parse(json);
    if (data.version === 1) {
        return migrateV2toV3(migrateV1toV2(data as ProjectDataV1));
    }
    if (data.version === 2) {
        return migrateV2toV3(data as ProjectDataV2);
    }
    if (data.version === 3) {
        return data as ProjectDataV3;
    }
    throw new Error(`Unsupported project version: ${data.version}`);
}

export function downloadProject(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function openProjectFile(): Promise<string> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) { reject(new Error('No file selected')); return; }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        };
        input.click();
    });
}
