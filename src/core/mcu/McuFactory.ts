import type { IMicrocontroller } from './interfaces/IMicrocontroller';
import { AvrMcu } from './avr/AvrMcu';
export type BoardType = 'arduino-uno';
const B: Record<BoardType, () => IMicrocontroller> = { 'arduino-uno': () => new AvrMcu() };
export function createMcu(board: BoardType): IMicrocontroller { const f = B[board]; if (!f) throw new Error(`Unknown board: ${board}`); return f(); }
