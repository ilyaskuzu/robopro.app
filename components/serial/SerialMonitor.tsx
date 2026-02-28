"use client";

import { useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useMcuStore } from "@/lib/stores/useMcuStore";

export function SerialMonitor() {
  const serialBuffer = useMcuStore((s) => s.serialBuffer);
  const clearSerial = useMcuStore((s) => s.clearSerial);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serialBuffer.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end px-2 py-1">
        <button
          onClick={clearSerial}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </button>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-2 font-mono text-xs leading-5">
        {serialBuffer.length === 0 ? (
          <span className="text-muted-foreground/50">No serial output yet...</span>
        ) : (
          serialBuffer.map((line, i) => (
            <div key={i} className="text-emerald-400">{line}</div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
