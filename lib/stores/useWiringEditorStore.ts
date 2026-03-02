import { create } from 'zustand';
import { useWiringStore } from './useWiringStore';
import { useMcuStore } from './useMcuStore';

const MCU_COMPONENT_ID = '__mcu__';

/**
 * If `wire` is an MCU↔component wire, call useWiringStore.removeWire so
 * the simulation graph stays in sync regardless of which UI path triggered removal.
 */
function syncRemoveWireToStore(wire: { fromComponentId: string; fromPinName: string; toComponentId: string; toPinName: string }): void {
  const mcu = useMcuStore.getState().mcu;
  if (!mcu) return;

  const isFromMcu = wire.fromComponentId === MCU_COMPONENT_ID;
  const isToMcu = wire.toComponentId === MCU_COMPONENT_ID;
  if (!isFromMcu && !isToMcu) return;

  const mcuPinName = isFromMcu ? wire.fromPinName : wire.toPinName;
  const compId = isFromMcu ? wire.toComponentId : wire.fromComponentId;
  const compPinName = isFromMcu ? wire.toPinName : wire.fromPinName;

  const idx = mcu.pins.findIndex((p) => p.name === mcuPinName);
  if (idx >= 0) {
    useWiringStore.getState().removeWire(idx, compId, compPinName);
  }
}

// ─── Types ───────────────────────────────────────────────────

export interface PinPosition {
  readonly componentId: string;
  readonly pinName: string;
  readonly x: number;
  readonly y: number;
  readonly type: 'digital' | 'analog' | 'power' | 'ground' | 'pwm';
  readonly direction: 'input' | 'output' | 'bidirectional';
  readonly side: 'left' | 'right' | 'top' | 'bottom';
}

export interface WireSegment {
  readonly id: string;
  readonly fromComponentId: string;
  readonly fromPinName: string;
  readonly toComponentId: string;
  readonly toPinName: string;
  readonly color: string;
  readonly path: Array<{ x: number; y: number }>;
}

export interface BoardPlacement {
  readonly componentId: string;
  readonly label: string;
  readonly category: 'mcu' | 'driver' | 'motor' | 'sensor' | 'battery';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pins: PinPosition[];
}

export type WiringEditorAction =
  | { type: 'addWire'; wire: WireSegment }
  | { type: 'removeWire'; wireId: string }
  | { type: 'moveComponent'; componentId: string; prevX: number; prevY: number; x: number; y: number };

// ─── Pin color mapping ──────────────────────────────────────

export const PIN_COLORS: Record<PinPosition['type'], string> = {
  digital: '#3b82f6',
  analog: '#8b5cf6',
  power: '#ef4444',
  ground: '#6b7280',
  pwm: '#f59e0b',
};

export function getWireColor(fromType: PinPosition['type']): string {
  switch (fromType) {
    case 'power': return '#ef4444';
    case 'ground': return '#6b7280';
    case 'analog': return '#8b5cf6';
    case 'pwm': return '#f59e0b';
    default: return '#3b82f6';
  }
}

// ─── Pin Suggestion Engine ──────────────────────────────────

function findPinInPlacements(
  componentId: string, pinName: string, placements: BoardPlacement[]
): PinPosition | null {
  for (const p of placements) {
    const pin = p.pins.find(pp => pp.componentId === componentId && pp.pinName === pinName);
    if (pin) return pin;
  }
  return null;
}

function findPlacement(componentId: string, placements: BoardPlacement[]): BoardPlacement | null {
  return placements.find(p => p.componentId === componentId) ?? null;
}

