import type { IPin, IPinListener } from './IPin';

export interface IMicrocontroller {
  readonly boardName: string;
  readonly pins: ReadonlyArray<IPin>;
  readonly serialOutput: string[];
  loadFirmware(hex: Uint8Array): void;
  tick(cpuCycles: number): void;
  reset(): void;
  getPin(index: number): IPin;
  getPinByName(name: string): IPin | undefined;
  writePin(index: number, value: number): void;
  addPinListener(listener: IPinListener): void;
  removePinListener(listener: IPinListener): void;
  getSerialOutput(): string;
  clearSerialOutput(): void;
}
