import { useRef } from 'react';
import type { Mesh } from 'three';

interface WheelProps { position: [number, number, number]; radius?: number; width?: number; rotation?: number; }

export function Wheel({ position, radius = 0.033, width = 0.026, rotation = 0 }: WheelProps) {
  const meshRef = useRef<Mesh>(null);
  if (meshRef.current) meshRef.current.rotation.x = rotation;
  return (
    <mesh ref={meshRef} position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, width, 16]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      <mesh><cylinderGeometry args={[radius * 0.3, radius * 0.3, width + 0.002, 8]} /><meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} /></mesh>
    </mesh>
  );
}
