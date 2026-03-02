"use client";

import { useProjectStore } from '@/lib/stores/useProjectStore';
import { MOTOR_CATALOG } from '@/core/components/catalog/motorCatalog';
import { ComponentCard } from './ComponentCard';

export function MotorSelector() {
  const selectedMotorId = useProjectStore(s => s.selectedMotorId);
  const setMotor = useProjectStore(s => s.setMotor);

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight px-1">
        DC Motors
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {MOTOR_CATALOG.map(motor => (
          <ComponentCard
            key={motor.id}
            specId={motor.id}
            name={motor.displayName}
            category="motors"
            selected={selectedMotorId === motor.id}
            onSelect={() => setMotor(motor.id)}
            stats={[
              { label: 'Voltage', value: `${motor.specs.nominalVoltage}V` },
              { label: 'Torque', value: `${(motor.specs.stallTorque * 1000).toFixed(1)} mN·m` },
              { label: 'RPM', value: `${motor.specs.noLoadRpm}` },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
