"use client";

import { useWiringStore } from "@/lib/stores/useWiringStore";
import { useMcuStore } from "@/lib/stores/useMcuStore";

export function WiringPanel() {
  const connections = useWiringStore((s) => s.connections);
  const pinStates = useMcuStore((s) => s.pinStates);

  return (
    <div className="flex h-full flex-col overflow-auto p-3 font-mono text-xs">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Wire Connections
      </div>
      {connections.length === 0 ? (
        <span className="text-muted-foreground/50">No connections</span>
      ) : (
        <div className="flex flex-col gap-1">
          {connections.map((conn, i) => {
            const pin = pinStates.find((p) => p.index === conn.mcuPinIndex);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
              >
                <span className="text-blue-400">{pin?.name ?? `Pin ${conn.mcuPinIndex}`}</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="text-emerald-400">
                  {conn.componentId}.{conn.componentPinName}
                </span>
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
            <span className={pin.value > 0 ? "text-emerald-400 font-semibold" : "text-muted-foreground/40"}>
              {pin.mode === "unset" ? "-" : pin.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
