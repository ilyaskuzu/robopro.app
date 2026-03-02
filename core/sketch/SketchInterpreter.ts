/**
 * AST-based Arduino sketch interpreter.
 * Parses Arduino-style .ino source and executes it against pin state callbacks,
 * supporting variables, control flow, expressions, and sensor readback.
 *
 * ## Supported Arduino API
 * - pinMode(pin, mode)           — INPUT / OUTPUT / INPUT_PULLUP
 * - digitalWrite(pin, value)     — HIGH / LOW / 1 / 0
 * - digitalRead(pin)             — returns 0 or 1
 * - analogWrite(pin, value)      — 0–255 PWM
 * - analogRead(pin)              — returns 0–1023
 * - delay(ms)
 * - millis()                     — elapsed time since sketch start
 * - Serial.begin(baud)
 * - Serial.print(value)
 * - Serial.println(value)
 * - map(value, fromLow, fromHigh, toLow, toHigh)
 * - constrain(value, low, high)
 * - abs(x), min(a,b), max(a,b)
 *
 * ## Supported Language Features
 * - int / long / float / bool variable declarations
 * - const int, #define
 * - Arithmetic: + - * / %
 * - Comparison: < > <= >= == !=
 * - Logical: && || !
 * - Bitwise: & | ^ ~ << >>
 * - Assignment: = += -= *= /=
 * - Control: if / else if / else, while, for
 * - User-defined void functions (no params, no return value)
 * - // and block comments
 *
 * ## Not Yet Supported
 * - Arrays and strings
 * - switch/case
 * - Classes / structs
 * - Pointers
 * - #include
 * - Interrupt attachments (attachInterrupt)
 * - Servo / Wire / SPI libraries
 * - Function parameters and return values (non-void)
 * - do...while
 * - break / continue
 * - Ternary operator (? :)
 * - Type casting
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
  onDigitalRead?: (pin: number) => number;
  onAnalogRead?: (pin: number) => number;
  onServoAttach?: (servoId: string, pin: number) => void;
  onServoWrite?: (servoId: string, angle: number) => void;
  onServoDetach?: (servoId: string) => void;
  onTone?: (pin: number, frequency: number, duration?: number) => void;
  onNoTone?: (pin: number) => void;
  onPulseIn?: (pin: number, value: number, timeout?: number) => number;
  onWireWrite?: (address: number, data: number[]) => void;
  onWireRead?: (address: number, quantity: number) => number[];
  onError?: (message: string, severity: 'error' | 'warning') => void;
}

// ─── AST Node Types ──────────────────────────────────────────

type ASTNode =
  | { type: 'block'; body: ASTNode[] }
  | { type: 'varDecl'; name: string; value: ASTNode }
  | { type: 'assign'; name: string; value: ASTNode }
  | { type: 'compoundAssign'; name: string; op: string; value: ASTNode }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'identifier'; name: string }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }
  | { type: 'call'; name: string; args: ASTNode[] }
  | { type: 'if'; condition: ASTNode; then: ASTNode; else?: ASTNode }
  | { type: 'while'; condition: ASTNode; body: ASTNode }
  | { type: 'for'; init: ASTNode | null; condition: ASTNode | null; update: ASTNode | null; body: ASTNode }
  | { type: 'delay'; ms: ASTNode }
  | { type: 'noop' }
  | { type: 'switch'; expr: ASTNode; cases: Array<{ values: ASTNode[]; body: ASTNode[] }>; defaultBody: ASTNode[] }
  | { type: 'doWhile'; condition: ASTNode; body: ASTNode }
  | { type: 'break' }
  | { type: 'continue' }
  | { type: 'return'; value: ASTNode | null }
  | { type: 'ternary'; condition: ASTNode; consequent: ASTNode; alternate: ASTNode }
  | { type: 'arrayLiteral'; elements: ASTNode[] }
  | { type: 'arrayDecl'; name: string; elements: ASTNode[] }
  | { type: 'arrayAccess'; name: string; index: ASTNode }
  | { type: 'arrayAssign'; name: string; index: ASTNode; value: ASTNode }
  | { type: 'methodCall'; object: string; method: string; args: ASTNode[] }
  | { type: 'stepperInit'; steps: ASTNode; p1: ASTNode; p2: ASTNode; p3: ASTNode; p4: ASTNode };

// ─── Tokenizer ───────────────────────────────────────────────

interface Token {
  type: 'number' | 'string' | 'ident' | 'op' | 'paren' | 'brace' | 'semi' | 'comma' | 'dot' | 'bracket' | 'question' | 'colon';
  value: string;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    // Whitespace
    if (/\s/.test(source[i])) { i++; continue; }
    // Line comment
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    // Block comment
    if (source[i] === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // String literal
    if (source[i] === '"') {
      let str = '';
      i++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < source.length) {
          const esc = source[i + 1];
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === '\\') str += '\\';
          else if (esc === '"') str += '"';
          else str += esc;
          i += 2;
        } else {
          str += source[i];
          i++;
        }
      }
      i++; // closing "
      tokens.push({ type: 'string', value: str });
      continue;
    }
    // Hex number (0x / 0X)
    if (source[i] === '0' && i + 2 < source.length && /[xX]/.test(source[i + 1]) && /[0-9a-fA-F]/.test(source[i + 2])) {
      let num = '0';
      i += 2;
      while (i < source.length && /[0-9a-fA-F]/.test(source[i])) { num += source[i]; i++; }
      tokens.push({ type: 'number', value: String(parseInt(num, 16)) });
      continue;
    }
    // Number (int or float)
    if (/[0-9]/.test(source[i]) || (source[i] === '.' && i + 1 < source.length && /[0-9]/.test(source[i + 1]))) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(source[i])) { num += source[i]; i++; }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_]/.test(source[i])) {
      let id = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) { id += source[i]; i++; }
      tokens.push({ type: 'ident', value: id });
      continue;
    }
    // Multi-char operators
    const two = source.substring(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '+=', '-=', '*=', '/=', '++', '--'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    // Single-char
    const ch = source[i];
    if ('()'.includes(ch)) { tokens.push({ type: 'paren', value: ch }); i++; continue; }
    if ('{}'.includes(ch)) { tokens.push({ type: 'brace', value: ch }); i++; continue; }
    if (ch === ';') { tokens.push({ type: 'semi', value: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ch }); i++; continue; }
    if (ch === '.') { tokens.push({ type: 'dot', value: ch }); i++; continue; }
    if ('[]'.includes(ch)) { tokens.push({ type: 'bracket', value: ch }); i++; continue; }
    if (ch === '?') { tokens.push({ type: 'question', value: ch }); i++; continue; }
    if (ch === ':') { tokens.push({ type: 'colon', value: ch }); i++; continue; }
    if ('+-*/%<>=!&|^~'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
    // Unknown char — skip
    i++;
  }
  return tokens;
}

// ─── Parser ──────────────────────────────────────────────────

class Parser {
  private pos = 0;
  private defines = new Map<string, number>();
  private userFunctions = new Map<string, { params: string[]; body: ASTNode }>();
  /** Global-scope variable declarations (Servo, String, etc.) */
  globalDecls: ASTNode[] = [];
  setupAST: ASTNode = { type: 'block', body: [] };
  loopAST: ASTNode = { type: 'block', body: [] };

  constructor(private tokens: Token[]) {}

