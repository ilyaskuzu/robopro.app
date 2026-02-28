"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

const WHEEL_RADIUS = 0.033;
const WHEEL_WIDTH = 0.018;
const AXLE_HALF_SPAN = 0.065;
const AXLE_FRONT_X = 0.065;
const AXLE_REAR_X = -0.065;
const SPOKE_COUNT = 5;

/**
 * Wheel built from a cylinder (tire) + disc hub + spokes.
 * Cylinder axis = Y by default. We rotate the whole group so axle is along Z.
 * Spinning the wheel = rotating around local Y (the cylinder axis).
 */
function Wheel() {
  const spokeLen = WHEEL_RADIUS * 0.7;

  return (
    <group>
      {/* Tire cylinder */}
      <mesh>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Rim ring (slightly smaller, slightly wider so it pokes out) */}
      <mesh>
        <cylinderGeometry args={[WHEEL_RADIUS - 0.004, WHEEL_RADIUS - 0.004, WHEEL_WIDTH + 0.001, 24]} />
        <meshStandardMaterial color="#555555" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Hub disc */}
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, WHEEL_WIDTH + 0.002, 12]} />
        <meshStandardMaterial color="#999999" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Spokes (thin boxes radially in the XZ plane, perpendicular to Y axis) */}
      {Array.from({ length: SPOKE_COUNT }).map((_, i) => {
        const angle = (i / SPOKE_COUNT) * Math.PI * 2;
        const cx = Math.cos(angle) * spokeLen * 0.5;
        const cz = Math.sin(angle) * spokeLen * 0.5;
        return (
          <mesh key={i} position={[cx, 0, cz]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[spokeLen, 0.003, 0.003]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.5} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function MotorBlock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Motor body -- axle along Z */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.028, 12]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.036, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function UltrasonicSensor({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* PCB backing */}
      <mesh position={[0, 0, -0.006]}>
        <boxGeometry args={[0.008, 0.012, 0.018]} />
        <meshStandardMaterial color="#1565c0" roughness={0.5} />
      </mesh>
      {/* Left transducer */}
      <mesh position={[0, 0, 0.005]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.008, 10]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Right transducer */}
      <mesh position={[0, 0.012, 0.005]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.008, 10]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function RobotCar() {
  const groupRef = useRef<THREE.Group>(null!);
  const wheelFLRef = useRef<THREE.Group>(null!);
  const wheelFRRef = useRef<THREE.Group>(null!);
  const wheelRLRef = useRef<THREE.Group>(null!);
  const wheelRRRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    const state = useSimulationStore.getState();
    const body = state.rigidBodyState;

    if (groupRef.current) {
      if (body) {
        groupRef.current.position.x = body.x;
        groupRef.current.position.z = body.z;
        // Car local forward = +X. rotation.y=R → local +X becomes world (cos(R), 0, -sin(R)).
        // Physics forward = (cos(θ), 0, sin(θ)). Matching: cos(R)=cos(θ), -sin(R)=sin(θ) → R = -θ.
        groupRef.current.rotation.y = -body.theta;
      } else {
        groupRef.current.position.x = 0;
        groupRef.current.position.z = 0;
        groupRef.current.rotation.y = 0;
      }
    }

    const leftAngle = body?.wheelAngleLeft ?? 0;
    const rightAngle = body?.wheelAngleRight ?? 0;

    if (wheelFLRef.current) wheelFLRef.current.rotation.y = leftAngle;
    if (wheelFRRef.current) wheelFRRef.current.rotation.y = rightAngle;
    if (wheelRLRef.current) wheelRLRef.current.rotation.y = leftAngle;
    if (wheelRRRef.current) wheelRRRef.current.rotation.y = rightAngle;
  });

  const chassisGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.09, l = 0.095, r = 0.012;
    shape.moveTo(-l + r, -w);
    shape.lineTo(l - r, -w);
    shape.quadraticCurveTo(l, -w, l, -w + r);
    shape.lineTo(l, w - r);
    shape.quadraticCurveTo(l, w, l - r, w);
    shape.lineTo(-l + r, w);
    shape.quadraticCurveTo(-l, w, -l, w - r);
    shape.lineTo(-l, -w + r);
    shape.quadraticCurveTo(-l, -w, -l + r, -w);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
  }, []);

  return (
    <group ref={groupRef} position={[0, WHEEL_RADIUS, 0]}>
      {/* Chassis */}
      <mesh geometry={chassisGeo} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1e88e5" roughness={0.35} metalness={0.1} />
      </mesh>

      {/* Battery pack */}
      <mesh position={[0.025, 0.025, 0]}>
        <boxGeometry args={[0.05, 0.018, 0.04]} />
        <meshStandardMaterial color="#333333" roughness={0.7} />
      </mesh>

      {/* MCU board */}
      <mesh position={[-0.035, 0.022, 0]}>
        <boxGeometry args={[0.05, 0.008, 0.06]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.5} />
      </mesh>
      <mesh position={[-0.035, 0.028, 0]}>
        <boxGeometry args={[0.012, 0.003, 0.012]} />
        <meshStandardMaterial color="#111111" roughness={0.3} />
      </mesh>
      <mesh position={[-0.062, 0.024, 0]}>
        <boxGeometry args={[0.008, 0.005, 0.01]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Motors */}
      <MotorBlock position={[AXLE_FRONT_X, -0.005, -AXLE_HALF_SPAN + 0.005]} />
      <MotorBlock position={[AXLE_FRONT_X, -0.005, AXLE_HALF_SPAN - 0.005]} />

      {/* Ultrasonic sensor at front */}
      <UltrasonicSensor position={[0.1, 0.018, 0]} />

      {/* Axle rods (along Z) */}
      <mesh position={[AXLE_FRONT_X, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, AXLE_HALF_SPAN * 2 + WHEEL_WIDTH * 2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[AXLE_REAR_X, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, AXLE_HALF_SPAN * 2 + WHEEL_WIDTH * 2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/*
        Each wheel wrapper:
        1. Positioned at the axle end
        2. Rotated [PI/2, 0, 0] so the cylinder (default Y axis) now points along Z (the axle)
        3. Inner ref group rotates around Y (the spin axis, which after parent rotation becomes Z world)
      */}
      <group position={[AXLE_FRONT_X, -0.005, -AXLE_HALF_SPAN - WHEEL_WIDTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelFLRef}><Wheel /></group>
      </group>
      <group position={[AXLE_FRONT_X, -0.005, AXLE_HALF_SPAN + WHEEL_WIDTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelFRRef}><Wheel /></group>
      </group>
      <group position={[AXLE_REAR_X, -0.005, -AXLE_HALF_SPAN - WHEEL_WIDTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelRLRef}><Wheel /></group>
      </group>
      <group position={[AXLE_REAR_X, -0.005, AXLE_HALF_SPAN + WHEEL_WIDTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelRRRef}><Wheel /></group>
      </group>
    </group>
  );
}
