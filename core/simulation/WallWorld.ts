/**
 * Wall / Obstacle collision world.
 *
 * Each wall is a line segment with thickness.
 * The car body is treated as a circle for collision detection.
 */

export interface Wall {
  readonly id: string;
  /** Start X */
  readonly x1: number;
  /** Start Z */
  readonly z1: number;
  /** End X */
  readonly x2: number;
  /** End Z */
  readonly z2: number;
  /** Half-thickness of the wall in world units */
  readonly thickness: number;
  /** Display label */
  readonly label: string;
}

export interface CollisionResult {
  readonly collided: boolean;
  /** Nearest point on wall segment to the query position */
  readonly nearestX: number;
  readonly nearestZ: number;
  /** Distance from query to the nearest wall surface */
  readonly distance: number;
  /** Normal vector pointing away from the wall */
  readonly normalX: number;
  readonly normalZ: number;
}

export interface RaycastHit {
  readonly wallId: string;
  /** Distance from ray origin to intersection */
  readonly distance: number;
  /** Intersection point */
  readonly hitX: number;
  readonly hitZ: number;
}

export class WallWorld {
  private walls: Wall[] = [];

  addWall(wall: Wall): void {
    this.walls.push(wall);
  }

  removeWall(id: string): void {
    this.walls = this.walls.filter(w => w.id !== id);
  }

  getWalls(): readonly Wall[] {
    return this.walls;
  }

  clear(): void {
    this.walls = [];
  }

  /**
   * Check whether a circle at (x, z) with given radius collides with any wall.
   * Returns the closest collision result, or a non-collided result.
   */
  checkCollision(x: number, z: number, radius: number): CollisionResult {
    let closest: CollisionResult = {
      collided: false,
      nearestX: x,
      nearestZ: z,
      distance: Infinity,
      normalX: 0,
      normalZ: 1,
    };

    for (const wall of this.walls) {
      const result = this.segmentCircleTest(wall, x, z, radius);
      // Prefer collided result over non-collided; among collided pick deepest penetration (smallest distance)
      const take =
        result.collided && (!closest.collided || result.distance < closest.distance) ||
        (!result.collided && !closest.collided && result.distance < closest.distance);
      if (take) {
        closest = result;
      }
    }

    return closest;
  }

  /**
   * Cast a ray from (x, z) in direction (dirX, dirZ) and find the nearest wall hit.
   * Direction vector does not need to be normalised.
   * Returns null if no wall is hit within maxDistance.
   */
  raycast(
    x: number,
    z: number,
    dirX: number,
    dirZ: number,
    maxDistance = 400,
  ): RaycastHit | null {
    // Normalise direction
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (len === 0) return null;
    const ndx = dirX / len;
    const ndz = dirZ / len;

    let best: RaycastHit | null = null;

    for (const wall of this.walls) {
      const hit = this.raySegmentIntersect(
        x,
        z,
        ndx,
        ndz,
        wall,
        maxDistance,
      );
      if (hit && (best === null || hit.distance < best.distance)) {
        best = hit;
      }
    }

    return best;
  }

  /* ---------- internals ---------- */

  private segmentCircleTest(
    wall: Wall,
    cx: number,
    cz: number,
    radius: number,
  ): CollisionResult {
    // Closest point on segment to circle center
    const { px, pz } = this.closestPointOnSegment(
      wall.x1,
      wall.z1,
      wall.x2,
      wall.z2,
      cx,
      cz,
    );

    const dx = cx - px;
    const dz = cz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const effectiveRadius = radius + wall.thickness;
    const collided = dist < effectiveRadius;

    // Normal: from wall point toward circle center
    let normalX = 0;
    let normalZ = 1;
    if (dist > 1e-9) {
      normalX = dx / dist;
      normalZ = dz / dist;
    }

    return {
      collided,
      nearestX: px,
      nearestZ: pz,
      distance: dist - wall.thickness, // surface distance
      normalX,
      normalZ,
    };
  }

  private closestPointOnSegment(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    px: number,
    pz: number,
  ): { px: number; pz: number } {
    const abx = bx - ax;
    const abz = bz - az;
    const abLenSq = abx * abx + abz * abz;

    if (abLenSq < 1e-12) {
      return { px: ax, pz: az };
    }

    let t = ((px - ax) * abx + (pz - az) * abz) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    return {
      px: ax + t * abx,
      pz: az + t * abz,
    };
  }

  private raySegmentIntersect(
    ox: number,
    oz: number,
    dx: number,
    dz: number,
    wall: Wall,
    maxDist: number,
  ): RaycastHit | null {
    // Ray: P = O + t*D
    // Segment: Q = A + s*(B-A)
    const ex = wall.x2 - wall.x1;
    const ez = wall.z2 - wall.z1;

    const denom = dx * ez - dz * ex;
    if (Math.abs(denom) < 1e-12) return null; // Parallel

    const sx = wall.x1 - ox;
    const sz = wall.z1 - oz;

    const t = (sx * ez - sz * ex) / denom;
    const s = (sx * dz - sz * dx) / denom;

    if (t < 0 || t > maxDist || s < 0 || s > 1) return null;

    return {
      wallId: wall.id,
      distance: t,
      hitX: ox + t * dx,
      hitZ: oz + t * dz,
    };
  }
}
