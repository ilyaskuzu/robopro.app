import { create } from 'zustand';
import type { IMicrocontroller } from '@/core/mcu/interfaces/IMicrocontroller';
import type { PinMode } from '@/core/mcu/interfaces/IPin';
import { createMcu, type BoardType } from '@/core/mcu/McuFactory';

export interface PinState {
  readonly index: number;
  readonly name: string;
  readonly mode: PinMode;
  readonly value: number;
}

export interface McuStoreState {
  boardType: BoardType;
  mcu: IMicrocontroller | null;
  pinStates: PinState[];
  serialBuffer: string[];
  firmwareLoaded: boolean;
  initBoard: (boardType: BoardType) => void;
  loadFirmware: (hex: Uint8Array) => void;
  appendSerial: (line: string) => void;
  clearSerial: () => void;
  syncPinStates: () => void;
  reset: () => void;
}

export const useMcuStore = create<McuStoreState>((set, get) => ({
  boardType: 'arduino-uno',
  mcu: null,
  pinStates: [],
  serialBuffer: [],
  firmwareLoaded: false,

  initBoard: (boardType) => {
    const mcu = createMcu(boardType);
    set({ boardType, mcu, pinStates: mcu.pins.map(p => ({ index: p.index, name: p.name, mode: p.mode, value: p.value })), firmwareLoaded: false, serialBuffer: [] });
  },

  loadFirmware: (hex) => { const { mcu } = get(); if (!mcu) return; mcu.loadFirmware(hex); set({ firmwareLoaded: true }); },
  appendSerial: (line) => set(prev => ({ serialBuffer: [...prev.serialBuffer, line] })),
  clearSerial: () => set({ serialBuffer: [] }),
  syncPinStates: () => {
    const { mcu } = get();
    if (!mcu) return;
    set({ pinStates: mcu.pins.map(p => ({ index: p.index, name: p.name, mode: p.mode, value: p.value })) });
  },
  reset: () => { get().mcu?.reset(); set({ pinStates: [], serialBuffer: [], firmwareLoaded: false }); },
}));
