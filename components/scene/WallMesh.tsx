"use client";

import { useRef, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Wall } from "@/core/simulation/WallWorld";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WALL_HEIGHT = 0.08; // visual height in world units
const WALL_COLOR = "#6b7280"; // gray-500
const WALL_SELECTED_COLOR = "#3b82f6"; // blue-500

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface WallMeshProps {
  wall: Wall;
}

export function WallMesh({ wall }: WallMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selected = useEnvironmentStore(
    (s) => s.selectedEntity?.type === "wall" && s.selectedEntity.id === wall.id,
  );
  const selectEntity = useEnvironmentStore((s) => s.selectEntity);

  const { position, rotation, length } = useMemo(() => {
    const dx = wall.x2 - wall.x1;
    const dz = wall.z2 - wall.z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    return {
      position: new THREE.Vector3(
        (wall.x1 + wall.x2) / 2,
        WALL_HEIGHT / 2,
        (wall.z1 + wall.z2) / 2,
      ),
      rotation: new THREE.Euler(0, -angle, 0),
      length: Math.max(len, 0.01),
    };
  }, [wall.x1, wall.z1, wall.x2, wall.z2]);

  const thickness = wall.thickness * 2; // wall.thickness is half-thickness

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectEntity({ type: "wall", id: wall.id });
  };

  const wallThickness = Math.max(thickness, 0.01);

  return (
    <group>
      {/* Wall body */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={position}
        rotation={rotation}
        onClick={handleClick}
      >
        <boxGeometry args={[length, WALL_HEIGHT, wallThickness]} />
        <meshStandardMaterial
          color={selected ? WALL_SELECTED_COLOR : WALL_COLOR}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      {/* Darker top edge strip */}
      <mesh
        position={[position.x, WALL_HEIGHT - 0.003, position.z]}
        rotation={rotation}
      >
        <boxGeometry args={[length, 0.006, wallThickness + 0.002]} />
        <meshStandardMaterial color="#455a64" roughness={0.9} />
      </mesh>
    </group>
  );
}
