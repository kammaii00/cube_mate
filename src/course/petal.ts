// 흰 꽃 섬의 화면 연습 문제: 노란색이 위인 큐브에서 꽃잎(흰 모서리) 하나를 노란 가운데 옆으로 올리기
import { SOLVED } from '../core/faces';
import { applyMove, applyMoves, flipUpsideDown, type Move } from '../core/moves';
import { followCells } from './pieces';

/** 화면 연습 종류: 옆(가운데 줄)에 있는 꽃잎 / 아래(바닥)에 있는 꽃잎 / 올릴 자리가 차 있어 먼저 비우기 */
export type PetalKind = 'side' | 'bottom' | 'busy';

export interface PetalPuzzle {
  kind: PetalKind;
  /** 노란색이 위인 큐브 그림 */
  state: string;
  /** 올려야 할 꽃잎이 지금 있는 칸들 */
  cells: number[];
  /** 누를 수 있는 돌리기 버튼들 */
  moves: Move[];
}

/** 윗면 모서리 칸 (꽃잎 자리) */
const TOP_EDGES = [1, 3, 5, 7];
/** 앞 위 / 오른쪽 위 꽃잎의 칸 (윗면 칸, 옆면 칸) */
const UF: number[] = [7, 19];
const UR: number[] = [5, 10];

// 흰 꽃이 다 된 큐브: 노란색 위로 잡은 맞춘 큐브에서 네 옆면을 두 번씩 돌리면 흰 모서리 4개가 위로 올라온다
export function daisyBase(): string {
  return applyMoves(flipUpsideDown(SOLVED), ['F2', 'R2', 'B2', 'L2']);
}

// 흰 꽃이 다 됐는지: 노란 가운데 둘레 네 칸이 모두 흰색
export function isDaisy(state: string): boolean {
  return state[4] === 'D' && TOP_EDGES.every((i) => state[i] === 'U');
}

/** 종류마다 꽃잎 하나를 빼는 방법 (앞면 또는 오른쪽 면, 보이는 곳으로) 과 누를 수 있는 버튼 */
const MAKERS: Record<PetalKind, { from: number[]; moves: Move[] }[]> = {
  side: [
    { from: UF, moves: ['F'] },
    { from: UR, moves: ["R'"] },
  ],
  bottom: [
    { from: UF, moves: ['F2'] },
    { from: UR, moves: ['R2'] },
  ],
  busy: [
    { from: UF, moves: ['F', 'U'] },
    { from: UF, moves: ['F', "U'"] },
    { from: UR, moves: ["R'", 'U'] },
    { from: UR, moves: ["R'", "U'"] },
  ],
};
const BUTTONS: Record<PetalKind, Move[]> = {
  side: ['F', "F'", 'R', "R'"],
  bottom: ['F', "F'", 'R', "R'"],
  busy: ['U', "U'", 'F', "F'", 'R', "R'"],
};

// 목록에서 하나를 무작위로 고른다
function pickOne<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

// 문제 하나를 만든다: 흰 꽃에서 바닥·윗면을 무작위로 돌려 모양을 바꾼 뒤 꽃잎 하나를 뺀다
export function makePetal(kind: PetalKind, rand = Math.random): PetalPuzzle {
  const turns = (face: string) => Array.from({ length: Math.floor(rand() * 4) }, () => face);
  const start = applyMoves(daisyBase(), [...turns('D'), ...turns('U')]);
  const maker = pickOne(MAKERS[kind], rand);
  const state = applyMoves(start, maker.moves);
  const cells = maker.moves.reduce((c, m) => followCells(c, m), maker.from);
  return { kind, state, cells, moves: BUTTONS[kind] };
}

// 흰 꽃까지 최소 몇 번 돌리면 되는지 (버튼들로, max번 안에 안 되면 Infinity)
export function stepsToDaisy(state: string, moves: Move[], max = 4): number {
  let layer = [state];
  const seen = new Set(layer);
  for (let depth = 0; depth <= max; depth++) {
    if (layer.some(isDaisy)) return depth;
    const next: string[] = [];
    for (const s of layer)
      for (const m of moves) {
        const t = applyMove(s, m);
        if (!seen.has(t)) {
          seen.add(t);
          next.push(t);
        }
      }
    layer = next;
  }
  return Infinity;
}

// 지금 눌러야 할 버튼 하나 (흰 꽃에 한 걸음 가까워지는 첫 버튼, 없으면 null)
export function nextPetalMove(state: string, moves: Move[]): Move | null {
  const now = stepsToDaisy(state, moves);
  if (now === 0 || now === Infinity) return null;
  return moves.find((m) => stepsToDaisy(applyMove(state, m), moves, now - 1) === now - 1) ?? null;
}
