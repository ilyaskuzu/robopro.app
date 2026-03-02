import { describe, it, expect } from 'vitest';
import { VehicleDynamics } from '../../core/physics/VehicleDynamics';
import type { VehicleSpec } from '../../core/physics/interfaces/IVehicleBody';

const SPEC: VehicleSpec = {
  mass: 0.3,
  momentOfInertia: 0.001,
  wheelRadius: 0.033,
  trackWidth: 0.13,
  longitudinalDrag: 0.05,
  gravity: 9.81,
};

describe('VehicleDynamics', () => {
  it('creates state at rest', () => {
    const v = new VehicleDynamics(SPEC);
    const s = v.getState();
    expect(s.x).toBe(0);
    expect(s.z).toBe(0);
    expect(s.theta).toBe(0);
    expect(s.v).toBe(0);
    expect(s.omega).toBe(0);
    expect(s.wheelAngleLeft).toBe(0);
    expect(s.wheelAngleRight).toBe(0);
  });

  it('symmetric forward thrust gives no rotation', () => {
    const v = new VehicleDynamics(SPEC);
    const tau = 0.01;
    for (let i = 0; i < 60; i++) {
      v.step(tau, tau, 1 / 60);
    }
    const s = v.getState();
    expect(s.omega).toBeCloseTo(0, 5);
    expect(s.v).toBeGreaterThan(0);
    expect(s.x).toBeGreaterThan(0);
    expect(s.z).toBeCloseTo(0, 5);
  });

  it('asymmetric thrust produces rotation', () => {
    const v = new VehicleDynamics(SPEC);
    for (let i = 0; i < 120; i++) {
      v.step(0.01, -0.01, 1 / 60);
    }
    const s = v.getState();
    expect(Math.abs(s.omega)).toBeGreaterThan(0);
    expect(Math.abs(s.theta)).toBeGreaterThan(0);
  });

  it('getWheelAngularSpeeds matches rolling constraint', () => {
    const v = new VehicleDynamics(SPEC);
    v.step(0.01, 0.01, 0.1);
    const s = v.getState();
    const w = v.getWheelAngularSpeeds();
    const halfTrack = SPEC.trackWidth / 2;
    const expectedLeft = (s.v - s.omega * halfTrack) / SPEC.wheelRadius;
    const expectedRight = (s.v + s.omega * halfTrack) / SPEC.wheelRadius;
    expect(w.omegaLeft).toBeCloseTo(expectedLeft, 8);
    expect(w.omegaRight).toBeCloseTo(expectedRight, 8);
  });

  it('reset zeros state', () => {
    const v = new VehicleDynamics(SPEC);
    v.step(0.01, 0.01, 1);
    v.reset();
    const s = v.getState();
    expect(s.x).toBe(0);
    expect(s.z).toBe(0);
    expect(s.theta).toBe(0);
    expect(s.v).toBe(0);
    expect(s.omega).toBe(0);
    expect(s.wheelAngleLeft).toBe(0);
    expect(s.wheelAngleRight).toBe(0);
  });

  it('drag reduces forward velocity over time when coasting', () => {
    const v = new VehicleDynamics(SPEC);
    v.step(0.02, 0.02, 0.5);
    const vAfterThrust = v.getState().v;
    for (let i = 0; i < 120; i++) {
      v.step(0, 0, 1 / 60);
    }
    const s = v.getState();
    expect(s.v).toBeLessThan(vAfterThrust);
    expect(s.v).toBeGreaterThanOrEqual(0);
  });

  it('uses spec tireFrictionCoeff instead of hardcoded 0.8', () => {
    // Very low friction → less achievable force → lower velocity for same torque
    const lowFriction: VehicleSpec = { ...SPEC, tireFrictionCoeff: 0.1 };
    const defaultFriction: VehicleSpec = { ...SPEC, tireFrictionCoeff: 0.8 };
    const vLow = new VehicleDynamics(lowFriction);
    const vDef = new VehicleDynamics(defaultFriction);
    const bigTorque = 0.1;
    for (let i = 0; i < 60; i++) {
      vLow.step(bigTorque, bigTorque, 1 / 60);
      vDef.step(bigTorque, bigTorque, 1 / 60);
    }
    // Low friction caps force more → lower velocity
    expect(vLow.getState().v).toBeLessThan(vDef.getState().v);
  });

  it('uses spec rotationalDamping', () => {
    const highDamping: VehicleSpec = { ...SPEC, rotationalDamping: 20 };
    const lowDamping: VehicleSpec = { ...SPEC, rotationalDamping: 0.1 };
    const vHigh = new VehicleDynamics(highDamping);
    const vLow = new VehicleDynamics(lowDamping);
    // Give asymmetric torque then let go
    for (let i = 0; i < 30; i++) {
      vHigh.step(0.01, -0.01, 1 / 60);
      vLow.step(0.01, -0.01, 1 / 60);
    }
    for (let i = 0; i < 60; i++) {
      vHigh.step(0, 0, 1 / 60);
      vLow.step(0, 0, 1 / 60);
    }
    // High damping → omega should be closer to zero
    expect(Math.abs(vHigh.getState().omega)).toBeLessThan(Math.abs(vLow.getState().omega));
  });

  it('setFrictionQuery overrides spec friction', () => {
    const v = new VehicleDynamics(SPEC);
    v.setFrictionQuery(() => 0.01); // Almost no friction
    const bigTorque = 0.1;
    for (let i = 0; i < 60; i++) {
      v.step(bigTorque, bigTorque, 1 / 60);
    }
    const sLow = v.getState().v;

    const v2 = new VehicleDynamics(SPEC);
    v2.setFrictionQuery(() => 1.5); // High friction
    for (let i = 0; i < 60; i++) {
      v2.step(bigTorque, bigTorque, 1 / 60);
    }
    expect(sLow).toBeLessThan(v2.getState().v);
  });

  it('setSlopeQuery adds gravity component', () => {
    const v = new VehicleDynamics(SPEC);
    // Downhill slope → positive gravity component → accelerates
    v.setSlopeQuery(() => 2.0);
    for (let i = 0; i < 60; i++) {
      v.step(0, 0, 1 / 60); // No motor torque
    }
    // Should have moved forward from gravity alone
    expect(v.getState().v).toBeGreaterThan(0);
  });

  it('resolveWallCollision pushes car out and cancels into-wall velocity', () => {
    const v = new VehicleDynamics(SPEC);
    // Drive forward
    for (let i = 0; i < 30; i++) {
      v.step(0.01, 0.01, 1 / 60);
    }
    const before = v.getState();
    expect(before.v).toBeGreaterThan(0);

    // Simulate wall collision: normal pointing in -X, car was heading +X (theta ≈ 0)
    v.resolveWallCollision(-1, 0, -0.01, 0.065);
    const after = v.getState();
    // Car should have been pushed back (-X)
    expect(after.x).toBeLessThan(before.x);
  });
});