  parse(): void {
    // First pass: extract #define-like constants and function bodies
    this.pos = 0;
    while (this.pos < this.tokens.length) {
      // Skip type specifiers
      if (this.check('ident') && ['void', 'int', 'long', 'float', 'bool', 'unsigned', 'byte', 'char', 'boolean', 'double', 'short', 'word', 'size_t'].includes(this.peek().value)) {
        const typeToken = this.peek().value;

        // Check for function definition: type name(...) { ... }
        if (typeToken === 'void' || typeToken === 'int' || typeToken === 'long' || typeToken === 'float') {
          const saved = this.pos;
          this.advance(); // skip type
          if (this.check('ident')) {
            const name = this.peek().value;
            this.advance(); // skip name
            if (this.check('paren', '(')) {
              this.advance(); // skip (
              // Parse parameter names
              const params: string[] = [];
              while (!this.check('paren', ')') && this.pos < this.tokens.length) {
                // Skip type keyword
                if (this.check('ident')) this.advance();
                // Handle 'unsigned int' etc.
                if (this.check('ident') && ['int', 'long', 'char', 'short'].includes(this.peek().value)) this.advance();
                // Get param name
                if (this.check('ident')) {
                  params.push(this.advance().value);
                }
                if (this.check('comma')) this.advance();
              }
              if (this.check('paren', ')')) this.advance(); // skip )
              if (this.check('brace', '{')) {
                const body = this.parseBlock();
                if (name === 'setup') this.setupAST = body;
                else if (name === 'loop') this.loopAST = body;
                else this.userFunctions.set(name, { params, body });
                continue;
              }
            }
          }
          this.pos = saved;
        }

        // const int NAME = value;
        if (typeToken === 'int' || typeToken === 'long' || typeToken === 'float' || typeToken === 'bool') {
          const saved = this.pos;
          // Check for 'const' before the type
          // Actually, 'const' comes before the type token at the top level
          // We'll handle const separately below
          this.pos = saved;
        }
      }

      // Handle 'const type name = value;'  at top level
      if (this.check('ident', 'const')) {
        const saved = this.pos;
        this.advance(); // skip const
        if (this.check('ident')) {
          this.advance(); // skip type (int/long/etc)
          if (this.check('ident')) {
            const name = this.peek().value;
            this.advance(); // skip name
            if (this.check('op', '=')) {
              this.advance(); // skip =
              const val = this.parseExpression();
              this.defines.set(name, this.evalConstExpr(val));
              this.skipSemi();
              continue;
            }
          }
        }
        this.pos = saved;
      }

      // Global Servo/String/Stepper declarations: Servo myservo; String s = "x"; Stepper s(200,8,9,10,11);
      if (this.check('ident', 'Servo') || this.check('ident', 'String') || this.check('ident', 'Stepper')) {
        const decl = this.parseClassVarDecl();
        this.globalDecls.push(decl);
        continue;
      }

      // Global variable declarations: int x = 5;
      if (this.check('ident') && ['int', 'long', 'float', 'bool', 'unsigned', 'byte', 'char', 'boolean', 'double', 'short', 'word', 'size_t'].includes(this.peek().value)) {
        const saved = this.pos;
        // Peek ahead to see if this is a variable (not function)
        this.advance(); // skip type
        if (this.check('ident') && ['int', 'long', 'char', 'short'].includes(this.peek().value)) {
          this.advance(); // skip second type word
        }
        if (this.check('ident')) {
          const nextSaved = this.pos;
          this.advance(); // skip name
          if (this.check('op', '=') || this.check('semi') || this.check('bracket', '[')) {
            // It's a global variable declaration
            this.pos = saved;
            const decl = this.parseVarDecl();
            this.globalDecls.push(decl);
            continue;
          }
          this.pos = nextSaved;
        }
        this.pos = saved;
      }

      this.advance();
    }
  }

  getUserFunctions(): Map<string, { params: string[]; body: ASTNode }> { return this.userFunctions; }
  getDefines(): Map<string, number> { return this.defines; }

  // ─── Helpers ─────────────────────────────

  private peek(): Token { return this.tokens[this.pos] || { type: 'semi', value: '' }; }
  private advance(): Token { return this.tokens[this.pos++] || { type: 'semi', value: '' }; }
  private check(type: string, value?: string): boolean {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }
  private expect(type: string, value?: string): Token {
    if (this.check(type, value)) return this.advance();
    // Error recovery: skip
    return this.advance();
  }
  private skipSemi(): void { if (this.check('semi')) this.advance(); }

