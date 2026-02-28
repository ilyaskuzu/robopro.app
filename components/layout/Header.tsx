"use client";

import { Play, Pause, RotateCcw, Square, Cpu } from "lucide-react";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

export function Header() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const reset = useSimulationStore((s) => s.reset);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);

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
    </header>
  );
}
