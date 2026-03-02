import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

/** Maximum request body size in bytes (2 MB) */
const MAX_BODY_SIZE = 2 * 1024 * 1024;
/** Maximum number of motion log entries per request */
const MAX_ENTRIES = 5000;
/** Minimum interval between requests in ms */
const RATE_LIMIT_MS = 2000;

let lastRequestTime = 0;

interface Entry {
  tick: number;
  x: number;
  z: number;
  dir: number;
  v: number;
  omega: number;
  motorL: number;
  motorR: number;
  phase: string;
}

interface Body {
  sessionId: number;
  entries: Entry[];
  exportedAt: string;
}

function isValidEntry(e: unknown): e is Entry {
  if (typeof e !== 'object' || e === null) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj.tick === 'number' &&
    typeof obj.x === 'number' &&
    typeof obj.z === 'number' &&
    typeof obj.dir === 'number' &&
    typeof obj.v === 'number' &&
    typeof obj.omega === 'number' &&
    typeof obj.motorL === 'number' &&
    typeof obj.motorR === 'number' &&
    typeof obj.phase === 'string'
  );
}

interface PhaseSpan {
  phase: string;
  tickStart: number;
  tickEnd: number;
  count: number;
  startX: number; startZ: number; startDir: number;
  endX: number; endZ: number; endDir: number;
  maxV: number;
  endV: number;
  avgMotorL: number;
  avgMotorR: number;
}

function detectPhases(entries: Entry[]): PhaseSpan[] {
  if (!entries.length) return [];
  const spans: PhaseSpan[] = [];
  let cur: PhaseSpan | null = null;
  let sumL = 0, sumR = 0;

  for (const e of entries) {
    if (!cur || e.phase !== cur.phase) {
      if (cur) {
        cur.avgMotorL = sumL / cur.count;
        cur.avgMotorR = sumR / cur.count;
        spans.push(cur);
      }
      cur = {
        phase: e.phase, tickStart: e.tick, tickEnd: e.tick, count: 1,
        startX: e.x, startZ: e.z, startDir: e.dir,
        endX: e.x, endZ: e.z, endDir: e.dir,
        maxV: Math.abs(e.v), endV: e.v,
        avgMotorL: 0, avgMotorR: 0,
      };
      sumL = e.motorL; sumR = e.motorR;
    } else {
      cur.tickEnd = e.tick;
      cur.count++;
      cur.endX = e.x; cur.endZ = e.z; cur.endDir = e.dir;
      cur.endV = e.v;
      if (Math.abs(e.v) > cur.maxV) cur.maxV = Math.abs(e.v);
      sumL += e.motorL; sumR += e.motorR;
    }
  }
  if (cur) {
    cur.avgMotorL = sumL / cur.count;
    cur.avgMotorR = sumR / cur.count;
    spans.push(cur);
  }
  return spans;
}

function detectAnomalies(spans: PhaseSpan[]): string[] {
  const issues: string[] = [];
  for (const s of spans) {
    if (s.phase === 'STOPPED' && Math.abs(s.endV * 100) > 1) {
      issues.push(`STOPPED phase (${s.tickStart}-${s.tickEnd}): v=${(s.endV * 100).toFixed(1)}cm/s at end (should be ~0)`);
    }
    if (s.phase === 'COASTING' && s.count > 120) {
      issues.push(`COASTING phase (${s.tickStart}-${s.tickEnd}): lasted ${s.count} ticks (${(s.count / 60).toFixed(1)}s) — car not stopping`);
    }
    if (s.phase === 'PIVOT' && Math.abs(s.endV * 100) > 5) {
      issues.push(`PIVOT phase (${s.tickStart}-${s.tickEnd}): v=${(s.endV * 100).toFixed(1)}cm/s (should pivot in place, v≈0)`);
    }
    if (s.phase === 'FORWARD') {
      const dx = s.endX - s.startX;
      const dz = s.endZ - s.startZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const dirRad = s.startDir * Math.PI / 180;
      const expectedDx = dist * Math.cos(dirRad);
      const expectedDz = dist * Math.sin(dirRad);
      const lateralError = Math.abs((dx - expectedDx) * Math.sin(dirRad) - (dz - expectedDz) * Math.cos(dirRad));
      if (lateralError * 100 > 1) {
        issues.push(`FORWARD phase (${s.tickStart}-${s.tickEnd}): lateral drift ${(lateralError * 100).toFixed(1)}cm (should be 0)`);
      }
    }
  }
  return issues;
}

function pad(s: string, n: number) { return s.padStart(n); }
function padr(s: string, n: number) { return s.padEnd(n); }

