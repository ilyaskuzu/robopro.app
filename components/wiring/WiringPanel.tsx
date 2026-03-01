"use client";

import { useWiringStore } from "@/lib/stores/useWiringStore";
import { useMcuStore } from "@/lib/stores/useMcuStore";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

function PinIndicator({ value, mode }: { value: number; mode?: string }) {
  const isPwm = mode === "pwm" || (value > 0 && value < 1);
  const isHigh = value > 0.5;

  if (isPwm) {
    return (
      <span className="flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_theme(colors.blue.400)]" />
        <span className="text-[9px] font-mono text-blue-400">PWM {Math.round(value * 100)}%</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-1.5 w-1.5 rounded-full transition-all ${isHigh ? "bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]" : "bg-muted-foreground/30"
        }`} />
      <span className={`text-[9px] font-mono ${isHigh ? "text-emerald-400" : "text-muted-foreground/40"}`}>
        {isHigh ? "HIGH" : "LOW"}
      </span>
    </span>
  );
}

export function WiringPanel() {
  const connections = useWiringStore((s) => s.connections);
  const pinStates = useMcuStore((s) => s.pinStates);
  const componentOutputs = useSimulationStore((s) => s.componentOutputs);

  return (
    <div className="flex h-full flex-col overflow-auto p-3 font-mono text-xs">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Wire Connections ({connections.length})
      </div>
      {connections.length === 0 ? (
        <span className="text-muted-foreground/50">No connections</span>
      ) : (
        <div className="flex flex-col gap-1">
          {connections.map((conn, i) => {
            const pin = pinStates.find((p) => p.index === conn.mcuPinIndex);
            const compOutputs = componentOutputs[conn.componentId] ?? {};
            const pinValue = compOutputs[conn.componentPinName] ?? pin?.value ?? 0;
            const pinMode = pin?.mode;

            return (
              <div
                key={i}
                className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold min-w-[32px]">
                    {pin?.name ?? `Pin ${conn.mcuPinIndex}`}
                  </span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="text-emerald-400">
                    {conn.componentId}
                  </span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    .{conn.componentPinName}
                  </span>
                </div>
                <PinIndicator value={pinValue} mode={pinMode} />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Pin States
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {pinStates.slice(0, 14).map((pin) => (
          <div key={pin.index} className="flex items-center justify-between px-1">
            <span className="text-muted-foreground">{pin.name}</span>
            <PinIndicator value={pin.value} mode={pin.mode} />
          </div>
        ))}
      </div>
    </div>
  );
}
