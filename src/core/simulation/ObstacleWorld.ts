/**
 * ObstacleWorld — simple 2D obstacle model for the simulation ground plane.
 *
 * Stores cylindrical obstacles as (x, z, radius) and provides raycasting
 * to determine distance to the nearest obstacle from a given position/direction.
 */

export interface Obstacle {
    readonly x: number;
    readonly z: number;
    readonly radius: number;
}

export class ObstacleWorld {
    private obstacles: Obstacle[] = [];

    addObstacle(obstacle: Obstacle): void {
        this.obstacles.push(obstacle);
    }

    removeObstacle(index: number): void {
        this.obstacles.splice(index, 1);
    }

    getObstacles(): ReadonlyArray<Obstacle> {
        return this.obstacles;
    }

    clear(): void {
        this.obstacles = [];
    }

    /**
     * Raycast from origin in a given direction (angle in radians, 0 = +X axis).
     * Returns the distance to the nearest obstacle, or maxDist if none found.
     *
     * Uses ray-circle intersection: each obstacle is treated as a circle (x, z, r)
     * on the ground plane.
     */
    raycast(originX: number, originZ: number, directionRad: number, maxDist: number = 4.0): number {
        const dx = Math.cos(directionRad);
        const dz = Math.sin(directionRad);

        let closest = maxDist;

        for (const obs of this.obstacles) {
            // Vector from ray origin to obstacle center
            const fx = originX - obs.x;
            const fz = originZ - obs.z;

            // Quadratic: a*t^2 + b*t + c = 0
            const a = dx * dx + dz * dz; // always 1 for unit direction
            const b = 2 * (fx * dx + fz * dz);
            const c = fx * fx + fz * fz - obs.radius * obs.radius;

            const discriminant = b * b - 4 * a * c;
            if (discriminant < 0) continue;

            const sqrtD = Math.sqrt(discriminant);
            const t1 = (-b - sqrtD) / (2 * a);
            const t2 = (-b + sqrtD) / (2 * a);

            // We want the first positive intersection
            let t = -1;
            if (t1 > 0.001) t = t1;
            else if (t2 > 0.001) t = t2;

            if (t > 0 && t < closest) {
                closest = t;
            }
        }

        return closest;
    }
}
