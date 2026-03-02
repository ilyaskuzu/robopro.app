/**
 * Terrain elevation / slope system.
 *
 * Each zone defines a ramp region that gives an elevation delta
 * and slope angle for gravity-based acceleration.
 */

export interface TerrainZone {
  readonly id: string;
  readonly shape: 'ramp';
  /** Center X */
  readonly x: number;
  /** Center Z */
  readonly z: number;
  /** Region width (X axis) */
  readonly width: number;
  /** Region depth (Z axis) */
  readonly depth: number;
  /**
   * Slope direction in radians (heading).
   * 0 = slopes downward along +X, π/2 = slopes downward along +Z, etc.
   */
  readonly slopeDirection: number;
  /** Elevation change across the region (in world units) */
  readonly elevationDelta: number;
  /** Display label */
  readonly label: string;
}

export interface TerrainSample {
  /** Elevation at the queried point */
  readonly elevation: number;
  /** Slope angle in radians (0 = flat, positive = uphill) relative to heading */
  readonly slopeAngle: number;
  /** Gravitational acceleration component along heading (m/s², negative = deceleration uphill) */
  readonly gravityComponent: number;
}

const GRAVITY = 9.81;

export class TerrainMap {
  private zones: TerrainZone[] = [];
  private baseElevation: number;

  constructor(baseElevation = 0) {
    this.baseElevation = baseElevation;
  }

  addZone(zone: TerrainZone): void {
    this.zones.push(zone);
  }

  removeZone(id: string): void {
    this.zones = this.zones.filter(z => z.id !== id);
  }

  getZones(): readonly TerrainZone[] {
    return this.zones;
  }

  clear(): void {
    this.zones = [];
  }

  /**
   * Get elevation at (x, z). Multiple overlapping ramps are additive.
   */
  getElevation(x: number, z: number): number {
    let elevation = this.baseElevation;

    for (const zone of this.zones) {
      if (this.isInsideZone(zone, x, z)) {
        elevation += this.computeZoneElevation(zone, x, z);
      }
    }

    return elevation;
  }

  /**
   * Sample terrain at position (x, z) with vehicle heading.
   * Returns slope angle relative to heading and gravitational component.
   */
  sample(x: number, z: number, heading: number): TerrainSample {
    let elevation = this.baseElevation;
    let totalSlopeX = 0; // gradient in world X
    let totalSlopeZ = 0; // gradient in world Z

    for (const zone of this.zones) {
      if (this.isInsideZone(zone, x, z)) {
        elevation += this.computeZoneElevation(zone, x, z);
        const { gradX, gradZ } = this.computeGradient(zone);
        totalSlopeX += gradX;
        totalSlopeZ += gradZ;
      }
    }

    // Project gradient onto heading direction
    const headingX = Math.cos(heading);
    const headingZ = Math.sin(heading);
    const slopeAlongHeading = totalSlopeX * headingX + totalSlopeZ * headingZ;

    // Slope angle: atan of rise/run
    const slopeAngle = Math.atan(slopeAlongHeading);

    // Gravity component along heading: -g * sin(slopeAngle)
    // Negative when going uphill (decelerates), positive when going downhill
    const gravityComponent = -GRAVITY * Math.sin(slopeAngle);

    return { elevation, slopeAngle, gravityComponent };
  }

  /* ---------- internals ---------- */

  private isInsideZone(zone: TerrainZone, x: number, z: number): boolean {
    return (
      x >= zone.x - zone.width / 2 &&
      x <= zone.x + zone.width / 2 &&
      z >= zone.z - zone.depth / 2 &&
      z <= zone.z + zone.depth / 2
    );
  }

  /**
   * Compute the elevation contribution of a ramp zone at (x, z).
   * The elevation varies linearly from 0 at the "high" edge to elevationDelta at the "low" edge
   * along the slope direction.
   */
  private computeZoneElevation(
    zone: TerrainZone,
    x: number,
    z: number,
  ): number {
    const cos = Math.cos(zone.slopeDirection);
    const sin = Math.sin(zone.slopeDirection);

    // Local offset from zone center
    const localX = x - zone.x;
    const localZ = z - zone.z;

    // Project onto slope direction → displacement along slope
    const projection = localX * cos + localZ * sin;

    // Normalise to [-0.5, 0.5] range based on the ramp extent along slope direction
    const extent =
      Math.abs(cos) * zone.width + Math.abs(sin) * zone.depth;
    if (extent < 1e-9) return 0;

    const t = projection / extent; // [-0.5, 0.5]

    // Elevation is 0 at -0.5, elevationDelta at +0.5
    return zone.elevationDelta * (t + 0.5);
  }

  /**
   * Compute the constant gradient (rise/run) of a ramp zone.
   */
  private computeGradient(zone: TerrainZone): {
    gradX: number;
    gradZ: number;
  } {
    const cos = Math.cos(zone.slopeDirection);
    const sin = Math.sin(zone.slopeDirection);
    const extent =
      Math.abs(cos) * zone.width + Math.abs(sin) * zone.depth;
    if (extent < 1e-9) return { gradX: 0, gradZ: 0 };

    const slope = zone.elevationDelta / extent;
    return {
      gradX: slope * cos,
      gradZ: slope * sin,
    };
  }
}
