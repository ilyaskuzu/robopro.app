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
  | { type: 'noop' };

// ─── Tokenizer ───────────────────────────────────────────────

interface Token {
  type: 'number' | 'string' | 'ident' | 'op' | 'paren' | 'brace' | 'semi' | 'comma' | 'dot';
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
  private userFunctions = new Map<string, ASTNode>();
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
              // Skip params (we don't support params yet)
              while (!this.check('paren', ')') && this.pos < this.tokens.length) this.advance();
              if (this.check('paren', ')')) this.advance(); // skip )
              if (this.check('brace', '{')) {
                const body = this.parseBlock();
                if (name === 'setup') this.setupAST = body;
                else if (name === 'loop') this.loopAST = body;
                else this.userFunctions.set(name, body);
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

      this.advance();
    }
  }

  getUserFunctions(): Map<string, ASTNode> { return this.userFunctions; }
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

    // Variable declaration: int/long/float/bool/unsigned/byte name = expr;
    if (this.check('ident') && ['int', 'long', 'float', 'bool', 'unsigned', 'byte', 'char', 'boolean', 'double', 'short', 'word', 'size_t'].includes(this.peek().value)) {
      return this.parseVarDecl();
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
    let value: ASTNode = { type: 'number', value: 0 };
    if (this.check('op', '=')) {
      this.advance();
      value = this.parseExpression();
    }
    this.skipSemi();
    return { type: 'varDecl', name, value };
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

  // ─── Expression Parsing (Pratt / precedence climbing) ─────

  parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const left = this.parseOr();
    if (this.check('op', '=') && left.type === 'identifier') {
      this.advance();
      const value = this.parseAssignment();
      return { type: 'assign', name: left.name, value };
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

    // Parenthesized expression
    if (this.check('paren', '(')) {
      this.advance();
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

      // Serial.print / Serial.println / Serial.begin
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
  private userFunctions = new Map<string, ASTNode>();
  private variables = new Map<string, number>();
  private setupDone = false;
  private setupIndex = 0;
  private loopIndex = 0;
  private delayRemaining = 0;
  private running = false;
  private elapsedMs = 0;

  constructor(private callbacks: SketchCallbacks) {}

  parse(source: string): void {
    this.setupAST = { type: 'block', body: [] };
    this.loopAST = { type: 'block', body: [] };
    this.userFunctions.clear();
    this.variables.clear();
    this.setupDone = false;
    this.setupIndex = 0;
    this.loopIndex = 0;
    this.delayRemaining = 0;
    this.elapsedMs = 0;

    // Preprocess (#define substitution)
    const { cleaned, defines } = preprocess(source);

    // Tokenize
    const tokens = tokenize(cleaned);

    // Parse
    const parser = new Parser(tokens);
    parser.parse();
    this.setupAST = parser.setupAST;
    this.loopAST = parser.loopAST;
    this.userFunctions = parser.getUserFunctions();

    // Load defines as initial constants
    for (const [name, value] of defines) {
      const num = parseFloat(value);
      if (!isNaN(num)) this.variables.set(name, num);
    }
    for (const [name, value] of parser.getDefines()) {
      this.variables.set(name, value);
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
    switch (node.type) {
      case 'noop':
        return false;

      case 'block':
        for (const stmt of node.body) {
          const hit = this.executeNode(stmt);
          if (hit) return true;
        }
        return false;

      case 'varDecl':
        this.variables.set(node.name, this.evaluate(node.value));
        return false;

      case 'assign':
        this.variables.set(node.name, this.evaluate(node.value));
        return false;

      case 'compoundAssign': {
        const current = this.variables.get(node.name) ?? 0;
        const val = this.evaluate(node.value);
        switch (node.op) {
          case '+=': this.variables.set(node.name, current + val); break;
          case '-=': this.variables.set(node.name, current - val); break;
          case '*=': this.variables.set(node.name, current * val); break;
          case '/=': this.variables.set(node.name, val !== 0 ? current / val : 0); break;
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
          if (hit) return true; // delay inside while — NOTE: won't resume correctly inside the while, but acceptable for Phase 2
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
          if (node.update) this.executeNode(node.update);
          iterations++;
        }
        return false;
      }

      case 'call':
        this.evaluateCall(node.name, node.args);
        return false;

      // Expression statements (like bare function calls)
      case 'binary':
      case 'unary':
      case 'number':
      case 'string':
      case 'identifier':
        this.evaluate(node);
        return false;
    }
  }

  /**
   * Evaluate an expression node and return its numeric value.
   */
  private evaluate(node: ASTNode): number {
    switch (node.type) {
      case 'number': return node.value;
      case 'string': return 0; // Strings evaluate to 0 in numeric context
      case 'identifier': return this.variables.get(node.name) ?? 0;

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
        this.variables.set(node.name, aVal);
        return aVal;

      case 'compoundAssign': {
        const current = this.variables.get(node.name) ?? 0;
        const val = this.evaluate(node.value);
        let result: number;
        switch (node.op) {
          case '+=': result = current + val; break;
          case '-=': result = current - val; break;
          case '*=': result = current * val; break;
          case '/=': result = val !== 0 ? current / val : 0; break;
          default: result = current;
        }
        this.variables.set(node.name, result);
        return result;
      }

      case 'call':
        return this.evaluateCall(node.name, node.args);

      case 'varDecl':
        const dVal = this.evaluate(node.value);
        this.variables.set(node.name, dVal);
        return dVal;

      default: return 0;
    }
  }

  /**
   * Resolve a string node's value for Serial.print etc.
   */
  private evaluateString(node: ASTNode): string {
    if (node.type === 'string') return node.value;
    return String(this.evaluate(node));
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

      default: {
        // User-defined function
        const fn = this.userFunctions.get(name);
        if (fn) {
          this.executeNode(fn);
        }
        return 0;
      }
    }
  }
}
