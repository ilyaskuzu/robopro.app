export interface ElectricalState { readonly supplyVoltage: number; readonly totalCurrent: number; readonly totalPower: number; readonly motorCurrents: number[]; }
export interface MotorElectricalParams { readonly backEmfConstant: number; readonly armatureResistance: number; readonly angularVelocity: number; }
export class ElectricalEngine {
  computeState(bV: number, bR: number, dVD: number, motors: MotorElectricalParams[]): ElectricalState {
    const aV = bV - dVD;
    const mc = motors.map(m => m.armatureResistance <= 0 ? 0 : Math.max(0, (aV - m.backEmfConstant * Math.abs(m.angularVelocity)) / m.armatureResistance));
    const tC = mc.reduce((s, c) => s + c, 0), sV = bV - tC * bR;
    return { supplyVoltage: Math.max(0, sV), totalCurrent: tC, totalPower: sV * tC, motorCurrents: mc };
  }
}
