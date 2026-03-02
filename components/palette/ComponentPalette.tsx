"use client";

import { useWiringStore, type PlacedComponent } from '@/lib/stores/useWiringStore';
import { useProjectStore, type CatalogTab } from '@/lib/stores/useProjectStore';
import { DcMotor, TT_MOTOR_6V } from '@/core/components/motors/DcMotor';
import { L298N } from '@/core/components/drivers/L298N';
import { BatteryPack, BATTERY_4xAA } from '@/core/components/power/BatteryPack';
import { UltrasonicSensor } from '@/core/components/sensors/UltrasonicSensor';
import { IrLineSensor } from '@/core/components/sensors/IrLineSensor';
import { RotaryEncoder } from '@/core/components/sensors/RotaryEncoder';
import { Plus, Trash2, Box, Cpu, Zap, Settings, Radio, Activity } from 'lucide-react';
import { MotorSelector } from './MotorSelector';
import { BatterySelector } from './BatterySelector';
import { DriverSelector } from './DriverSelector';
import { McuSelector } from './McuSelector';
import { SpecDetailModal } from './SpecDetailModal';
import { SENSOR_CATALOG } from '@/core/components/catalog/sensorCatalog';
import { ComponentCard } from './ComponentCard';

const AVAILABLE_COMPONENTS = [
    { type: 'dc-motor', name: 'DC Motor (TT 6V)', category: 'Actuators', factory: (id: string) => new DcMotor(id, TT_MOTOR_6V) },
    { type: 'l298n', name: 'L298N Motor Driver', category: 'Drivers', factory: (id: string) => new L298N(id) },
    { type: 'hc-sr04', name: 'HC-SR04 Ultrasonic', category: 'Sensors', factory: (id: string) => new UltrasonicSensor(id) },
    { type: 'ir-line', name: 'IR Line Sensor', category: 'Sensors', factory: (id: string) => new IrLineSensor(id) },
    { type: 'encoder', name: 'Rotary Encoder', category: 'Sensors', factory: (id: string) => new RotaryEncoder(id) },
    { type: 'battery-4aa', name: '4xAA Battery Pack', category: 'Power', factory: (id: string) => new BatteryPack(id, BATTERY_4xAA) },
] as const;

let componentCounter = 0;

const TABS: { id: CatalogTab; label: string; icon: React.ReactNode }[] = [
    { id: 'motors', label: 'Motors', icon: <Settings className="w-3 h-3" /> },
    { id: 'drivers', label: 'Drivers', icon: <Activity className="w-3 h-3" /> },
    { id: 'sensors', label: 'Sensors', icon: <Radio className="w-3 h-3" /> },
    { id: 'power', label: 'Power', icon: <Zap className="w-3 h-3" /> },
    { id: 'mcu', label: 'MCU', icon: <Cpu className="w-3 h-3" /> },
];

function SensorsTab() {
    return (
        <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight px-1">
                Sensors
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
                {SENSOR_CATALOG.map(sensor => (
                    <ComponentCard
                        key={sensor.id}
                        specId={sensor.id}
                        name={sensor.displayName}
                        category="sensors"
                        stats={[
                            { label: 'Type', value: sensor.specs.sensorType },
                            { label: 'Voltage', value: `${sensor.specs.operatingVoltage}V` },
                            ...(sensor.specs.range ? [{ label: 'Range', value: `${sensor.specs.range[0]}–${sensor.specs.range[1]}` }] : []),
                        ]}
                    />
                ))}
            </div>
        </div>
    );
}

function PlacedComponentsList() {
    const placed = useWiringStore(s => s.placedComponents);
    const addComponent = useWiringStore(s => s.addComponent);
    const removeComponent = useWiringStore(s => s.removeComponent);

    const handleAdd = (comp: typeof AVAILABLE_COMPONENTS[number]) => {
        componentCounter++;
        const id = `${comp.type}-${componentCounter}`;
        const instance = comp.factory(id);
        const placedComp: PlacedComponent = {
            id,
            type: comp.type,
            displayName: comp.name,
            instance,
            pinManifest: instance.pinManifest,
        };
        addComponent(placedComp);
    };

    if (placed.length === 0) return null;

    return (
        <div className="border-t border-border mt-2 pt-2">
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight px-1 mb-1">
                Project Components ({placed.length})
            </h3>
            <div className="space-y-0.5">
                {placed.map(inst => (
                    <div
                        key={inst.id}
                        className="flex items-center justify-between py-0.5 px-2 text-[10px] bg-muted/20 rounded border border-transparent hover:border-border/50 transition-colors"
                    >
                        <span className="font-mono text-muted-foreground/80">{inst.id}</span>
                        <button
                            onClick={() => removeComponent(inst.id)}
                            className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                            title="Remove component"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ComponentPalette() {
    const activeCatalogTab = useProjectStore(s => s.activeCatalogTab);
    const setCatalogTab = useProjectStore(s => s.setCatalogTab);
    const computedMass = useProjectStore(s => s.computedMass);

    return (
        <div className="flex flex-col h-full bg-card border-r border-border overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Component Catalog
                    </span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                    {(computedMass * 1000).toFixed(0)}g
                </span>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-border bg-muted/10 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCatalogTab(tab.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                            activeCatalogTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {activeCatalogTab === 'motors' && <MotorSelector />}
                {activeCatalogTab === 'drivers' && <DriverSelector />}
                {activeCatalogTab === 'sensors' && <SensorsTab />}
                {activeCatalogTab === 'power' && <BatterySelector />}
                {activeCatalogTab === 'mcu' && <McuSelector />}

                {/* Placed components list (always shown at bottom) */}
                <PlacedComponentsList />
            </div>

            {/* Spec Detail Modal */}
            <SpecDetailModal />
        </div>
    );
}

