import { create } from 'zustand';
import { WiringGraph, type WireConnection } from '@/core/simulation/WiringGraph';

export interface WiringStoreState {
  wiring: WiringGraph;
  connections: WireConnection[];
  addWire: (mcuPinIndex: number, componentId: string, componentPinName: string) => void;
  removeWire: (mcuPinIndex: number, componentId: string, componentPinName: string) => void;
  clearAll: () => void;
}

export const useWiringStore = create<WiringStoreState>((set, get) => ({
  wiring: new WiringGraph(),
  connections: [],
  addWire: (m, c, p) => { get().wiring.addConnection(m, c, p); set({ connections: [...get().wiring.getAllConnections()] }); },
  removeWire: (m, c, p) => { get().wiring.removeConnection(m, c, p); set({ connections: [...get().wiring.getAllConnections()] }); },
  clearAll: () => { get().wiring.clear(); set({ connections: [] }); },
}));
