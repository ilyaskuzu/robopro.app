/**
 * Lightweight Arduino sketch interpreter.
 * Parses basic Arduino API calls from .ino source and executes them
 * against a pin state callback, without needing a real AVR compiler.
 *
 * Supported: pinMode, digitalWrite, analogWrite, delay,
 *            Serial.begin, Serial.println, Serial.print
 */

export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';

export interface SketchPinState {
  mode: Record<number, PinMode>;
  digital: Record<number, number>;
  pwm: Record<number, number>;
}

export interface SketchCallbacks {
  onPinMode: (pin: number, mode: PinMode) => void;
  onDigitalWrite: (pin: number, value: number) => void;
  onAnalogWrite: (pin: number, value: number) => void;
  onSerialPrint: (text: string) => void;
}

type Statement =
  | { type: 'pinMode'; pin: number; mode: PinMode }
  | { type: 'digitalWrite'; pin: number; value: number }
  | { type: 'analogWrite'; pin: number; value: number }
  | { type: 'delay'; ms: number }
  | { type: 'serialBegin'; baud: number }
  | { type: 'serialPrint'; text: string; newline: boolean };

export class SketchInterpreter {
  private setupStatements: Statement[] = [];
  private loopStatements: Statement[] = [];
  private setupDone = false;
  private loopIndex = 0;
  private delayRemaining = 0;
  private running = false;

  constructor(private callbacks: SketchCallbacks) {}

  parse(source: string): void {
    this.setupStatements = [];
    this.loopStatements = [];
    this.setupDone = false;
    this.loopIndex = 0;
    this.delayRemaining = 0;

    const setupBody = this.extractFunctionBody(source, 'setup');
    const loopBody = this.extractFunctionBody(source, 'loop');

    this.setupStatements = this.parseStatements(setupBody);
    this.loopStatements = this.parseStatements(loopBody);
    this.running = true;
  }

  /**
   * Advance the interpreter by dt seconds.
   * Returns true if the interpreter is still running.
   */
  tick(dtMs: number): boolean {
    if (!this.running) return false;

    if (this.delayRemaining > 0) {
      this.delayRemaining -= dtMs;
      if (this.delayRemaining > 0) return true;
      // Delay expired mid-tick: fall through to execute next statements immediately.
      // The negative remainder (overshoot) is preserved and subtracted from the next delay.
    }

    if (!this.setupDone) {
      const blocked = this.executeBlock(this.setupStatements, 0, this.setupStatements.length);
      if (!blocked) {
        this.setupDone = true;
        this.loopIndex = 0;
      }
      return true;
    }

    const startIndex = this.loopIndex;
    for (let i = startIndex; i < this.loopStatements.length; i++) {
      const stmt = this.loopStatements[i];
      if (stmt.type === 'delay') {
        // Carry over overshoot from previous delay (delayRemaining is ≤ 0)
        this.delayRemaining = stmt.ms + this.delayRemaining;
        this.loopIndex = i + 1;
        if (this.delayRemaining > 0) return true;
        // If delay is already expired (very short), continue executing
        continue;
      }
      this.executeStatement(stmt);
    }

    this.loopIndex = 0;
    return true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.setupDone = false;
    this.loopIndex = 0;
    this.delayRemaining = 0;
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private executeBlock(statements: Statement[], from: number, to: number): boolean {
    for (let i = from; i < to; i++) {
      const stmt = statements[i];
      if (stmt.type === 'delay') {
        this.delayRemaining = stmt.ms;
        return true;
      }
      this.executeStatement(stmt);
    }
    return false;
  }

  private executeStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'pinMode':
        this.callbacks.onPinMode(stmt.pin, stmt.mode);
        break;
      case 'digitalWrite':
        this.callbacks.onDigitalWrite(stmt.pin, stmt.value);
        break;
      case 'analogWrite':
        this.callbacks.onAnalogWrite(stmt.pin, stmt.value);
        break;
      case 'serialBegin':
        break;
      case 'serialPrint':
        this.callbacks.onSerialPrint(stmt.text + (stmt.newline ? '' : ''));
        break;
    }
  }

  private extractFunctionBody(source: string, funcName: string): string {
    const pattern = new RegExp(`void\\s+${funcName}\\s*\\(\\s*\\)\\s*\\{`);
    const match = pattern.exec(source);
    if (!match) return '';

    let braceCount = 1;
    let i = match.index + match[0].length;
    const start = i;

    while (i < source.length && braceCount > 0) {
      if (source[i] === '{') braceCount++;
      else if (source[i] === '}') braceCount--;
      i++;
    }

    return source.slice(start, i - 1);
  }

  private parseStatements(body: string): Statement[] {
    const statements: Statement[] = [];
    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

    for (const line of lines) {
      const stmt = this.parseLine(line);
      if (stmt) statements.push(stmt);
    }

    return statements;
  }

  private parseLine(line: string): Statement | null {
    let m: RegExpMatchArray | null;

    m = line.match(/pinMode\s*\(\s*(\d+)\s*,\s*(INPUT|OUTPUT|INPUT_PULLUP)\s*\)/);
    if (m) return { type: 'pinMode', pin: parseInt(m[1]), mode: m[2] as PinMode };

    m = line.match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW|1|0)\s*\)/);
    if (m) {
      const val = (m[2] === 'HIGH' || m[2] === '1') ? 1 : 0;
      return { type: 'digitalWrite', pin: parseInt(m[1]), value: val };
    }

    m = line.match(/analogWrite\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (m) return { type: 'analogWrite', pin: parseInt(m[1]), value: parseInt(m[2]) };

    m = line.match(/delay\s*\(\s*(\d+)\s*\)/);
    if (m) return { type: 'delay', ms: parseInt(m[1]) };

    m = line.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/);
    if (m) return { type: 'serialBegin', baud: parseInt(m[1]) };

    m = line.match(/Serial\.println\s*\(\s*"([^"]*)"\s*\)/);
    if (m) return { type: 'serialPrint', text: m[1], newline: true };

    m = line.match(/Serial\.print\s*\(\s*"([^"]*)"\s*\)/);
    if (m) return { type: 'serialPrint', text: m[1], newline: false };

    return null;
  }
}