function isPinCompatible(
  from: PinPosition, fromCategory: string,
  to: PinPosition, toCategory: string,
): boolean {
  if (from.type === 'power' && to.type === 'power') return true;
  if (from.type === 'ground' && to.type === 'ground') return true;
  if ((from.type === 'power' && to.type === 'ground') ||
      (from.type === 'ground' && to.type === 'power')) return false;

  const isFromSignal = ['digital', 'analog', 'pwm'].includes(from.type);
  const isToSignal = ['digital', 'analog', 'pwm'].includes(to.type);
  if (!isFromSignal || !isToSignal) return false;

  // MCU → Driver: MCU digital/pwm to driver input pins
  if (fromCategory === 'mcu' && toCategory === 'driver') {
    return to.direction === 'input';
  }
  if (fromCategory === 'driver' && toCategory === 'mcu') {
    return from.direction === 'output';
  }

  // Driver → Motor: driver output to motor input
  if (fromCategory === 'driver' && toCategory === 'motor') {
    return from.direction === 'output' && to.direction === 'input';
  }
  if (fromCategory === 'motor' && toCategory === 'driver') {
    return to.direction === 'output' && from.direction === 'input';
  }

  // MCU ↔ Sensor
  if (fromCategory === 'mcu' && toCategory === 'sensor') {
    return to.direction === 'input' || to.direction === 'output' || to.direction === 'bidirectional';
  }
  if (fromCategory === 'sensor' && toCategory === 'mcu') {
    return from.direction === 'output' || from.direction === 'bidirectional';
  }

  // Generic: output → input or bidirectional
  if (from.direction === 'output' && (to.direction === 'input' || to.direction === 'bidirectional')) return true;
  if (from.direction === 'input' && (to.direction === 'output' || to.direction === 'bidirectional')) return true;
  if (from.direction === 'bidirectional') return true;

  return false;
}

function computeSuggestions(
  drawingFrom: { componentId: string; pinName: string } | null,
  placements: BoardPlacement[],
  wires: WireSegment[],
): Set<string> {
  if (!drawingFrom) return new Set();

  const fromPin = findPinInPlacements(drawingFrom.componentId, drawingFrom.pinName, placements);
  const fromPlacement = findPlacement(drawingFrom.componentId, placements);
  if (!fromPin || !fromPlacement) return new Set();

  const connected = new Set<string>();
  for (const w of wires) {
    connected.add(`${w.fromComponentId}:${w.fromPinName}`);
    connected.add(`${w.toComponentId}:${w.toPinName}`);
  }

  const suggestions = new Set<string>();
  for (const placement of placements) {
    if (placement.componentId === drawingFrom.componentId) continue;

    for (const pin of placement.pins) {
      const key = `${pin.componentId}:${pin.pinName}`;
      if (connected.has(key)) continue;
      if (isPinCompatible(fromPin, fromPlacement.category, pin, placement.category)) {
        suggestions.add(key);
      }
    }
  }

  return suggestions;
}

/** Rank suggestion - lower is better (best match). */
export function getSuggestionRank(
  fromPin: PinPosition, fromCategory: string,
  toPin: PinPosition, toCategory: string,
): number {
  // PWM → PWM input (speed control): best match
  if (fromPin.type === 'pwm' && toPin.type === 'pwm') return 1;
  // MCU digital → driver digital input
  if (fromCategory === 'mcu' && toCategory === 'driver' && fromPin.type === 'digital' && toPin.type === 'digital') return 2;
  // Driver output → motor
  if (fromCategory === 'driver' && toCategory === 'motor') return 2;
  // Exact type match
  if (fromPin.type === toPin.type) return 3;
  // Power/ground match
  if (fromPin.type === 'power' && toPin.type === 'power') return 1;
  if (fromPin.type === 'ground' && toPin.type === 'ground') return 1;
  return 5;
}

// ─── Validation ─────────────────────────────────────────────

export interface WireValidationError {
  readonly wireId: string;
  readonly message: string;
}

export function validateWires(wires: WireSegment[], placements: BoardPlacement[]): WireValidationError[] {
  const errors: WireValidationError[] = [];
  const pinMap = new Map<string, PinPosition>();

  for (const p of placements) {
    for (const pin of p.pins) {
      pinMap.set(`${pin.componentId}:${pin.pinName}`, pin);
    }
  }

  const pinConnections = new Map<string, string[]>();
  for (const w of wires) {
    const fromKey = `${w.fromComponentId}:${w.fromPinName}`;
    const toKey = `${w.toComponentId}:${w.toPinName}`;
    if (!pinConnections.has(fromKey)) pinConnections.set(fromKey, []);
    if (!pinConnections.has(toKey)) pinConnections.set(toKey, []);
    pinConnections.get(fromKey)!.push(w.id);
    pinConnections.get(toKey)!.push(w.id);
  }

  for (const [key, wireIds] of pinConnections) {
    if (wireIds.length > 1) {
      const pin = pinMap.get(key);
      if (pin && pin.type !== 'power' && pin.type !== 'ground') {
        for (const wid of wireIds) {
          errors.push({ wireId: wid, message: `Pin ${key} has multiple connections` });
        }
      }
    }
  }

  for (const w of wires) {
    const fromPin = pinMap.get(`${w.fromComponentId}:${w.fromPinName}`);
    const toPin = pinMap.get(`${w.toComponentId}:${w.toPinName}`);
    if (fromPin && toPin) {
      if ((fromPin.type === 'power' && toPin.type === 'ground') ||
          (fromPin.type === 'ground' && toPin.type === 'power')) {
        errors.push({ wireId: w.id, message: 'Short circuit: power connected to ground' });
      }
    }
  }

  return errors;
}

