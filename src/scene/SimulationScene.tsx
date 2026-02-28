import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { GroundGrid } from './components/GroundGrid';
import { RobotCar } from './components/RobotCar';
import { SimulationDriver } from './SimulationDriver';

export function SimulationScene() {
  return (
    <Canvas camera={{ position: [0.3, 0.25, 0.3], fov: 50, near: 0.01, far: 100 }} style={{ background: '#0a0a1a' }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 3]} intensity={1} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
      <Environment preset="city" />
      <OrbitControls makeDefault minDistance={0.1} maxDistance={5} target={[0, 0.03, 0]} />
      <GroundGrid />
      <RobotCar />
      <SimulationDriver />
    </Canvas>
  );
}