  private evalConstExpr(node: ASTNode): number {
    if (node.type === 'number') return node.value;
    if (node.type === 'unary' && node.op === '-') return -this.evalConstExpr(node.operand);
    if (node.type === 'binary') {
      const l = this.evalConstExpr(node.left);
      const r = this.evalConstExpr(node.right);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r !== 0 ? l / r : 0;
        case '%': return r !== 0 ? l % r : 0;
        default: return 0;
      }
    }
    if (node.type === 'identifier') return this.defines.get(node.name) ?? 0;
    return 0;
  }

  // ─── Statement Parsing ───────────────────

  parseBlock(): ASTNode {
    this.expect('brace', '{');
    const body: ASTNode[] = [];
    while (!this.check('brace', '}') && this.pos < this.tokens.length) {
      const stmt = this.parseStatement();
      if (stmt.type !== 'noop') body.push(stmt);
    }
    this.expect('brace', '}');
    return { type: 'block', body };
  }

  parseStatement(): ASTNode {
    // Empty statement
    if (this.check('semi')) { this.advance(); return { type: 'noop' }; }

    // Block
    if (this.check('brace', '{')) return this.parseBlock();

    // if
    if (this.check('ident', 'if')) return this.parseIf();

    // while
    if (this.check('ident', 'while')) return this.parseWhile();

    // for
    if (this.check('ident', 'for')) return this.parseFor();

    // switch
    if (this.check('ident', 'switch')) return this.parseSwitch();

    // do...while
    if (this.check('ident', 'do')) return this.parseDoWhile();

    // break
    if (this.check('ident', 'break')) { this.advance(); this.skipSemi(); return { type: 'break' }; }

    // continue
    if (this.check('ident', 'continue')) { this.advance(); this.skipSemi(); return { type: 'continue' }; }

    // return
    if (this.check('ident', 'return')) return this.parseReturn();

    // Variable declaration: int/long/float/bool/unsigned/byte name = expr;
    if (this.check('ident') && ['int', 'long', 'float', 'bool', 'unsigned', 'byte', 'char', 'boolean', 'double', 'short', 'word', 'size_t'].includes(this.peek().value)) {
      return this.parseVarDecl();
    }

    // Servo/String/Stepper declaration at statement level
    if (this.check('ident', 'Servo') || this.check('ident', 'String') || this.check('ident', 'Stepper')) {
      return this.parseClassVarDecl();
    }

    // const type name = value;
    if (this.check('ident', 'const')) {
      const saved = this.pos;
      this.advance(); // skip const
      if (this.check('ident') && ['int', 'long', 'float', 'bool', 'unsigned', 'byte'].includes(this.peek().value)) {
        return this.parseVarDecl();
      }
      this.pos = saved;
    }

    // delay(expr) — special handling for blocking
    if (this.check('ident', 'delay')) {
      this.advance(); // skip delay
      this.expect('paren', '(');
      const ms = this.parseExpression();
      this.expect('paren', ')');
      this.skipSemi();
      return { type: 'delay', ms };
    }

    // Expression statement (assignment, function call, etc.)
    const expr = this.parseExpression();
    this.skipSemi();

    // Convert top-level expression into assignment if applicable
    return expr;
  }

  private parseVarDecl(): ASTNode {
    this.advance(); // skip type token
    // Handle 'unsigned int', 'unsigned long', etc.
    if (this.check('ident') && ['int', 'long', 'char', 'short'].includes(this.peek().value)) {
      this.advance(); // skip second type word
    }
    const name = this.expect('ident').value;

    // Array declaration: int arr[] = {1,2,3}; or int arr[3];
    if (this.check('bracket', '[')) {
      this.advance(); // skip [
      // Optional size
      if (!this.check('bracket', ']')) {
        this.parseExpression(); // skip size expression
      }
      this.expect('bracket', ']');
      if (this.check('op', '=')) {
        this.advance(); // skip =
        if (this.check('brace', '{')) {
          this.advance(); // skip {
          const elements: ASTNode[] = [];
          while (!this.check('brace', '}') && this.pos < this.tokens.length) {
            elements.push(this.parseExpression());
            if (this.check('comma')) this.advance();
          }
          this.expect('brace', '}');
          this.skipSemi();
          return { type: 'arrayDecl', name, elements };
        }
      }
      this.skipSemi();
      return { type: 'arrayDecl', name, elements: [] };
    }

    let value: ASTNode = { type: 'number', value: 0 };
    if (this.check('op', '=')) {
      this.advance();
      value = this.parseExpression();
    }
    this.skipSemi();
    return { type: 'varDecl', name, value };
  }

  private parseClassVarDecl(): ASTNode {
    const className = this.advance().value; // 'Servo', 'String', or 'Stepper'
    const varName = this.expect('ident').value;
    if (className === 'Servo') {
      this.skipSemi();
      return { type: 'varDecl', name: varName, value: { type: 'string', value: '__servo__' } };
    }
    if (className === 'Stepper') {
      this.expect('paren', '(');
      const steps = this.parseExpression();
      this.expect('comma');
      const p1 = this.parseExpression();
      this.expect('comma');
      const p2 = this.parseExpression();
      this.expect('comma');
      const p3 = this.parseExpression();
      this.expect('comma');
      const p4 = this.parseExpression();
      this.expect('paren', ')');
      this.skipSemi();
      return { type: 'varDecl', name: varName, value: { type: 'stepperInit', steps, p1, p2, p3, p4 } };
    }
    // String
    let value: ASTNode = { type: 'string', value: '' };
    if (this.check('op', '=')) {
      this.advance();
      value = this.parseExpression();
    }
    this.skipSemi();
    return { type: 'varDecl', name: varName, value };
  }

  private parseIf(): ASTNode {
    this.expect('ident', 'if');
    this.expect('paren', '(');
    const condition = this.parseExpression();
    this.expect('paren', ')');
    const then = this.check('brace', '{') ? this.parseBlock() : this.parseStatement();
    let elseNode: ASTNode | undefined;
    if (this.check('ident', 'else')) {
      this.advance();
      if (this.check('ident', 'if')) {
        elseNode = this.parseIf();
      } else {
        elseNode = this.check('brace', '{') ? this.parseBlock() : this.parseStatement();
      }
    }
    return { type: 'if', condition, then, else: elseNode };
  }

  private parseWhile(): ASTNode {
    this.expect('ident', 'while');
    this.expect('paren', '(');
    const condition = this.parseExpression();
    this.expect('paren', ')');
    const body = this.check('brace', '{') ? this.parseBlock() : this.parseStatement();
    return { type: 'while', condition, body };
  }

  private parseFor(): ASTNode {
    this.expect('ident', 'for');
    this.expect('paren', '(');
    let init: ASTNode | null = null;
    if (!this.check('semi')) {
      if (this.check('ident') && ['int', 'long', 'float', 'bool', 'unsigned', 'byte'].includes(this.peek().value)) {
        init = this.parseVarDecl();
      } else {
        init = this.parseExpression();
        this.skipSemi();
      }
    } else {
      this.advance(); // skip ;
    }
    let condition: ASTNode | null = null;
    if (!this.check('semi')) {
      condition = this.parseExpression();
    }
    this.skipSemi();
    let update: ASTNode | null = null;
    if (!this.check('paren', ')')) {
      update = this.parseExpression();
    }
    this.expect('paren', ')');
    const body = this.check('brace', '{') ? this.parseBlock() : this.parseStatement();
    return { type: 'for', init, condition, update, body };
  }

  private parseSwitch(): ASTNode {
    this.expect('ident', 'switch');
    this.expect('paren', '(');
    const expr = this.parseExpression();
    this.expect('paren', ')');
    this.expect('brace', '{');

    const cases: Array<{ values: ASTNode[]; body: ASTNode[] }> = [];
    let defaultBody: ASTNode[] = [];

    while (!this.check('brace', '}') && this.pos < this.tokens.length) {
      if (this.check('ident', 'case')) {
        const values: ASTNode[] = [];
        // Collect consecutive case labels
        while (this.check('ident', 'case')) {
          this.advance(); // skip 'case'
          values.push(this.parseExpression());
          this.expect('colon');
        }
        const body: ASTNode[] = [];
        while (!this.check('ident', 'case') && !this.check('ident', 'default') && !this.check('brace', '}') && this.pos < this.tokens.length) {
          const stmt = this.parseStatement();
          if (stmt.type !== 'noop') body.push(stmt);
        }
        cases.push({ values, body });
      } else if (this.check('ident', 'default')) {
        this.advance(); // skip 'default'
        this.expect('colon');
        while (!this.check('ident', 'case') && !this.check('brace', '}') && this.pos < this.tokens.length) {
          const stmt = this.parseStatement();
          if (stmt.type !== 'noop') defaultBody.push(stmt);
        }
      } else {
        this.advance(); // skip unknown
      }
    }
    this.expect('brace', '}');
    return { type: 'switch', expr, cases, defaultBody };
  }

  private parseDoWhile(): ASTNode {
    this.expect('ident', 'do');
    const body = this.check('brace', '{') ? this.parseBlock() : this.parseStatement();
    this.expect('ident', 'while');
    this.expect('paren', '(');
    const condition = this.parseExpression();
    this.expect('paren', ')');
    this.skipSemi();
    return { type: 'doWhile', condition, body };
  }

  private parseReturn(): ASTNode {
    this.expect('ident', 'return');
    if (this.check('semi')) {
      this.advance();
      return { type: 'return', value: null };
    }
    const value = this.parseExpression();
    this.skipSemi();
    return { type: 'return', value };
  }

  // ─── Expression Parsing (Pratt / precedence climbing) ─────

  parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const left = this.parseOr();

    // Ternary operator: expr ? a : b
    if (this.check('question')) {
      this.advance(); // skip ?
      const consequent = this.parseAssignment();
      this.expect('colon');
      const alternate = this.parseAssignment();
      return { type: 'ternary', condition: left, consequent, alternate };
    }

    if (this.check('op', '=') && left.type === 'identifier') {
      this.advance();
      const value = this.parseAssignment();
      return { type: 'assign', name: left.name, value };
    }
    // Array assignment: arr[i] = val
    if (this.check('op', '=') && left.type === 'arrayAccess') {
      this.advance();
      const value = this.parseAssignment();
      return { type: 'arrayAssign', name: left.name, index: left.index, value };
    }
    if (left.type === 'identifier') {
      const compoundOps = ['+=', '-=', '*=', '/='];
      for (const op of compoundOps) {
        if (this.check('op', op)) {
          this.advance();
          const value = this.parseAssignment();
          return { type: 'compoundAssign', name: left.name, op, value };
        }
      }
    }
    return left;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.check('op', '||')) { this.advance(); const right = this.parseAnd(); left = { type: 'binary', op: '||', left, right }; }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseBitwiseOr();
    while (this.check('op', '&&')) { this.advance(); const right = this.parseBitwiseOr(); left = { type: 'binary', op: '&&', left, right }; }
    return left;
  }

  private parseBitwiseOr(): ASTNode {
    let left = this.parseBitwiseXor();
    while (this.check('op', '|') && !this.tokens[this.pos + 1]?.value?.startsWith('|')) { this.advance(); const right = this.parseBitwiseXor(); left = { type: 'binary', op: '|', left, right }; }
    return left;
  }

  private parseBitwiseXor(): ASTNode {
    let left = this.parseBitwiseAnd();
    while (this.check('op', '^')) { this.advance(); const right = this.parseBitwiseAnd(); left = { type: 'binary', op: '^', left, right }; }
    return left;
  }

  private parseBitwiseAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.check('op', '&') && !this.tokens[this.pos + 1]?.value?.startsWith('&')) { this.advance(); const right = this.parseEquality(); left = { type: 'binary', op: '&', left, right }; }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (this.check('op', '==') || this.check('op', '!=')) { const op = this.advance().value; const right = this.parseComparison(); left = { type: 'binary', op, left, right }; }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseShift();
    while (this.check('op', '<') || this.check('op', '>') || this.check('op', '<=') || this.check('op', '>=')) {
      const op = this.advance().value;
      const right = this.parseShift();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  private parseShift(): ASTNode {
    let left = this.parseAddition();
    while (this.check('op', '<<') || this.check('op', '>>')) { const op = this.advance().value; const right = this.parseAddition(); left = { type: 'binary', op, left, right }; }
    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();
    while (this.check('op', '+') || this.check('op', '-')) { const op = this.advance().value; const right = this.parseMultiplication(); left = { type: 'binary', op, left, right }; }
    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary();
    while (this.check('op', '*') || this.check('op', '/') || this.check('op', '%')) { const op = this.advance().value; const right = this.parseUnary(); left = { type: 'binary', op, left, right }; }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.check('op', '-')) { this.advance(); return { type: 'unary', op: '-', operand: this.parseUnary() }; }
    if (this.check('op', '!')) { this.advance(); return { type: 'unary', op: '!', operand: this.parseUnary() }; }
    if (this.check('op', '~')) { this.advance(); return { type: 'unary', op: '~', operand: this.parseUnary() }; }

    // Pre-increment/decrement
    if (this.check('op', '++') && this.pos + 1 < this.tokens.length && this.tokens[this.pos + 1].type === 'ident') {
      this.advance(); // skip ++
      const name = this.advance().value;
      return { type: 'compoundAssign', name, op: '+=', value: { type: 'number', value: 1 } };
    }
    if (this.check('op', '--') && this.pos + 1 < this.tokens.length && this.tokens[this.pos + 1].type === 'ident') {
      this.advance(); // skip --
      const name = this.advance().value;
      return { type: 'compoundAssign', name, op: '-=', value: { type: 'number', value: 1 } };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let node = this.parsePrimary();

    // Array access: name[expr]
    while (node.type === 'identifier' && this.check('bracket', '[')) {
      this.advance(); // skip [
      const index = this.parseExpression();
      this.expect('bracket', ']');
      node = { type: 'arrayAccess', name: node.name, index };
    }

    // Method call: name.method(args) — for object variables like Servo
    if (node.type === 'identifier' && this.check('dot')) {
      this.advance(); // skip .
      const method = this.advance().value; // method name
      if (this.check('paren', '(')) {
        this.advance(); // skip (
        const args: ASTNode[] = [];
        while (!this.check('paren', ')') && this.pos < this.tokens.length) {
          args.push(this.parseExpression());
          if (this.check('comma')) this.advance();
        }
        this.expect('paren', ')');
        return { type: 'methodCall', object: node.name, method, args };
      }
      // Property access (no args) — treat as method call with no args
      return { type: 'methodCall', object: node.name, method, args: [] };
    }

    // Post-increment/decrement
    if (node.type === 'identifier' && (this.check('op', '++') || this.check('op', '--'))) {
      const op = this.advance().value === '++' ? '+=' : '-=';
      return { type: 'compoundAssign', name: node.name, op, value: { type: 'number', value: 1 } };
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    // Number literal
    if (this.check('number')) {
      return { type: 'number', value: parseFloat(this.advance().value) };
    }

    // String literal
    if (this.check('string')) {
      return { type: 'string', value: this.advance().value };
    }

    // Parenthesized expression or type cast
    if (this.check('paren', '(')) {
      // Check for type cast: (int)expr, (float)expr, (byte)expr, (long)expr, (char)expr
      const saved = this.pos;
      this.advance(); // skip (
      if (this.check('ident') && ['int', 'float', 'byte', 'long', 'char', 'unsigned', 'double', 'short', 'boolean'].includes(this.peek().value)) {
        const castType = this.advance().value;
        if (this.check('paren', ')')) {
          this.advance(); // skip )
          const expr = this.parseUnary();
          // Apply cast
          if (castType === 'int' || castType === 'long' || castType === 'byte' || castType === 'short' || castType === 'char') {
            return { type: 'call', name: '__castInt', args: [expr] };
          }
          return expr; // float/double/unsigned — no runtime change
        }
      }
      // Not a cast, backtrack
      this.pos = saved;
      this.advance(); // skip (
      const expr = this.parseExpression();
      this.expect('paren', ')');
      return expr;
    }

    // Identifier, constants, or function call
    if (this.check('ident')) {
      const name = this.advance().value;

      // Arduino constants
      if (name === 'HIGH') return { type: 'number', value: 1 };
      if (name === 'LOW') return { type: 'number', value: 0 };
      if (name === 'true') return { type: 'number', value: 1 };
      if (name === 'false') return { type: 'number', value: 0 };
      if (name === 'INPUT') return { type: 'string', value: 'INPUT' };
      if (name === 'OUTPUT') return { type: 'string', value: 'OUTPUT' };
      if (name === 'INPUT_PULLUP') return { type: 'string', value: 'INPUT_PULLUP' };
      if (name === 'A0') return { type: 'number', value: 14 };
      if (name === 'A1') return { type: 'number', value: 15 };
      if (name === 'A2') return { type: 'number', value: 16 };
      if (name === 'A3') return { type: 'number', value: 17 };
      if (name === 'A4') return { type: 'number', value: 18 };
      if (name === 'A5') return { type: 'number', value: 19 };

      // Servo class declaration: Servo myservo; → treat as variable declaration
      if (name === 'Servo' && this.check('ident')) {
        const servoName = this.advance().value;
        this.skipSemi();
        return { type: 'varDecl', name: servoName, value: { type: 'string', value: '__servo__' } };
      }

      // String class declaration: String s = "hello";
      if (name === 'String' && this.check('ident')) {
        const varName = this.advance().value;
        let value: ASTNode = { type: 'string', value: '' };
        if (this.check('op', '=')) {
          this.advance();
          value = this.parseExpression();
        }
        this.skipSemi();
        return { type: 'varDecl', name: varName, value };
      }

      // Serial.print / Serial.println / Serial.begin / Serial.available / Serial.read / etc.
      if (name === 'Serial' && this.check('dot')) {
        this.advance(); // skip .
        const method = this.advance().value;
        this.expect('paren', '(');
        const args: ASTNode[] = [];
        while (!this.check('paren', ')') && this.pos < this.tokens.length) {
          args.push(this.parseExpression());
          if (this.check('comma')) this.advance();
        }
        this.expect('paren', ')');
        return { type: 'call', name: `Serial.${method}`, args };
      }

      // Wire.begin / Wire.beginTransmission / Wire.write / Wire.endTransmission / Wire.requestFrom / Wire.read
      if (name === 'Wire' && this.check('dot')) {
        this.advance(); // skip .
        const method = this.advance().value;
        this.expect('paren', '(');
        const args: ASTNode[] = [];
        while (!this.check('paren', ')') && this.pos < this.tokens.length) {
          args.push(this.parseExpression());
          if (this.check('comma')) this.advance();
        }
        this.expect('paren', ')');
        return { type: 'call', name: `Wire.${method}`, args };
      }

      // Function call
      if (this.check('paren', '(')) {
        this.advance(); // skip (
        const args: ASTNode[] = [];
        while (!this.check('paren', ')') && this.pos < this.tokens.length) {
          args.push(this.parseExpression());
          if (this.check('comma')) this.advance();
        }
        this.expect('paren', ')');
        return { type: 'call', name, args };
      }

      // Constant (#define or const)
      if (this.defines.has(name)) {
        return { type: 'number', value: this.defines.get(name)! };
      }

      return { type: 'identifier', name };
    }

    // Fallback
    this.advance();
    return { type: 'number', value: 0 };
  }
}

// ─── Preprocessor ────────────────────────────────────────────

function preprocess(source: string): { cleaned: string; defines: Map<string, string> } {
  const defines = new Map<string, string>();
  const lines = source.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#define')) {
      const parts = trimmed.replace(/^#define\s+/, '').split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const value = parts.slice(1).join(' ');
        defines.set(name, value);
      }
      continue; // Don't include #define lines
    }
    if (trimmed.startsWith('#include')) continue; // Skip includes
    // Substitute defines
    let processed = line;
    for (const [name, value] of defines) {
      // Replace whole-word only
      processed = processed.replace(new RegExp(`\\b${name}\\b`, 'g'), value);
    }
    cleaned.push(processed);
  }

  return { cleaned: cleaned.join('\n'), defines };
}

