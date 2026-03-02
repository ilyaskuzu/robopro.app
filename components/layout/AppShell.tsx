"use client";

import { useEffect, useState, useRef } from 'react';
import { useLayoutStore, type AppPage } from '@/lib/stores/useLayoutStore';
import { useSimulationStore } from '@/lib/stores/useSimulationStore';
import { useMcuStore } from '@/lib/stores/useMcuStore';
import { useWiringStore } from '@/lib/stores/useWiringStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { useAssemblyStore } from '@/lib/stores/useAssemblyStore';
import { serializeProject, deserializeProject, downloadProject, openProjectFile, type ProjectData, type SavedAssemblyPlacement } from '@/core/simulation/ProjectSerializer';
import { loadProjectData } from '@/lib/projectLoad';
import { initProjectSync } from '@/lib/stores/projectSyncOrchestrator';
import { PRESETS, PRESET_NAMES } from '@/core/sketch/presets';

initProjectSync();
import { SaveMotionLogOnStop } from '@/components/motion/SaveMotionLogOnStop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu, Save, FolderOpen, BookOpen, HelpCircle,
  Puzzle, Cable, Play as PlayIcon, Check,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const AssemblyPage = dynamic(
  () => import('@/components/pages/AssemblyPage').then(m => m.AssemblyPage),
  { ssr: false, loading: () => <div className="flex-1 bg-background animate-pulse" /> }
);
const WiringPage = dynamic(
  () => import('@/components/pages/WiringPage').then(m => m.WiringPage),
  { ssr: false, loading: () => <div className="flex-1 bg-background animate-pulse" /> }
);
const SimulationPage = dynamic(
  () => import('@/components/pages/SimulationPage').then(m => m.SimulationPage),
  { ssr: false, loading: () => <div className="flex-1 bg-background animate-pulse" /> }
);

const PAGES: { id: AppPage; label: string; icon: typeof Puzzle; shortcut: string }[] = [
  { id: 'assembly', label: 'Assembly', icon: Puzzle, shortcut: '1' },
  { id: 'wiring', label: 'Wiring', icon: Cable, shortcut: '2' },
  { id: 'simulation', label: 'Simulate', icon: PlayIcon, shortcut: '3' },
];

function useGlobalKeyboardShortcuts() {
  const { setPage, page } = useLayoutStore();
  const isRunning = useSimulationStore(s => s.isRunning);
  const play = useSimulationStore(s => s.play);
  const pause = useSimulationStore(s => s.pause);
  const shortcutHelpOpen = useLayoutStore((s) => s.shortcutHelpOpen);
  const setShortcutHelpOpen = useLayoutStore((s) => s.setShortcutHelpOpen);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          if (isRunning) pause(); else play();
        }
        return;
      }

      if (isInput) return;

      if (e.key === "1") setPage("assembly");
      else if (e.key === "2") setPage("wiring");
      else if (e.key === "3") setPage("simulation");
      else if (e.key === "?") setShortcutHelpOpen(!shortcutHelpOpen);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setPage, page, isRunning, play, pause, shortcutHelpOpen, setShortcutHelpOpen]);
}

export function AppShell() {
  useGlobalKeyboardShortcuts();

  const page = useLayoutStore(s => s.page);
  const setPage = useLayoutStore(s => s.setPage);
  const shortcutHelpOpen = useLayoutStore(s => s.shortcutHelpOpen);
  const setShortcutHelpOpen = useLayoutStore(s => s.setShortcutHelpOpen);
  const appendSerial = useMcuStore(s => s.appendSerial);
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

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
    const savedAssembly: SavedAssemblyPlacement[] = assemblyPlacements.map((p) => ({
      id: p.id,
      catalogId: p.catalogId,
      category: p.category,
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <SaveMotionLogOnStop />

      {/* Header */}
      <header className="flex h-10 items-center gap-3 border-b border-border bg-card px-3 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Cpu className="h-4 w-4" />
          <span>ROBOPRO</span>
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Step navigation */}
        <nav className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {PAGES.map(({ id, label, icon: Icon, shortcut }, i) => {
            const isActive = page === id;
            const stepNum = i + 1;
            const isCompleted =
              (id === 'assembly' && page !== 'assembly') ||
              (id === 'wiring' && page === 'simulation');

            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
                title={`${label} (${shortcut})`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border text-[9px] flex items-center justify-center leading-none">
                    {stepNum}
                  </span>
                )}
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Save / Load / Presets */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleSave} title="Save project">
            <Save className="w-3 h-3" /> Save
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLoad} title="Load project">
            <FolderOpen className="w-3 h-3" /> Load
          </Button>
          <div className="relative" ref={presetsRef}>
            <Button variant="ghost" size="sm" onClick={() => setShowPresets(!showPresets)} title="Load a preset">
              <BookOpen className="w-3 h-3" /> Presets
            </Button>
            {showPresets && (
              <div className="absolute top-full left-0 mt-1 z-[9999] min-w-[220px] rounded-lg border border-border bg-zinc-800 shadow-xl overflow-hidden">
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

        <Button variant="ghost" size="icon" onClick={() => setShortcutHelpOpen(!shortcutHelpOpen)} title="Keyboard shortcuts (?)">
          <HelpCircle className="w-3.5 h-3.5" />
        </Button>
      </header>

      {/* Page content */}
      {page === 'assembly' && <AssemblyPage />}
      {page === 'wiring' && <WiringPage />}
      {page === 'simulation' && <SimulationPage />}

      {/* Status bar */}
      <footer className="flex h-6 items-center gap-4 border-t border-border bg-card px-3 text-[10px] text-muted-foreground shrink-0">
        <span className="uppercase font-bold tracking-wider">{page}</span>
        <span>ROBOPRO v0.2</span>
      </footer>

      {/* Help dialog */}
      {shortcutHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShortcutHelpOpen(false)}>
          <div className="bg-card border border-border rounded-lg p-4 max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <kbd className="font-mono bg-muted rounded px-1">Ctrl+R</kbd><span>Run / Stop</span>
              <kbd className="font-mono bg-muted rounded px-1">1 / 2 / 3</kbd><span>Assembly / Wiring / Sim</span>
              <kbd className="font-mono bg-muted rounded px-1">Delete</kbd><span>Delete selected</span>
              <kbd className="font-mono bg-muted rounded px-1">?</kbd><span>This dialog</span>
            </div>
            <button onClick={() => setShortcutHelpOpen(false)} className="mt-3 w-full rounded bg-muted hover:bg-accent text-xs py-1 transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
