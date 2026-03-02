import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject, type ProjectData } from '../../core/simulation/ProjectSerializer';

describe('ProjectSerializer', () => {
    const sampleComponents = [
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'l298n', id: 'driver' },
    ];
    const sampleWires = [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
    ];
    const sampleObstacles = [
        { x: 0.5, z: 0.3, radius: 0.05 },
    ];
    const sampleTrackPoints = [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: 1, z: 1 },
    ];

    it('round-trips serialize + deserialize as v3', () => {
        const json = serializeProject(
            'test-project',
            'void setup() {} void loop() {}',
            sampleComponents,
            sampleWires,
            sampleObstacles,
            sampleTrackPoints,
            0.02,
        );
        const data = deserializeProject(json);
        expect(data.version).toBe(3);
        expect(data.name).toBe('test-project');
        expect(data.sketch).toBe('void setup() {} void loop() {}');
        expect(data.components).toEqual(sampleComponents);
        expect(data.wires).toEqual(sampleWires);
        expect(data.obstacles).toEqual(sampleObstacles);
        expect(data.lineTrack.points).toEqual(sampleTrackPoints);
        expect(data.lineTrack.lineWidth).toBe(0.02);
        expect(data.frictionZones).toEqual([]);
        expect(data.walls).toEqual([]);
        expect(data.terrainZones).toEqual([]);
        expect(data.catalogSelections).toEqual({ motorId: '', driverId: '', batteryId: '', boardType: '' });
    });

    it('produces valid JSON', () => {
        const json = serializeProject('p', '', [], [], [], [], 0.01);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it('throws on unsupported version', () => {
        const bad = JSON.stringify({ version: 99, name: 'x' });
        expect(() => deserializeProject(bad)).toThrow('Unsupported project version: 99');
    });

    it('throws on invalid JSON', () => {
        expect(() => deserializeProject('not json')).toThrow();
    });

    it('handles empty components and wires', () => {
        const json = serializeProject('empty', '', [], [], [], [], 0.01);
        const data = deserializeProject(json);
        expect(data.components).toEqual([]);
        expect(data.wires).toEqual([]);
        expect(data.obstacles).toEqual([]);
    });

    it('preserves sketch with special characters', () => {
        const sketch = 'void setup() {\n  Serial.println("Hello, \\"world\\"!");\n}';
        const json = serializeProject('sc', sketch, [], [], [], [], 0.01);
        const data = deserializeProject(json);
        expect(data.sketch).toBe(sketch);
    });

    it('migrates v1 project to v3 with empty environment arrays and catalogSelections', () => {
        const v1Data = {
            version: 1,
            name: 'legacy',
            sketch: 'void setup(){}',
            components: [{ type: 'dc-motor', id: 'm' }],
            wires: [],
            obstacles: [],
            lineTrack: { points: [], lineWidth: 0.02 },
        };
        const json = JSON.stringify(v1Data);
        const data = deserializeProject(json);
        expect(data.version).toBe(3);
        expect(data.name).toBe('legacy');
        expect(data.frictionZones).toEqual([]);
        expect(data.walls).toEqual([]);
        expect(data.terrainZones).toEqual([]);
        expect(data.catalogSelections).toEqual({ motorId: '', driverId: '', batteryId: '', boardType: '' });
    });

    it('serializes and deserializes friction zones, walls, terrain', () => {
        const zones = [
            { id: 'z1', shape: 'rect' as const, x: 0, z: 0, width: 5, height: 5, friction: 0.1, label: 'Ice', priority: 1 },
        ];
        const walls = [
            { id: 'w1', x1: -5, z1: 5, x2: 5, z2: 5, thickness: 0.1, label: 'North' },
        ];
        const terrainZones = [
            { id: 't1', shape: 'ramp' as const, x: 0, z: 0, width: 10, depth: 10, slopeDirection: 0, elevationDelta: 2, label: 'Ramp' },
        ];
        const json = serializeProject(
            'env-test', '', [], [], [], [], 0.02,
            zones, walls, terrainZones,
        );
        const data = deserializeProject(json);
        expect(data.frictionZones).toEqual(zones);
        expect(data.walls).toEqual(walls);
        expect(data.terrainZones).toEqual(terrainZones);
    });

    it('serializes component specId when provided', () => {
        const comps = [
            { type: 'dc-motor', id: 'm1', specId: 'tt-motor-6v' },
        ];
        const json = serializeProject('spec-test', '', comps, [], [], [], 0.02);
        const data = deserializeProject(json);
        expect(data.components[0].specId).toBe('tt-motor-6v');
    });

    it('serializes v3 with catalogSelections and environmentPresetId when provided', () => {
        const catalogSelections = {
            motorId: 'tt-motor-6v',
            driverId: 'l298n',
            batteryId: '4xaa-alkaline',
            boardType: 'arduino-uno',
        };
        const json = serializeProject(
            'v3-test', '', [], [], [], [], 0.02,
            [], [], [],
            { catalogSelections, environmentPresetId: 'empty' },
        );
        const data = deserializeProject(json);
        expect(data.version).toBe(3);
        expect(data.catalogSelections).toEqual(catalogSelections);
        expect(data.environmentPresetId).toBe('empty');
    });
});
