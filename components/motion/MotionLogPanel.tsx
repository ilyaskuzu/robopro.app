"use client";

import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { Download } from "lucide-react";

const EXPECTED_BEHAVIOUR = `From default sketch (loop):
1. FORWARD  2000 ms  — both motors forward, car moves +X
2. STOP     1000 ms  — ENA/ENB=0, car coasts to stop
3. PIVOT    2000 ms  — left backward, right forward; car turns left in place
4. STOP     1000 ms  — car stops
5. Repeat from 1`;

function downloadMotionLog(log: ReturnType<typeof useSimulationStore.getState>["motionLog"]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: log.length,
    entries: log,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `robopro-motion-log-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const PHASE_COLORS: Record<string, string> = {
  FORWARD: 'text-emerald-400',
  STOPPED: 'text-muted-foreground',
  PIVOT: 'text-amber-400',
  COASTING: 'text-blue-400',
  CURVE: 'text-purple-400',
  IDLE: 'text-muted-foreground/50',
};

export function MotionLogPanel() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const rigidBodyState = useSimulationStore((s) => s.rigidBodyState);
  const motionLog = useSimulationStore((s) => s.motionLog);
  const tickCount = useSimulationStore((s) => s.tickCount);
  const kineticStates = useSimulationStore((s) => s.kineticStates);

  const canDownload = !isRunning && motionLog.length > 0;
  const motorL = kineticStates["motor-left"];
  const motorR = kineticStates["motor-right"];
  const lastEntry = motionLog.length > 0 ? motionLog[motionLog.length - 1] : null;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3">
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-2">
        <span className="text-[10px] font-mono text-muted-foreground">
          {lastEntry ? (
            <span className={PHASE_COLORS[lastEntry.phase] ?? ''}>
              {lastEntry.phase}
            </span>
          ) : 'IDLE'}
          {' '}| Tick {tickCount} | {motionLog.length} samples
        </span>
        <button
          type="button"
          onClick={() => downloadMotionLog(motionLog)}
          disabled={!canDownload}
          title={!isRunning && motionLog.length === 0 ? "Run and Stop to enable" : isRunning ? "Stop to download" : undefined}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      </div>

      <section className="shrink-0 space-y-1">
        <h3 className="text-xs font-semibold text-foreground">Current state</h3>
        <div className="rounded border border-border bg-muted/40 p-2 font-mono text-[10px] text-muted-foreground grid grid-cols-4 gap-x-3 gap-y-0.5">
          {rigidBodyState ? (
            <>
              <span>Pos: ({rigidBodyState.x.toFixed(3)}, {rigidBodyState.z.toFixed(3)})</span>
              <span>Dir: {((((rigidBodyState.theta * 180) / Math.PI) % 360 + 360) % 360).toFixed(1)}°</span>
              <span>v: {(rigidBodyState.v * 100).toFixed(1)} cm/s</span>
              <span>ω: {(rigidBodyState.omega * 180 / Math.PI).toFixed(1)}°/s</span>
              <span>L: {motorL ? (motorL.linearVelocity * 100).toFixed(1) : '0.0'} cm/s</span>
              <span>R: {motorR ? (motorR.linearVelocity * 100).toFixed(1) : '0.0'} cm/s</span>
            </>
          ) : (
            <span className="col-span-4">Press Run to start.</span>
          )}
        </div>
      </section>

      <section className="shrink-0">
        <details className="text-[10px]">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">Expected behaviour</summary>
          <pre className="whitespace-pre-wrap rounded border border-border bg-muted/40 p-2 font-mono text-muted-foreground mt-1">
            {EXPECTED_BEHAVIOUR}
          </pre>
        </details>
      </section>

      <section className="min-h-0 flex-1 space-y-1 overflow-hidden">
        <h3 className="text-xs font-semibold text-foreground">Log</h3>
        <div className="h-full overflow-auto rounded border border-border">
          <table className="w-full border-collapse font-mono text-[10px] text-muted-foreground">
            <thead className="sticky top-0 bg-muted/80">
              <tr>
                <th className="border-b border-border px-1.5 py-1 text-left">Tick</th>
                <th className="border-b border-border px-1.5 py-1 text-left">Phase</th>
                <th className="border-b border-border px-1.5 py-1 text-right">x(cm)</th>
                <th className="border-b border-border px-1.5 py-1 text-right">z(cm)</th>
                <th className="border-b border-border px-1.5 py-1 text-right">Dir°</th>
                <th className="border-b border-border px-1.5 py-1 text-right">v(cm/s)</th>
                <th className="border-b border-border px-1.5 py-1 text-right">L</th>
                <th className="border-b border-border px-1.5 py-1 text-right">R</th>
              </tr>
            </thead>
            <tbody>
              {[...motionLog].reverse().map((entry, i) => (
                <tr key={`${entry.tick}-${i}`} className="border-b border-border/50">
                  <td className="px-1.5 py-0.5">{entry.tick}</td>
                  <td className={`px-1.5 py-0.5 ${PHASE_COLORS[entry.phase] ?? ''}`}>{entry.phase}</td>
                  <td className="px-1.5 py-0.5 text-right">{(entry.x * 100).toFixed(1)}</td>
                  <td className="px-1.5 py-0.5 text-right">{(entry.z * 100).toFixed(1)}</td>
                  <td className="px-1.5 py-0.5 text-right">{entry.dir.toFixed(0)}</td>
                  <td className="px-1.5 py-0.5 text-right">{(entry.v * 100).toFixed(1)}</td>
                  <td className="px-1.5 py-0.5 text-right">{entry.motorL.toFixed(1)}</td>
                  <td className="px-1.5 py-0.5 text-right">{entry.motorR.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {motionLog.length === 0 && (
            <div className="p-3 text-center text-[10px] text-muted-foreground">
              No log entries yet. Press Run to record motion.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
