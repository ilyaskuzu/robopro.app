"use client";

import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

export function SimulationDriver() {
  const tick = useSimulationStore((s) => s.tick);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const speed = useSimulationStore((s) => s.speed);

  useFrame(() => {
    if (!isRunning) return;
    const steps = Math.max(1, Math.round(speed));
    for (let i = 0; i < steps; i++) tick();
  });

  return null;
}
