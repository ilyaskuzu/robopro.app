"use client";

import { X } from 'lucide-react';
import { useProjectStore, type CatalogTab } from '@/lib/stores/useProjectStore';
import { MOTOR_CATALOG } from '@/core/components/catalog/motorCatalog';
import { SERVO_CATALOG } from '@/core/components/catalog/servoCatalog';
import { DRIVER_CATALOG } from '@/core/components/catalog/driverCatalog';
import { SENSOR_CATALOG } from '@/core/components/catalog/sensorCatalog';
import { BATTERY_CATALOG } from '@/core/components/catalog/batteryCatalog';
import { MCU_CATALOG } from '@/core/components/catalog/mcuCatalog';

function getSpecEntries(category: CatalogTab, id: string): { label: string; value: string }[] {
  switch (category) {
    case 'motors': {
      const m = MOTOR_CATALOG.find(e => e.id === id);
      if (!m) return [];
      const stallCurrent = m.specs.nominalVoltage / m.specs.armatureResistance;
      return [
        { label: 'Nominal Voltage', value: `${m.specs.nominalVoltage} V` },
        { label: 'Stall Torque', value: `${(m.specs.stallTorque * 1000).toFixed(1)} mN·m` },
        { label: 'No-Load RPM', value: `${m.specs.noLoadRpm}` },
        { label: 'Stall Current', value: `${(stallCurrent * 1000).toFixed(0)} mA` },
        { label: 'Armature Resistance', value: `${m.specs.armatureResistance.toFixed(1)} Ω` },
        { label: 'Weight', value: `${m.weight} g` },
        { label: 'Geared', value: m.geared ? `Yes (${m.gearRatio}:1)` : 'No' },
        { label: 'Dimensions (L×W×H)', value: `${m.dimensions[0]}×${m.dimensions[1]}×${m.dimensions[2]} mm` },
      ];
    }
    case 'servos': {
      const s = SERVO_CATALOG.find(e => e.id === id);
      if (!s) return [];
      return [
        { label: 'Stall Torque', value: `${s.specs.stallTorqueKgCm} kg·cm` },
        { label: 'Max Angle', value: `${s.specs.maxAngleDeg}°` },
        { label: 'Speed (60°)', value: `${s.specs.speedPer60Deg} s` },
        { label: 'Voltage', value: `${s.specs.nominalVoltage} V` },
        { label: 'Dead Band', value: `${s.specs.deadBandUs} µs` },
        { label: 'Weight', value: `${s.weight} g` },
        { label: 'Dimensions (L×W×H)', value: `${s.dimensions[0]}×${s.dimensions[1]}×${s.dimensions[2]} mm` },
      ];
    }
    case 'drivers': {
      const d = DRIVER_CATALOG.find(e => e.id === id);
      if (!d) return [];
      return [
        { label: 'Max Current per Channel', value: `${d.specs.maxCurrentPerChannel} A` },
        { label: 'Voltage Drop', value: `${d.specs.voltageDrop} V` },
        { label: 'Min Supply Voltage', value: `${d.specs.minVoltage} V` },
        { label: 'Max Supply Voltage', value: `${d.specs.maxVoltage} V` },
        { label: 'Voltage Range', value: `${d.specs.minVoltage}–${d.specs.maxVoltage} V` },
        { label: 'Channels', value: `${d.specs.channels}` },
        { label: 'Standby/Enable Pin', value: d.specs.hasStandbyPin ? 'Yes' : 'No' },
        { label: 'Weight', value: `${d.weight} g` },
        { label: 'Dimensions (L×W×H)', value: `${d.dimensions[0]}×${d.dimensions[1]}×${d.dimensions[2]} mm` },
      ];
    }
    case 'sensors': {
      const s = SENSOR_CATALOG.find(e => e.id === id);
      if (!s) return [];
      return [
        { label: 'Type', value: s.specs.sensorType },
        { label: 'Voltage', value: `${s.specs.operatingVoltage} V` },
        { label: 'Current', value: `${s.specs.currentDrawMa} mA` },
        ...(s.specs.range ? [{ label: 'Range', value: `${s.specs.range[0]}–${s.specs.range[1]} ${s.specs.unit}` }] : []),
        ...(s.specs.accuracy ? [{ label: 'Accuracy', value: s.specs.accuracy }] : []),
        { label: 'Signal Pins', value: `${s.specs.signalPinCount}` },
        { label: 'Weight', value: `${s.weight} g` },
        { label: 'Dimensions (L×W×H)', value: `${s.dimensions[0]}×${s.dimensions[1]}×${s.dimensions[2]} mm` },
      ];
    }
    case 'power': {
      const b = BATTERY_CATALOG.find(e => e.id === id);
      if (!b) return [];
      const dims = b.dimensions[0] && b.dimensions[1] && b.dimensions[2]
        ? `${b.dimensions[0]}×${b.dimensions[1]}×${b.dimensions[2]} mm`
        : '—';
      return [
        { label: 'Voltage', value: `${b.specs.nominalVoltage} V` },
        { label: 'Capacity', value: `${(b.specs.capacityAh * 1000).toFixed(0)} mAh` },
        { label: 'Chemistry', value: b.chemistry },
        { label: 'Int. Resistance', value: `${(b.specs.internalResistance * 1000).toFixed(0)} mΩ` },
        { label: 'Max Discharge', value: Number.isFinite(b.maxDischargeCurrent) ? `${b.maxDischargeCurrent} A` : 'USB' },
        { label: 'Weight', value: `${b.weight} g` },
        { label: 'Dimensions (L×W×H)', value: dims },
      ];
    }
    case 'mcu': {
      const m = MCU_CATALOG.find(e => e.id === id);
      if (!m) return [];
      return [
        { label: 'Chip', value: m.specs.chipName },
        { label: 'Clock', value: `${m.specs.clockHz / 1e6} MHz` },
        { label: 'Digital Pins', value: `${m.specs.digitalPinCount}` },
        { label: 'Analog Pins', value: `${m.specs.analogPinCount}` },
        { label: 'PWM Pins', value: m.specs.pwmPins.join(', ') },
        { label: 'Voltage', value: `${m.specs.operatingVoltage} V` },
        { label: 'Flash', value: `${m.specs.flashKB} KB` },
        { label: 'SRAM', value: `${m.specs.sramKB} KB` },
        { label: 'Weight', value: `${m.weight} g` },
        { label: 'Dimensions (L×W×H)', value: `${m.dimensions[0]}×${m.dimensions[1]}×${m.dimensions[2]} mm` },
      ];
    }
    default:
      return [];
  }
}

