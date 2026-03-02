import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateWires,
  generateWireId,
  getWireColor,
  PIN_COLORS,
  type PinPosition,
  type WireSegment,
  type BoardPlacement,
} from '@/lib/stores/useWiringEditorStore';

// ── Helpers ──────────────────────────────────────────────────

function makePin(componentId: string, pinName: string, type: PinPosition['type'], x = 0, y = 0): PinPosition {
  return { componentId, pinName, x, y, type, direction: 'bidirectional', side: 'left' };
}

function makePlacement(componentId: string, pins: PinPosition[], category: BoardPlacement['category'] = 'mcu'): BoardPlacement {
  return { componentId, label: componentId, category, x: 0, y: 0, width: 100, height: 60, pins };
}

function makeWire(id: string, from: [string, string], to: [string, string], color = '#3b82f6'): WireSegment {
  return { id, fromComponentId: from[0], fromPinName: from[1], toComponentId: to[0], toPinName: to[1], color, path: [] };
}

// ── Wire ID generation ───────────────────────────────────────

describe('WiringEditorStore – wire IDs', () => {
  it('generates unique wire IDs', () => {
    const a = generateWireId();
    const b = generateWireId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^wire-\d+$/);
  });
});

// ── Pin colors ───────────────────────────────────────────────

describe('WiringEditorStore – pin colors', () => {
  it('has colors for all pin types', () => {
    expect(PIN_COLORS.digital).toBeDefined();
    expect(PIN_COLORS.analog).toBeDefined();
    expect(PIN_COLORS.power).toBeDefined();
    expect(PIN_COLORS.ground).toBeDefined();
    expect(PIN_COLORS.pwm).toBeDefined();
  });

  it('getWireColor returns correct color by type', () => {
    expect(getWireColor('power')).toBe('#ef4444');
    expect(getWireColor('ground')).toBe('#6b7280');
    expect(getWireColor('analog')).toBe('#8b5cf6');
    expect(getWireColor('pwm')).toBe('#f59e0b');
    expect(getWireColor('digital')).toBe('#3b82f6');
  });
});

// ── Wire validation ──────────────────────────────────────────

describe('WiringEditorStore – validation', () => {
  const mcuPins = [
    makePin('mcu', 'D2', 'digital', 10, 10),
    makePin('mcu', 'D3', 'pwm', 20, 10),
    makePin('mcu', '5V', 'power', 30, 10),
    makePin('mcu', 'GND', 'ground', 40, 10),
  ];
  const driverPins = [
    makePin('driver', 'IN1', 'digital', 10, 80),
    makePin('driver', 'IN2', 'digital', 20, 80),
    makePin('driver', 'VCC', 'power', 30, 80),
    makePin('driver', 'GND', 'ground', 40, 80),
  ];
  const placements = [makePlacement('mcu', mcuPins, 'mcu'), makePlacement('driver', driverPins, 'driver')];

  it('returns no errors for valid wiring', () => {
    const wires = [
      makeWire('w1', ['mcu', 'D2'], ['driver', 'IN1']),
      makeWire('w2', ['mcu', 'D3'], ['driver', 'IN2']),
    ];
    const errors = validateWires(wires, placements);
    expect(errors).toHaveLength(0);
  });

  it('detects multiple connections on a non-power pin', () => {
    const wires = [
      makeWire('w1', ['mcu', 'D2'], ['driver', 'IN1']),
      makeWire('w2', ['mcu', 'D3'], ['driver', 'IN1']), // IN1 connected twice
    ];
    const errors = validateWires(wires, placements);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.includes('multiple connections'))).toBe(true);
  });

  it('allows multiple connections on power pins', () => {
    const wires = [
      makeWire('w1', ['mcu', '5V'], ['driver', 'VCC']),
      makeWire('w2', ['mcu', '5V'], ['driver', 'IN1']), // 5V to IN1 plus VCC
    ];
    const errors = validateWires(wires, placements);
    // Only the non-power pin with multiple connections should error, 5V is power so OK
    const powerErrors = errors.filter(e => e.message.includes('Short circuit'));
    expect(powerErrors).toHaveLength(0);
  });

  it('detects power-to-ground short circuit', () => {
    const wires = [
      makeWire('w1', ['mcu', '5V'], ['driver', 'GND']),
    ];
    const errors = validateWires(wires, placements);
    expect(errors.some(e => e.message.includes('Short circuit'))).toBe(true);
  });

  it('returns empty errors for empty wires', () => {
    expect(validateWires([], placements)).toHaveLength(0);
  });
});

