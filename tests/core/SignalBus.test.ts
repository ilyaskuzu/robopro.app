import { describe, it, expect } from 'vitest';
import { SignalBus } from '../../src/core/simulation/SignalBus';
import { WiringGraph } from '../../src/core/simulation/WiringGraph';
import type { IComponent, PinManifest, PinValueMap } from '../../src/core/components/interfaces/IComponent';
import type { IMicrocontroller } from '../../src/core/mcu/interfaces/IMicrocontroller';
import type { IPin, IPinListener, PinMode } from '../../src/core/mcu/interfaces/IPin';

class MockPin implements IPin { constructor(public readonly index: number, public readonly name: string, public mode: PinMode = 'output', public value: number = 0, public pwmDutyCycle: number = 0) {} }
class MockMcu implements IMicrocontroller {
  boardName = 'mock'; pins: MockPin[]; serialOutput: string[] = [];
  constructor(pv: Record<number, number>) { this.pins = Object.entries(pv).map(([i, v]) => new MockPin(Number(i), `D${i}`, 'output', v)); }
  loadFirmware(): void {} tick(): void {} reset(): void {}
  getPin(i: number): IPin { return this.pins.find(p => p.index === i) ?? new MockPin(i, `D${i}`); }
  getPinByName(): IPin | undefined { return undefined; }
  writePin(i: number, v: number): void { const p = this.pins.find(x => x.index === i); if (p) p.value = v; }
  addPinListener(_l: IPinListener): void {} removePinListener(_l: IPinListener): void {}
  getSerialOutput(): string { return ''; } clearSerialOutput(): void {}
}
class MockComp implements IComponent {
  lastInputs: PinValueMap = {};
  pinManifest: PinManifest[] = [{ name: 'IN', direction: 'input', signalType: 'digital' }, { name: 'OUT', direction: 'output', signalType: 'digital' }];
  constructor(public readonly id: string) {}
  tick(_dt: number, inputs: PinValueMap): PinValueMap { this.lastInputs = inputs; return { OUT: (inputs['IN'] ?? 0) > 0.5 ? 1 : 0 }; }
  reset(): void {}
}

describe('SignalBus', () => {
  it('routes MCU pin to component input', () => { const bus = new SignalBus(); const mcu = new MockMcu({ 5: 1 }); const c = new MockComp('c1'); const w = new WiringGraph(); w.addConnection(5, 'c1', 'IN'); bus.routeSignals(mcu, new Map([['c1', c]]), w, 1/60); expect(c.lastInputs['IN']).toBe(1); });
  it('routes component output to MCU pin', () => { const bus = new SignalBus(); const mcu = new MockMcu({ 5: 1, 6: 0 }); const c = new MockComp('c1'); const w = new WiringGraph(); w.addConnection(5, 'c1', 'IN'); w.addConnection(6, 'c1', 'OUT'); bus.routeSignals(mcu, new Map([['c1', c]]), w, 1/60); expect(mcu.getPin(6).value).toBe(1); });
  it('handles multiple components', () => { const bus = new SignalBus(); const mcu = new MockMcu({ 3: 1, 4: 0 }); const c1 = new MockComp('c1'), c2 = new MockComp('c2'); const w = new WiringGraph(); w.addConnection(3, 'c1', 'IN'); w.addConnection(4, 'c2', 'IN'); const o = bus.routeSignals(mcu, new Map([['c1', c1], ['c2', c2]]), w, 1/60); expect(o.get('c1')?.['OUT']).toBe(1); expect(o.get('c2')?.['OUT']).toBe(0); });
});
