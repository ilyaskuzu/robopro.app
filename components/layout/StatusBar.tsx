"use client";

import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useMcuStore } from "@/lib/stores/useMcuStore";

export function StatusBar() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const tickCount = useSimulationStore((s) => s.tickCount);
  const supplyVoltage = useSimulationStore((s) => s.supplyVoltage);
  const totalCurrent = useSimulationStore((s) => s.totalCurrent);
  const speed = useSimulationStore((s) => s.speed);
  const rigidBodyState = useSimulationStore((s) => s.rigidBodyState);
  const boardType = useMcuStore((s) => s.boardType);
  const kineticStates = useSimulationStore((s) => s.kineticStates);
  const motorLeft = kineticStates["motor-left"];
  const motorRight = kineticStates["motor-right"];

  const headingDeg = rigidBodyState
    ? (((rigidBodyState.theta * 180) / Math.PI % 360) + 360) % 360
    : 0;

  return (
    <footer className="flex h-6 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-card px-3 text-[10px] font-mono text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isRunning ? "bg-emerald-500" : "bg-muted-foreground"}`} />
        {isRunning ? "Running" : "Stopped"}
      </span>
      <span>Board: {boardType}</span>
      <span>Tick: {tickCount}</span>
      <span>Sim: {speed}x</span>
      <span>V: {supplyVoltage.toFixed(2)}V</span>
      <span>I: {(totalCurrent * 1000).toFixed(0)}mA</span>
      {rigidBodyState && (
        <>
          <span title="Position (m)">Pos: x={rigidBodyState.x.toFixed(3)} z={rigidBodyState.z.toFixed(3)}</span>
          <span title="Heading (degrees from +X)">Dir: {headingDeg.toFixed(1)}°</span>
          <span title="Forward velocity (m/s)">v: {(rigidBodyState.v * 100).toFixed(1)}cm/s</span>
        </>
      )}
      {motorLeft && <span>L: {(motorLeft.linearVelocity * 100).toFixed(1)}cm/s</span>}
      {motorRight && <span>R: {(motorRight.linearVelocity * 100).toFixed(1)}cm/s</span>}
    </footer>
  );
}
