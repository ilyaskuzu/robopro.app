import type { ReactNode } from 'react';
interface ChassisProps { position: [number, number, number]; children?: ReactNode; }
export function Chassis({ position, children }: ChassisProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]}><boxGeometry args={[0.18, 0.02, 0.12]} /><meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.1} /></mesh>
      <mesh position={[0.03, 0.03, 0]}><boxGeometry args={[0.06, 0.02, 0.05]} /><meshStandardMaterial color="#333" roughness={0.6} /></mesh>
      <mesh position={[-0.04, 0.03, 0]}><boxGeometry args={[0.055, 0.012, 0.07]} /><meshStandardMaterial color="#006644" roughness={0.5} /></mesh>
      {children}
    </group>
  );
}
