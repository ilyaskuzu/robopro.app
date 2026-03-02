import { describe, it, expect } from 'vitest';
import { ElectricalEngine } from '../../core/physics/ElectricalEngine';

describe('ElectricalEngine — Current Limiting', () => {
  const engine = new ElectricalEngine();

  const motorStall = {
    backEmfConstant: 0.2,
    armatureResistance: 2,
    angularVelocity: 0,
  };

  it('without limit, current is unclamped', () => {
    const state = engine.computeState(7.4, 0.1, 1.4, [motorStall]);
    // Expected current: (7.4 - 1.4) / 2 = 3.0 A
    expect(state.motorCurrents[0]).toBeCloseTo(3.0, 2);
    expect(state.currentLimited).toBe(false);
  });

  it('with limit of 2A, stall current is clamped', () => {
    const state = engine.computeState(7.4, 0.1, 1.4, [motorStall], 2.0);
    expect(state.motorCurrents[0]).toBe(2.0);
    expect(state.currentLimited).toBe(true);
  });

  it('limit does not affect motors below threshold', () => {
    const motorSlow = {
      backEmfConstant: 0.2,
      armatureResistance: 20, // very high R → low current
      angularVelocity: 0,
    };
    const state = engine.computeState(7.4, 0.1, 1.4, [motorSlow], 2.0);
    // Expected: (7.4-1.4)/20 = 0.3 A — well below 2A limit
    expect(state.motorCurrents[0]).toBeCloseTo(0.3, 2);
    expect(state.currentLimited).toBe(false);
  });

  it('limits each motor independently', () => {
    const state = engine.computeState(7.4, 0.1, 1.4, [motorStall, motorStall], 2.0);
    expect(state.motorCurrents[0]).toBe(2.0);
    expect(state.motorCurrents[1]).toBe(2.0);
    expect(state.totalCurrent).toBe(4.0);
    expect(state.currentLimited).toBe(true);
  });

  it('voltage sag is reduced when current is limited', () => {
    const unlimited = engine.computeState(7.4, 0.5, 1.4, [motorStall, motorStall]);
    const limited = engine.computeState(7.4, 0.5, 1.4, [motorStall, motorStall], 1.0);
    // Limited total current = 2A, unlimited = 6A
    // Voltage sag = I * R(internal), so limited has higher supply voltage
    expect(limited.supplyVoltage).toBeGreaterThan(unlimited.supplyVoltage);
  });

  it('currentLimited field in response', () => {
    const state = engine.computeState(7.4, 0.1, 1.4, [], 2.0);
    expect(state.currentLimited).toBe(false); // no motors, no limiting
  });

  it('zero current motors are not limited', () => {
    const offMotor = { backEmfConstant: 0.2, armatureResistance: 0, angularVelocity: 0 };
    const state = engine.computeState(7.4, 0.1, 1.4, [offMotor], 2.0);
    expect(state.motorCurrents[0]).toBe(0);
    expect(state.currentLimited).toBe(false);
  });
});
