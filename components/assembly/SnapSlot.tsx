"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export type SlotType = 'mcu' | 'driver' | 'motor-left' | 'motor-right' | 'battery' | 'sensor-front' | 'sensor-rear';

interface SnapSlotProps {
  slotType: SlotType;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  isHighlighted: boolean;
  isOccupied: boolean;
  occupantLabel?: string;
  occupantColor?: string;
  onClick: () => void;
  onRemove?: () => void;
}

const SLOT_COLORS: Record<string, string> = {
  mcu: '#22c55e',
  driver: '#3b82f6',
  'motor-left': '#f97316',
  'motor-right': '#f97316',
  battery: '#ef4444',
  'sensor-front': '#a855f7',
  'sensor-rear': '#a855f7',
};

export function SnapSlot({
  slotType, label, position, size,
  isHighlighted, isOccupied, occupantLabel, occupantColor,
  onClick, onRemove,
}: SnapSlotProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const baseColor = SLOT_COLORS[slotType] ?? '#888888';
  const pulseRef = useRef(0);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (isOccupied) {
      mat.opacity = 0.9;
      mat.emissiveIntensity = 0.1;
      return;
    }

    if (isHighlighted) {
      pulseRef.current += dt * 4;
      const pulse = 0.4 + Math.sin(pulseRef.current) * 0.2;
      mat.opacity = pulse;
      mat.emissiveIntensity = 0.5 + Math.sin(pulseRef.current) * 0.3;
    } else {
      mat.opacity = hovered ? 0.35 : 0.15;
      mat.emissiveIntensity = hovered ? 0.3 : 0;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={isOccupied ? (occupantColor ?? baseColor) : baseColor}
          transparent
          opacity={0.15}
          emissive={baseColor}
          emissiveIntensity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={isHighlighted ? '#ffffff' : baseColor}
          wireframe
          transparent
          opacity={isOccupied ? 0.4 : (isHighlighted ? 0.8 : 0.3)}
        />
      </mesh>

      {/* Dashed border animation for highlighted empty slots */}
      {isHighlighted && !isOccupied && (
        <mesh position={[0, size[1] / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(size[0], size[2]) * 0.5, Math.max(size[0], size[2]) * 0.55, 32]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Html
        position={[0, size[1] / 2 + 0.012, 0]}
        center
        distanceFactor={0.4}
        zIndexRange={[1, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span
            className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              background: isOccupied ? 'rgba(0,0,0,0.92)' : (isHighlighted ? baseColor : 'rgba(0,0,0,0.88)'),
              color: '#fff',
              border: `1px solid ${baseColor}`,
              textShadow: '0 0 1px rgba(0,0,0,0.8)',
            }}
          >
            {isOccupied ? occupantLabel : label}
          </span>
          {isOccupied && onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-[8px] bg-red-600 text-white px-1 py-0 rounded cursor-pointer hover:bg-red-500 transition-colors"
              style={{ pointerEvents: 'auto' }}
            >
              Remove
            </button>
          )}
          {!isOccupied && isHighlighted && (
            <span className="text-[8px] text-white/80 animate-pulse">Click to place</span>
          )}
        </div>
      </Html>
    </group>
  );
}