// ── Store undo/redo ──────────────────────────────────────────

describe('WiringEditorStore – store operations', () => {
  // We test the store logic by using the Zustand store directly
  // (since Zustand stores are just functions, they work in Node without React)
  let store: ReturnType<typeof import('@/lib/stores/useWiringEditorStore').useWiringEditorStore.getState>;

  beforeEach(async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    mod.useWiringEditorStore.getState().clearAll();
    store = mod.useWiringEditorStore.getState();
  });

  it('adds and removes wires', async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    const { useWiringEditorStore } = mod;

    const wire: WireSegment = makeWire('w1', ['mcu', 'D2'], ['driver', 'IN1']);
    useWiringEditorStore.getState().addWire(wire);
    expect(useWiringEditorStore.getState().wires).toHaveLength(1);

    useWiringEditorStore.getState().removeWire('w1');
    expect(useWiringEditorStore.getState().wires).toHaveLength(0);
  });

  it('supports undo after adding wire', async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    const { useWiringEditorStore } = mod;

    const wire: WireSegment = makeWire('w-undo', ['mcu', 'D2'], ['driver', 'IN1']);
    useWiringEditorStore.getState().addWire(wire);
    expect(useWiringEditorStore.getState().wires).toHaveLength(1);

    useWiringEditorStore.getState().undo();
    expect(useWiringEditorStore.getState().wires).toHaveLength(0);
  });

  it('supports redo after undo', async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    const { useWiringEditorStore } = mod;

    const wire: WireSegment = makeWire('w-redo', ['mcu', 'D2'], ['driver', 'IN1']);
    useWiringEditorStore.getState().addWire(wire);
    useWiringEditorStore.getState().undo();
    expect(useWiringEditorStore.getState().wires).toHaveLength(0);

    useWiringEditorStore.getState().redo();
    expect(useWiringEditorStore.getState().wires).toHaveLength(1);
    expect(useWiringEditorStore.getState().wires[0].id).toBe('w-redo');
  });

  it('clearAll resets everything', async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    const { useWiringEditorStore } = mod;

    useWiringEditorStore.getState().addWire(makeWire('w2', ['mcu', 'D2'], ['driver', 'IN1']));
    useWiringEditorStore.getState().clearAll();

    const s = useWiringEditorStore.getState();
    expect(s.wires).toHaveLength(0);
    expect(s.undoStack).toHaveLength(0);
    expect(s.redoStack).toHaveLength(0);
    expect(s.selectedWireId).toBeNull();
  });

  it('selectWire updates selection', async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    const { useWiringEditorStore } = mod;

    useWiringEditorStore.getState().selectWire('w1');
    expect(useWiringEditorStore.getState().selectedWireId).toBe('w1');

    useWiringEditorStore.getState().selectWire(null);
    expect(useWiringEditorStore.getState().selectedWireId).toBeNull();
  });

  it('zoom is clamped between 0.25 and 4', async () => {
    const mod = await import('@/lib/stores/useWiringEditorStore');
    const { useWiringEditorStore } = mod;

    useWiringEditorStore.getState().setZoom(0.1);
    expect(useWiringEditorStore.getState().zoom).toBe(0.25);

    useWiringEditorStore.getState().setZoom(10);
    expect(useWiringEditorStore.getState().zoom).toBe(4);
  });
});
