import * as CANNON from 'cannon-es';
import type { VehicleSpec, RigidBodyState } from './interfaces/IVehicleBody';
import type { FrictionZone } from '../simulation/FrictionMap';
import type { Wall } from '../simulation/WallWorld';

const GRAVITY_DEFAULT = 9.81;

export interface CannonWorldOptions {
  vehicleSpec: VehicleSpec;
  gravity?: number;
}

export interface Transform {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

export interface ObstacleInput {
  id: string;
  x: number;
  z: number;
  radius: number;
  mass?: number;
}

export class CannonWorld {
  readonly world: CANNON.World;
  private groundBody: CANNON.Body;
  private chassisBody: CANNON.Body;
  private vehicle: CANNON.RaycastVehicle;
  private wallBodies: Map<string, CANNON.Body> = new Map();
  private obstacleBodies: Map<string, CANNON.Body> = new Map();

  private wheelMaterial: CANNON.Material;
  private groundMaterial: CANNON.Material;

  private readonly vehicleSpec: VehicleSpec;
  private readonly halfLength: number;
  private readonly halfWidth: number;
  private readonly halfHeight: number;

  constructor(options: CannonWorldOptions) {
    const { vehicleSpec, gravity = GRAVITY_DEFAULT } = options;
    this.vehicleSpec = vehicleSpec;

    // Derive chassis half-extents from spec
    // momentOfInertia ≈ (1/12) * mass * (L² + W²); assume L ≈ 2 * trackWidth for wheelbase
    const wheelbase = vehicleSpec.trackWidth * 2;
    this.halfLength = wheelbase / 2;
    this.halfWidth = vehicleSpec.trackWidth / 2;
    this.halfHeight = vehicleSpec.wheelRadius;

    // Create world with SAPBroadphase for performance
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -gravity, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Materials
    this.wheelMaterial = new CANNON.Material('wheel');
    this.groundMaterial = new CANNON.Material('ground');

    // Ground plane (y-up, infinite)
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Plane normal = y-up
    this.world.addBody(this.groundBody);

    // Chassis body
    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(this.halfWidth, this.halfHeight, this.halfLength)
    );
    this.chassisBody = new CANNON.Body({
      mass: vehicleSpec.mass,
      material: this.wheelMaterial,
    });
    this.chassisBody.addShape(chassisShape);
    this.chassisBody.position.set(0, this.halfHeight + vehicleSpec.wheelRadius, 0);
    this.world.addBody(this.chassisBody);

