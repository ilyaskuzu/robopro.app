"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Square, Cpu, Save, FolderOpen, BookOpen, Code, Wrench, Globe } from "lucide-react";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useMcuStore } from "@/lib/stores/useMcuStore";
import { useWiringStore } from "@/lib/stores/useWiringStore";
import { useProjectStore } from "@/lib/stores/useProjectStore";
import { useLayoutStore, type AppPage } from "@/lib/stores/useLayoutStore";
import { serializeProject, deserializeProject, downloadProject, openProjectFile, type ProjectData, type SavedAssemblyPlacement } from "@/core/simulation/ProjectSerializer";
import { loadProjectData } from "@/lib/projectLoad";
import { useAssemblyStore } from "@/lib/stores/useAssemblyStore";
import { useWiringEditorStore } from "@/lib/stores/useWiringEditorStore";
import { PRESETS, PRESET_NAMES } from "@/core/sketch/presets";

export function Header() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const reset = useSimulationStore((s) => s.reset);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const appendSerial = useMcuStore((s) => s.appendSerial);
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);
  const layoutMode = useLayoutStore((s) => s.page);
  const setLayoutMode = useLayoutStore((s) => s.setPage);
  const shortcutHelpOpen = useLayoutStore((s) => s.shortcutHelpOpen);
  const setShortcutHelpOpen = useLayoutStore((s) => s.setShortcutHelpOpen);

  const MODE_ICONS: Record<AppPage, typeof Code> = {
    assembly: Code,
    wiring: Wrench,
    simulation: Globe,
  };
  const MODE_LABELS: Record<AppPage, string> = {
    assembly: 'Assembly',
    wiring: 'Wiring',
    simulation: 'Simulate',
  };

  // Click-outside to close presets dropdown
  useEffect(() => {
    if (!showPresets) return;
    function handleClickOutside(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresets]);

  const handleSave = () => {
    const { placedComponents, connections } = useWiringStore.getState();
    const { sketchSource, obstacleWorld, lineTrack } = useSimulationStore.getState();
    const assemblyPlacements = useAssemblyStore.getState().placements;
    const { selectedBoardType, selectedMotorId, selectedDriverId, selectedBatteryId } = useProjectStore.getState();
    const editorWires = useWiringEditorStore.getState().wires;
    const savedAssembly: SavedAssemblyPlacement[] = assemblyPlacements.map((p) => ({
      id: p.id,
      catalogId: p.catalogId,
      category: p.category,
    }));
    const savedEditorWires = editorWires
      .filter(w => w.fromComponentId !== '__mcu__' || w.fromPinName === 'VIN' || w.fromPinName === '5V' || w.fromPinName === 'GND')
      .filter(w => w.toComponentId !== '__mcu__' || w.toPinName === 'VIN' || w.toPinName === '5V' || w.toPinName === 'GND')
      .map(w => ({
        fromComponentId: w.fromComponentId,
        fromPinName: w.fromPinName,
        toComponentId: w.toComponentId,
        toPinName: w.toPinName,
      }));
    const json = serializeProject(
      "robopro-project",
      sketchSource,
      placedComponents.map((c) => ({ type: c.type, id: c.id })),
      connections,
      obstacleWorld.getObstacles(),
      lineTrack.getPoints(),
      lineTrack.getLineWidth(),
      [],
      [],
      [],
      {
        catalogSelections: {
          motorId: selectedMotorId,
          driverId: selectedDriverId,
          batteryId: selectedBatteryId,
          boardType: selectedBoardType,
        },
        assemblyPlacements: savedAssembly,
        editorWires: savedEditorWires,
      },
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
        <div className="relative" ref={presetsRef}>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
            title="Load a preset sketch"
          >
            <BookOpen className="h-3 w-3" /> Presets
          </button>
          {showPresets && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] rounded-lg border border-zinc-600 bg-zinc-800 shadow-xl overflow-hidden">
              <div className="px-2.5 py-1.5 border-b border-zinc-600">
                <span className="text-xs font-semibold text-zinc-100">Load preset</span>
              </div>
              {PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handlePreset(name)}
                  className="block w-full px-3 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-700 transition-colors border-b border-zinc-700/80 last:border-0"
                >
                  {PRESETS[name].name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Layout mode switcher */}
      <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
        {(Object.keys(MODE_LABELS) as AppPage[]).map((m) => {
          const Icon = MODE_ICONS[m];
          return (
            <button
              key={m}
              onClick={() => setLayoutMode(m)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                layoutMode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
              title={`${MODE_LABELS[m]} mode (${m === 'assembly' ? '1' : m === 'wiring' ? '2' : '3'})`}
            >
              <Icon className="h-3 w-3" />
              {MODE_LABELS[m]}
            </button>
          );
        })}
      </div>

      {/* Keyboard help */}
      <button
        onClick={() => setShortcutHelpOpen(!shortcutHelpOpen)}
        className="ml-2 rounded px-1.5 py-0.5 text-xs font-bold text-muted-foreground hover:bg-accent transition-colors"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      {/* Shortcut help overlay */}
      {shortcutHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShortcutHelpOpen(false)}>
          <div className="bg-card border border-border rounded-lg p-4 max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <kbd className="font-mono bg-muted rounded px-1">Ctrl+R</kbd><span>Run / Stop</span>
              <kbd className="font-mono bg-muted rounded px-1">Ctrl+S</kbd><span>Save project</span>
              <kbd className="font-mono bg-muted rounded px-1">Ctrl+O</kbd><span>Open project</span>
              <kbd className="font-mono bg-muted rounded px-1">1 / 2 / 3</kbd><span>Code / Circuit / Env mode</span>
              <kbd className="font-mono bg-muted rounded px-1">Delete</kbd><span>Delete selected</span>
              <kbd className="font-mono bg-muted rounded px-1">?</kbd><span>This dialog</span>
            </div>
            <button onClick={() => setShortcutHelpOpen(false)} className="mt-3 w-full rounded bg-muted hover:bg-accent text-xs py-1 transition-colors">Close</button>
          </div>
        </div>
      )}
    </header>
  );
}
