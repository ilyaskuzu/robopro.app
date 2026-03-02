"use client";

import { useState } from 'react';
import { useProjectStore, type CatalogTab } from '@/lib/stores/useProjectStore';
import { useAssemblyStore } from '@/lib/stores/useAssemblyStore';
import { useLayoutStore } from '@/lib/stores/useLayoutStore';
import { SpecDetailModal } from '@/components/palette/SpecDetailModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOTOR_CATALOG } from '@/core/components/catalog/motorCatalog';
import { DRIVER_CATALOG } from '@/core/components/catalog/driverCatalog';
import { SENSOR_CATALOG } from '@/core/components/catalog/sensorCatalog';
import { BATTERY_CATALOG } from '@/core/components/catalog/batteryCatalog';
import { MCU_CATALOG } from '@/core/components/catalog/mcuCatalog';
import { SERVO_CATALOG } from '@/core/components/catalog/servoCatalog';
import {
  Settings, Activity, Radio, Zap, Cpu, ChevronRight, CheckCircle2,
  AlertCircle, Plus, Trash2, Info, Wrench, MousePointerClick,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const AssemblyScene = dynamic(
  () => import('@/components/assembly/AssemblyScene').then(m => m.AssemblyScene),
  { ssr: false, loading: () => <div className="flex-1 bg-[#0f1117] animate-pulse" /> }
);

const TABS: { id: CatalogTab; label: string; icon: React.ReactNode }[] = [
  { id: 'mcu', label: 'MCU', icon: <Cpu className="w-3 h-3" /> },
  { id: 'drivers', label: 'Drivers', icon: <Activity className="w-3 h-3" /> },
  { id: 'motors', label: 'Motors', icon: <Settings className="w-3 h-3" /> },
  { id: 'sensors', label: 'Sensors', icon: <Radio className="w-3 h-3" /> },
  { id: 'power', label: 'Power', icon: <Zap className="w-3 h-3" /> },
];

interface CatalogItem {
  id: string;
  displayName: string;
  category: string;
  stats: { label: string; value: string }[];
}

function getCatalogItems(tab: CatalogTab): CatalogItem[] {
  switch (tab) {
    case 'mcu':
      return MCU_CATALOG.map(m => ({
        id: m.id, displayName: m.displayName, category: 'mcu',
        stats: [
          { label: 'Chip', value: m.specs.chipName },
          { label: 'Pins', value: `${m.specs.digitalPinCount}D + ${m.specs.analogPinCount}A` },
          { label: 'Voltage', value: `${m.specs.operatingVoltage}V` },
        ],
      }));
    case 'drivers':
      return DRIVER_CATALOG.map(d => ({
        id: d.id, displayName: d.displayName, category: 'driver',
        stats: [
          { label: 'Current', value: `${d.specs.maxCurrentPerChannel}A/ch` },
          { label: 'V Drop', value: `${d.specs.voltageDrop}V` },
          { label: 'Channels', value: `${d.specs.channels}` },
        ],
      }));
    case 'motors':
      return MOTOR_CATALOG.map(m => ({
        id: m.id, displayName: m.displayName, category: 'dc-motor',
        stats: [
          { label: 'Voltage', value: `${m.specs.nominalVoltage}V` },
          { label: 'Torque', value: `${(m.specs.stallTorque * 1000).toFixed(0)} mN-m` },
          { label: 'RPM', value: `${m.specs.noLoadRpm}` },
        ],
      }));
    case 'sensors':
      return SENSOR_CATALOG.map(s => ({
        id: s.id, displayName: s.displayName, category: 'sensor',
        stats: [
          { label: 'Type', value: s.specs.sensorType },
          { label: 'Voltage', value: `${s.specs.operatingVoltage}V` },
        ],
      }));
    case 'power':
      return BATTERY_CATALOG.map(b => ({
        id: b.id, displayName: b.displayName, category: 'battery',
        stats: [
          { label: 'Voltage', value: `${b.specs.nominalVoltage}V` },
          { label: 'Capacity', value: b.specs.capacityAh === Infinity ? '∞' : `${b.specs.capacityAh}Ah` },
          { label: 'Weight', value: `${b.weight}g` },
        ],
      }));
    default:
      return [];
  }
}

function CatalogItemCard({
  item, isSelected, onSelect,
}: { item: CatalogItem; isSelected: boolean; onSelect: () => void }) {
  const showDetail = useProjectStore(s => s.showDetail);

  const categoryAccent: Record<string, string> = {
    mcu: 'border-emerald-500/50 hover:border-emerald-400',
    driver: 'border-blue-500/50 hover:border-blue-400',
    'dc-motor': 'border-orange-500/50 hover:border-orange-400',
    sensor: 'border-purple-500/50 hover:border-purple-400',
    battery: 'border-red-500/50 hover:border-red-400',
  };

  const accent = categoryAccent[item.category] ?? 'border-border hover:border-muted-foreground';

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border p-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/15 ring-1 ring-primary/40 shadow-lg shadow-primary/10'
          : `bg-card/50 ${accent}`
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <h4 className="text-[11px] font-semibold text-foreground leading-tight truncate flex-1">
          {item.displayName}
        </h4>
        <div className="flex items-center gap-0.5">
          {isSelected && (
            <Badge variant="default" className="text-[8px] py-0 px-1">
              <MousePointerClick className="w-2 h-2 mr-0.5" /> Selected
            </Badge>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const tab = item.category === 'dc-motor' ? 'motors'
                : item.category === 'sensor' ? 'sensors'
                : item.category === 'battery' ? 'power'
                : item.category as CatalogTab;
              showDetail(item.id, tab);
            }}
            className="p-0.5 text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="mt-1 space-y-0.5">
        {item.stats.map(s => (
          <div key={s.label} className="flex justify-between text-[9px]">
            <span className="text-muted-foreground/60">{s.label}</span>
            <span className="font-mono text-foreground/70">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssemblyStatus() {
  const placements = useAssemblyStore(s => s.placements);
  const isReady = useAssemblyStore(s => s.isReadyForWiring());

  const hasMcu = placements.some(p => p.category === 'mcu');
  const hasDriver = placements.some(p => p.category === 'driver');
  const hasMotor = placements.some(p => p.category === 'dc-motor' || p.category === 'stepper');
  const hasBattery = placements.some(p => p.category === 'battery');

  const checks = [
    { label: 'MCU', ok: hasMcu },
    { label: 'Driver', ok: hasDriver },
    { label: 'Motor', ok: hasMotor },
    { label: 'Battery', ok: hasBattery },
  ];

  return (
    <div className="border-t border-border/30 mt-2 pt-2">
      <div className="flex items-center gap-1.5 px-1 mb-1.5">
        <Wrench className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-[9px] font-bold uppercase text-muted-foreground/50 tracking-wider">
          Build Status
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 px-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1 text-[9px] rounded px-1.5 py-0.5 ${
            c.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/30 text-muted-foreground/40'
          }`}>
            {c.ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
            {c.label}
          </div>
        ))}
      </div>
      {isReady && (
        <div className="mt-1.5 px-1">
          <Badge variant="success" className="w-full justify-center py-1 text-[9px]">
            Ready for Wiring
          </Badge>
        </div>
      )}
    </div>
  );
}

function PlacedPartsList() {
  const placements = useAssemblyStore(s => s.placements);
  const removeComponent = useAssemblyStore(s => s.removeComponent);

  if (placements.length === 0) return null;

  return (
    <div className="border-t border-border/30 mt-2 pt-2">
      <span className="text-[9px] font-bold uppercase text-muted-foreground/50 tracking-wider px-1">
        Placed ({placements.length})
      </span>
      <div className="mt-1 space-y-0.5">
        {placements.map(p => (
          <div key={p.id} className="flex items-center justify-between px-1.5 py-0.5 text-[9px] rounded bg-muted/20 hover:bg-muted/40 transition-colors">
            <span className="font-mono text-muted-foreground/70 truncate">{p.catalogId}</span>
            <button
              onClick={() => removeComponent(p.id)}
              className="p-0.5 text-muted-foreground/30 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssemblyPage() {
  const activeCatalogTab = useProjectStore(s => s.activeCatalogTab);
  const setCatalogTab = useProjectStore(s => s.setCatalogTab);
  const setPage = useLayoutStore(s => s.setPage);
  const [selectedItem, setSelectedItem] = useState<{ id: string; category: string } | null>(null);

  const items = getCatalogItems(activeCatalogTab);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: Catalog Panel */}
      <div className="w-[260px] border-r border-border/50 flex flex-col bg-card/80 shrink-0">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Parts Catalog
          </span>
        </div>

        {/* Category tabs -- horizontally scrollable */}
        <div className="flex overflow-x-auto border-b border-border/30 bg-muted/5 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setCatalogTab(tab.id); setSelectedItem(null); }}
              className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors border-b-2 shrink-0 ${
                activeCatalogTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Instruction banner */}
        {selectedItem && (
          <div className="px-2 py-1.5 bg-primary/10 border-b border-primary/20 text-[9px] text-primary flex items-center gap-1.5">
            <MousePointerClick className="w-3 h-3 shrink-0" />
            <span>Click a matching slot on the model to place <strong>{selectedItem.id}</strong></span>
          </div>
        )}

        {/* Item list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {items.map(item => (
            <CatalogItemCard
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              onSelect={() => setSelectedItem(
                selectedItem?.id === item.id ? null : { id: item.id, category: item.category }
              )}
            />
          ))}
        </div>

        {/* Bottom: Status */}
        <div className="p-2 border-t border-border/30 bg-muted/10">
          <AssemblyStatus />
          <PlacedPartsList />
        </div>

        <SpecDetailModal />
      </div>

      {/* Right: 3D Assembly Scene */}
      <div className="flex-1 min-w-[400px] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              Snap Components to Model
            </span>
            {!selectedItem && (
              <Badge variant="secondary" className="text-[8px]">
                Select a part from the catalog
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={() => setPage('wiring')}>
            Next: Wiring <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        {/* 3D Scene — relative+z-0 creates a stacking context so Html overlays stay below modals */}
        <div className="flex-1 min-h-0 relative z-0">
          <AssemblyScene selectedCatalogItem={selectedItem} />
        </div>
      </div>
    </div>
  );
}
