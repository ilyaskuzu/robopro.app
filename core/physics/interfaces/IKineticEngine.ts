export interface IMotorSpec { readonly stallTorque: number; readonly noLoadRpm: number; readonly nominalVoltage: number; readonly armatureResistance: number; readonly backEmfConstant: number; }
export interface ILoadSpec { readonly mass: number; readonly wheelRadius: number; readonly staticFrictionCoeff: number; readonly kineticFrictionCoeff: number; }
export interface IEnvironment { readonly gravity: number; readonly dt: number; }
export interface IKineticState { readonly angularVelocity: number; readonly linearVelocity: number; readonly displacement: number; readonly acceleration: number; readonly netTorque: number; readonly motorCurrent: number; }
export interface IKineticEngine { step(supplyVoltage: number, dutyCycle: number, direction: 1 | -1 | 0, motor: IMotorSpec, load: ILoadSpec, env: IEnvironment, currentState: IKineticState): IKineticState; createInitialState(): IKineticState; }
