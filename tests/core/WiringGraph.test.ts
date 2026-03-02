import { describe, it, expect } from 'vitest';
import { WiringGraph } from '../../core/simulation/WiringGraph';

describe('WiringGraph', () => {
    it('starts empty', () => {
        const g = new WiringGraph();
        expect(g.getAllConnections()).toHaveLength(0);
    });

    it('adds a connection', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        expect(g.getAllConnections()).toHaveLength(1);
        expect(g.getAllConnections()[0]).toEqual({
            mcuPinIndex: 5,
            componentId: 'driver',
            componentPinName: 'ENA',
        });
    });

    it('prevents duplicate connections', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        g.addConnection(5, 'driver', 'ENA');
        expect(g.getAllConnections()).toHaveLength(1);
    });

    it('allows different connections on the same pin', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        g.addConnection(5, 'motor', 'POWER');
        expect(g.getAllConnections()).toHaveLength(2);
    });

    it('removes a specific connection', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        g.addConnection(7, 'driver', 'IN1');
        g.removeConnection(5, 'driver', 'ENA');
        expect(g.getAllConnections()).toHaveLength(1);
        expect(g.getAllConnections()[0].componentPinName).toBe('IN1');
    });

    it('getConnectionsForComponent filters by component id', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        g.addConnection(7, 'driver', 'IN1');
        g.addConnection(3, 'sensor', 'TRIG');
        expect(g.getConnectionsForComponent('driver')).toHaveLength(2);
        expect(g.getConnectionsForComponent('sensor')).toHaveLength(1);
        expect(g.getConnectionsForComponent('nonexistent')).toHaveLength(0);
    });

    it('clears all connections', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        g.addConnection(7, 'driver', 'IN1');
        g.clear();
        expect(g.getAllConnections()).toHaveLength(0);
    });

    it('removing a non-existent connection does nothing', () => {
        const g = new WiringGraph();
        g.addConnection(5, 'driver', 'ENA');
        g.removeConnection(99, 'ghost', 'PIN');
        expect(g.getAllConnections()).toHaveLength(1);
    });
});
