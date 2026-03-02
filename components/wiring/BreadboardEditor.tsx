'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWiringEditorStore, type PinPosition, PIN_COLORS } from '@/lib/stores/useWiringEditorStore';
import { useWiringStore } from '@/lib/stores/useWiringStore';
import { useMcuStore } from '@/lib/stores/useMcuStore';
import BreadboardComponent from './BreadboardComponent';
import WireDrawer from './WireDrawer';

const MCU_COMPONENT_ID = '__mcu__';
// removeWire sync is now handled inside useWiringEditorStore.removeWire

const GRID_SPACING = 20;
const SVG_WIDTH = 1100;
const SVG_HEIGHT = 700;

export default function BreadboardEditor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<{ componentId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const {
    placements, wires, selectedWireId, hoveredPinKey, drawingFrom,
    suggestedPinKeys, validationErrors,
    panX, panY, zoom,
    setHoveredPin, startDrawing, finishDrawing, cancelDrawing,
    selectWire, removeWire, moveComponent, setPan, setZoom,
  } = useWiringEditorStore();

  const connectedPins = useMemo(() => {
    const set = new Set<string>();
    for (const w of wires) {
      set.add(`${w.fromComponentId}:${w.fromPinName}`);
      set.add(`${w.toComponentId}:${w.toPinName}`);
    }
    return set;
  }, [wires]);

  // ─── Sync wires to WiringStore for simulation ───────────
  const mcu = useMcuStore((s) => s.mcu);
  const addSimWire = useWiringStore(s => s.addWire);
  const removeSimWire = useWiringStore(s => s.removeWire);

  useEffect(() => {
    const mcuPlacement = placements.find(p => p.componentId === MCU_COMPONENT_ID || p.componentId.includes('mcu') || p.componentId.includes('arduino'));
    if (!mcuPlacement) return;

    for (const wire of wires) {
      let mcuPinName: string | null = null;
      let compId: string | null = null;
      let compPinName: string | null = null;

      if (wire.fromComponentId === mcuPlacement.componentId) {
        mcuPinName = wire.fromPinName;
        compId = wire.toComponentId;
        compPinName = wire.toPinName;
      } else if (wire.toComponentId === mcuPlacement.componentId) {
        mcuPinName = wire.toPinName;
        compId = wire.fromComponentId;
        compPinName = wire.fromPinName;
      }

      if (mcuPinName && compId && compPinName) {
        const pinIndex = parseInt(mcuPinName.replace(/\D/g, ''), 10);
        if (!isNaN(pinIndex)) {
          addSimWire(pinIndex, compId, compPinName);
        }
      }
    }
  }, [wires, placements, addSimWire, removeSimWire]);

  // ─── Mouse handlers ─────────────────────────────────────

  const svgToLocal = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const viewBoxPt = pt.matrixTransform(ctm.inverse());
    return {
      x: (viewBoxPt.x - panX) / zoom,
      y: (viewBoxPt.y - panY) / zoom,
    };
  }, [panX, panY, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = svgToLocal(e.clientX, e.clientY);
    setMousePos(pos);

    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      const newX = Math.round((dragging.origX + dx) / GRID_SPACING) * GRID_SPACING;
      const newY = Math.round((dragging.origY + dy) / GRID_SPACING) * GRID_SPACING;
      moveComponent(dragging.componentId, newX, newY);
    }
  }, [svgToLocal, dragging, zoom, moveComponent]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    if (drawingFrom) cancelDrawing();
    selectWire(null);
  }, [drawingFrom, cancelDrawing, selectWire]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    } else {
      setPan(panX - e.deltaX, panY - e.deltaY);
    }
  }, [zoom, panX, panY, setZoom, setPan]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedWireId) {
        removeWire(selectedWireId);
      }
    }
    if (e.key === 'Escape') {
      cancelDrawing();
      selectWire(null);
    }
  }, [selectedWireId, removeWire, cancelDrawing, selectWire]);

  const handlePinMouseDown = useCallback((componentId: string, pinName: string) => {
    if (drawingFrom) {
      finishDrawing(componentId, pinName);
    } else {
      startDrawing(componentId, pinName);
    }
  }, [drawingFrom, startDrawing, finishDrawing]);

  const handlePinMouseUp = useCallback((componentId: string, pinName: string) => {
    if (drawingFrom) {
      finishDrawing(componentId, pinName);
    }
  }, [drawingFrom, finishDrawing]);

  const handleDragStart = useCallback((componentId: string, startX: number, startY: number) => {
    const placement = placements.find(p => p.componentId === componentId);
    if (!placement) return;
    setDragging({ componentId, startX, startY, origX: placement.x, origY: placement.y });
  }, [placements]);

  // ─── Render grid ────────────────────────────────────────

  const gridPattern = useMemo(() => (
    <defs>
      <pattern id="grid" width={GRID_SPACING} height={GRID_SPACING} patternUnits="userSpaceOnUse">
        <circle cx={GRID_SPACING} cy={GRID_SPACING} r={0.5} fill="#1f2937" />
      </pattern>
    </defs>
  ), []);

  return (
    <div className="w-full h-full bg-gray-950 rounded-lg overflow-hidden relative" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gray-900/90 backdrop-blur flex items-center px-3 gap-4 text-xs text-gray-400 z-10 border-b border-gray-800">
        <span className="font-semibold text-gray-200">Wiring Editor</span>
        <span className="text-gray-500">|</span>
        <span>{wires.length} wire{wires.length !== 1 ? 's' : ''}</span>
        {validationErrors.length > 0 && (
          <span className="text-red-400">{validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}</span>
        )}
        {drawingFrom && (
          <span className="text-green-400 animate-pulse">
            Drawing wire from {drawingFrom.componentId}:{drawingFrom.pinName} — click a target pin
          </span>
        )}
        <div className="ml-auto flex gap-3 items-center text-gray-500">
          <span className="text-[10px]">Scroll: pan &middot; Ctrl+scroll: zoom &middot; Del: remove wire</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBackgroundClick}
        onWheel={handleWheel}
        className="mt-8 select-none"
        style={{
          height: wires.length > 0 ? 'calc(100% - 32px - 120px)' : 'calc(100% - 32px)',
          userSelect: 'none',
        }}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Dot grid */}
          {gridPattern}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#grid)" />

          {/* Wires (behind components) */}
          <WireDrawer
            wires={wires}
            placements={placements}
            selectedWireId={selectedWireId}
            validationErrors={validationErrors}
            drawingFrom={drawingFrom}
            mousePosition={mousePos}
            onSelectWire={selectWire}
            onDeleteWire={removeWire}
          />

          {/* Components */}
          {placements.map(placement => (
            <BreadboardComponent
              key={placement.componentId}
              placement={placement}
              hoveredPinKey={hoveredPinKey}
              drawingFrom={drawingFrom}
              connectedPins={connectedPins}
              suggestedPinKeys={suggestedPinKeys}
              onPinMouseDown={handlePinMouseDown}
              onPinMouseUp={handlePinMouseUp}
              onHoverPin={setHoveredPin}
              onHoverEnd={() => setHoveredPin(null)}
              onDragStart={handleDragStart}
            />
          ))}
        </g>
      </svg>

      {/* Wire list panel */}
      {wires.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gray-900/95 backdrop-blur border-t border-gray-700 z-10 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 shrink-0">
            <span className="text-xs font-semibold text-gray-300">
              Connections ({wires.length})
            </span>
            <button
              onClick={() => { for (const w of wires) removeWire(w.id); }}
              className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors"
            >
              Remove All
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-0.5">
            {wires.map(wire => {
              const isSelected = wire.id === selectedWireId;
              return (
                <div
                  key={wire.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                    isSelected ? 'bg-gray-700/80 ring-1 ring-gray-500' : 'hover:bg-gray-800/60'
                  }`}
                  onClick={() => selectWire(isSelected ? null : wire.id)}
                >
                  <span
                    className="w-3 h-0.5 rounded-full shrink-0"
                    style={{ background: wire.color }}
                  />
                  <span className="text-gray-300 font-mono truncate">
                    {wire.fromComponentId.replace('__mcu__', 'MCU')}
                    <span className="text-gray-500">:</span>
                    <span className="text-gray-200">{wire.fromPinName}</span>
                  </span>
                  <span className="text-gray-600">→</span>
                  <span className="text-gray-300 font-mono truncate">
                    {wire.toComponentId.replace('__mcu__', 'MCU')}
                    <span className="text-gray-500">:</span>
                    <span className="text-gray-200">{wire.toPinName}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeWire(wire.id); }}
                    className="ml-auto shrink-0 text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors"
                    title="Remove wire"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
