import { describe, it, expect } from 'vitest';
import { DcMotor, type DcMotorSpecs } from '../../core/components/motors/DcMotor';

/* ------------------------------------------------------------------ */
/*  Motor specs                                                        */
/* ------------------------------------------------------------------ */

/** Un-geared motor: high RPM, low torque */
const UNGEARED: DcMotorSpecs = {
  stallTorque: 0.01,
  noLoadRpm: 10000,
  nominalVoltage: 6,
  armatureResistance: 2,
  gearRatio: 1,
};

/** Same motor with 48:1 gearbox */
const GEARED_48: DcMotorSpecs = {
  ...UNGEARED,
  gearRatio: 48,
};

/** Same motor with 100:1 gearbox */
const GEARED_100: DcMotorSpecs = {
  ...UNGEARED,
  gearRatio: 100,
};

/* ------------------------------------------------------------------ */
/*  Gear ratio tests                                                   */
/* ------------------------------------------------------------------ */

describe('DcMotor — Gear Ratio', () => {
  it('ungeared motor: output torque equals motor torque', () => {
    const m = new DcMotor('m', UNGEARED);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    // At stall (omega=0): torque = stallTorque * gearRatio = 0.01 * 1
    expect(m.getOutput().torque).toBeCloseTo(0.01, 4);
  });

  it('48:1 gear multiplies output torque by 48', () => {
    const m = new DcMotor('m', GEARED_48);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    // stallTorque * gearRatio = 0.01 * 48 = 0.48
    expect(m.getOutput().torque).toBeCloseTo(0.48, 4);
  });

  it('100:1 gear multiplies output torque by 100', () => {
    const m = new DcMotor('m', GEARED_100);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    expect(m.getOutput().torque).toBeCloseTo(1.0, 4);
  });

  it('higher gear ratio reduces output shaft speed', () => {
    // With gearRatio, output omega = motor omega / G
    // If we set the same output angular velocity, the motor shaft spins faster
    const mUng = new DcMotor('m1', UNGEARED);
    const mGeared = new DcMotor('m2', GEARED_48);

    const outputOmega = 5; // rad/s output shaft
    mUng.setAngularVelocity(outputOmega);
    mGeared.setAngularVelocity(outputOmega);

    // Motor shaft speed: outputOmega * gearRatio
    expect(mUng.getMotorShaftSpeed()).toBeCloseTo(5, 4);
    expect(mGeared.getMotorShaftSpeed()).toBeCloseTo(5 * 48, 1);
  });

  it('torque decreases as output speed approaches no-load speed / gearRatio', () => {
    const m = new DcMotor('m', GEARED_48);

    // At stall
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    const tStall = m.getOutput().torque;

    // At moderate speed
    m.setAngularVelocity(5); // output shaft at 5 rad/s → motor at 240 rad/s
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    const tMid = m.getOutput().torque;

    expect(tStall).toBeGreaterThan(tMid);
    expect(tMid).toBeGreaterThan(0);
  });

  it('partial power with gear ratio scales both torque and speed', () => {
    const m = new DcMotor('m', GEARED_48);
    m.tick(1 / 60, { POWER: 0.5, DIRECTION: 1 });
    // At stall with 50% power: stallTorque * 0.5 * gearRatio = 0.01 * 0.5 * 48 = 0.24
    expect(m.getOutput().torque).toBeCloseTo(0.24, 4);
  });

  it('default gearRatio is 1 when not specified', () => {
    const specs: DcMotorSpecs = {
      stallTorque: 0.05,
      noLoadRpm: 200,
      nominalVoltage: 6,
      armatureResistance: 7.5,
    };
    const m = new DcMotor('m', specs);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    expect(m.getOutput().torque).toBeCloseTo(0.05, 4);
  });
});

/* ------------------------------------------------------------------ */
/*  Rotor inertia tests                                                */
/* ------------------------------------------------------------------ */

describe('DcMotor — Rotor Inertia', () => {
  const WITH_INERTIA: DcMotorSpecs = {
    stallTorque: 0.01,
    noLoadRpm: 10000,
    nominalVoltage: 6,
    armatureResistance: 2,
    gearRatio: 1,
    rotorInertia: 0.0001, // kg·m²
    viscousFriction: 0.0001,
  };

  const NO_INERTIA: DcMotorSpecs = {
    stallTorque: 0.01,
    noLoadRpm: 10000,
    nominalVoltage: 6,
    armatureResistance: 2,
    gearRatio: 1,
  };

  it('motor with inertia has same stall torque at t=0', () => {
    const m = new DcMotor('m', WITH_INERTIA);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    // Should still produce torque at stall
    expect(m.getOutput().torque).toBeGreaterThan(0);
  });

  it('motor without inertia responds instantly', () => {
    const m = new DcMotor('m', NO_INERTIA);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    expect(m.getOutput().torque).toBeCloseTo(0.01, 4);
    m.tick(1 / 60, { POWER: 0, DIRECTION: 1 });
    expect(m.getOutput().torque).toBe(0);
  });

  it('reset clears motor shaft speed', () => {
    const m = new DcMotor('m', WITH_INERTIA);
    m.setAngularVelocity(10);
    m.tick(1 / 60, { POWER: 1, DIRECTION: 1 });
    m.reset();
    expect(m.getOutput().angularVelocity).toBe(0);
    expect(m.getMotorShaftSpeed()).toBe(0);
  });
});