// ─── Interpreter ─────────────────────────────────────────────

/** Max iterations for a single while/for loop per tick to prevent infinite loops */
const MAX_LOOP_ITERATIONS = 100_000;

export class SketchInterpreter {
  private setupAST: ASTNode = { type: 'block', body: [] };
  private loopAST: ASTNode = { type: 'block', body: [] };
  private userFunctions = new Map<string, { params: string[]; body: ASTNode }>();
  private variables = new Map<string, number | string>();
  private arrays = new Map<string, (number | string)[]>();
  private callStack: Array<Map<string, number | string>> = [];
  private setupDone = false;
  private setupIndex = 0;
  private loopIndex = 0;
  private delayRemaining = 0;
  private running = false;
  private elapsedMs = 0;
  private breakFlag = false;
  private continueFlag = false;
  private returnValue: number | string | null = null;
  private returnFlag = false;
  // Servo state
  private servoAngles = new Map<string, number>();
  private servoPins = new Map<string, number>();

  // Stepper state: stepsPerRev, pins [4], currentRpm, currentStep (phase index 0–7)
  private stepperObjects = new Map<string, { stepsPerRev: number; pins: number[]; currentRpm: number; currentStep: number }>();

  // Wire/I2C state
  private wireTxBuffer: number[] = [];
  private wireTargetAddr = 0;
  private wireRxBuffer: number[] = [];
  private wireRxIndex = 0;

