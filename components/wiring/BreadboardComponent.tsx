'use client';

import React, { useCallback } from 'react';
import type { BoardPlacement } from '@/lib/stores/useWiringEditorStore';
import PinStub from './PinStub';

interface BreadboardComponentProps {
  placement: BoardPlacement;
  hoveredPinKey: string | null;
  drawingFrom: { componentId: string; pinName: string } | null;
  connectedPins: Set<string>;
  suggestedPinKeys: Set<string>;
  onPinMouseDown: (componentId: string, pinName: string) => void;
  onPinMouseUp: (componentId: string, pinName: string) => void;
  onHoverPin: (key: string) => void;
  onHoverEnd: () => void;
  onDragStart: (componentId: string, startX: number, startY: number) => void;
}

const CATEGORY_STYLES: Record<string, { body: string; border: string; text: string; glow: string }> = {
  mcu:     { body: '#0f2440', border: '#3b82f6', text: '#93c5fd', glow: '#3b82f620' },
  driver:  { body: '#281438', border: '#a855f7', text: '#d8b4fe', glow: '#a855f720' },
  motor:   { body: '#142814', border: '#22c55e', text: '#86efac', glow: '#22c55e20' },
  sensor:  { body: '#2d2010', border: '#f59e0b', text: '#fcd34d', glow: '#f59e0b20' },
  battery: { body: '#2d1414', border: '#ef4444', text: '#fca5a5', glow: '#ef444420' },
};

export default function BreadboardComponent({
  placement,
  hoveredPinKey,
  drawingFrom,
  connectedPins,
  suggestedPinKeys,
  onPinMouseDown,
  onPinMouseUp,
  onHoverPin,
  onHoverEnd,
  onDragStart,
}: BreadboardComponentProps) {
  const style = CATEGORY_STYLES[placement.category] ?? CATEGORY_STYLES.mcu;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('.pin-hitarea')) return;
    e.preventDefault();
    e.stopPropagation();
    onDragStart(placement.componentId, e.clientX, e.clientY);
  }, [placement.componentId, onDragStart]);

  const { x, y, width, height } = placement;

  return (
    <g onMouseDown={handleMouseDown} style={{ cursor: 'grab', userSelect: 'none' }}>
      {/* Shadow */}
      <rect
        x={x + 2} y={y + 2}
        width={width} height={height}
        rx={6} ry={6}
        fill="#000" opacity={0.3}
      />

      {/* Component body */}
      <rect
        x={x} y={y}
        width={width} height={height}
        rx={6} ry={6}
        fill={style.body}
        stroke={style.border}
        strokeWidth={2}
      />

      {/* IC notch at top */}
      <circle
        cx={x + width / 2} cy={y}
        r={6}
        fill={style.body}
        stroke={style.border}
        strokeWidth={1.5}
      />

      {/* Category badge */}
      <rect
        x={x + 8} y={y + 6}
        width={width - 16} height={16}
        rx={3} ry={3}
        fill={style.border} opacity={0.15}
      />
      <text
        x={x + width / 2} y={y + 16}
        fill={style.border}
        fontSize={8}
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing={1}
        pointerEvents="none"
        opacity={0.7}
      >
        {placement.category.toUpperCase()}
      </text>

      {/* Component name */}
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill={style.text}
        fontSize={13}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        pointerEvents="none"
      >
        {placement.label}
      </text>

      {/* Pins */}
      {placement.pins.map(pin => {
        const pinKey = `${pin.componentId}:${pin.pinName}`;
        return (
          <PinStub
            key={pinKey}
            pin={pin}
            isHovered={hoveredPinKey === pinKey}
            isDrawingSource={drawingFrom?.componentId === pin.componentId && drawingFrom?.pinName === pin.pinName}
            isConnected={connectedPins.has(pinKey)}
            isSuggested={suggestedPinKeys.has(pinKey)}
            onMouseDown={onPinMouseDown}
            onMouseUp={onPinMouseUp}
            onHoverStart={onHoverPin}
            onHoverEnd={onHoverEnd}
          />
        );
      })}
    </g>
  );
}
