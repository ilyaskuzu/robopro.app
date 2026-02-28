import type { IMicrocontroller } from '../mcu/interfaces/IMicrocontroller';
import type { IComponent, PinValueMap } from '../components/interfaces/IComponent';
import type { WiringGraph } from './WiringGraph';
export class SignalBus {
  routeSignals(mcu: IMicrocontroller, components: Map<string, IComponent>, wiring: WiringGraph, dt: number): Map<string, PinValueMap> {
    const out = new Map<string, PinValueMap>();
    for (const [cid, comp] of components) {
      const conns = wiring.getConnectionsForComponent(cid); const inp: PinValueMap = {};
      for (const cn of conns) { const pin = mcu.getPin(cn.mcuPinIndex); const m = comp.pinManifest.find(x => x.name === cn.componentPinName); if (m && (m.direction === 'input' || m.direction === 'bidirectional')) inp[cn.componentPinName] = pin.mode === 'pwm' ? pin.pwmDutyCycle : pin.value; }
      const outputs = comp.tick(dt, inp); out.set(cid, outputs);
      for (const cn of conns) { const m = comp.pinManifest.find(x => x.name === cn.componentPinName); if (m && (m.direction === 'output' || m.direction === 'bidirectional')) { const v = outputs[cn.componentPinName]; if (v !== undefined) mcu.writePin(cn.mcuPinIndex, v); } }
    }
    return out;
  }
}