  // Serial input buffer (bidirectional)
  private serialInputBuffer = '';

  constructor(private callbacks: SketchCallbacks) {}

  private reportError(message: string, severity: 'error' | 'warning' = 'error'): void {
    this.callbacks.onError?.(message, severity);
  }

  parse(source: string): void {
    this.setupAST = { type: 'block', body: [] };
    this.loopAST = { type: 'block', body: [] };
    this.userFunctions.clear();
    this.variables.clear();
    this.arrays.clear();
    this.callStack = [];
    this.setupDone = false;
    this.setupIndex = 0;
    this.loopIndex = 0;
    this.delayRemaining = 0;
    this.elapsedMs = 0;
    this.breakFlag = false;
    this.continueFlag = false;
    this.returnValue = null;
    this.returnFlag = false;
    this.servoAngles.clear();
    this.servoPins.clear();
    this.stepperObjects.clear();
    this.wireTxBuffer = [];
    this.wireTargetAddr = 0;
    this.wireRxBuffer = [];
    this.wireRxIndex = 0;
    this.serialInputBuffer = '';

    // Preprocess (#define substitution)
    const { cleaned, defines } = preprocess(source);

    // Tokenize
    const tokens = tokenize(cleaned);
    if (tokens.length === 0) {
      this.reportError('Empty sketch — nothing to execute');
      this.running = false;
      return;
    }

    // Parse
    const parser = new Parser(tokens);
    try {
      parser.parse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.reportError(`Parse error: ${msg}`);
      this.running = false;
      return;
    }
    this.setupAST = parser.setupAST;
    this.loopAST = parser.loopAST;
    this.userFunctions = parser.getUserFunctions();

    if (this.setupAST.type === 'block' && this.setupAST.body.length === 0 &&
        this.loopAST.type === 'block' && this.loopAST.body.length === 0 &&
        this.userFunctions.size === 0 && parser.globalDecls.length === 0) {
      this.reportError('No setup() or loop() function found in sketch', 'warning');
    }

    // Load defines as initial constants
    for (const [name, value] of defines) {
      const num = parseFloat(value);
      if (!isNaN(num)) this.variables.set(name, num);
    }
    for (const [name, value] of parser.getDefines()) {
      this.variables.set(name, value);
    }

    // Execute global declarations (Servo, String, global variables)
    for (const decl of parser.globalDecls) {
      this.executeNode(decl);
    }

    this.running = true;
  }

  /**
   * Advance the interpreter by dtMs milliseconds.
   * Returns true if the interpreter is still running.
   */
  tick(dtMs: number): boolean {
    if (!this.running) return false;

    this.elapsedMs += dtMs;

    if (this.delayRemaining > 0) {
      this.delayRemaining -= dtMs;
      if (this.delayRemaining > 0) return true;
      // Delay expired — fall through
    }

    if (!this.setupDone) {
      const result = this.executeBlockResumable(this.setupAST, this.setupIndex);
      if (result.blocked) {
        this.setupIndex = result.index;
        return true;
      }
      this.setupDone = true;
      this.loopIndex = 0;
    }

    // Execute loop body
    const result = this.executeBlockResumable(this.loopAST, this.loopIndex);
    if (result.blocked) {
      this.loopIndex = result.index;
      return true;
    }

    // Loop completed — restart from beginning
    this.loopIndex = 0;
    return true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.setupDone = false;
    this.setupIndex = 0;
    this.loopIndex = 0;
    this.delayRemaining = 0;
    this.running = false;
    this.elapsedMs = 0;
    this.variables.clear();
    this.arrays.clear();
    this.callStack = [];
    this.breakFlag = false;
    this.continueFlag = false;
    this.returnValue = null;
    this.returnFlag = false;
    this.servoAngles.clear();
    this.servoPins.clear();
    this.stepperObjects.clear();
    this.wireTxBuffer = [];
    this.wireTargetAddr = 0;
    this.wireRxBuffer = [];
    this.wireRxIndex = 0;
    this.serialInputBuffer = '';
  }

  /** Inject user-typed text into the serial input buffer for Serial.read/parseInt/etc. */
  feedSerialInput(text: string): void {
    this.serialInputBuffer += text;
  }

  get isRunning(): boolean {
    return this.running;
  }

  // ─── Execution Engine ────────────────────

  /**
   * Execute a block AST from a given statement index.
   * Returns { blocked: true, index } if a delay was hit.
   * Returns { blocked: false } if block completed.
   */
  private executeBlockResumable(block: ASTNode, fromIndex: number): { blocked: boolean; index: number } {
    if (block.type !== 'block') {
      // Single statement
      const delayHit = this.executeNode(block);
      if (delayHit) return { blocked: true, index: 0 };
      return { blocked: false, index: 0 };
    }

    for (let i = fromIndex; i < block.body.length; i++) {
      const delayHit = this.executeNode(block.body[i]);
      if (delayHit) {
        return { blocked: true, index: i + 1 };
      }
    }
    return { blocked: false, index: 0 };
  }

