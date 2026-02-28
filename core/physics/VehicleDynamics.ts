import type { RigidBodyState, VehicleSpec, WheelAngularSpeeds } from './interfaces/IVehicleBody';

const GRAVITY_DEFAULT = 9.81;

/**
 * Differential-drive rigid-body dynamics. Single chassis state; wheel speeds
 * follow from rolling constraint. No lateral velocity (non-holonomic).
 */
export class VehicleDynamics {
  private state: MutableRigidBodyState;
  private readonly spec: VehicleSpec;

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

    const nF = mass * gravity * 0.5;
    const mu = 0.8;
    const F_max = mu * nF;
    const F_leftCapped = Math.max(-F_max, Math.min(F_max, F_left));
    const F_rightCapped = Math.max(-F_max, Math.min(F_max, F_right));

    let F_long = F_leftCapped + F_rightCapped;
    F_long -= longitudinalDrag * this.state.v;

    const tau = (F_rightCapped - F_leftCapped) * halfTrack;
    const a = mass > 0 ? F_long / mass : 0;
    const rotationalDamping = 2; // 1/s so omega decays in ~1s when motors off
    const alpha = momentOfInertia > 0 ? (tau / momentOfInertia) - rotationalDamping * this.state.omega : 0;

    this.state.v += a * dt;
    this.state.omega += alpha * dt;

    this.state.x += this.state.v * Math.cos(this.state.theta) * dt;
    this.state.z += this.state.v * Math.sin(this.state.theta) * dt;
    this.state.theta += this.state.omega * dt;

    const { omegaLeft, omegaRight } = this.getWheelAngularSpeeds();
    this.state.wheelAngleLeft += omegaLeft * dt;
    this.state.wheelAngleRight += omegaRight * dt;
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

interface MutableRigidBodyState extends RigidBodyState {
  wheelAngleLeft: number;
  wheelAngleRight: number;
}