function getSpecName(category: CatalogTab, id: string): string {
  switch (category) {
    case 'motors': return MOTOR_CATALOG.find(e => e.id === id)?.displayName ?? id;
    case 'servos': return SERVO_CATALOG.find(e => e.id === id)?.displayName ?? id;
    case 'drivers': return DRIVER_CATALOG.find(e => e.id === id)?.displayName ?? id;
    case 'sensors': return SENSOR_CATALOG.find(e => e.id === id)?.displayName ?? id;
    case 'power': return BATTERY_CATALOG.find(e => e.id === id)?.displayName ?? id;
    case 'mcu': return MCU_CATALOG.find(e => e.id === id)?.displayName ?? id;
    default: return id;
  }
}

export function SpecDetailModal() {
  const specId = useProjectStore(s => s.detailSpecId);
  const category = useProjectStore(s => s.detailSpecCategory);
  const hideDetail = useProjectStore(s => s.hideDetail);

  if (!specId || !category) return null;

  const name = getSpecName(category, specId);
  const entries = getSpecEntries(category, specId);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70"
      style={{ zIndex: 9999 }}
      onClick={hideDetail}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-[380px] max-h-[85vh] overflow-hidden rounded-xl border border-border shadow-2xl"
        style={{
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - solid background */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-border"
          style={{ background: 'hsl(var(--muted))' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            {name}
          </h3>
          <button
            onClick={hideDetail}
            className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
            style={{ color: 'hsl(var(--foreground))' }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spec Table - solid background, high contrast */}
        <div
          className="p-4 overflow-y-auto"
          style={{
            background: 'hsl(var(--background))',
            maxHeight: 'calc(85vh - 120px)',
          }}
        >
          <table className="w-full text-xs">
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.label}
                  className="border-b border-border/50"
                  style={{
                    background: i % 2 === 0 ? 'hsl(var(--muted) / 0.3)' : 'transparent',
                  }}
                >
                  <td className="py-2 px-3 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {entry.label}
                  </td>
                  <td className="py-2 px-3 font-mono text-right" style={{ color: 'hsl(var(--foreground))' }}>
                    {entry.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 border-t border-border text-center"
          style={{ background: 'hsl(var(--muted))' }}
        >
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {category} — {specId}
          </span>
        </div>
      </div>
    </div>
  );
}
