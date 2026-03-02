"use client";

import { create } from 'zustand';
import type { CatalogCategory } from '@/core/components/catalog';

export interface AssemblyPlacement {
  id: string;
  catalogId: string;
  category: CatalogCategory;
  position: { x: number; y: number };
  connections: Array<{ fromZone: string; toComponentId: string; toZone: string }>;
}

export interface AssemblyStoreState {
  placements: AssemblyPlacement[];
  selectedId: string | null;

  addComponent: (catalogId: string, category: CatalogCategory) => void;
  /** Restore placements from saved project (e.g. preset load). Uses provided ids. */
  setPlacements: (placements: AssemblyPlacement[]) => void;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, pos: { x: number; y: number }) => void;
  connectComponents: (fromId: string, fromZone: string, toId: string, toZone: string) => void;
  disconnectComponents: (fromId: string, toId: string) => void;
  selectComponent: (id: string | null) => void;
  clearAll: () => void;

  // Computed getters
  getByCategory: (cat: CatalogCategory) => AssemblyPlacement[];
  getMcuPlacement: () => AssemblyPlacement | undefined;
  getMotorPlacements: () => AssemblyPlacement[];
  getDriverPlacement: () => AssemblyPlacement | undefined;
  getBatteryPlacement: () => AssemblyPlacement | undefined;
  isReadyForWiring: () => boolean;
}

const DEFAULT_OFFSET = 60;

export const useAssemblyStore = create<AssemblyStoreState>((set, get) => ({
  placements: [],
  selectedId: null,

  addComponent: (catalogId, category) => {
    const { placements } = get();
    const id = `${category}-${Date.now()}`;
    const x = placements.length * DEFAULT_OFFSET;
    const placement: AssemblyPlacement = {
      id,
      catalogId,
      category,
      position: { x, y: 0 },
      connections: [],
    };
    set({ placements: [...placements, placement] });
  },

  setPlacements: (placements) => set({ placements }),

  removeComponent: (id) => {
    const { placements } = get();
    const filtered = placements.filter((p) => p.id !== id);
    const cleaned = filtered.map((p) => ({
      ...p,
      connections: p.connections.filter((c) => c.toComponentId !== id),
    }));
    set((s) => ({
      placements: cleaned,
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  moveComponent: (id, pos) => {
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === id ? { ...p, position: pos } : p
      ),
    }));
  },

  connectComponents: (fromId, fromZone, toId, toZone) => {
    const { placements } = get();
    const from = placements.find((p) => p.id === fromId);
    const to = placements.find((p) => p.id === toId);
    if (!from || !to) return;
    const existing = from.connections.some(
      (c) => c.fromZone === fromZone && c.toComponentId === toId && c.toZone === toZone
    );
    if (existing) return;
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === fromId
          ? {
              ...p,
              connections: [
                ...p.connections,
                { fromZone, toComponentId: toId, toZone },
              ],
            }
          : p
      ),
    }));
  },

  disconnectComponents: (fromId, toId) => {
    set((s) => ({
      placements: s.placements.map((p) =>
        p.id === fromId
          ? {
              ...p,
              connections: p.connections.filter((c) => c.toComponentId !== toId),
            }
          : p
      ),
    }));
  },

  selectComponent: (id) => set({ selectedId: id }),

  clearAll: () => set({ placements: [], selectedId: null }),

  getByCategory: (cat) => get().placements.filter((p) => p.category === cat),

  getMcuPlacement: () => get().placements.find((p) => p.category === 'mcu'),

  getMotorPlacements: () =>
    get().placements.filter((p) => p.category === 'dc-motor' || p.category === 'stepper'),

  getDriverPlacement: () => get().placements.find((p) => p.category === 'driver'),

  getBatteryPlacement: () => get().placements.find((p) => p.category === 'battery'),

  isReadyForWiring: () => {
    const mcu = get().getMcuPlacement();
    const driver = get().getDriverPlacement();
    const motors = get().getMotorPlacements();
    return Boolean(mcu && driver && motors.length >= 1);
  },
}));
