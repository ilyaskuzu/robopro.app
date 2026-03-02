'use client';

import React from 'react';
import type { WireSegment, WireValidationError, BoardPlacement, PinPosition } from '@/lib/stores/useWiringEditorStore';

interface WireDrawerProps {
  wires: WireSegment[];
  placements: BoardPlacement[];
  selectedWireId: string | null;
  validationErrors: WireValidationError[];
  drawingFrom: { componentId: string; pinName: string } | null;
  mousePosition: { x: number; y: number } | null;
  onSelectWire: (wireId: string | null) => void;
  onDeleteWire: (wireId: string) => void;
}

const STUB_LENGTH = 10;

function findPin(placements: BoardPlacement[], componentId: string, pinName: string): PinPosition | null {
  for (const p of placements) {
    const pin = p.pins.find(pp => pp.componentId === componentId && pp.pinName === pinName);
    if (pin) return pin;
  }
  return null;
}

/** Get the stub-end position (where the wire connects, outside the component). */
function getStubEnd(pin: PinPosition): { x: number; y: number } {
  switch (pin.side) {
    case 'left':  return { x: pin.x - STUB_LENGTH, y: pin.y };
    case 'right': return { x: pin.x + STUB_LENGTH, y: pin.y };
    case 'top':   return { x: pin.x, y: pin.y - STUB_LENGTH };
    case 'bottom': return { x: pin.x, y: pin.y + STUB_LENGTH };
  }
}

/** Generate a smooth cubic bezier path between two pin positions. */
function generateBezierPath(from: PinPosition, to: PinPosition): string {
  const a = getStubEnd(from);
  const b = getStubEnd(to);

  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.max(50, Math.min(150, dist * 0.4));

  let cx1 = a.x, cy1 = a.y;
  let cx2 = b.x, cy2 = b.y;

  switch (from.side) {
    case 'left':  cx1 = a.x - offset; break;
    case 'right': cx1 = a.x + offset; break;
    case 'top':   cy1 = a.y - offset; break;
    case 'bottom': cy1 = a.y + offset; break;
  }

  switch (to.side) {
    case 'left':  cx2 = b.x - offset; break;
    case 'right': cx2 = b.x + offset; break;
    case 'top':   cy2 = b.y - offset; break;
    case 'bottom': cy2 = b.y + offset; break;
  }

  return `M ${a.x} ${a.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${b.x} ${b.y}`;
}

/** Generate a live-drawing path from a pin to the current mouse position. */
function generateDrawingPath(from: PinPosition, mouse: { x: number; y: number }): string {
  const a = getStubEnd(from);
  const dx = Math.abs(mouse.x - a.x);
  const offset = Math.max(40, Math.min(120, dx * 0.4));

  let cx1 = a.x, cy1 = a.y;

  switch (from.side) {
    case 'left':  cx1 = a.x - offset; break;
    case 'right': cx1 = a.x + offset; break;
    case 'top':   cy1 = a.y - offset; break;
    case 'bottom': cy1 = a.y + offset; break;
  }

  const cx2 = (cx1 + mouse.x) / 2;
  const cy2 = mouse.y;

  return `M ${a.x} ${a.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${mouse.x} ${mouse.y}`;
}

export default function WireDrawer({
  wires,
  placements,
  selectedWireId,
  validationErrors,
  drawingFrom,
  mousePosition,
  onSelectWire,
  onDeleteWire,
}: WireDrawerProps) {
  const errorWireIds = new Set(validationErrors.map(e => e.wireId));

  const handleContextMenu = (e: React.MouseEvent, wireId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteWire(wireId);
  };

  return (
    <g>
      {/* Existing wires */}
      {wires.map(wire => {
        const fromPin = findPin(placements, wire.fromComponentId, wire.fromPinName);
        const toPin = findPin(placements, wire.toComponentId, wire.toPinName);
        if (!fromPin || !toPin) return null;

        const isSelected = wire.id === selectedWireId;
        const hasError = errorWireIds.has(wire.id);
        const pathD = generateBezierPath(fromPin, toPin);
        const fromStub = getStubEnd(fromPin);
        const toStub = getStubEnd(toPin);

        return (
          <g key={wire.id}>
            {/* Invisible wider hit target */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectWire(wire.id)}
              onContextMenu={(e) => handleContextMenu(e, wire.id)}
            />

            {/* Selected glow (behind the wire) */}
            {isSelected && (
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.15}
                pointerEvents="none"
              />
            )}

            {/* Visible wire */}
            <path
              d={pathD}
              fill="none"
              stroke={hasError ? '#ef4444' : wire.color}
              strokeWidth={isSelected ? 3 : 2}
              strokeLinecap="round"
              opacity={hasError ? 0.9 : 1}
              pointerEvents="none"
            />

            {/* Junction dots at wire endpoints */}
            <circle cx={fromStub.x} cy={fromStub.y} r={3} fill={wire.color} pointerEvents="none" />
            <circle cx={toStub.x} cy={toStub.y} r={3} fill={wire.color} pointerEvents="none" />

            {/* Error badge */}
            {hasError && (
              <g>
                <circle
                  cx={(fromStub.x + toStub.x) / 2}
                  cy={(fromStub.y + toStub.y) / 2}
                  r={8}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
                <text
                  x={(fromStub.x + toStub.x) / 2}
                  y={(fromStub.y + toStub.y) / 2}
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  !
                </text>
                <title>{validationErrors.find(e => e.wireId === wire.id)?.message}</title>
              </g>
            )}
          </g>
        );
      })}

      {/* Drawing-in-progress wire */}
      {drawingFrom && mousePosition && (() => {
        const fromPin = findPin(placements, drawingFrom.componentId, drawingFrom.pinName);
        if (!fromPin) return null;
        const pathD = generateDrawingPath(fromPin, mousePosition);
        return (
          <>
            {/* Glow */}
            <path
              d={pathD}
              fill="none"
              stroke="#22c55e"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.15}
              pointerEvents="none"
            />
            {/* Dashed wire */}
            <path
              d={pathD}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="8 4"
              strokeLinecap="round"
              opacity={0.85}
              pointerEvents="none"
            />
            {/* Cursor dot */}
            <circle
              cx={mousePosition.x}
              cy={mousePosition.y}
              r={4}
              fill="#22c55e"
              opacity={0.6}
              pointerEvents="none"
            />
          </>
        );
      })()}
    </g>
  );
}
