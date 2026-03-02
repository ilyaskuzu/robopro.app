export interface ElectricalState {
  readonly supplyVoltage: number;
  readonly totalCurrent: number;
  readonly totalPower: number;
  readonly motorCurrents: number[];
  /** True if any motor current was clamped to maxCurrent. */
  readonly currentLimited: boolean;
}

export interface MotorElectricalParams {
  readonly backEmfConstant: number;
  readonly armatureResistance: number;
  readonly angularVelocity: number;
}

export class ElectricalEngine {
  /**
   * Compute the electrical state of the power train.
   *
   * @param bV   Battery voltage (V)
   * @param bR   Battery internal resistance (Ω)
   * @param dVD  Driver voltage drop (V)
   * @param motors  Per-motor electrical parameters
   * @param maxCurrent  Optional per-channel current limit from driver IC (A).
   *                    When provided, each motor current is clamped to this value.
   */
  computeState(
    bV: number,
    bR: number,
    dVD: number,
    motors: MotorElectricalParams[],
    maxCurrent?: number,
  ): ElectricalState {
    const aV = bV - dVD;
    let currentLimited = false;

    const mc = motors.map((m) => {
      if (m.armatureResistance <= 0) return 0;
      let current = Math.max(
        0,
        (aV - m.backEmfConstant * Math.abs(m.angularVelocity)) / m.armatureResistance,
      );
      if (maxCurrent !== undefined && current > maxCurrent) {
        current = maxCurrent;
        currentLimited = true;
      }
      return current;
    });

    const tC = mc.reduce((s, c) => s + c, 0);
    const sV = bV - tC * bR;

    return {
      supplyVoltage: Math.max(0, sV),
      totalCurrent: tC,
      totalPower: Math.max(0, sV) * tC,
      motorCurrents: mc,
      currentLimited,
    };
  }
}
