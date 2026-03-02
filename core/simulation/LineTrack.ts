/**
 * LineTrack — defines a line pattern on the ground plane for line-following exercises.
 *
 * Stores a polyline (array of (x, z) waypoints) and a line width.
 * Provides getReflectance(x, z) → 0 (on line / dark) or 1 (off line / bright).
 */

export interface TrackPoint {
    readonly x: number;
    readonly z: number;
}

export class LineTrack {
    private points: TrackPoint[] = [];
    private lineWidth: number;

    constructor(lineWidth: number = 0.02) {
        this.lineWidth = lineWidth;
    }

    setPoints(points: TrackPoint[]): void {
        this.points = [...points];
    }

    getPoints(): ReadonlyArray<TrackPoint> {
        return this.points;
    }

    getLineWidth(): number {
        return this.lineWidth;
    }

    setLineWidth(width: number): void {
        this.lineWidth = Math.max(0.001, width);
    }

    clear(): void {
        this.points = [];
    }

    /**
     * Returns the surface reflectance at point (x, z):
     * - 0.0 = on the line (dark / low reflectance)
     * - 1.0 = off the line (bright / high reflectance)
     *
     * Uses point-to-line-segment distance for each segment of the polyline.
     * If the shortest distance is within lineWidth/2, returns 0 (on line).
     */
    getReflectance(x: number, z: number): number {
        if (this.points.length < 2) return 1.0;

        const halfWidth = this.lineWidth / 2;
        let minDist = Infinity;

        for (let i = 0; i < this.points.length - 1; i++) {
            const dist = this.pointToSegmentDistance(
                x, z,
                this.points[i].x, this.points[i].z,
                this.points[i + 1].x, this.points[i + 1].z,
            );
            if (dist < minDist) minDist = dist;
        }

        return minDist <= halfWidth ? 0.0 : 1.0;
    }

    /**
     * Distance from point (px, pz) to line segment (ax, az)–(bx, bz).
     */
    private pointToSegmentDistance(
        px: number, pz: number,
        ax: number, az: number,
        bx: number, bz: number,
    ): number {
        const abx = bx - ax;
        const abz = bz - az;
        const apx = px - ax;
        const apz = pz - az;

        const ab2 = abx * abx + abz * abz;
        if (ab2 === 0) {
            // Degenerate segment (point)
            return Math.sqrt(apx * apx + apz * apz);
        }

        let t = (apx * abx + apz * abz) / ab2;
        t = Math.max(0, Math.min(1, t));

        const closestX = ax + t * abx;
        const closestZ = az + t * abz;

        const dx = px - closestX;
        const dz = pz - closestZ;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
