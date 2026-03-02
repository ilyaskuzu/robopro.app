"use client";

import { useRef, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { FrictionZone } from "@/core/simulation/FrictionMap";
import { FRICTION_MATERIALS } from "@/core/simulation/FrictionMap";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */

/** Map friction coefficient → color: ice=blue, concrete=gray, sand=tan, carpet=brown, rubber=red. */
function frictionToColor(mu: number): string {
  if (mu <= 0.1) return "#bbdefb"; // ice — light blue
  if (mu <= 0.35) return "#b0bec5"; // metal — cool gray
  if (mu <= 0.55) return "#a5d6a7"; // grass/wood — soft green
  if (mu <= 0.7) return "#ffe0b2"; // sand — warm tan
  if (mu <= 0.9) return "#e0e0e0"; // concrete — neutral gray
  if (mu <= 1.3) return "#d7ccc8"; // carpet — warm brown-gray
  return "#ef9a9a"; // rubber mat — warm red
}

/** Reverse-lookup: find the material name closest to a friction value. */
function frictionLabel(mu: number): string {
  let closest = "";
  let minDiff = Infinity;
  for (const [name, val] of Object.entries(FRICTION_MATERIALS)) {
    const diff = Math.abs(val - mu);
    if (diff < minDiff) {
      minDiff = diff;
      closest = name;
    }
  }
  return closest.toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface FrictionZoneMeshProps {
  zone: FrictionZone;
}

export function FrictionZoneMesh({ zone }: FrictionZoneMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selected = useEnvironmentStore(
    (s) => s.selectedEntity?.type === "friction" && s.selectedEntity.id === zone.id,
  );
  const selectEntity = useEnvironmentStore((s) => s.selectEntity);

  const color = useMemo(() => frictionToColor(zone.friction), [zone.friction]);
  const label = useMemo(() => zone.label || frictionLabel(zone.friction), [zone.label, zone.friction]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectEntity({ type: "friction", id: zone.id });
  };

  if (zone.shape === "circle") {
    const radius = zone.radius ?? 0.1;
    return (
      <group position={[zone.x, 0.002, zone.z]}>
        <mesh
          ref={meshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleClick}
        >
          <circleGeometry args={[radius, 32]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={selected ? 0.6 : 0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.005, radius + 0.005, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )}
        <Text
          position={[0, 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={Math.min(0.04, radius * 0.4)}
          color="#222"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    );
  }

  // Rectangle (default)
  const w = zone.width ?? 0.2;
  const h = zone.height ?? 0.2;

  return (
    <group position={[zone.x, 0.002, zone.z]}>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={selected ? 0.6 : 0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {selected && (
        <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}
      <Text
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(0.04, Math.min(w, h) * 0.25)}
        color="#222"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}
