"use client";

import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

export function SimulationDriver() {
  const tick = useSimulationStore((s) => s.tick);
  const isRunning = useSimulationStore((s) => s.isRunning);
  // Speed is handled inside store.tick() — no multiplication here to avoid double-speed bug

  useFrame(() => {
    if (!isRunning) return;
    tick();
  });

  return null;
}
