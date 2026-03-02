"use client";

import { useEffect } from 'react';
import { useLayoutStore } from '@/lib/stores/useLayoutStore';
import { useWiringEditorStore, type BoardPlacement, type PinPosition } from '@/lib/stores/useWiringEditorStore';
import { useWiringStore } from '@/lib/stores/useWiringStore';
import { useMcuStore } from '@/lib/stores/useMcuStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const BreadboardEditor = dynamic(
  () => import('@/components/wiring/BreadboardEditor'),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const PIN_SPACING = 26;
const COMPONENT_PAD_Y = 20;
const MCU_WIDTH = 200;
const COMP_WIDTH = 160;

type PinSide = 'left' | 'right';
type WiringCategory = BoardPlacement['category'];

function edgePins(
  componentId: string,
  pins: Array<{ name: string; type: PinPosition['type']; direction: PinPosition['direction'] }>,
  side: PinSide,
  compX: number,
  compY: number,
  compWidth: number,
): PinPosition[] {
  return pins.map((p, i) => ({
    componentId,
    pinName: p.name,
    x: side === 'left' ? compX : compX + compWidth,
    y: compY + COMPONENT_PAD_Y + i * PIN_SPACING,
    type: p.type,
    direction: p.direction,
    side,
  }));
}

function categoriseComponent(compType: string): WiringCategory {
  if (compType.includes('motor') || compType === 'dc-motor') return 'motor';
  if (/driver|l298|l293|tb6612|drv8833|a4988|uln2003/.test(compType)) return 'driver';
  if (/battery|lipo/.test(compType)) return 'battery';
  return 'sensor';
}

// ─── Bridge: Wiring Store → Editor Placements (visual layout) ───

function useBridgeToEditorPlacements() {
  const placedComponents = useWiringStore(s => s.placedComponents);
  const mcu = useMcuStore(s => s.mcu);
  const setPlacements = useWiringEditorStore(s => s.setPlacements);
  const mcuSpec = useProjectStore(s => s.getMcuSpec());

  useEffect(() => {
    if (!mcu) return;

    const placements: BoardPlacement[] = [];
    const allPins = mcu.pins;
    const half = Math.ceil(allPins.length / 2);

    const leftPins = allPins.slice(0, half);
    const rightPins = allPins.slice(half);

    const mcuPinRows = Math.max(leftPins.length, rightPins.length);
    const mcuHeight = COMPONENT_PAD_Y * 2 + mcuPinRows * PIN_SPACING;

    const mcuX = 40;
    const mcuY = 60;

    const classifyMcuPin = (p: { name: string }) => {
      const name = p.name;
      const isAnalog = name.startsWith('A');
      const isPwm = name.includes('~');
      const type: PinPosition['type'] = isAnalog ? 'analog' : isPwm ? 'pwm' : 'digital';
      return { name, type, direction: 'bidirectional' as const };
    };

    const mcuPinPositions: PinPosition[] = [
      ...edgePins('__mcu__', leftPins.map(classifyMcuPin), 'left', mcuX, mcuY, MCU_WIDTH),
      ...edgePins('__mcu__', rightPins.map(classifyMcuPin), 'right', mcuX, mcuY, MCU_WIDTH),
    ];

    const vinY = mcuY + COMPONENT_PAD_Y + leftPins.length * PIN_SPACING;
    const vccY = vinY + PIN_SPACING;
    const gndY = vccY + PIN_SPACING;
    mcuPinPositions.push(
      { componentId: '__mcu__', pinName: 'VIN', x: mcuX, y: vinY, type: 'power', direction: 'input', side: 'left' },
      { componentId: '__mcu__', pinName: '5V', x: mcuX, y: vccY, type: 'power', direction: 'output', side: 'left' },
      { componentId: '__mcu__', pinName: 'GND', x: mcuX, y: gndY, type: 'ground', direction: 'bidirectional', side: 'left' },
    );

    const finalMcuHeight = Math.max(mcuHeight, gndY - mcuY + COMPONENT_PAD_Y);

    placements.push({
      componentId: '__mcu__',
      label: mcuSpec?.displayName ?? 'Arduino Uno',
      category: 'mcu',
      x: mcuX,
      y: mcuY,
      width: MCU_WIDTH,
      height: finalMcuHeight,
      pins: mcuPinPositions,
    });

    // Group placed components by category for column layout
    const grouped: Record<WiringCategory, typeof placedComponents> = {
      mcu: [], driver: [], motor: [], sensor: [], battery: [],
    };
    for (const comp of placedComponents) {
      const cat = categoriseComponent(comp.type);
      grouped[cat].push(comp);
    }

    const colX: Record<string, number> = { driver: 380, sensor: 380, motor: 650, battery: 650 };
    const colY: Record<string, number> = { driver: 60, sensor: 60, motor: 60, battery: 60 };

    for (const cat of ['driver', 'sensor', 'motor', 'battery'] as WiringCategory[]) {
      for (const comp of grouped[cat]) {
        const x = colX[cat];
        const y = colY[cat];

        const inputPins = comp.pinManifest.filter(p => p.direction === 'input');
        const outputPins = comp.pinManifest.filter(p => p.direction !== 'input');

        const rows = Math.max(inputPins.length, outputPins.length, 1);
        const compHeight = COMPONENT_PAD_Y * 2 + rows * PIN_SPACING;

        const pins: PinPosition[] = [
          ...edgePins(
            comp.id,
            inputPins.map(p => ({ name: p.name, type: p.signalType, direction: p.direction })),
            'left', x, y, COMP_WIDTH,
          ),
          ...edgePins(
            comp.id,
            outputPins.map(p => ({ name: p.name, type: p.signalType, direction: p.direction })),
            'right', x, y, COMP_WIDTH,
          ),
        ];

        placements.push({
          componentId: comp.id,
          label: comp.displayName,
          category: cat,
          x, y,
          width: COMP_WIDTH,
          height: compHeight,
          pins,
        });

        colY[cat] = y + compHeight + 30;
        if (cat === 'driver') colY['sensor'] = Math.max(colY['sensor'], colY['driver']);
        if (cat === 'motor') colY['battery'] = Math.max(colY['battery'], colY['motor']);
      }
    }

    setPlacements(placements);
  }, [mcu, placedComponents, setPlacements, mcuSpec]);
}

export function WiringPage() {
  useBridgeToEditorPlacements();

  const setPage = useLayoutStore(s => s.setPage);
  const wires = useWiringEditorStore(s => s.wires);
  const errors = useWiringEditorStore(s => s.validationErrors);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPage('assembly')}>
            <ChevronLeft className="w-3 h-3" /> Assembly
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Badge variant="secondary">Wires: {wires.length}</Badge>
            {errors.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> {errors.length} errors
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setPage('simulation')}>
          Next: Simulate <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <BreadboardEditor />
      </div>
    </div>
  );
}
