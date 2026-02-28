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
});
