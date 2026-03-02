"use client";

import { useState } from 'react';
import { useLayoutStore, type SimSubPanel } from '@/lib/stores/useLayoutStore';
import { useSimulationStore } from '@/lib/stores/useSimulationStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, RotateCcw, Square, ChevronLeft,
  Code, Gamepad2, Mountain,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const CodeEditorPanel = dynamic(
  () => import('@/components/editor/CodeEditorPanel').then((m) => m.CodeEditorPanel),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const ViewportPanel = dynamic(
  () => import('@/components/scene/ViewportPanel').then((m) => m.ViewportPanel),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const BottomPanel = dynamic(
  () => import('@/components/layout/BottomPanel').then((m) => m.BottomPanel),
  { ssr: false }
);

const SUB_PANELS: { id: SimSubPanel; label: string; icon: typeof Code }[] = [
  { id: 'code', label: 'Code', icon: Code },
  { id: 'drive', label: 'Drive', icon: Gamepad2 },
  { id: 'environment', label: 'Environment', icon: Mountain },
];

export function SimulationPage() {
  const [followCamera, setFollowCamera] = useState(false);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const reset = useSimulationStore((s) => s.reset);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const simPanel = useLayoutStore((s) => s.simPanel);
  const setSimPanel = useLayoutStore((s) => s.setSimPanel);
  const setPage = useLayoutStore((s) => s.setPage);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Simulation toolbar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-muted/20">
        <Button variant="ghost" size="sm" onClick={() => setPage('wiring')}>
          <ChevronLeft className="w-3 h-3" /> Wiring
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Run controls */}
        <div className="flex items-center gap-1">
          {isRunning ? (
            <Button size="sm" variant="secondary" onClick={pause} className="bg-amber-600 hover:bg-amber-700 text-white border-0">
              <Pause className="w-3 h-3" /> Pause
            </Button>
          ) : (
            <Button size="sm" onClick={play} className="bg-emerald-600 hover:bg-emerald-700 border-0">
              <Play className="w-3 h-3" /> Run
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => { pause(); reset(); }}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
          {isRunning && (
            <Button size="sm" variant="destructive" onClick={pause}>
              <Square className="w-3 h-3" /> Stop
            </Button>
          )}
        </div>

        <div className="h-4 w-px bg-border" />

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Speed
          <input
            type="range" min={0.25} max={10} step={0.25}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20 accent-primary"
          />
          <span className="w-8 text-foreground font-mono text-[10px]">{speed}x</span>
        </label>

        <div className="flex-1" />

        {/* Sub-panel toggle */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {SUB_PANELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSimPanel(id)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                simPanel === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        {simPanel === 'code' && (
          <div className="w-[450px] min-w-[300px] border-r border-border flex flex-col">
            <CodeEditorPanel />
          </div>
        )}

        {simPanel === 'drive' && (
          <div className="w-[250px] border-r border-border flex flex-col p-4 gap-4 bg-card">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-tight">Manual Controls</h3>
            <div className="text-center space-y-2">
              <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
                <div />
                <Badge variant="outline" className="px-3 py-2 text-sm font-mono">W</Badge>
                <div />
                <Badge variant="outline" className="px-3 py-2 text-sm font-mono">A</Badge>
                <Badge variant="outline" className="px-3 py-2 text-sm font-mono">S</Badge>
                <Badge variant="outline" className="px-3 py-2 text-sm font-mono">D</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Use WASD or arrow keys</p>
              <Badge variant="outline" className="px-4 py-2 text-sm font-mono">SPACE</Badge>
              <p className="text-[10px] text-muted-foreground">Brake</p>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Speed</span><span className="font-mono">0 m/s</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Steering</span><span className="font-mono">0 deg</span>
              </div>
            </div>
          </div>
        )}

        {simPanel === 'environment' && (
          <div className="w-[250px] border-r border-border flex flex-col bg-card">
            {/* EnvironmentToolbar will be rendered inside ViewportPanel */}
          </div>
        )}

        {/* 3D Viewport */}
        <div className="flex flex-1 flex-col min-w-[400px]">
          <div className="flex-1 min-h-0 relative">
            <ViewportPanel follow={followCamera || simPanel === 'drive'} />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => setFollowCamera(!followCamera)}
                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                  followCamera
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted/80 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {followCamera ? 'CAMERA: FOLLOW' : 'CAMERA: FREE'}
              </button>
            </div>
          </div>

          {simPanel === 'code' && (
            <div className="h-[200px] border-t border-border">
              <BottomPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
