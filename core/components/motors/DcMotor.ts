import type { IActuator, ActuatorOutput } from '../interfaces/IActuator';
import type { PinManifest, PinValueMap } from '../interfaces/IComponent';
export interface DcMotorSpecs { readonly stallTorque: number; readonly noLoadRpm: number; readonly nominalVoltage: number; readonly armatureResistance: number; }
const R = Math.PI / 30;
export class DcMotor implements IActuator {
  readonly id: string;
  static readonly PIN_MANIFEST: PinManifest[] = [{ name: 'POWER', direction: 'input', signalType: 'analog' }, { name: 'DIRECTION', direction: 'input', signalType: 'digital' }];
  private readonly nLO: number; private aV = 0; private cT = 0; private cD: 1 | -1 | 0 = 0;
  constructor(id: string, private readonly specs: DcMotorSpecs) { this.id = id; this.nLO = specs.noLoadRpm * R; }
  get pinManifest(): PinManifest[] { return DcMotor.PIN_MANIFEST; }
  tick(_dt: number, inputs: PinValueMap): PinValueMap {
    const pw = inputs['POWER'] ?? 0, ds = inputs['DIRECTION'] ?? 0;
    this.cD = pw === 0 ? 0 : (ds >= 0 ? 1 : -1);
    const vR = Math.abs(pw), eST = this.specs.stallTorque * vR, eNO = this.nLO * vR;
    if (eNO === 0) { this.cT = 0; } else { this.cT = Math.max(0, eST * (1 - Math.abs(this.aV) / eNO)); }
    return {};
  }
  getOutput(): ActuatorOutput { return { torque: this.cT, angularVelocity: this.aV, direction: this.cD }; }
  setAngularVelocity(omega: number): void { this.aV = omega; }
  reset(): void { this.aV = 0; this.cT = 0; this.cD = 0; }
}
export const TT_MOTOR_6V: DcMotorSpecs = { stallTorque: 0.078, noLoadRpm: 200, nominalVoltage: 6, armatureResistance: 7.5 };
