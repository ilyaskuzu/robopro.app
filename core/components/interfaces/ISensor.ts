import type { IComponent } from './IComponent';
export interface SensorEnvironment { readonly distanceToObstacle?: number; readonly surfaceReflectance?: number; readonly wheelAngularVelocity?: number; [key: string]: number | undefined; }
export interface ISensor extends IComponent { setEnvironment(env: SensorEnvironment): void; }
