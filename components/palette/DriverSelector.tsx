"use client";

import { useProjectStore } from '@/lib/stores/useProjectStore';
import { DRIVER_CATALOG } from '@/core/components/catalog/driverCatalog';
import { ComponentCard } from './ComponentCard';

export function DriverSelector() {
  const selectedDriverId = useProjectStore(s => s.selectedDriverId);
  const setDriver = useProjectStore(s => s.setDriver);

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight px-1">
        Motor Drivers
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {DRIVER_CATALOG.map(driver => (
          <ComponentCard
            key={driver.id}
            specId={driver.id}
            name={driver.displayName}
            category="drivers"
            selected={selectedDriverId === driver.id}
            onSelect={() => setDriver(driver.id)}
            stats={[
              { label: 'Current', value: `${driver.specs.maxCurrentPerChannel}A/ch` },
              { label: 'V Drop', value: `${driver.specs.voltageDrop}V` },
              { label: 'Channels', value: `${driver.specs.channels}` },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
