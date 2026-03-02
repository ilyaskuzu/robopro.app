import { describe, it, expect } from 'vitest';
import { ElectricalEngine } from '../../core/physics/ElectricalEngine';

describe('ElectricalEngine', () => {
  const e = new ElectricalEngine();
  it('zero current with no motors', () => { const s = e.computeState(7.4, 0.15, 1.4, []); expect(s.totalCurrent).toBe(0); expect(s.supplyVoltage).toBe(7.4); });
  it('computes motor current', () => { const s = e.computeState(7.4, 0.15, 1.4, [{ backEmfConstant: 0.2, armatureResistance: 7.5, angularVelocity: 0 }]); expect(s.motorCurrents[0]).toBeCloseTo((7.4 - 1.4) / 7.5, 4); });
  it('voltage sags under load', () => { const s = e.computeState(7.4, 0.15, 1.4, [{ backEmfConstant: 0.2, armatureResistance: 7.5, angularVelocity: 0 }, { backEmfConstant: 0.2, armatureResistance: 7.5, angularVelocity: 0 }]); expect(s.supplyVoltage).toBeLessThan(7.4); });
  it('back-EMF reduces current', () => { const r = e.computeState(7.4, 0.15, 1.4, [{ backEmfConstant: 0.3, armatureResistance: 7.5, angularVelocity: 0 }]); const s = e.computeState(7.4, 0.15, 1.4, [{ backEmfConstant: 0.3, armatureResistance: 7.5, angularVelocity: 15 }]); expect(s.motorCurrents[0]).toBeLessThan(r.motorCurrents[0]); });
  it('clamps to zero when back-EMF exceeds supply', () => { const s = e.computeState(7.4, 0.15, 1.4, [{ backEmfConstant: 0.3, armatureResistance: 7.5, angularVelocity: 100 }]); expect(s.motorCurrents[0]).toBe(0); });
});
