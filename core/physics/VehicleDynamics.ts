import type { RigidBodyState, VehicleSpec, WheelAngularSpeeds } from './interfaces/IVehicleBody';

const GRAVITY_DEFAULT = 9.81;

/**
 * Optional callback used to query spatially-varying friction at the car's position.
 * If provided, this overrides the spec's tireFrictionCoeff for each step.
 */
export type FrictionQueryFn = (x: number, z: number) => number;

/**
 * Optional callback that returns the gravity component along the heading
 * due to terrain slope (m/s², positive = downhill acceleration).
 */
export type SlopeQueryFn = (x: number, z: number, heading: number) => number;

/**
 * Differential-drive rigid-body dynamics. Single chassis state; wheel speeds
 * follow from rolling constraint. No lateral velocity (non-holonomic).
 */
export class VehicleDynamics {
  private state: MutableRigidBodyState;
  private readonly spec: VehicleSpec;
  private frictionQuery: FrictionQueryFn | null = null;
  private slopeQuery: SlopeQueryFn | null = null;

  constructor(spec: VehicleSpec) {
    this.spec = spec;
    this.state = {
      x: 0,
      z: 0,
      theta: 0,
      v: 0,
      omega: 0,
      wheelAngleLeft: 0,
      wheelAngleRight: 0,
    };
  }

  /** Set a spatial friction query (e.g. from FrictionMap). Pass null to use spec default. */
  setFrictionQuery(fn: FrictionQueryFn | null): void {
    this.frictionQuery = fn;
  }

  /** Set a terrain slope query (e.g. from TerrainMap). Pass null for flat terrain. */
  setSlopeQuery(fn: SlopeQueryFn | null): void {
    this.slopeQuery = fn;
  }

  getState(): RigidBodyState & { wheelAngleLeft: number; wheelAngleRight: number } {
    return { ...this.state };
  }

  /**
   * Wheel angular speeds from rolling-without-slip constraint (rad/s).
   */
  getWheelAngularSpeeds(): WheelAngularSpeeds {
    const { v, omega } = this.state;
    const { wheelRadius, trackWidth } = this.spec;
    const halfTrack = trackWidth / 2;
    return {
      omegaLeft: (v - omega * halfTrack) / wheelRadius,
      omegaRight: (v + omega * halfTrack) / wheelRadius,
    };
  }

  /**
   * Step dynamics: wheel torques (N·m) drive body acceleration.
   * Signed: positive = forward for that side.
   * Rotational damping so that when motors are off, omega decays (car stops turning).
   */
  step(signedTauLeft: number, signedTauRight: number, dt: number): void {
    const { mass, momentOfInertia, wheelRadius, trackWidth, longitudinalDrag = 0, gravity = GRAVITY_DEFAULT } = this.spec;
    const halfTrack = trackWidth / 2;

    const F_left = signedTauLeft / wheelRadius;
    const F_right = signedTauRight / wheelRadius;

    // Friction coefficient: spatial query or spec default
    const mu = this.frictionQuery
      ? this.frictionQuery(this.state.x, this.state.z)
      : (this.spec.tireFrictionCoeff ?? 0.8);

    const nF = mass * gravity * 0.5;
    const wheelSpeeds = this.getWheelAngularSpeeds();
    const vWheelLeft = wheelSpeeds.omegaLeft * wheelRadius;
    const vWheelRight = wheelSpeeds.omegaRight * wheelRadius;

    // Slip ratio: kappa = (v_wheel - v_ground) / max(|v_wheel|, |v_ground|, 0.01)
    const vGround = this.state.v;
    const denom = (v: number) => Math.max(Math.abs(v), Math.abs(vGround), 0.01);
    const kappaLeft = (vWheelLeft - vGround) / denom(vWheelLeft);
    const kappaRight = (vWheelRight - vGround) / denom(vWheelRight);

    // Pacejka-lite: F_tire = mu * normalForce * sin(1.9 * atan(kappa * 10))
    // At kappa≈0 (pure rolling) use simple mu*N cap; otherwise use slip-dependent curve
    const F_maxSimple = mu * nF;
    const pacejkaForce = (kappa: number, normalForce: number) => {
      if (!Number.isFinite(kappa) || Math.abs(kappa) < 0.001) return F_maxSimple;
      return mu * normalForce * Math.sin(1.9 * Math.atan(kappa * 10));
    };
    const F_maxLeft = pacejkaForce(kappaLeft, nF);
    const F_maxRight = pacejkaForce(kappaRight, nF);

    // Clamp requested force to tire limit (Pacejka when slip present, else mu*N)
    const F_leftCapped = Math.max(-Math.abs(F_maxLeft), Math.min(Math.abs(F_maxLeft), F_left));
    const F_rightCapped = Math.max(-Math.abs(F_maxRight), Math.min(Math.abs(F_maxRight), F_right));

    let F_long = F_leftCapped + F_rightCapped;
    F_long -= longitudinalDrag * this.state.v;

    // Add gravity component from terrain slope (positive = downhill)
    if (this.slopeQuery) {
      const gravComponent = this.slopeQuery(this.state.x, this.state.z, this.state.theta);
      F_long += mass * gravComponent;
    }

    const tau = (F_rightCapped - F_leftCapped) * halfTrack;
    const a = mass > 0 ? F_long / mass : 0;
    const rotDamping = this.spec.rotationalDamping ?? 2;
    const alpha = momentOfInertia > 0 ? (tau / momentOfInertia) - rotDamping * this.state.omega : 0;

    this.state.v += a * dt;
    this.state.omega += alpha * dt;

    this.state.x += this.state.v * Math.cos(this.state.theta) * dt;
    this.state.z += this.state.v * Math.sin(this.state.theta) * dt;
    this.state.theta += this.state.omega * dt;

    const { omegaLeft, omegaRight } = this.getWheelAngularSpeeds();
    this.state.wheelAngleLeft += omegaLeft * dt;
    this.state.wheelAngleRight += omegaRight * dt;
  }

  /**
   * Push car out of a wall/obstacle collision and remove inward velocity.
   */
  resolveWallCollision(
    normalX: number,
    normalZ: number,
    surfaceDistance: number,
    carRadius: number,
  ): void {
    const penetration = carRadius - surfaceDistance;
    if (penetration > 0) {
      const pushBack = Math.min(penetration, carRadius);
      this.state.x += normalX * pushBack;
      this.state.z += normalZ * pushBack;
    }

    const hx = Math.cos(this.state.theta);
    const hz = Math.sin(this.state.theta);
    const dotHN = hx * normalX + hz * normalZ;
    const vDotN = this.state.v * dotHN;

    if (vDotN < 0) {
      // Remove inward velocity: v_new = v * (1 - dot²)
      // Head-on (dot=-1) → v=0; glancing (dot≈0) → v unchanged
      this.state.v *= Math.max(0, 1 - dotHN * dotHN);
      this.state.omega *= 0.5;
    }
  }

  reset(): void {
    this.state = {
      x: 0,
      z: 0,
      theta: 0,
      v: 0,
      omega: 0,
      wheelAngleLeft: 0,
      wheelAngleRight: 0,
    };
  }
}

/** Internal mutable state; RigidBodyState uses readonly for snapshots. */
interface MutableRigidBodyState {
  x: number;
  z: number;
  theta: number;
  v: number;
  omega: number;
  wheelAngleLeft: number;
  wheelAngleRight: number;
}
