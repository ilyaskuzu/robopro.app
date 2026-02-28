"use client";

import { useState } from "react";
import { SerialMonitor } from "@/components/serial/SerialMonitor";
import { WiringPanel } from "@/components/wiring/WiringPanel";
import { MotionLogPanel } from "@/components/motion/MotionLogPanel";

type Tab = "serial" | "wiring" | "motion";

const TABS: { id: Tab; label: string }[] = [
  { id: "serial", label: "Serial Monitor" },
  { id: "wiring", label: "Wiring" },
  { id: "motion", label: "Motion" },
];

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("serial");

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex border-b border-border">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "serial" && <SerialMonitor />}
        {activeTab === "wiring" && <WiringPanel />}
        {activeTab === "motion" && <MotionLogPanel />}
      </div>
    </div>
  );
}
