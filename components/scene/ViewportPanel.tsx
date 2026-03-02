"use client";

import { useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Grid } from "@react-three/drei";
import { RobotCar } from "./RobotCar";
import { SimulationDriver } from "./SimulationDriver";
import { EnvironmentLayer } from "./EnvironmentLayer";
import { EnvironmentToolbar } from "./EnvironmentToolbar";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import * as THREE from "three";

const _followTarget = new THREE.Vector3();
const _followLookAt = new THREE.Vector3();

function SimulationFollowCamera() {
  const { camera } = useThree();
  const state = useSimulationStore((s) => s.rigidBodyState);

  useFrame((_, delta) => {
    if (!state) return;

    const distance = 0.5;
    const height = 0.25;
    _followTarget.set(
      state.x - Math.cos(state.theta) * distance,
      height,
      state.z - Math.sin(state.theta) * distance,
    );
    _followLookAt.set(state.x, 0.05, state.z);

    camera.position.lerp(_followTarget, delta * 3);
    camera.lookAt(_followLookAt);
  });

  return null;
}

/** Keyboard handler for Delete key on selected environment entity. */
function useEnvironmentKeyboard() {
  const deleteSelected = useEnvironmentStore((s) => s.deleteSelected);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected]);
}

export function ViewportPanel({ follow = false }: { follow?: boolean }) {
  useEnvironmentKeyboard();

  return (
    <div className="h-full w-full relative">
      <Canvas
        shadows
        camera={{ position: [-0.7, 0.5, 0.3], fov: 50, near: 0.01, far: 100 }}
        gl={{ antialias: true, powerPreference: "default", toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#1a1a2e"]} />
        <fog attach="fog" args={["#1a1a2e", 3, 8]} />

        {/* Three-point lighting rig */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-2}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-3, 4, -2]} intensity={0.5} />
        <directionalLight position={[0, 6, -5]} intensity={0.3} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#e8eaf6" roughness={1} metalness={0} />
        </mesh>
        <Grid
          position={[0, 0, 0]}
          args={[10, 10]}
          cellSize={0.05}
          cellThickness={0.5}
          cellColor="#b0b0c8"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#9090b0"
          fadeDistance={4}
          fadeStrength={1}
          infiniteGrid
        />

        {/* Soft contact shadow under the car */}
        <ContactShadows position={[0.15, 0.001, 0]} opacity={0.35} scale={2} blur={2.5} far={0.5} />

        <OrbitControls
          makeDefault={!follow}
          minDistance={0.15}
          maxDistance={3}
          maxPolarAngle={Math.PI / 2.1}
          target={[0.3, 0.02, 0]}
          enableDamping
          dampingFactor={0.1}
        />

        <EnvironmentLayer />
        <RobotCar />
        <SimulationDriver />
        {follow && <SimulationFollowCamera />}
      </Canvas>
      <EnvironmentToolbar />
    </div>
  );
}
