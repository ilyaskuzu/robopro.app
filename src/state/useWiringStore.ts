import { create } from 'zustand';
import { WiringGraph, type WireConnection } from '../core/simulation/WiringGraph';
import type { IComponent, PinManifest } from '../core/components/interfaces/IComponent';

export interface PlacedComponent {
    readonly id: string;
    readonly type: string;
    readonly displayName: string;
    readonly instance: IComponent;
    readonly pinManifest: PinManifest[];
}

export interface WiringStoreState {
    wiring: WiringGraph;
    connections: WireConnection[];
    placedComponents: PlacedComponent[];
    addWire: (mcuPinIndex: number, componentId: string, componentPinName: string) => void;
    removeWire: (mcuPinIndex: number, componentId: string, componentPinName: string) => void;
    addComponent: (component: PlacedComponent) => void;
    removeComponent: (id: string) => void;
    getComponentMap: () => Map<string, IComponent>;
    clearAll: () => void;
}

export const useWiringStore = create<WiringStoreState>((set, get) => ({
    wiring: new WiringGraph(),
    connections: [],
    placedComponents: [],

    addWire: (m, c, p) => {
        get().wiring.addConnection(m, c, p);
        set({ connections: [...get().wiring.getAllConnections()] });
    },

    removeWire: (m, c, p) => {
        get().wiring.removeConnection(m, c, p);
        set({ connections: [...get().wiring.getAllConnections()] });
    },

    addComponent: (component) => {
        set((prev) => ({
            placedComponents: [...prev.placedComponents.filter(c => c.id !== component.id), component],
        }));
    },

    removeComponent: (id) => {
        // Remove all wires connected to this component
        const { wiring } = get();
        const conns = wiring.getConnectionsForComponent(id);
        for (const conn of conns) {
            wiring.removeConnection(conn.mcuPinIndex, conn.componentId, conn.componentPinName);
        }
        set((prev) => ({
            placedComponents: prev.placedComponents.filter(c => c.id !== id),
            connections: [...get().wiring.getAllConnections()],
        }));
    },

    getComponentMap: () => {
        const map = new Map<string, IComponent>();
        for (const comp of get().placedComponents) {
            map.set(comp.id, comp.instance);
        }
        return map;
    },

    clearAll: () => {
        get().wiring.clear();
        set({ connections: [], placedComponents: [] });
    },
}));
