'use client';

import React, { useCallback, useMemo } from 'react';
import { PIN_COLORS, type PinPosition } from '@/lib/stores/useWiringEditorStore';

interface PinStubProps {
  pin: PinPosition;
  isHovered: boolean;
  isDrawingSource: boolean;
  isConnected: boolean;
  isSuggested: boolean;
  onMouseDown: (componentId: string, pinName: string) => void;
  onMouseUp: (componentId: string, pinName: string) => void;
  onHoverStart: (key: string) => void;
  onHoverEnd: () => void;
}

const LABEL_OFFSET = 14;
const STUB_LENGTH = 10;

export default function PinStub({
  pin,
  isHovered,
  isDrawingSource,
  isConnected,
  isSuggested,
  onMouseDown,
  onMouseUp,
  onHoverStart,
  onHoverEnd,
}: PinStubProps) {
  const pinKey = `${pin.componentId}:${pin.pinName}`;
  const color = PIN_COLORS[pin.type];
  const radius = isHovered || isDrawingSource || isSuggested ? 7 : 5;
  const strokeColor = isDrawingSource ? '#22c55e' : isSuggested ? '#facc15' : isHovered ? '#ffffff' : '#374151';
  const strokeWidth = isDrawingSource || isSuggested ? 2.5 : isConnected ? 2 : 1;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown(pin.componentId, pin.pinName);
  }, [pin.componentId, pin.pinName, onMouseDown]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseUp(pin.componentId, pin.pinName);
  }, [pin.componentId, pin.pinName, onMouseUp]);

  const handleHoverStart = useCallback(() => onHoverStart(pinKey), [pinKey, onHoverStart]);

  const tooltipText = useMemo(() => {
    const parts = [pin.pinName, pin.type.toUpperCase(), pin.direction];
    return parts.join(' | ');
  }, [pin.pinName, pin.type, pin.direction]);

  // Pin position is on the component edge.
  // Stub line extends outward, label outside that.
  const isLeft = pin.side === 'left';
  const isRight = pin.side === 'right';

  // Stub line endpoints
  const stubX = isLeft ? pin.x - STUB_LENGTH : isRight ? pin.x + STUB_LENGTH : pin.x;
  const stubY = pin.side === 'top' ? pin.y - STUB_LENGTH : pin.side === 'bottom' ? pin.y + STUB_LENGTH : pin.y;

  // Label position (outside the stub)
  const labelX = isLeft ? stubX - LABEL_OFFSET : isRight ? stubX + LABEL_OFFSET : pin.x;
  const labelY = pin.y;
  const labelAnchor = isLeft ? 'end' : isRight ? 'start' : 'middle';

  // Estimate label width for background (approx 6px per char)
  const labelText = pin.pinName;
  const labelW = labelText.length * 6.5 + 10;
  const labelH = 16;
  const bgX = isLeft ? labelX - labelW + 2 : isRight ? labelX - 4 : labelX - labelW / 2;
  const bgY = labelY - labelH / 2;

  return (
    <g
      className="pin-hitarea"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleHoverStart}
      onMouseLeave={onHoverEnd}
      style={{ cursor: 'pointer' }}
    >
      <title>{tooltipText}</title>

      {/* Suggestion glow ring */}
      {isSuggested && !isDrawingSource && (
        <>
          <circle
            cx={stubX} cy={stubY}
            r={14}
            fill="none"
            stroke="#facc15"
            strokeWidth={2}
            opacity={0.6}
          >
            <animate
              attributeName="r"
              values="12;16;12"
              dur="1.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.2;0.6"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* Drawing source glow */}
      {isDrawingSource && (
        <circle
          cx={stubX} cy={stubY}
          r={12}
          fill="#22c55e"
          opacity={0.2}
        >
          <animate
            attributeName="r"
            values="10;14;10"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Stub line connecting pin to component edge */}
      <line
        x1={pin.x} y1={pin.y}
        x2={stubX} y2={stubY}
        stroke={isConnected ? color : '#4b5563'}
        strokeWidth={isConnected ? 2 : 1.5}
      />

      {/* Pin circle (at the end of the stub, outside the component) */}
      <circle
        cx={stubX}
        cy={stubY}
        r={radius}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={1}
      />

      {/* Invisible larger hit area */}
      <circle
        cx={stubX} cy={stubY}
        r={12}
        fill="transparent"
      />

      {/* Label background pill */}
      <rect
        x={bgX} y={bgY}
        width={labelW} height={labelH}
        rx={3} ry={3}
        fill="#111827"
        stroke={isHovered || isSuggested ? color : '#1f2937'}
        strokeWidth={0.5}
        opacity={0.92}
      />

      {/* Pin label */}
      <text
        x={labelX}
        y={labelY}
        fill={isHovered || isSuggested ? '#ffffff' : '#d1d5db'}
        fontSize={10}
        fontWeight={isHovered || isSuggested ? '600' : '500'}
        fontFamily="ui-monospace, monospace"
        textAnchor={labelAnchor}
        dominantBaseline="central"
        pointerEvents="none"
      >
        {labelText}
      </text>
    </g>
  );
}
