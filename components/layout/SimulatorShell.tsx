"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { StatusBar } from "./StatusBar";
import { SaveMotionLogOnStop } from "@/components/motion/SaveMotionLogOnStop";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useLayoutStore } from "@/lib/stores/useLayoutStore";
import dynamic from "next/dynamic";

const CodeEditorPanel = dynamic(
  () => import("@/components/editor/CodeEditorPanel").then((m) => m.CodeEditorPanel),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const ViewportPanel = dynamic(
  () => import("@/components/scene/ViewportPanel").then((m) => m.ViewportPanel),
  { ssr: false, loading: () => <div className="flex-1 bg-card animate-pulse" /> }
);

const ComponentPalette = dynamic(
  () => import("@/components/palette/ComponentPalette").then((m) => m.ComponentPalette),
  { ssr: false }
);

const BottomPanel = dynamic(
  () => import("@/components/layout/BottomPanel").then((m) => m.BottomPanel),
  { ssr: false }
);

/**
 * Global keyboard shortcuts handled at the shell level.
 */
function useGlobalKeyboardShortcuts() {
  const { setPage, page } = useLayoutStore();
  const isRunning = useSimulationStore((s) => s.isRunning);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
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

export function SimulatorShell() {
  useGlobalKeyboardShortcuts();
  const [followCamera, setFollowCamera] = useState(false);
  const page = useLayoutStore((s) => s.page);
  const panels = {
    palette: page === 'assembly',
    codeEditor: page === 'simulation',
    viewport: true,
    bottomPanel: page === 'simulation',
    environmentToolbar: false,
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <SaveMotionLogOnStop />
      <Header />
      <div className="flex flex-1 min-h-0">
        {panels.palette && (
          <div className="w-[200px] border-r border-border shrink-0">
            <ComponentPalette />
          </div>
        )}
        {panels.codeEditor && (
          <div className="w-[450px] min-w-[300px] border-r border-border flex flex-col">
            <CodeEditorPanel />
          </div>
        )}
        <div className="flex flex-1 flex-col min-w-[400px]">
          {panels.viewport && (
            <div className="flex-1 min-h-0 relative">
              <ViewportPanel follow={followCamera} />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => setFollowCamera(!followCamera)}
                  className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${followCamera ? 'bg-primary text-white border-primary' : 'bg-muted/80 text-muted-foreground border-border hover:bg-muted'
                    }`}
                >
                  {followCamera ? 'CAMERA: FOLLOW' : 'CAMERA: FREE'}
                </button>
              </div>
            </div>
          )}
          {panels.bottomPanel && (
            <div className="h-[250px] border-t border-border">
              <BottomPanel />
            </div>
          )}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
