"use client";

import { useRef, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { TerrainZone } from "@/core/simulation/TerrainMap";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RAMP_COLOR = "#cddc39"; // lime — brighter, more visible
const RAMP_SELECTED_COLOR = "#c0ca33";
const ARROW_COLOR = "#33691e";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface RampMeshProps {
  zone: TerrainZone;
}

export function RampMesh({ zone }: RampMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selected = useEnvironmentStore(
    (s) => s.selectedEntity?.type === "ramp" && s.selectedEntity.id === zone.id,
  );
  const selectEntity = useEnvironmentStore((s) => s.selectEntity);

  // Build a tilted plane geometry to visually indicate the slope
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(zone.width, zone.depth);
    const pos = geo.attributes.position;

    // Tilt along local X to show elevation
    const maxElev = Math.abs(zone.elevationDelta);
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i); // [-w/2, w/2]
      // Elevation varies from 0 to elevationDelta along the slope direction
      // For visualisation, tilt the plane along its local X axis
      const t = (lx / zone.width) + 0.5; // 0→1
      const elev = t * maxElev;
      pos.setZ(i, pos.getZ(i)); // keep Z
      pos.setX(i, pos.getX(i));
      // We'll handle elevation via vertex Y in world space below
      // Store elevation in a custom attribute isn't easy here,
      // so we adjust the Y of the position attribute (plane is XY by default)
      pos.setY(i, pos.getY(i));
    }

    geo.computeVertexNormals();
    return geo;
  }, [zone.width, zone.depth, zone.elevationDelta]);

  // Slope angle for tilting the visual mesh
  const slopeAngle = useMemo(() => {
    const extent = zone.width; // along slope direction
    if (extent < 1e-6) return 0;
    return Math.atan2(zone.elevationDelta, extent);
  }, [zone.width, zone.elevationDelta]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectEntity({ type: "ramp", id: zone.id });
  };

  const elevLabel = `${zone.elevationDelta > 0 ? "+" : ""}${zone.elevationDelta.toFixed(2)}m`;

  return (
    <group position={[zone.x, 0, zone.z]}>
      {/* Ramp surface — tilted plane */}
      <mesh
        ref={meshRef}
        rotation={[
          -Math.PI / 2 + slopeAngle * Math.cos(zone.slopeDirection),
          0,
          slopeAngle * Math.sin(zone.slopeDirection),
        ]}
        position={[0, Math.abs(zone.elevationDelta) / 2, 0]}
        onClick={handleClick}
      >
        <planeGeometry args={[zone.width, zone.depth]} />
        <meshStandardMaterial
          color={selected ? RAMP_SELECTED_COLOR : RAMP_COLOR}
          transparent
          opacity={selected ? 0.7 : 0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Selection outline */}
      {selected && (
        <lineSegments
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, Math.abs(zone.elevationDelta) / 2, 0]}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(zone.width, zone.depth)]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}

      {/* Slope direction arrow */}
      <group
        position={[0, Math.abs(zone.elevationDelta) + 0.01, 0]}
        rotation={[0, -zone.slopeDirection, 0]}
      >
        <mesh position={[0.02, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.015, 0.04, 6]} />
          <meshBasicMaterial color={ARROW_COLOR} />
        </mesh>
      </group>

      {/* Elevation label */}
      <Text
        position={[0, Math.abs(zone.elevationDelta) + 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.025}
        color={ARROW_COLOR}
        anchorX="center"
        anchorY="middle"
      >
        {`${zone.label || "Ramp"} ${elevLabel}`}
      </Text>
    </group>
  );
}
