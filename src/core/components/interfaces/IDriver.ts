import type { IComponent, PinValueMap } from './IComponent';
export interface DriverChannel { readonly speed: number; readonly direction: 1 | -1 | 0; readonly enabled: boolean; }
export interface IDriver extends IComponent { getChannels(): DriverChannel[]; tick(dt: number, inputs: PinValueMap): PinValueMap; }
