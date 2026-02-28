interface SensorModelProps { position: [number, number, number]; type: 'ultrasonic' | 'ir'; }
export function SensorModel({ position, type }: SensorModelProps) {
  if (type === 'ultrasonic') {
    return (
      <group position={position}>
        <mesh position={[-0.01, 0, 0]}><cylinderGeometry args={[0.008, 0.008, 0.012, 12]} /><meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0.01, 0, 0]}><cylinderGeometry args={[0.008, 0.008, 0.012, 12]} /><meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0, 0, -0.008]}><boxGeometry args={[0.04, 0.015, 0.004]} /><meshStandardMaterial color="#2266aa" roughness={0.5} /></mesh>
      </group>
    );
  }
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.01, 0.005, 0.008]} /><meshStandardMaterial color="#111" roughness={0.6} /></mesh>
      <mesh position={[0, -0.003, 0.002]}><boxGeometry args={[0.004, 0.002, 0.004]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} /></mesh>
    </group>
  );
}