    // RaycastVehicle: indexForwardAxis=2 (z), indexRightAxis=0 (x), indexUpAxis=1 (y)
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexForwardAxis: 2,
      indexRightAxis: 0,
      indexUpAxis: 1,
    });

    const baseWheelOpts = {
      radius: vehicleSpec.wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 30,
      suspensionRestLength: vehicleSpec.wheelRadius * 0.5,
      dampingCompression: 0.3,
      dampingRelaxation: 0.5,
      frictionSlip: 2,
      rollInfluence: 0.01,
      maxSuspensionForce: 100000,
      maxSuspensionTravel: 0.3,
      axleLocal: new CANNON.Vec3(0, 0, 1),
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    // Front-left, front-right, rear-left, rear-right (indices 0,1 = front steer, 2,3 = rear drive)
    const hw = this.halfWidth;
    const hh = this.halfHeight;
    const hl = this.halfLength;

    this.vehicle.addWheel({
      ...baseWheelOpts,
      chassisConnectionPointLocal: new CANNON.Vec3(-hw, -hh, hl),
      isFrontWheel: true,
    });
    this.vehicle.addWheel({
      ...baseWheelOpts,
      chassisConnectionPointLocal: new CANNON.Vec3(hw, -hh, hl),
      isFrontWheel: true,
    });
    this.vehicle.addWheel({
      ...baseWheelOpts,
      chassisConnectionPointLocal: new CANNON.Vec3(-hw, -hh, -hl),
      isFrontWheel: false,
    });
    this.vehicle.addWheel({
      ...baseWheelOpts,
      chassisConnectionPointLocal: new CANNON.Vec3(hw, -hh, -hl),
      isFrontWheel: false,
    });

    this.vehicle.addToWorld(this.world);

    // Default contact material
    const defaultFriction = vehicleSpec.tireFrictionCoeff ?? 0.8;
    const cm = new CANNON.ContactMaterial(this.wheelMaterial, this.groundMaterial, {
      friction: defaultFriction,
      restitution: 0,
      contactEquationStiffness: 1000,
    });
    this.world.addContactMaterial(cm);
  }

  syncWalls(walls: Wall[]): void {
    const currentIds = new Set(walls.map((w) => w.id));
    for (const [id, body] of this.wallBodies) {
      if (!currentIds.has(id)) {
        this.world.removeBody(body);
        this.wallBodies.delete(id);
      }
    }
    const existingIds = new Set(this.wallBodies.keys());
    for (const wall of walls) {
      if (existingIds.has(wall.id)) continue;
      const dx = wall.x2 - wall.x1;
      const dz = wall.z2 - wall.z1;
      const len = Math.sqrt(dx * dx + dz * dz) || 0.001;
      const halfLen = len / 2;
      const cx = (wall.x1 + wall.x2) / 2;
      const cz = (wall.z1 + wall.z2) / 2;
      const shape = new CANNON.Box(
        new CANNON.Vec3(halfLen, wall.thickness, wall.thickness)
      );
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(cx, wall.thickness, cz);
      const angle = Math.atan2(dz, dx);
      body.quaternion.setFromEuler(0, -angle, 0);
      this.world.addBody(body);
      this.wallBodies.set(wall.id, body);
    }
  }

  syncObstacles(obstacles: ObstacleInput[]): void {
    const currentIds = new Set(obstacles.map((o) => o.id));
    for (const [id, body] of this.obstacleBodies) {
      if (!currentIds.has(id)) {
        this.world.removeBody(body);
        this.obstacleBodies.delete(id);
      }
    }
    const existingIds = new Set(this.obstacleBodies.keys());
    for (const obs of obstacles) {
      if (existingIds.has(obs.id)) continue;
      const mass = obs.mass ?? 1;
      const height = obs.radius * 2;
      const shape = new CANNON.Cylinder(obs.radius, obs.radius, height, 16);
      const body = new CANNON.Body({ mass });
      body.addShape(shape);
      body.position.set(obs.x, obs.radius, obs.z);
      this.world.addBody(body);
      this.obstacleBodies.set(obs.id, body);
    }
  }

  syncFrictionZones(zones: FrictionZone[]): void {
    const defaultFriction = this.vehicleSpec.tireFrictionCoeff ?? 0.8;
    let friction = defaultFriction;
    if (zones.length > 0) {
      const sorted = [...zones].sort((a, b) => b.priority - a.priority);
      friction = sorted[0].friction;
    }
    const cm = this.world.getContactMaterial(this.wheelMaterial, this.groundMaterial);
    if (cm) {
      cm.friction = friction;
    }
  }

  applyEngineForce(force: number): void {
    this.vehicle.applyEngineForce(force, 2);
    this.vehicle.applyEngineForce(force, 3);
  }

  setSteeringValue(angle: number): void {
    this.vehicle.setSteeringValue(angle, 0);
    this.vehicle.setSteeringValue(angle, 1);
  }

  setBrake(force: number): void {
    for (let i = 0; i < 4; i++) {
      this.vehicle.setBrake(force, i);
    }
  }

  syncFromSimulation(state: RigidBodyState): void {
    this.chassisBody.position.set(state.x, this.halfHeight + this.vehicleSpec.wheelRadius, state.z);
    this.chassisBody.quaternion.setFromEuler(0, state.theta, 0);
    this.chassisBody.velocity.set(
      state.v * Math.cos(state.theta),
      0,
      state.v * Math.sin(state.theta)
    );
    this.chassisBody.angularVelocity.set(0, state.omega, 0);
  }

  step(dt: number): void {
    this.world.step(dt);
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
    }
  }

  private bodyToTransform(body: CANNON.Body): Transform {
    const p = body.position;
    const q = body.quaternion;
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      qx: q.x,
      qy: q.y,
      qz: q.z,
      qw: q.w,
    };
  }

  getChassisTransform(): Transform {
    return this.bodyToTransform(this.chassisBody);
  }

  getWheelTransforms(): Transform[] {
    const out: Transform[] = [];
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      const wt = this.vehicle.wheelInfos[i].worldTransform;
      out.push({
        x: wt.position.x,
        y: wt.position.y,
        z: wt.position.z,
        qx: wt.quaternion.x,
        qy: wt.quaternion.y,
        qz: wt.quaternion.z,
        qw: wt.quaternion.w,
      });
    }
    return out;
  }

  getObstacleTransforms(): Map<string, Transform> {
    const out = new Map<string, Transform>();
    for (const [id, body] of this.obstacleBodies) {
      out.set(id, this.bodyToTransform(body));
    }
    return out;
  }

  raycast(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDist: number
  ): { hit: boolean; distance: number } {
    const from = new CANNON.Vec3(originX, originY, originZ);
    const to = new CANNON.Vec3(
      originX + dirX * maxDist,
      originY + dirY * maxDist,
      originZ + dirZ * maxDist
    );
    const result = new CANNON.RaycastResult();
    const hit = this.world.raycastClosest(from, to, {}, result);
    return {
      hit: hit && result.hasHit,
      distance: hit && result.hasHit ? result.distance : maxDist,
    };
  }

  dispose(): void {
    this.vehicle.removeFromWorld(this.world);
    this.world.removeBody(this.chassisBody);
    this.world.removeBody(this.groundBody);
    for (const body of this.wallBodies.values()) {
      this.world.removeBody(body);
    }
    this.wallBodies.clear();
    for (const body of this.obstacleBodies.values()) {
      this.world.removeBody(body);
    }
    this.obstacleBodies.clear();
  }
}
