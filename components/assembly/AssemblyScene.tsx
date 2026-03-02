"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import { SnapSlot, type SlotType } from "./SnapSlot";
import { useProjectStore } from "@/lib/stores/useProjectStore";
import { useAssemblyStore } from "@/lib/stores/useAssemblyStore";
import * as THREE from "three";

type SnapSlotDef = {
  type: SlotType;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  acceptsCategory: string;
};

const SNAP_SLOTS: SnapSlotDef[] = [
  { type: 'mcu',          label: 'MCU Board',      position: [-0.04, 0.028, 0],       size: [0.055, 0.012, 0.035], acceptsCategory: 'mcu' },
  { type: 'driver',       label: 'Motor Driver',   position: [0.005, 0.028, 0.035],   size: [0.045, 0.012, 0.035], acceptsCategory: 'driver' },
  { type: 'motor-left',   label: 'Left Motor',     position: [0.05, 0.000, -0.065],   size: [0.035, 0.022, 0.020], acceptsCategory: 'dc-motor' },
  { type: 'motor-right',  label: 'Right Motor',    position: [0.05, 0.000, 0.065],    size: [0.035, 0.022, 0.020], acceptsCategory: 'dc-motor' },
  { type: 'battery',      label: 'Battery Pack',   position: [0.025, 0.030, 0],        size: [0.040, 0.018, 0.030], acceptsCategory: 'battery' },
  { type: 'sensor-front', label: 'Front Sensor',   position: [0.10, 0.022, 0],        size: [0.018, 0.015, 0.025], acceptsCategory: 'sensor' },
];

function categoryMatchesSlot(slotAccepts: string, category: string): boolean {
  if (slotAccepts === 'sensor') {
    return category === 'sensors' || category === 'sensor';
  }
  if (slotAccepts === 'dc-motor') {
    return category === 'motors' || category === 'dc-motor' || category === 'stepper';
  }
  return category === slotAccepts || category === `${slotAccepts}s`;
}

