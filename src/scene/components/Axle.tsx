import type { ReactNode } from 'react';
interface AxleProps { position: [number, number, number]; length?: number; children?: ReactNode; }
export function Axle({ position, length = 0.15, children }: AxleProps) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.004, 0.004, length, 8]} /><meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} /></mesh>
      {children}
    </group>
  );
}
