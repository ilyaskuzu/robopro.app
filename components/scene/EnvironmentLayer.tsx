"use client";

import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { FrictionZoneMesh } from "./FrictionZoneMesh";
import { WallMesh } from "./WallMesh";
import { RampMesh } from "./RampMesh";
import { ObstacleMesh } from "./ObstacleMesh";

/**
 * Renders all environment entities (friction zones, walls, ramps, obstacles)
 * within the R3F scene. Lives inside the <Canvas> tree.
 */
export function EnvironmentLayer() {
  const frictionZones = useEnvironmentStore((s) => s.frictionZones);
  const walls = useEnvironmentStore((s) => s.walls);
  const terrainZones = useEnvironmentStore((s) => s.terrainZones);
  const obstacles = useEnvironmentStore((s) => s.obstacles);

  return (
    <group name="environment-layer">
      {frictionZones.map((zone) => (
        <FrictionZoneMesh key={zone.id} zone={zone} />
      ))}
      {walls.map((wall) => (
        <WallMesh key={wall.id} wall={wall} />
      ))}
      {terrainZones.map((zone) => (
        <RampMesh key={zone.id} zone={zone} />
      ))}
      {obstacles.map((obs) => (
        <ObstacleMesh key={obs.id} obstacle={obs} />
      ))}
    </group>
  );
}