function Chassis() {
  const halfW = 0.075;
  const halfL = 0.095;

  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    const r = 0.012;
    shape.moveTo(-halfL + r, -halfW);
    shape.lineTo(halfL - r, -halfW);
    shape.quadraticCurveTo(halfL, -halfW, halfL, -halfW + r);
    shape.lineTo(halfL, halfW - r);
    shape.quadraticCurveTo(halfL, halfW, halfL - r, halfW);
    shape.lineTo(-halfL + r, halfW);
    shape.quadraticCurveTo(-halfL, halfW, -halfL, halfW - r);
    shape.lineTo(-halfL, -halfW + r);
    shape.quadraticCurveTo(-halfL, -halfW, -halfL + r, -halfW);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.004,
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.001,
      bevelSegments: 2,
    });
  }, []);

  return (
    <group>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Wheel placeholders */}
      {[[-0.055, 0, -0.08], [-0.055, 0, 0.08], [0.055, 0, -0.08], [0.055, 0, 0.08]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.012, 16]} />
          <meshStandardMaterial color="#333" roughness={0.9} />
        </mesh>
      ))}

      {/* Axle rods */}
      <mesh position={[-0.055, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.18, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
      <mesh position={[0.055, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.18, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
    </group>
  );
}

function OccupiedComponent({ slot, color }: { slot: SnapSlotDef; color: string }) {
  return (
    <mesh position={slot.position}>
      <boxGeometry args={[slot.size[0] * 0.9, slot.size[1] * 0.9, slot.size[2] * 0.9]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
  );
}

const COMPONENT_COLORS: Record<string, string> = {
  mcu: '#15803d',
  driver: '#8b0000',
  'motor-left': '#a0a0a0',
  'motor-right': '#a0a0a0',
  battery: '#333333',
  'sensor-front': '#1565c0',
  'sensor-rear': '#1565c0',
};

interface AssemblySceneInnerProps {
  selectedCatalogItem: { id: string; category: string } | null;
}

function AssemblySceneInner({ selectedCatalogItem }: AssemblySceneInnerProps) {
  const placements = useAssemblyStore(s => s.placements);
  const addComponent = useAssemblyStore(s => s.addComponent);
  const removeComponent = useAssemblyStore(s => s.removeComponent);

  const occupiedSlots = useMemo(() => {
    const map: Record<string, { catalogId: string; placementId: string; label: string }> = {};
    for (const p of placements) {
      const slot = SNAP_SLOTS.find(s => categoryMatchesSlot(s.acceptsCategory, p.category));
      if (!slot) continue;

      if (slot.acceptsCategory === 'dc-motor') {
        if (!map['motor-left']) {
          map['motor-left'] = { catalogId: p.catalogId, placementId: p.id, label: p.catalogId };
        } else if (!map['motor-right']) {
          map['motor-right'] = { catalogId: p.catalogId, placementId: p.id, label: p.catalogId };
        }
      } else {
        map[slot.type] = { catalogId: p.catalogId, placementId: p.id, label: p.catalogId };
      }
    }
    return map;
  }, [placements]);

  const handleSlotClick = (slot: SnapSlotDef) => {
    if (!selectedCatalogItem) return;
    if (!categoryMatchesSlot(slot.acceptsCategory, selectedCatalogItem.category)) return;
    if (occupiedSlots[slot.type]) return;

    addComponent(selectedCatalogItem.id, selectedCatalogItem.category as any);
  };

  const handleRemove = (slotType: SlotType) => {
    const occ = occupiedSlots[slotType];
    if (occ) removeComponent(occ.placementId);
  };

  return (
    <>
      <Chassis />

      {SNAP_SLOTS.map(slot => {
        const isOccupied = !!occupiedSlots[slot.type];
        const isHighlighted = !isOccupied && !!selectedCatalogItem &&
          categoryMatchesSlot(slot.acceptsCategory, selectedCatalogItem.category);

        return (
          <SnapSlot
            key={slot.type}
            slotType={slot.type}
            label={slot.label}
            position={slot.position}
            size={slot.size}
            isHighlighted={isHighlighted}
            isOccupied={isOccupied}
            occupantLabel={occupiedSlots[slot.type]?.label}
            occupantColor={COMPONENT_COLORS[slot.type]}
            onClick={() => handleSlotClick(slot)}
            onRemove={() => handleRemove(slot.type)}
          />
        );
      })}

      {Object.entries(occupiedSlots).map(([slotType, occ]) => {
        const slotDef = SNAP_SLOTS.find(s => s.type === slotType);
        if (!slotDef) return null;
        return (
          <OccupiedComponent
            key={slotType}
            slot={slotDef}
            color={COMPONENT_COLORS[slotType] ?? '#666'}
          />
        );
      })}
    </>
  );
}

export interface AssemblySceneProps {
  selectedCatalogItem: { id: string; category: string } | null;
}

export function AssemblyScene({ selectedCatalogItem }: AssemblySceneProps) {
  return (
    <Canvas
      camera={{ position: [-0.2, 0.2, 0.2], fov: 45, near: 0.001, far: 10 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0f1117"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 8, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-2, 4, -2]} intensity={0.4} />
      <hemisphereLight args={["#b0c4ff", "#1a1a2e", 0.5]} />

      <OrbitControls
        makeDefault
        minDistance={0.1}
        maxDistance={0.6}
        target={[0.01, 0.02, 0]}
        enablePan={false}
      />

      <gridHelper args={[0.5, 20, "#333355", "#222244"]} position={[0, -0.001, 0]} />
      <ContactShadows position={[0, -0.001, 0]} opacity={0.4} scale={0.5} blur={2} />

      <AssemblySceneInner selectedCatalogItem={selectedCatalogItem} />
    </Canvas>
  );
}
