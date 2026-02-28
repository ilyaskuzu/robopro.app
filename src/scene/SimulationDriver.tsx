import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../state/useSimulationStore';

export function SimulationDriver() {
  const tick = useSimulationStore(s => s.tick);
  const isRunning = useSimulationStore(s => s.isRunning);
  const speed = useSimulationStore(s => s.speed);

  useFrame(() => {
    if (!isRunning) return;
    const stepsPerFrame = Math.max(1, Math.round(speed));
    for (let i = 0; i < stepsPerFrame; i++) tick();
  });

  return null;
}
