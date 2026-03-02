"use client";

import { useRef } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { IdentifiedObstacle } from "@/lib/stores/useEnvironmentStore";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OBS_COLOR = "#ff9800"; // orange — traffic cone style
const OBS_SELECTED_COLOR = "#f57c00";
const OBS_STRIPE_COLOR = "#ffffff";
const OBS_HEIGHT = 0.08;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface ObstacleMeshProps {
  obstacle: IdentifiedObstacle;
}

export function ObstacleMesh({ obstacle }: ObstacleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selected = useEnvironmentStore(
    (s) => s.selectedEntity?.type === "obstacle" && s.selectedEntity.id === obstacle.id,
  );
  const selectEntity = useEnvironmentStore((s) => s.selectEntity);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectEntity({ type: "obstacle", id: obstacle.id });
  };

  return (
    <group position={[obstacle.x, 0, obstacle.z]}>
      {/* Cone body — traffic cone style */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={[0, OBS_HEIGHT / 2, 0]}
        onClick={handleClick}
      >
        <coneGeometry args={[obstacle.radius, OBS_HEIGHT, 16]} />
        <meshStandardMaterial
          color={selected ? OBS_SELECTED_COLOR : OBS_COLOR}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      {/* White stripe band at mid-height */}
      <mesh position={[0, OBS_HEIGHT * 0.45, 0]}>
        <torusGeometry args={[obstacle.radius * 0.55, 0.003, 8, 16]} />
        <meshStandardMaterial color={OBS_STRIPE_COLOR} roughness={0.5} />
      </mesh>
      {/* Base plate */}
      <mesh castShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[obstacle.radius * 1.3, 16]} />
        <meshStandardMaterial color="#455a64" roughness={0.9} />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, OBS_HEIGHT + 0.005, 0]}>
          <ringGeometry args={[obstacle.radius - 0.003, obstacle.radius + 0.005, 24]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
