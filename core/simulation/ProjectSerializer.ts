/**
 * ProjectSerializer — save and load complete project state as JSON.
 *
 * Serialized data includes:
 * - Sketch source code
 * - Component list (type + id)
 * - Wire connections
 * - Obstacle positions
 * - Line track waypoints
 */

import type { WireConnection } from './WiringGraph';
import type { Obstacle } from './ObstacleWorld';
import type { TrackPoint } from './LineTrack';

export interface ProjectData {
    readonly version: 1;
    readonly name: string;
    readonly sketch: string;
    readonly components: Array<{ type: string; id: string }>;
    readonly wires: WireConnection[];
    readonly obstacles: Obstacle[];
    readonly lineTrack: { points: TrackPoint[]; lineWidth: number };
}

export function serializeProject(
    name: string,
    sketch: string,
    components: Array<{ type: string; id: string }>,
    wires: ReadonlyArray<WireConnection>,
    obstacles: ReadonlyArray<Obstacle>,
    lineTrackPoints: ReadonlyArray<TrackPoint>,
    lineTrackWidth: number,
): string {
    const data: ProjectData = {
        version: 1,
        name,
        sketch,
        components,
        wires: [...wires],
        obstacles: [...obstacles],
        lineTrack: { points: [...lineTrackPoints], lineWidth: lineTrackWidth },
    };
    return JSON.stringify(data, null, 2);
}

export function deserializeProject(json: string): ProjectData {
    const data = JSON.parse(json);
    if (data.version !== 1) {
        throw new Error(`Unsupported project version: ${data.version}`);
    }
    return data as ProjectData;
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
