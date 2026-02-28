import { describe, it, expect } from 'vitest';
import { DcMotor, TT_MOTOR_6V } from '../../src/core/components/motors/DcMotor';

describe('DcMotor', () => {
  it('produces torque when powered', () => { const m = new DcMotor('m1', TT_MOTOR_6V); m.tick(1/60, { POWER: 1, DIRECTION: 1 }); expect(m.getOutput().torque).toBeGreaterThan(0); expect(m.getOutput().direction).toBe(1); });
  it('zero torque when power=0', () => { const m = new DcMotor('m1', TT_MOTOR_6V); m.tick(1/60, { POWER: 0, DIRECTION: 1 }); expect(m.getOutput().torque).toBe(0); });
  it('torque decreases with speed', () => { const m = new DcMotor('m1', TT_MOTOR_6V); m.tick(1/60, { POWER: 1, DIRECTION: 1 }); const t0 = m.getOutput().torque; m.setAngularVelocity(10); m.tick(1/60, { POWER: 1, DIRECTION: 1 }); expect(m.getOutput().torque).toBeLessThan(t0); });
  it('stall torque matches spec', () => { const m = new DcMotor('m1', TT_MOTOR_6V); m.tick(1/60, { POWER: 1, DIRECTION: 1 }); expect(m.getOutput().torque).toBeCloseTo(TT_MOTOR_6V.stallTorque, 3); });
  it('resets to zero', () => { const m = new DcMotor('m1', TT_MOTOR_6V); m.tick(1/60, { POWER: 1, DIRECTION: 1 }); m.reset(); const o = m.getOutput(); expect(o.torque).toBe(0); expect(o.angularVelocity).toBe(0); });
});
