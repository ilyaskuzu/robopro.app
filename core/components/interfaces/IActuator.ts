import type { IComponent } from './IComponent';
export interface ActuatorOutput { readonly torque: number; readonly angularVelocity: number; readonly direction: 1 | -1 | 0; }
export interface IActuator extends IComponent { getOutput(): ActuatorOutput; }
