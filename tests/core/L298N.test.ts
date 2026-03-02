import { describe, it, expect } from 'vitest';
import { L298N } from '../../core/components/drivers/L298N';

describe('L298N', () => {
  it('forward: IN1=H IN2=L ENA=1 -> positive', () => { const d = new L298N('d1'); const o = d.tick(1 / 60, { ENA: 1, IN1: 1, IN2: 0, ENB: 0, IN3: 0, IN4: 0 }); expect(o['OUT_A']).toBeGreaterThan(0); expect(o['DIR_A']).toBe(1); });
  it('reverse: IN1=L IN2=H -> negative', () => { const d = new L298N('d1'); const o = d.tick(1 / 60, { ENA: 1, IN1: 0, IN2: 1, ENB: 0, IN3: 0, IN4: 0 }); expect(o['OUT_A']).toBeLessThan(0); expect(o['DIR_A']).toBe(-1); });
  it('brake: both HIGH -> zero', () => { const d = new L298N('d1'); const o = d.tick(1 / 60, { ENA: 1, IN1: 1, IN2: 1, ENB: 0, IN3: 0, IN4: 0 }); expect(o['OUT_A']).toBe(0); });
  it('coast: both LOW -> zero', () => { const d = new L298N('d1'); const o = d.tick(1 / 60, { ENA: 1, IN1: 0, IN2: 0, ENB: 0, IN3: 0, IN4: 0 }); expect(o['OUT_A']).toBe(0); });
  it('PWM scaling', () => { const d = new L298N('d1'); const o = d.tick(1 / 60, { ENA: 0.5, IN1: 1, IN2: 0, ENB: 0, IN3: 0, IN4: 0 }); expect(o['OUT_A']).toBeCloseTo(0.5); });
  it('channel B independent', () => { const d = new L298N('d1'); const o = d.tick(1 / 60, { ENA: 0, IN1: 0, IN2: 0, ENB: 1, IN3: 1, IN4: 0 }); expect(o['OUT_A']).toBe(0); expect(o['OUT_B']).toBeGreaterThan(0); });
  it('getChannels returns 2', () => { const d = new L298N('d1'); d.tick(1 / 60, { ENA: 1, IN1: 1, IN2: 0, ENB: 0.7, IN3: 0, IN4: 1 }); expect(d.getChannels()).toHaveLength(2); expect(d.getChannels()[0].direction).toBe(1); expect(d.getChannels()[1].direction).toBe(-1); });
  it('reset clears channels', () => { const d = new L298N('d1'); d.tick(1 / 60, { ENA: 1, IN1: 1, IN2: 0, ENB: 1, IN3: 1, IN4: 0 }); d.reset(); expect(d.getChannels()[0].speed).toBe(0); });
});
