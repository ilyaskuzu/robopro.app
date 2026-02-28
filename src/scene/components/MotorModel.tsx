interface MotorModelProps { position: [number, number, number]; side: 'left' | 'right'; }
export function MotorModel({ position, side }: MotorModelProps) {
  const xFlip = side === 'left' ? -1 : 1;
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.03, 8]} /><meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0.02 * xFlip, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.003, 0.003, 0.015, 6]} /><meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} /></mesh>
    </group>
  );
}
