export type PinMode = 'input' | 'output' | 'input_pullup' | 'pwm' | 'unset';
export type SignalType = 'digital' | 'analog' | 'pwm' | 'power' | 'ground';

export interface IPin {
  readonly index: number;
  readonly name: string;
  mode: PinMode;
  value: number;
  pwmDutyCycle: number;
}

export interface IPinListener {
  onPinChange(pin: IPin): void;
}