  /**
   * Execute a single AST node. Returns true if execution hit a delay.
   */
  private executeNode(node: ASTNode): boolean {
    if (this.breakFlag || this.continueFlag || this.returnFlag) return false;

    switch (node.type) {
      case 'noop':
        return false;

      case 'block':
        for (const stmt of node.body) {
          const hit = this.executeNode(stmt);
          if (hit) return true;
          if (this.breakFlag || this.continueFlag || this.returnFlag) return false;
        }
        return false;

      case 'varDecl': {
        if (node.value.type === 'stepperInit') {
          const steps = this.evaluate(node.value.steps);
          const p1 = this.evaluate(node.value.p1);
          const p2 = this.evaluate(node.value.p2);
          const p3 = this.evaluate(node.value.p3);
          const p4 = this.evaluate(node.value.p4);
          this.stepperObjects.set(node.name, {
            stepsPerRev: steps,
            pins: [p1, p2, p3, p4],
            currentRpm: 0,
            currentStep: 0,
          });
          this.setVar(node.name, '__stepper__');
        } else {
          this.setVar(node.name, this.evaluateAny(node.value));
        }
        return false;
      }

      case 'assign':
        this.setVar(node.name, this.evaluateAny(node.value));
        return false;

      case 'compoundAssign': {
        const current = this.getVarNum(node.name);
        const val = this.evaluate(node.value);
        switch (node.op) {
          case '+=': this.setVar(node.name, current + val); break;
          case '-=': this.setVar(node.name, current - val); break;
          case '*=': this.setVar(node.name, current * val); break;
          case '/=': this.setVar(node.name, val !== 0 ? current / val : 0); break;
          default: break;
        }
        return false;
      }

      case 'delay': {
        const ms = this.evaluate(node.ms);
        this.delayRemaining = ms + (this.delayRemaining < 0 ? this.delayRemaining : 0);
        if (this.delayRemaining > 0) return true;
        return false;
      }

      case 'if': {
        const cond = this.evaluate(node.condition);
        if (cond) {
          return this.executeNode(node.then);
        } else if (node.else) {
          return this.executeNode(node.else);
        }
        return false;
      }

      case 'while': {
        let iterations = 0;
        while (this.evaluate(node.condition) && iterations < MAX_LOOP_ITERATIONS) {
          const hit = this.executeNode(node.body);
          if (hit) return true;
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (this.continueFlag) { this.continueFlag = false; }
          if (this.returnFlag) return false;
          iterations++;
        }
        return false;
      }

      case 'for': {
        if (node.init) this.executeNode(node.init);
        let iterations = 0;
        while ((node.condition ? this.evaluate(node.condition) : 1) && iterations < MAX_LOOP_ITERATIONS) {
          const hit = this.executeNode(node.body);
          if (hit) return true;
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (this.continueFlag) { this.continueFlag = false; }
          if (this.returnFlag) return false;
          if (node.update) this.executeNode(node.update);
          iterations++;
        }
        return false;
      }

      case 'doWhile': {
        let iterations = 0;
        do {
          const hit = this.executeNode(node.body);
          if (hit) return true;
          if (this.breakFlag) { this.breakFlag = false; break; }
          if (this.continueFlag) { this.continueFlag = false; }
          if (this.returnFlag) return false;
          iterations++;
        } while (this.evaluate(node.condition) && iterations < MAX_LOOP_ITERATIONS);
        return false;
      }

      case 'switch': {
        const val = this.evaluate(node.expr);
        let matched = false;
        for (const c of node.cases) {
          if (!matched) {
            for (const cv of c.values) {
              if (this.evaluate(cv) === val) { matched = true; break; }
            }
          }
          if (matched) {
            for (const stmt of c.body) {
              const hit = this.executeNode(stmt);
              if (hit) return true;
              if (this.breakFlag) { this.breakFlag = false; return false; }
              if (this.returnFlag) return false;
            }
          }
        }
        if (!matched) {
          for (const stmt of node.defaultBody) {
            const hit = this.executeNode(stmt);
            if (hit) return true;
            if (this.breakFlag) { this.breakFlag = false; return false; }
            if (this.returnFlag) return false;
          }
        }
        return false;
      }

      case 'break':
        this.breakFlag = true;
        return false;

      case 'continue':
        this.continueFlag = true;
        return false;

      case 'return': {
        if (node.value) {
          this.returnValue = this.evaluateAny(node.value);
        }
        this.returnFlag = true;
        return false;
      }

      case 'arrayDecl': {
        const elements = node.elements.map(e => this.evaluateAny(e));
        this.arrays.set(node.name, elements);
        return false;
      }

      case 'arrayAssign': {
        const arr = this.arrays.get(node.name) ?? [];
        const idx = Math.floor(this.evaluate(node.index));
        const val = this.evaluateAny(node.value);
        while (arr.length <= idx) arr.push(0);
        arr[idx] = val;
        this.arrays.set(node.name, arr);
        return false;
      }

      case 'call': {
        if (node.name === 'delayMicroseconds') {
          const us = this.evaluate(node.args[0]);
          this.delayRemaining = us / 1000 + (this.delayRemaining < 0 ? this.delayRemaining : 0);
          if (this.delayRemaining > 0) return true;
        }
        this.evaluateCall(node.name, node.args);
        return false;
      }

      case 'methodCall':
        this.evaluateMethodCall(node.object, node.method, node.args);
        return false;

      // Expression statements (like bare function calls)
      case 'binary':
      case 'unary':
      case 'number':
      case 'string':
      case 'identifier':
      case 'ternary':
      case 'arrayAccess':
      case 'arrayLiteral':
        this.evaluateAny(node);
        return false;

      default:
        return false;
    }
  }

  // ─── Variable helpers for multi-type support ──────────────

