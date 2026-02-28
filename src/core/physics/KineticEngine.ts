import type { IKineticEngine, IMotorSpec, ILoadSpec, IEnvironment, IKineticState } from './interfaces/IKineticEngine';
const RPM_TO_RAD_S = Math.PI / 30;
const STICTION_THRESHOLD = 0.01;
export class KineticEngine implements IKineticEngine {
  step(supplyVoltage: number, dutyCycle: number, direction: 1 | -1 | 0, motor: IMotorSpec, load: ILoadSpec, env: IEnvironment, currentState: IKineticState): IKineticState {
    if (direction === 0 || dutyCycle === 0) return this.coastStep(load, env, currentState);
    const eV = supplyVoltage * dutyCycle, vR = eV / motor.nominalVoltage;
    const sT = motor.stallTorque * vR, nO = motor.noLoadRpm * RPM_TO_RAD_S * vR;
    let mT = nO === 0 ? 0 : Math.max(0, sT * (1 - Math.abs(currentState.angularVelocity) / nO));
    const I = load.mass * load.wheelRadius * load.wheelRadius, nF = load.mass * env.gravity;
    const fT = this.friction(currentState.angularVelocity, mT * direction, nF, load);
    const net = mT * direction - fT, a = I > 0 ? net / I : 0;
    const w = currentState.angularVelocity + a * env.dt, v = w * load.wheelRadius;
    const x = currentState.displacement + v * env.dt;
    const bE = motor.backEmfConstant * Math.abs(w);
    const mC = motor.armatureResistance > 0 ? Math.max(0, (eV - bE) / motor.armatureResistance) : 0;
    return { angularVelocity: w, linearVelocity: v, displacement: x, acceleration: a * load.wheelRadius, netTorque: net, motorCurrent: mC };
  }
  createInitialState(): IKineticState { return { angularVelocity: 0, linearVelocity: 0, displacement: 0, acceleration: 0, netTorque: 0, motorCurrent: 0 }; }
  private coastStep(load: ILoadSpec, env: IEnvironment, s: IKineticState): IKineticState {
    if (Math.abs(s.angularVelocity) < STICTION_THRESHOLD) return { ...s, angularVelocity: 0, linearVelocity: 0, acceleration: 0, netTorque: 0, motorCurrent: 0 };
    const nF = load.mass * env.gravity, fT = load.kineticFrictionCoeff * nF * load.wheelRadius * Math.sign(s.angularVelocity);
    const I = load.mass * load.wheelRadius * load.wheelRadius, a = I > 0 ? -fT / I : 0;
    let w = s.angularVelocity + a * env.dt; if (Math.sign(w) !== Math.sign(s.angularVelocity)) w = 0;
    const v = w * load.wheelRadius, x = s.displacement + v * env.dt;
    return { angularVelocity: w, linearVelocity: v, displacement: x, acceleration: a * load.wheelRadius, netTorque: -fT, motorCurrent: 0 };
  }
  private friction(w: number, aT: number, nF: number, l: ILoadSpec): number {
    const sF = l.staticFrictionCoeff * nF * l.wheelRadius, kF = l.kineticFrictionCoeff * nF * l.wheelRadius;
    if (Math.abs(w) < STICTION_THRESHOLD) return Math.abs(aT) <= sF ? aT : sF * Math.sign(aT);
    return kF * Math.sign(w);
  }
}
