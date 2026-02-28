import { useRef } from 'react';
import type { Group } from 'three';
import { Chassis } from './Chassis';
import { Axle } from './Axle';
import { Wheel } from './Wheel';
import { MotorModel } from './MotorModel';
import { SensorModel } from './SensorModel';
import { useSimulationStore } from '../../state/useSimulationStore';

const WHEEL_RADIUS = 0.033;
const AXLE_SPACING = 0.15;
const WHEEL_OFFSET = 0.08;

export function RobotCar() {
  const groupRef = useRef<Group>(null);
  const kineticStates = useSimulationStore(s => s.kineticStates);
  const motorLeftState = kineticStates['motor-left'];
  const motorRightState = kineticStates['motor-right'];
  const avgDisplacement = ((motorLeftState?.displacement ?? 0) + (motorRightState?.displacement ?? 0)) / 2;
  const leftWheelRotation = motorLeftState ? motorLeftState.displacement / WHEEL_RADIUS : 0;
  const rightWheelRotation = motorRightState ? motorRightState.displacement / WHEEL_RADIUS : 0;

  return (
    <group ref={groupRef} position={[avgDisplacement, WHEEL_RADIUS, 0]}>
      <Chassis position={[0, 0, 0]}>
        <Axle position={[AXLE_SPACING / 2, 0, 0]}>
          <Wheel position={[-WHEEL_OFFSET, 0, 0]} radius={WHEEL_RADIUS} rotation={leftWheelRotation} />
          <Wheel position={[WHEEL_OFFSET, 0, 0]} radius={WHEEL_RADIUS} rotation={rightWheelRotation} />
        </Axle>
        <Axle position={[-AXLE_SPACING / 2, 0, 0]}>
          <Wheel position={[-WHEEL_OFFSET, 0, 0]} radius={WHEEL_RADIUS} rotation={leftWheelRotation} />
          <Wheel position={[WHEEL_OFFSET, 0, 0]} radius={WHEEL_RADIUS} rotation={rightWheelRotation} />
        </Axle>
        <MotorModel position={[AXLE_SPACING / 2, 0, -0.045]} side="left" />
        <MotorModel position={[AXLE_SPACING / 2, 0, 0.045]} side="right" />
        <SensorModel position={[0.1, 0.02, 0]} type="ultrasonic" />
        <SensorModel position={[0.07, -0.01, -0.025]} type="ir" />
        <SensorModel position={[0.07, -0.01, 0.025]} type="ir" />
      </Chassis>
    </group>
  );
}
