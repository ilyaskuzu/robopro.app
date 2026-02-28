import type { SignalType } from '../../mcu/interfaces/IPin';
export type PinDirection = 'input' | 'output' | 'bidirectional';
export interface PinManifest { readonly name: string; readonly direction: PinDirection; readonly signalType: SignalType; }
export type PinValueMap = Record<string, number>;
export interface IComponent { readonly id: string; readonly pinManifest: PinManifest[]; tick(dt: number, inputs: PinValueMap): PinValueMap; reset(): void; }
