"use client";

import { useState } from "react";
import { Play, Pause, RotateCcw, Square, Cpu, Save, FolderOpen, BookOpen } from "lucide-react";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useMcuStore } from "@/lib/stores/useMcuStore";
import { useWiringStore } from "@/lib/stores/useWiringStore";
import { serializeProject, deserializeProject, downloadProject, openProjectFile, type ProjectData } from "@/core/simulation/ProjectSerializer";
import { PRESETS, PRESET_NAMES } from "@/core/sketch/presets";
import { DcMotor, TT_MOTOR_6V } from "@/core/components/motors/DcMotor";
import { L298N } from "@/core/components/drivers/L298N";
import { BatteryPack, BATTERY_4xAA } from "@/core/components/power/BatteryPack";
import { UltrasonicSensor } from "@/core/components/sensors/UltrasonicSensor";
import { IrLineSensor } from "@/core/components/sensors/IrLineSensor";
import { RotaryEncoder } from "@/core/components/sensors/RotaryEncoder";
import type { IComponent } from "@/core/components/interfaces/IComponent";

function createComponent(type: string, id: string): IComponent | null {
  switch (type) {
    case "dc-motor": return new DcMotor(id, TT_MOTOR_6V);
    case "l298n": return new L298N(id);
    case "battery-4aa": return new BatteryPack(id, BATTERY_4xAA);
    case "hc-sr04": return new UltrasonicSensor(id);
    case "ir-line": return new IrLineSensor(id);
    case "encoder": return new RotaryEncoder(id);
    default: return null;
  }
}

function loadProjectData(data: ProjectData) {
  const { clearAll, addWire } = useWiringStore.getState();
  const { loadSketch } = useSimulationStore.getState();

  clearAll();

  for (const wire of data.wires) {
    addWire(wire.mcuPinIndex, wire.componentId, wire.componentPinName);
  }

  loadSketch(data.sketch);
}

export function Header() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const reset = useSimulationStore((s) => s.reset);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const appendSerial = useMcuStore((s) => s.appendSerial);
  const [showPresets, setShowPresets] = useState(false);

  const handleSave = () => {
    const { connections } = useWiringStore.getState();
    const { sketchSource } = useSimulationStore.getState();
    const json = serializeProject(
      "robopro-project",
      sketchSource,
      [],
      connections,
      [],
      [],
      0.02,
    );
    downloadProject(json, "robopro-project.json");
    appendSerial("> Project saved.");
  };

  const handleLoad = async () => {
    try {
      const json = await openProjectFile();
      const data = deserializeProject(json);
      loadProjectData(data);
      appendSerial(`> Loaded project: ${data.name}`);
    } catch (err) {
      appendSerial(`> Load error: ${err}`);
    }
  };

  const handlePreset = (name: string) => {
    const data = PRESETS[name as keyof typeof PRESETS];
    if (data) {
      loadProjectData(data);
      appendSerial(`> Loaded preset: ${data.name}`);
    }
    setShowPresets(false);
  };

  return (
    <header className="flex h-10 items-center gap-3 border-b border-border bg-card px-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Cpu className="h-4 w-4" />
        <span>ROBOPRO</span>
      </div>

      <div className="mx-2 h-4 w-px bg-border" />

      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={pause}
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            <Pause className="h-3 w-3" /> Pause
          </button>
        ) : (
          <button
            onClick={play}
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <Play className="h-3 w-3" /> Run
          </button>
        )}
        <button
          onClick={() => { pause(); reset(); }}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
        {isRunning && (
          <button
            onClick={pause}
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Stop simulation and keep motion log for download"
          >
            <Square className="h-3 w-3" /> Stop
          </button>
        )}
      </div>

      <div className="mx-2 h-4 w-px bg-border" />

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Speed
        <input
          type="range"
          min={0.25}
          max={10}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-20 accent-primary"
        />
        <span className="w-8 text-foreground font-mono">{speed}x</span>
      </label>

      <div className="mx-2 h-4 w-px bg-border" />

      {/* Save / Load / Presets */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
          title="Save project as JSON"
        >
          <Save className="h-3 w-3" /> Save
        </button>
        <button
          onClick={handleLoad}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
          title="Load project from JSON"
        >
          <FolderOpen className="h-3 w-3" /> Load
        </button>
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
            title="Load a preset sketch"
          >
            <BookOpen className="h-3 w-3" /> Presets
          </button>
          {showPresets && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-md border border-border bg-card shadow-lg">
              {PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handlePreset(name)}
                  className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {PRESETS[name].name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
