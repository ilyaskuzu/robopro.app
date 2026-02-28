/**
 * Rigid-body state for a differential-drive vehicle (SI units).
 * Velocity is longitudinal only (non-holonomic).
 */
export interface RigidBodyState {
  readonly x: number;
  readonly z: number;
  readonly theta: number;
  readonly v: number;
  readonly omega: number;
}

/**
 * Vehicle geometry and inertia for VehicleDynamics.
 */
export interface VehicleSpec {
  readonly mass: number;
  readonly momentOfInertia: number;
  readonly wheelRadius: number;
  readonly trackWidth: number;
  readonly longitudinalDrag?: number;
  readonly gravity?: number;
}

export interface WheelAngularSpeeds {
  readonly omegaLeft: number;
  readonly omegaRight: number;
}
