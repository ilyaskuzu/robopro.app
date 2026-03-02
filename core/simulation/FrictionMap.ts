/**
 * Spatial friction zone system.
 *
 * Each zone defines a region with a specific surface friction coefficient.
 * The car's effective mu is determined by querying its position against these zones.
 */

export interface FrictionZone {
  readonly id: string;
  readonly shape: 'rect' | 'circle';
  /** Center X in world units */
  readonly x: number;
  /** Center Z in world units */
  readonly z: number;
  /** Width (rect only) */
  readonly width?: number;
  /** Height/depth (rect only) */
  readonly height?: number;
  /** Radius (circle only) */
  readonly radius?: number;
  /** Surface friction coefficient */
  readonly friction: number;
  /** Display label */
  readonly label: string;
  /** Priority — higher overrides lower when overlapping */
  readonly priority: number;
}

/**
 * Named friction presets from real-world surfaces.
 */
export const FRICTION_MATERIALS: Record<string, number> = {
  concrete: 0.8,
  wood: 0.4,
  carpet: 1.2,
  ice: 0.05,
  sand: 0.6,
  'rubber-mat': 1.5,
  metal: 0.3,
  grass: 0.5,
} as const;

export class FrictionMap {
  private zones: FrictionZone[] = [];
  private defaultFriction: number;

  constructor(defaultFriction = 0.8) {
    this.defaultFriction = defaultFriction;
  }

  addZone(zone: FrictionZone): void {
    this.zones.push(zone);
    // Keep sorted by priority (ascending) so highest-priority wins last
    this.zones.sort((a, b) => a.priority - b.priority);
  }

  removeZone(id: string): void {
    this.zones = this.zones.filter(z => z.id !== id);
  }

  getZones(): readonly FrictionZone[] {
    return this.zones;
  }

  clear(): void {
    this.zones = [];
  }

  /**
   * Get the effective friction coefficient at position (x, z).
   * Returns the highest-priority zone's friction, or default if no zone covers the point.
   */
  getFriction(x: number, z: number): number {
    let result = this.defaultFriction;

    for (const zone of this.zones) {
      if (this.isInsideZone(zone, x, z)) {
        result = zone.friction; // last one wins (highest priority due to sorting)
      }
    }

    return result;
  }

  private isInsideZone(zone: FrictionZone, x: number, z: number): boolean {
    if (zone.shape === 'rect') {
      const w = zone.width ?? 0;
      const h = zone.height ?? 0;
      return (
        x >= zone.x - w / 2 &&
        x <= zone.x + w / 2 &&
        z >= zone.z - h / 2 &&
        z <= zone.z + h / 2
      );
    }

    if (zone.shape === 'circle') {
      const r = zone.radius ?? 0;
      const dx = x - zone.x;
      const dz = z - zone.z;
      return dx * dx + dz * dz <= r * r;
    }

    return false;
  }
}
