import { describe, it, expect } from 'vitest';
import { KineticEngine } from '../../src/core/physics/KineticEngine';
import type { IMotorSpec, ILoadSpec, IEnvironment } from '../../src/core/physics/interfaces/IKineticEngine';

const MOTOR: IMotorSpec = { stallTorque: 0.078, noLoadRpm: 200, nominalVoltage: 6, armatureResistance: 7.5, backEmfConstant: 6 / (200 * Math.PI / 30) };
const LOAD: ILoadSpec = { mass: 0.5, wheelRadius: 0.033, staticFrictionCoeff: 0.05, kineticFrictionCoeff: 0.03 };
const ENV: IEnvironment = { gravity: 9.81, dt: 1 / 60 };

describe('KineticEngine', () => {
  const engine = new KineticEngine();
  it('creates initial state at rest', () => { const s = engine.createInitialState(); expect(s.angularVelocity).toBe(0); expect(s.displacement).toBe(0); });
  it('produces positive acceleration when motor torque exceeds friction', () => { const s = engine.createInitialState(); const n = engine.step(6, 1, 1, MOTOR, LOAD, ENV, s); expect(n.angularVelocity).toBeGreaterThan(0); });
  it('stiction prevents motion with heavy load', () => { const hl: ILoadSpec = { ...LOAD, mass: 50, staticFrictionCoeff: 1.0 }; const n = engine.step(0.1, 0.01, 1, MOTOR, hl, ENV, engine.createInitialState()); expect(n.angularVelocity).toBe(0); });
  it('direction=0 coasts to stop', () => { const m = { ...engine.createInitialState(), angularVelocity: 5, linearVelocity: 0.165 }; const n = engine.step(6, 1, 0, MOTOR, LOAD, ENV, m); expect(Math.abs(n.angularVelocity)).toBeLessThan(5); });
  it('integrates displacement over steps', () => { let s = engine.createInitialState(); for (let i = 0; i < 60; i++) s = engine.step(6, 1, 1, MOTOR, LOAD, ENV, s); expect(s.displacement).toBeGreaterThan(0); });
  it('voltage scaling reduces acceleration', () => { const s = engine.createInitialState(); const f = engine.step(6, 1, 1, MOTOR, LOAD, ENV, s); const h = engine.step(3, 1, 1, MOTOR, LOAD, ENV, s); expect(f.acceleration).toBeGreaterThan(h.acceleration); });
  it('is deterministic', () => { const s = engine.createInitialState(); const a = engine.step(6, 0.8, 1, MOTOR, LOAD, ENV, s); const b = engine.step(6, 0.8, 1, MOTOR, LOAD, ENV, s); expect(a).toEqual(b); });
});