// ─── Store ──────────────────────────────────────────────────

export interface WiringEditorState {
  placements: BoardPlacement[];
  wires: WireSegment[];
  selectedWireId: string | null;
  hoveredPinKey: string | null;
  drawingFrom: { componentId: string; pinName: string } | null;
  suggestedPinKeys: Set<string>;
  validationErrors: WireValidationError[];

  undoStack: WiringEditorAction[];
  redoStack: WiringEditorAction[];

  panX: number;
  panY: number;
  zoom: number;

  setPlacements: (placements: BoardPlacement[]) => void;
  /** Replace all wires (e.g. when loading a project). */
  setWires: (wires: WireSegment[]) => void;
  addWire: (wire: WireSegment) => void;
  removeWire: (wireId: string) => void;
  selectWire: (wireId: string | null) => void;
  setHoveredPin: (key: string | null) => void;
  startDrawing: (componentId: string, pinName: string) => void;
  finishDrawing: (componentId: string, pinName: string) => void;
  cancelDrawing: () => void;
  moveComponent: (componentId: string, x: number, y: number) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
}

let wireIdCounter = 0;
export function generateWireId(): string {
  return `wire-${++wireIdCounter}`;
}

export const useWiringEditorStore = create<WiringEditorState>((set, get) => ({
  placements: [],
  wires: [],
  selectedWireId: null,
  hoveredPinKey: null,
  drawingFrom: null,
  suggestedPinKeys: new Set(),
  validationErrors: [],
  undoStack: [],
  redoStack: [],
  panX: 0,
  panY: 0,
  zoom: 1,

  setPlacements: (placements) => set({ placements }),

  setWires: (wires) => {
    const state = get();
    const errors = validateWires(wires, state.placements);
    set({ wires: [...wires], validationErrors: errors });
  },

  addWire: (wire) => {
    const state = get();
    const newWires = [...state.wires, wire];
    const errors = validateWires(newWires, state.placements);
    set({
      wires: newWires,
      validationErrors: errors,
      undoStack: [...state.undoStack, { type: 'addWire', wire }],
      redoStack: [],
    });
  },

  removeWire: (wireId) => {
    const state = get();
    const removed = state.wires.find(w => w.id === wireId);
    if (!removed) return;
    syncRemoveWireToStore(removed);
    const newWires = state.wires.filter(w => w.id !== wireId);
    const errors = validateWires(newWires, state.placements);
    set({
      wires: newWires,
      validationErrors: errors,
      selectedWireId: state.selectedWireId === wireId ? null : state.selectedWireId,
      undoStack: [...state.undoStack, { type: 'removeWire', wireId }],
      redoStack: [],
    });
  },

  selectWire: (wireId) => set({ selectedWireId: wireId }),

  setHoveredPin: (key) => set({ hoveredPinKey: key }),

  startDrawing: (componentId, pinName) => {
    const state = get();
    const suggestions = computeSuggestions(
      { componentId, pinName },
      state.placements,
      state.wires,
    );
    set({ drawingFrom: { componentId, pinName }, suggestedPinKeys: suggestions });
  },

  finishDrawing: (componentId, pinName) => {
    const state = get();
    if (!state.drawingFrom) return;
    if (state.drawingFrom.componentId === componentId && state.drawingFrom.pinName === pinName) {
      set({ drawingFrom: null, suggestedPinKeys: new Set() });
      return;
    }

    let fromType: PinPosition['type'] = 'digital';
    for (const p of state.placements) {
      const pin = p.pins.find(pp => pp.componentId === state.drawingFrom!.componentId && pp.pinName === state.drawingFrom!.pinName);
      if (pin) { fromType = pin.type; break; }
    }

    const wire: WireSegment = {
      id: generateWireId(),
      fromComponentId: state.drawingFrom.componentId,
      fromPinName: state.drawingFrom.pinName,
      toComponentId: componentId,
      toPinName: pinName,
      color: getWireColor(fromType),
      path: [],
    };
    const newWires = [...state.wires, wire];
    const errors = validateWires(newWires, state.placements);
    set({
      wires: newWires,
      drawingFrom: null,
      suggestedPinKeys: new Set(),
      validationErrors: errors,
      undoStack: [...state.undoStack, { type: 'addWire', wire }],
      redoStack: [],
    });
  },

  cancelDrawing: () => set({ drawingFrom: null, suggestedPinKeys: new Set() }),

  moveComponent: (componentId, x, y) => {
    const state = get();
    const placement = state.placements.find(p => p.componentId === componentId);
    if (!placement) return;
    const prevX = placement.x;
    const prevY = placement.y;
    const dx = x - prevX;
    const dy = y - prevY;
    const newPlacements = state.placements.map(p =>
      p.componentId === componentId
        ? { ...p, x, y, pins: p.pins.map(pin => ({ ...pin, x: pin.x + dx, y: pin.y + dy })) }
        : p
    );
    set({
      placements: newPlacements,
      undoStack: [...state.undoStack, { type: 'moveComponent', componentId, prevX, prevY, x, y }],
      redoStack: [],
    });
  },

  setPan: (x, y) => set({ panX: x, panY: y }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  undo: () => {
    const state = get();
    const action = state.undoStack[state.undoStack.length - 1];
    if (!action) return;
    const newUndoStack = state.undoStack.slice(0, -1);

    switch (action.type) {
      case 'addWire': {
        const newWires = state.wires.filter(w => w.id !== action.wire.id);
        const errors = validateWires(newWires, state.placements);
        set({ wires: newWires, validationErrors: errors, undoStack: newUndoStack, redoStack: [...state.redoStack, action] });
        break;
      }
      case 'removeWire': {
        const removedWire = state.undoStack
          .filter(a => a.type === 'addWire')
          .find(a => a.type === 'addWire' && a.wire.id === action.wireId);
        if (removedWire && removedWire.type === 'addWire') {
          const newWires = [...state.wires, removedWire.wire];
          const errors = validateWires(newWires, state.placements);
          set({ wires: newWires, validationErrors: errors, undoStack: newUndoStack, redoStack: [...state.redoStack, action] });
        }
        break;
      }
      case 'moveComponent': {
        const newPlacements = state.placements.map(p => {
          if (p.componentId !== action.componentId) return p;
          const dx = action.prevX - p.x;
          const dy = action.prevY - p.y;
          return { ...p, x: action.prevX, y: action.prevY, pins: p.pins.map(pin => ({ ...pin, x: pin.x + dx, y: pin.y + dy })) };
        });
        set({ placements: newPlacements, undoStack: newUndoStack, redoStack: [...state.redoStack, action] });
        break;
      }
    }
  },

  redo: () => {
    const state = get();
    const action = state.redoStack[state.redoStack.length - 1];
    if (!action) return;
    const newRedoStack = state.redoStack.slice(0, -1);

    switch (action.type) {
      case 'addWire': {
        const newWires = [...state.wires, action.wire];
        const errors = validateWires(newWires, state.placements);
        set({ wires: newWires, validationErrors: errors, undoStack: [...state.undoStack, action], redoStack: newRedoStack });
        break;
      }
      case 'removeWire': {
        const newWires = state.wires.filter(w => w.id !== action.wireId);
        const errors = validateWires(newWires, state.placements);
        set({ wires: newWires, validationErrors: errors, undoStack: [...state.undoStack, action], redoStack: newRedoStack });
        break;
      }
      case 'moveComponent': {
        const newPlacements = state.placements.map(p => {
          if (p.componentId !== action.componentId) return p;
          const dx = action.x - p.x;
          const dy = action.y - p.y;
          return { ...p, x: action.x, y: action.y, pins: p.pins.map(pin => ({ ...pin, x: pin.x + dx, y: pin.y + dy })) };
        });
        set({ placements: newPlacements, undoStack: [...state.undoStack, action], redoStack: newRedoStack });
        break;
      }
    }
  },

  clearAll: () => set({
    placements: [],
    wires: [],
    selectedWireId: null,
    hoveredPinKey: null,
    drawingFrom: null,
    suggestedPinKeys: new Set(),
    validationErrors: [],
    undoStack: [],
    redoStack: [],
    panX: 0,
    panY: 0,
    zoom: 1,
  }),
}));
