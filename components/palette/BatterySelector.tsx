"use client";

import { useProjectStore } from '@/lib/stores/useProjectStore';
import { BATTERY_CATALOG } from '@/core/components/catalog/batteryCatalog';
import { ComponentCard } from './ComponentCard';

export function BatterySelector() {
  const selectedBatteryId = useProjectStore(s => s.selectedBatteryId);
  const setBattery = useProjectStore(s => s.setBattery);

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight px-1">
        Batteries
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {BATTERY_CATALOG.map(battery => (
          <ComponentCard
            key={battery.id}
            specId={battery.id}
            name={battery.displayName}
            category="power"
            selected={selectedBatteryId === battery.id}
            onSelect={() => setBattery(battery.id)}
            stats={[
              { label: 'Voltage', value: `${battery.specs.nominalVoltage}V` },
              { label: 'Capacity', value: `${(battery.specs.capacityAh * 1000).toFixed(0)} mAh` },
              { label: 'Weight', value: `${battery.weight}g` },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