function buildTextReport(body: Body): string {
  const { entries, sessionId, exportedAt } = body;
  const lines: string[] = [];

  lines.push('=== ROBOPRO Motion Log ===');
  lines.push(`Session: ${sessionId} | Exported: ${exportedAt}`);
  if (entries.length) {
    lines.push(`Ticks: ${entries[0].tick}-${entries[entries.length - 1].tick} (${entries.length} entries @ 60Hz)`);
  }
  lines.push('');

  const spans = detectPhases(entries);

  lines.push('=== PHASE SUMMARY ===');
  lines.push(padr('Phase', 10) + pad('Ticks', 14) + pad('Duration', 9) + pad('Start Pos(cm)', 18) + pad('End Pos(cm)', 18) + pad('Dir°', 8) + pad('→Dir°', 8) + pad('MaxSpd', 8) + pad('AvgL', 8) + pad('AvgR', 8));
  lines.push('-'.repeat(109));
  for (const s of spans) {
    const dur = ((s.tickEnd - s.tickStart + 1) / 60 * 1000).toFixed(0) + 'ms';
    lines.push(
      padr(s.phase, 10) +
      pad(`${s.tickStart}-${s.tickEnd}`, 14) +
      pad(dur, 9) +
      pad(`(${(s.startX * 100).toFixed(1)},${(s.startZ * 100).toFixed(1)})`, 18) +
      pad(`(${(s.endX * 100).toFixed(1)},${(s.endZ * 100).toFixed(1)})`, 18) +
      pad(s.startDir.toFixed(0), 8) +
      pad(s.endDir.toFixed(0), 8) +
      pad((s.maxV * 100).toFixed(1), 8) +
      pad(s.avgMotorL.toFixed(1), 8) +
      pad(s.avgMotorR.toFixed(1), 8)
    );
  }
  lines.push('');

  const anomalies = detectAnomalies(spans);
  lines.push('=== ANOMALIES ===');
  if (anomalies.length === 0) {
    lines.push('None detected.');
  } else {
    for (const a of anomalies) lines.push('- ' + a);
  }
  lines.push('');

  lines.push('=== DATA TABLE (sampled every 10 ticks + phase transitions) ===');
  lines.push(pad('Tick', 6) + '  ' + padr('Phase', 10) + pad('x(cm)', 8) + pad('z(cm)', 8) + pad('Dir°', 6) + pad('v(cm/s)', 9) + pad('L(cm/s)', 9) + pad('R(cm/s)', 9));
  lines.push('-'.repeat(65));

  let lastPhase = '';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const isTransition = e.phase !== lastPhase;
    const isSample = i % 10 === 0;
    const isLast = i === entries.length - 1;
    if (isTransition || isSample || isLast) {
      lines.push(
        pad(String(e.tick), 6) + '  ' +
        padr(isTransition ? '>' + e.phase : e.phase, 10) +
        pad((e.x * 100).toFixed(1), 8) +
        pad((e.z * 100).toFixed(1), 8) +
        pad(e.dir.toFixed(0), 6) +
        pad((e.v * 100).toFixed(1), 9) +
        pad(e.motorL.toFixed(1), 9) +
        pad(e.motorR.toFixed(1), 9)
      );
    }
    lastPhase = e.phase;
  }

  lines.push('');
  lines.push('=== END ===');
  return lines.join('\n');
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before saving again.' },
        { status: 429 }
      );
    }
    lastRequestTime = now;

    // Size check via Content-Length header
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: `Request body too large (max ${MAX_BODY_SIZE / 1024 / 1024} MB)` },
        { status: 413 }
      );
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: `Request body too large (max ${MAX_BODY_SIZE / 1024 / 1024} MB)` },
        { status: 413 }
      );
    }

    let body: Body;
    try {
      body = JSON.parse(raw) as Body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { entries } = body;
    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries (array) required' }, { status: 400 });
    }
    if (entries.length > MAX_ENTRIES) {
      return NextResponse.json(
        { error: `Too many entries (max ${MAX_ENTRIES})` },
        { status: 400 }
      );
    }
    if (typeof body.sessionId !== 'number') {
      return NextResponse.json({ error: 'sessionId (number) required' }, { status: 400 });
    }

    // Validate entry shapes
    for (let i = 0; i < Math.min(entries.length, 10); i++) {
      if (!isValidEntry(entries[i])) {
        return NextResponse.json(
          { error: `Invalid entry at index ${i}` },
          { status: 400 }
        );
      }
    }

    const projectRoot = process.cwd();
    const logsDir = path.join(projectRoot, 'logs');
    await mkdir(logsDir, { recursive: true });

    const report = buildTextReport(body);
    const textPath = path.join(logsDir, 'session.log');
    await writeFile(textPath, report, 'utf-8');

    return NextResponse.json({
      ok: true,
      path: textPath,
      count: entries.length,
    });
  } catch (err) {
    console.error('save-motion-log:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save log' },
      { status: 500 }
    );
  }
}