  private getVar(name: string): number | string {
    // Search call stack first (scoped variables)
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (this.callStack[i].has(name)) return this.callStack[i].get(name)!;
    }
    return this.variables.get(name) ?? 0;
  }

  private getVarNum(name: string): number {
    const v = this.getVar(name);
    return typeof v === 'number' ? v : parseFloat(v) || 0;
  }

  private getVarStr(name: string): string {
    const v = this.getVar(name);
    return typeof v === 'string' ? v : String(v);
  }

  private setVar(name: string, value: number | string): void {
    // Set in top call stack frame if it exists there, else global
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      if (this.callStack[i].has(name)) {
        this.callStack[i].set(name, value);
        return;
      }
    }
    this.variables.set(name, value);
  }

  /**
   * Evaluate an expression and return any type (number or string).
   */
  private evaluateAny(node: ASTNode): number | string {
    switch (node.type) {
      case 'number': return node.value;
      case 'string': return node.value;
      case 'identifier': return this.getVar(node.name);

      case 'binary': {
        // String concatenation for +
        if (node.op === '+') {
          const l = this.evaluateAny(node.left);
          const r = this.evaluateAny(node.right);
          if (typeof l === 'string' || typeof r === 'string') {
            return String(l) + String(r);
          }
          return (l as number) + (r as number);
        }
        return this.evaluate(node);
      }

      case 'ternary': {
        const cond = this.evaluate(node.condition);
        return cond ? this.evaluateAny(node.consequent) : this.evaluateAny(node.alternate);
      }

      case 'arrayAccess': {
        const arr = this.arrays.get(node.name);
        if (!arr) return 0;
        const idx = Math.floor(this.evaluate(node.index));
        return arr[idx] ?? 0;
      }

      case 'arrayLiteral': {
        // Return first element or 0
        return node.elements.length > 0 ? this.evaluateAny(node.elements[0]) : 0;
      }

      case 'call':
        return this.evaluateCallAny(node.name, node.args);

      case 'methodCall':
        return this.evaluateMethodCall(node.object, node.method, node.args);

      case 'assign': {
        const val = this.evaluateAny(node.value);
        this.setVar(node.name, val);
        return val;
      }

      case 'varDecl': {
        const val = this.evaluateAny(node.value);
        this.setVar(node.name, val);
        return val;
      }

      default:
        return this.evaluate(node);
    }
  }

  /**
   * Evaluate an expression node and return its numeric value.
   */
  private evaluate(node: ASTNode): number {
    switch (node.type) {
      case 'number': return node.value;
      case 'string': return 0; // Strings evaluate to 0 in numeric context
      case 'identifier': return this.getVarNum(node.name);

      case 'ternary': {
        const cond = this.evaluate(node.condition);
        return cond ? this.evaluate(node.consequent) : this.evaluate(node.alternate);
      }

      case 'arrayAccess': {
        const arr = this.arrays.get(node.name);
        if (!arr) return 0;
        const idx = Math.floor(this.evaluate(node.index));
        const val = arr[idx] ?? 0;
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      }

      case 'binary': {
        const l = this.evaluate(node.left);
        const r = this.evaluate(node.right);
        switch (node.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r !== 0 ? l / r : 0;
          case '%': return r !== 0 ? l % r : 0;
          case '<': return l < r ? 1 : 0;
          case '>': return l > r ? 1 : 0;
          case '<=': return l <= r ? 1 : 0;
          case '>=': return l >= r ? 1 : 0;
          case '==': return l === r ? 1 : 0;
          case '!=': return l !== r ? 1 : 0;
          case '&&': return (l && r) ? 1 : 0;
          case '||': return (l || r) ? 1 : 0;
          case '&': return (l & r);
          case '|': return (l | r);
          case '^': return (l ^ r);
          case '<<': return (l << r);
          case '>>': return (l >> r);
          default: return 0;
        }
      }

      case 'unary': {
        const val = this.evaluate(node.operand);
        switch (node.op) {
          case '-': return -val;
          case '!': return val ? 0 : 1;
          case '~': return ~val;
          default: return 0;
        }
      }

      case 'assign':
        const aVal = this.evaluate(node.value);
        this.setVar(node.name, aVal);
        return aVal;

      case 'compoundAssign': {
        const current = this.getVarNum(node.name);
        const val = this.evaluate(node.value);
        let result: number;
        switch (node.op) {
          case '+=': result = current + val; break;
          case '-=': result = current - val; break;
          case '*=': result = current * val; break;
          case '/=': result = val !== 0 ? current / val : 0; break;
          default: result = current;
        }
        this.setVar(node.name, result);
        return result;
      }

      case 'call':
        return this.evaluateCall(node.name, node.args);

      case 'methodCall':
        return this.toNumber(this.evaluateMethodCall(node.object, node.method, node.args));

      case 'varDecl':
        const dVal = this.evaluate(node.value);
        this.setVar(node.name, dVal);
        return dVal;

      default: return 0;
    }
  }

  /**
   * Resolve a string node's value for Serial.print etc.
   */
  private evaluateString(node: ASTNode): string {
    if (node.type === 'string') return node.value;
    if (node.type === 'identifier') {
      const v = this.getVar(node.name);
      return typeof v === 'string' ? v : String(v);
    }
    if (node.type === 'binary' && node.op === '+') {
      return String(this.evaluateAny(node.left)) + String(this.evaluateAny(node.right));
    }
    if (node.type === 'call' && (node.name === 'Serial.readString' || node.name === 'Serial.readStringUntil')) {
      return this.evaluateCallAny(node.name, node.args) as string;
    }
    return String(this.evaluate(node));
  }

  private toNumber(v: number | string): number {
    return typeof v === 'number' ? v : parseFloat(v) || 0;
  }

  private serialReadString(): string {
    const val = this.serialInputBuffer;
    this.serialInputBuffer = '';
    return val;
  }

  private serialReadStringUntil(delim: string): string {
    const idx = this.serialInputBuffer.indexOf(delim);
    const val = idx >= 0 ? this.serialInputBuffer.slice(0, idx) : this.serialInputBuffer;
    this.serialInputBuffer = idx >= 0 ? this.serialInputBuffer.slice(idx + 1) : '';
    return val;
  }

  /**
   * Execute a function call and return its result.
   */
  private evaluateCall(name: string, args: ASTNode[]): number {
    switch (name) {
      case 'pinMode': {
        const pin = this.evaluate(args[0]);
        const modeNode = args[1];
        let mode: PinMode = 'OUTPUT';
        if (modeNode.type === 'string') mode = modeNode.value as PinMode;
        else if (modeNode.type === 'number') mode = modeNode.value === 0 ? 'INPUT' : 'OUTPUT';
        this.callbacks.onPinMode(pin, mode);
        return 0;
      }

      case 'digitalWrite': {
        const pin = this.evaluate(args[0]);
        const value = this.evaluate(args[1]);
        this.callbacks.onDigitalWrite(pin, value);
        return 0;
      }

      case 'digitalRead': {
        const pin = this.evaluate(args[0]);
        return this.callbacks.onDigitalRead?.(pin) ?? 0;
      }

      case 'analogWrite': {
        const pin = this.evaluate(args[0]);
        const value = this.evaluate(args[1]);
        this.callbacks.onAnalogWrite(pin, value);
        return 0;
      }

      case 'analogRead': {
        const pin = this.evaluate(args[0]);
        return this.callbacks.onAnalogRead?.(pin) ?? 0;
      }

      case 'millis':
        return Math.floor(this.elapsedMs);

      case 'micros':
        return Math.floor(this.elapsedMs * 1000);

      case 'randomSeed':
        // No-op in simulation; randomSeed sets the RNG seed
        return 0;

      case 'delayMicroseconds':
        // Handled in executeNode to support blocking
        return 0;

      case 'map': {
        const val = this.evaluate(args[0]);
        const fromLow = this.evaluate(args[1]);
        const fromHigh = this.evaluate(args[2]);
        const toLow = this.evaluate(args[3]);
        const toHigh = this.evaluate(args[4]);
        if (fromHigh === fromLow) return toLow;
        return (val - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
      }

      case 'constrain': {
        const val = this.evaluate(args[0]);
        const lo = this.evaluate(args[1]);
        const hi = this.evaluate(args[2]);
        return Math.max(lo, Math.min(hi, val));
      }

      case 'abs': return Math.abs(this.evaluate(args[0]));
      case 'min': return Math.min(this.evaluate(args[0]), this.evaluate(args[1]));
      case 'max': return Math.max(this.evaluate(args[0]), this.evaluate(args[1]));
      case 'sqrt': return Math.sqrt(this.evaluate(args[0]));
      case 'pow': return Math.pow(this.evaluate(args[0]), this.evaluate(args[1]));
      case 'random': {
        if (args.length === 1) return Math.floor(Math.random() * this.evaluate(args[0]));
        const lo = this.evaluate(args[0]);
        const hi = this.evaluate(args[1]);
        return Math.floor(Math.random() * (hi - lo)) + lo;
      }

      case 'Serial.begin':
        return 0;

      case 'Serial.print': {
        if (args.length > 0) this.callbacks.onSerialPrint(this.evaluateString(args[0]));
        return 0;
      }

      case 'Serial.println': {
        if (args.length > 0) this.callbacks.onSerialPrint(this.evaluateString(args[0]) + '\n');
        else this.callbacks.onSerialPrint('\n');
        return 0;
      }

      case 'Serial.available':
        return this.serialInputBuffer.length;

      case 'Serial.read': {
        if (this.serialInputBuffer.length === 0) return -1;
        const ch = this.serialInputBuffer[0];
        this.serialInputBuffer = this.serialInputBuffer.slice(1);
        return ch.charCodeAt(0);
      }

      case 'Serial.parseInt': {
        const s = this.serialInputBuffer;
        const match = s.match(/^\s*(-?\d+)/);
        if (!match) return 0;
        const val = parseInt(match[1], 10);
        this.serialInputBuffer = s.slice(match[0].length);
        return val;
      }

      case 'Serial.parseFloat': {
        const s = this.serialInputBuffer;
        const match = s.match(/^\s*(-?\d+\.?\d*|-?\.\d+)/);
        if (!match) return 0;
        const val = parseFloat(match[1]);
        this.serialInputBuffer = s.slice(match[0].length);
        return val;
      }

      case 'Serial.readString': {
        this.serialReadString();
        return 0;
      }

      case 'Serial.readStringUntil': {
        const delim = String.fromCharCode(this.evaluate(args[0]));
        this.serialReadStringUntil(delim);
        return 0;
      }

      case 'Wire.begin':
        return 0;

      case 'Wire.beginTransmission': {
        this.wireTargetAddr = this.evaluate(args[0]);
        this.wireTxBuffer = [];
        return 0;
      }

      case 'Wire.write': {
        const data = this.evaluate(args[0]);
        this.wireTxBuffer.push(data & 0xff);
        return 1;
      }

      case 'Wire.endTransmission': {
        this.callbacks.onWireWrite?.(this.wireTargetAddr, [...this.wireTxBuffer]);
        this.wireTxBuffer = [];
        return 0;
      }

      case 'Wire.requestFrom': {
        const addr = this.evaluate(args[0]);
        const qty = this.evaluate(args[1]);
        const data = this.callbacks.onWireRead?.(addr, qty);
        if (data) {
          this.wireRxBuffer = data;
        } else {
          // Stub: for MPU-6050 (0x68) return mock accel/gyro; else zeros
          if (addr === 0x68) {
            // MPU-6050 register layout: 0x3B-0x40 accel, 0x43-0x48 gyro (big-endian)
            const mock: number[] = [];
            for (let i = 0; i < qty; i++) mock.push((i * 17) & 0xff);
            this.wireRxBuffer = mock;
          } else {
            this.wireRxBuffer = Array(qty).fill(0);
          }
        }
        this.wireRxIndex = 0;
        return qty;
      }

      case 'Wire.read': {
        if (this.wireRxIndex >= this.wireRxBuffer.length) return -1;
        return this.wireRxBuffer[this.wireRxIndex++];
      }

      case '__castInt':
        return Math.trunc(this.evaluate(args[0]));

      case 'tone': {
        const pin = this.evaluate(args[0]);
        const freq = this.evaluate(args[1]);
        const dur = args.length > 2 ? this.evaluate(args[2]) : undefined;
        this.callbacks.onTone?.(pin, freq, dur);
        return 0;
      }

      case 'noTone': {
        const pin = this.evaluate(args[0]);
        this.callbacks.onNoTone?.(pin);
        return 0;
      }

      case 'pulseIn': {
        const pin = this.evaluate(args[0]);
        const value = this.evaluate(args[1]);
        const timeout = args.length > 2 ? this.evaluate(args[2]) : undefined;
        return this.callbacks.onPulseIn?.(pin, value, timeout) ?? 0;
      }

      case 'String': {
        // String() constructor — convert to string (return numeric)
        return this.evaluate(args[0]);
      }

      case 'sizeof': {
        if (args.length > 0 && args[0].type === 'identifier') {
          const arr = this.arrays.get(args[0].name);
          if (arr) return arr.length;
        }
        return 0;
      }

      default: {
        // User-defined function with parameters
        const fn = this.userFunctions.get(name);
        if (fn) {
          const scope = new Map<string, number | string>();
          for (let i = 0; i < fn.params.length; i++) {
            scope.set(fn.params[i], i < args.length ? this.evaluateAny(args[i]) : 0);
          }
          this.callStack.push(scope);
          this.returnFlag = false;
          this.returnValue = null;
          this.executeNode(fn.body);
          this.callStack.pop();
          const retVal = this.returnValue;
          this.returnFlag = false;
          this.returnValue = null;
          return typeof retVal === 'number' ? retVal : (retVal !== null ? (parseFloat(retVal) || 0) : 0);
        }
        this.reportError(`Unknown function: ${name}()`);
        return 0;
      }
    }
  }

  /**
   * evaluateCall variant that returns string or number (for evaluateAny)
   */
  private evaluateCallAny(name: string, args: ASTNode[]): number | string {
    if (name === 'Serial.readString') return this.serialReadString();
    if (name === 'Serial.readStringUntil') return this.serialReadStringUntil(String.fromCharCode(this.evaluate(args[0])));
    const fn = this.userFunctions.get(name);
    if (fn) {
      const scope = new Map<string, number | string>();
      for (let i = 0; i < fn.params.length; i++) {
        scope.set(fn.params[i], i < args.length ? this.evaluateAny(args[i]) : 0);
      }
      this.callStack.push(scope);
      this.returnFlag = false;
      this.returnValue = null;
      this.executeNode(fn.body);
      this.callStack.pop();
      const retVal = this.returnValue;
      this.returnFlag = false;
      this.returnValue = null;
      return retVal ?? 0;
    }
    return this.evaluateCall(name, args);
  }

  /**
   * Handle method calls on object variables (Servo, String, Stepper, etc.)
   */
  private evaluateMethodCall(objectName: string, method: string, args: ASTNode[]): number | string {
    const objVal = this.getVar(objectName);

    // Stepper methods
    const stepper = this.stepperObjects.get(objectName);
    if (stepper) {
      switch (method) {
        case 'setSpeed': {
          const rpm = this.evaluate(args[0]);
          stepper.currentRpm = rpm;
          return 0;
        }
        case 'step': {
          const n = Math.floor(this.evaluate(args[0]));
          const dir = n >= 0 ? 1 : -1;
          const absN = Math.abs(n);
          // 4-phase full-step pattern: 1000, 0100, 0010, 0001
          const PHASE = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
          ];
          for (let i = 0; i < absN; i++) {
            const phase = ((stepper.currentStep % 4) + 4) % 4;
            const pat = PHASE[phase];
            for (let j = 0; j < 4; j++) {
              this.callbacks.onDigitalWrite(stepper.pins[j], pat[j]);
            }
            stepper.currentStep += dir;
          }
          return 0;
        }
        default:
          return 0;
      }
    }

    // Servo methods
    if (objVal === '__servo__' || this.servoPins.has(objectName)) {
      switch (method) {
        case 'attach': {
          const pin = this.evaluate(args[0]);
          this.servoPins.set(objectName, pin);
          this.servoAngles.set(objectName, 90);
          this.callbacks.onServoAttach?.(objectName, pin);
          return 0;
        }
        case 'write': {
          const angle = Math.max(0, Math.min(180, this.evaluate(args[0])));
          this.servoAngles.set(objectName, angle);
          this.callbacks.onServoWrite?.(objectName, angle);
          return 0;
        }
        case 'read':
          return this.servoAngles.get(objectName) ?? 90;
        case 'detach':
          this.servoPins.delete(objectName);
          this.callbacks.onServoDetach?.(objectName);
          return 0;
        default:
          return 0;
      }
    }

    // String methods
    if (typeof objVal === 'string') {
      switch (method) {
        case 'length':
          return objVal.length;
        case 'charAt': {
          const idx = this.evaluate(args[0]);
          return objVal.charAt(idx) || '';
        }
        case 'substring': {
          const start = this.evaluate(args[0]);
          const end = args.length > 1 ? this.evaluate(args[1]) : undefined;
          return objVal.substring(start, end);
        }
        case 'indexOf': {
          const search = this.evaluateString(args[0]);
          return objVal.indexOf(search);
        }
        case 'toInt':
          return parseInt(objVal, 10) || 0;
        case 'toFloat':
          return parseFloat(objVal) || 0;
        case 'equals': {
          const other = this.evaluateString(args[0]);
          return objVal === other ? 1 : 0;
        }
        case 'concat': {
          const other = this.evaluateString(args[0]);
          this.setVar(objectName, objVal + other);
          return 0;
        }
        default:
          return 0;
      }
    }

    return 0;
  }
}
