"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

/**
 * When the simulation stops (Run → Stop), auto-saves the current session's motion log
 * to the project logs/ folder via the API. Session = from Reset to next Reset;
 * multiple Run/Stop in the same session overwrite the same session file.
 */
export function SaveMotionLogOnStop() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const motionLog = useSimulationStore((s) => s.motionLog);
  const sessionId = useSimulationStore((s) => s.sessionId);
  const prevIsRunning = useRef(isRunning);

  useEffect(() => {
    const wasRunning = prevIsRunning.current;
    prevIsRunning.current = isRunning;

    if (wasRunning && !isRunning && motionLog.length > 0) {
      fetch("/api/save-motion-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          entries: motionLog,
          exportedAt: new Date().toISOString(),
        }),
      }).catch((err) => console.error("Auto-save motion log failed:", err));
    }
  }, [isRunning, motionLog, sessionId]);

  return null;
}
