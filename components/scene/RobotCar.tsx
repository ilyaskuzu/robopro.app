"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";
import { useMcuStore } from "@/lib/stores/useMcuStore";
import { useProjectStore } from "@/lib/stores/useProjectStore";

const SPOKE_COUNT = 5;

/**
 * Wheel built from a cylinder (tire) + disc hub + spokes.
 * Dimensions adapt to the selected motor's wheel radius.
 */
function Wheel({ radius, width }: { radius: number; width: number }) {
  const spokeLen = radius * 0.7;

  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 24]} />
        <meshStandardMaterial color="#263238" roughness={0.9} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[radius - 0.004, radius - 0.004, width + 0.001, 24]} />
        <meshStandardMaterial color="#455a64" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, width + 0.002, 12]} />
        <meshStandardMaterial color="#ffeb3b" metalness={0.3} roughness={0.4} />
      </mesh>
      {Array.from({ length: SPOKE_COUNT }).map((_, i) => {
        const angle = (i / SPOKE_COUNT) * Math.PI * 2;
        const cx = Math.cos(angle) * spokeLen * 0.5;
        const cz = Math.sin(angle) * spokeLen * 0.5;
        return (
          <mesh key={i} position={[cx, 0, cz]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[spokeLen, 0.003, 0.003]} />
            <meshStandardMaterial color="#ffeb3b" metalness={0.3} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function MotorBlock({ position, motorDiameter, motorLength }: {
  position: [number, number, number];
  motorDiameter: number;
  motorLength: number;
}) {
  const r = motorDiameter / 2;
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, motorLength, 12]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, motorLength + 0.008, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function UltrasonicSensorMesh({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.006]}>
        <boxGeometry args={[0.008, 0.012, 0.018]} />
        <meshStandardMaterial color="#1565c0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <cylinderGeometry args={[0.005, 0.005, 0.008, 10]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.012, 0.005]}>
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

  // Dynamic dimensions from project store
  const motorSpec = useProjectStore(s => s.getMotorSpec());
  const batterySpec = useProjectStore(s => s.getBatterySpec());
  const mcuSpec = useProjectStore(s => s.getMcuSpec());
  const driverSpec = useProjectStore(s => s.getDriverSpec());

  // ── Wheel: use the motor's shaft diameter as a proxy for wheel hub,
  //    and scale wheel radius proportional to motor body width.
  //    Catalog width ranges 10–28 mm → wheel radius 25–42 mm.
  const motorWidth = motorSpec?.dimensions[1] ?? 22; // mm
  const motorLen = motorSpec?.dimensions[0] ?? 28;   // mm
  const motorHeight = motorSpec?.dimensions[2] ?? 18; // mm

  const wheelRadius = (20 + motorWidth * 0.8) / 1000; // 25–42 mm scaled to m
  const wheelWidth = Math.max(0.012, motorWidth * 0.6 / 1000); // track with motor

  // ── Motor block dimensions (mm → m) — directly from catalog
  const motorDiameter = Math.max(motorWidth, motorHeight) / 1000;
  const motorLength = motorLen / 1000;

  // ── Chassis auto-sizes around motors
  const axleHalfSpan = 0.055 + motorDiameter / 2;
  const axleFrontX = 0.045 + motorLength / 2;
  const axleRearX = -(0.045 + motorLength / 2);
  const chassisHalfLength = axleFrontX + motorLength / 2 + 0.02;
  const chassisHalfWidth = axleHalfSpan + 0.025;

  // ── Battery box: scales with capacity & voltage
  const battCapMah = batterySpec ? batterySpec.specs.capacityAh * 1000 : 2500;
  const battVoltage = batterySpec?.specs.nominalVoltage ?? 6;
  const battWeight = batterySpec?.weight ?? 100; // grams
  const batteryBoxWidth = 0.02 + battCapMah / 40000;  // 22–82 mm
  const batteryBoxDepth = 0.02 + battWeight / 4000;    // 22–55 mm
  const batteryBoxHeight = 0.012 + battVoltage / 800;  // 13–27 mm

  // ── Driver board: scales with physical dimensions
  const driverDims = driverSpec?.dimensions ?? [43, 43, 27]; // mm
  const driverBoardWidth = driverDims[0] / 1000;
  const driverBoardDepth = driverDims[1] / 1000;
  const driverBoardHeight = Math.max(0.004, driverDims[2] / 2000);

  // ── MCU board: scales with pin count
  const mcuDigitalPins = mcuSpec?.specs.digitalPinCount ?? 14;
  const mcuAnalogPins = mcuSpec?.specs.analogPinCount ?? 6;
  const mcuTotalPins = mcuDigitalPins + mcuAnalogPins;
  const mcuBoardWidth = 0.02 + mcuTotalPins * 0.0015;  // 23–83 mm
  const mcuBoardDepth = 0.03 + mcuDigitalPins * 0.002;  // 33–138 mm

  useFrame(() => {
    const state = useSimulationStore.getState();
    const body = state.rigidBodyState;

    if (groupRef.current) {
      if (body) {
        groupRef.current.position.x = body.x;
        groupRef.current.position.z = body.z;
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
    const w = chassisHalfWidth, l = chassisHalfLength, r = 0.012;
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
  }, [chassisHalfLength, chassisHalfWidth]);

  const isRunning = useSimulationStore((s) => s.isRunning);
  const pinStates = useMcuStore((s) => s.pinStates);
  const pin13 = pinStates.find((p) => p.index === 13);
  // Built-in LED (D13): reflect sketch digitalWrite(13, HIGH/LOW) directly when simulation is running
  const builtInLedOn = Boolean(isRunning && (pin13?.value ?? 0) > 0.5);

  return (
    <group ref={groupRef} position={[0, wheelRadius, 0]}>
      {/* Chassis */}
      <mesh castShadow receiveShadow geometry={chassisGeo} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2196f3" roughness={0.35} metalness={0.1} />
      </mesh>

      {/* Battery pack */}
      <mesh castShadow position={[0.025, 0.025, 0]}>
        <boxGeometry args={[batteryBoxWidth, batteryBoxHeight, batteryBoxDepth]} />
        <meshStandardMaterial color="#4caf50" roughness={0.6} />
      </mesh>

      {/* Driver board */}
      <mesh castShadow position={[0, 0.022, chassisHalfWidth * 0.4]}>
        <boxGeometry args={[driverBoardWidth, driverBoardHeight, driverBoardDepth]} />
        <meshStandardMaterial color="#f44336" roughness={0.5} />
      </mesh>
      {/* Driver heatsink */}
      <mesh castShadow position={[0, 0.022 + driverBoardHeight, chassisHalfWidth * 0.4]}>
        <boxGeometry args={[driverBoardWidth * 0.6, 0.005, driverBoardDepth * 0.6]} />
        <meshStandardMaterial color="#222222" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* MCU board */}
      <mesh castShadow position={[-0.035, 0.022, 0]}>
        <boxGeometry args={[mcuBoardWidth, 0.008, mcuBoardDepth]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.5} />
      </mesh>
      <mesh position={[-0.035, 0.028, 0]}>
        <boxGeometry args={[0.012, 0.003, 0.012]} />
        <meshStandardMaterial color="#111111" roughness={0.3} />
      </mesh>
      {/* Built-in LED (D13) — reflects sketch digitalWrite(13, HIGH/LOW); off when no power or not running */}
      <mesh position={[-0.035, 0.031, 0.008]}>
        <sphereGeometry args={[0.002, 8, 8]} />
        <meshStandardMaterial
          color={builtInLedOn ? "#00e676" : "#333333"}
          emissive={builtInLedOn ? "#00e676" : "#000000"}
          emissiveIntensity={builtInLedOn ? 2.0 : 0}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-0.062, 0.024, 0]}>
        <boxGeometry args={[0.008, 0.005, 0.01]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Antenna flag for personality */}
      <mesh position={[-chassisHalfLength + 0.01, 0.06, 0]}>
        <cylinderGeometry args={[0.001, 0.001, 0.05, 6]} />
        <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-chassisHalfLength + 0.01, 0.085, 0.004]}>
        <boxGeometry args={[0.001, 0.012, 0.01]} />
        <meshStandardMaterial color="#ff5722" roughness={0.5} />
      </mesh>

      {/* Motors */}
      <MotorBlock
        position={[axleFrontX, -0.005, -axleHalfSpan + 0.005]}
        motorDiameter={motorDiameter}
        motorLength={motorLength}
      />
      <MotorBlock
        position={[axleFrontX, -0.005, axleHalfSpan - 0.005]}
        motorDiameter={motorDiameter}
        motorLength={motorLength}
      />

      {/* Ultrasonic sensor at front */}
      <UltrasonicSensorMesh position={[chassisHalfLength + 0.005, 0.018, 0]} />

      {/* Axle rods */}
      <mesh position={[axleFrontX, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, axleHalfSpan * 2 + wheelWidth * 2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[axleRearX, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, axleHalfSpan * 2 + wheelWidth * 2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      <group position={[axleFrontX, -0.005, -axleHalfSpan - wheelWidth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelFLRef}><Wheel radius={wheelRadius} width={wheelWidth} /></group>
      </group>
      <group position={[axleFrontX, -0.005, axleHalfSpan + wheelWidth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelFRRef}><Wheel radius={wheelRadius} width={wheelWidth} /></group>
      </group>
      <group position={[axleRearX, -0.005, -axleHalfSpan - wheelWidth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelRLRef}><Wheel radius={wheelRadius} width={wheelWidth} /></group>
      </group>
      <group position={[axleRearX, -0.005, axleHalfSpan + wheelWidth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={wheelRRRef}><Wheel radius={wheelRadius} width={wheelWidth} /></group>
      </group>
    </group>
  );
}
