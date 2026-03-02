"use client";

import { Info } from 'lucide-react';
import { useProjectStore, type CatalogTab } from '@/lib/stores/useProjectStore';

export interface ComponentCardProps {
  specId: string;
  name: string;
  category: CatalogTab;
  /** Key–value stats to show on the card */
  stats: { label: string; value: string }[];
  /** Whether this card is currently selected */
  selected?: boolean;
  /** Callback when "Use" / select is clicked */
  onSelect?: () => void;
}

export function ComponentCard({
  specId,
  name,
  category,
  stats,
  selected = false,
  onSelect,
}: ComponentCardProps) {
  const showDetail = useProjectStore(s => s.showDetail);

  const categoryColors: Record<CatalogTab, string> = {
    motors: 'border-orange-500/40 bg-orange-500/5',
    servos: 'border-amber-500/40 bg-amber-500/5',
    drivers: 'border-blue-500/40 bg-blue-500/5',
    sensors: 'border-green-500/40 bg-green-500/5',
    power: 'border-red-500/40 bg-red-500/5',
    actuators: 'border-purple-500/40 bg-purple-500/5',
    mcu: 'border-cyan-500/40 bg-cyan-500/5',
  };

  return (
    <div
      className={`rounded-lg border p-2 transition-all cursor-pointer ${
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : `${categoryColors[category]} hover:border-primary/30`
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-1">
        <h4 className="text-xs font-semibold text-foreground leading-tight truncate flex-1">
          {name}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            showDetail(specId, category);
          }}
          className="p-0.5 text-muted-foreground/50 hover:text-primary transition-colors shrink-0"
          title="View full specs"
        >
          <Info className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-1.5 space-y-0.5">
        {stats.slice(0, 3).map(s => (
          <div key={s.label} className="flex justify-between text-[10px]">
            <span className="text-muted-foreground/70">{s.label}</span>
            <span className="font-mono text-foreground/80">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
