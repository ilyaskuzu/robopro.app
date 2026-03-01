"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RobotCar } from "./RobotCar";
import { SimulationDriver } from "./SimulationDriver";

export function ViewportPanel() {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [-0.7, 0.5, 0.3], fov: 50, near: 0.01, far: 100 }}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        <color attach="background" args={["#f0f0f4"]} />
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-4, 6, -3]} intensity={0.4} />
        <hemisphereLight args={["#ffffff", "#d0d0e0", 0.6]} />
        <OrbitControls makeDefault minDistance={0.05} maxDistance={3} target={[0.3, 0.02, 0]} />
        <gridHelper args={[2, 40, "#c0c0d0", "#d8d8e4"]} position={[0, 0, 0]} />
        <RobotCar />
        <SimulationDriver />
      </Canvas>
    </div>
  );
}
