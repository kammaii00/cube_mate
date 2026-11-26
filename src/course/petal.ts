// 흰 꽃 섬의 화면 연습 문제: 노란색이 위인 큐브에서 꽃잎(흰 모서리) 하나를 노란 가운데 옆으로 올리기
import { SOLVED } from '../core/faces';
import { applyMoves, flipUpsideDown, type Move } from '../core/moves';
import { followCells } from './pieces';
import { pickOne, randomTurns, stepsTo, type PetalKind, type Puzzle } from './puzzle';

/** 윗면 모서리 칸 (꽃잎 자리) */
const TOP_EDGES = [1, 3, 5, 7];
/** 앞 위 / 오른쪽 위 꽃잎의 칸 (윗면 칸, 옆면 칸) */
export const UF: number[] = [7, 19];
export const UR: number[] = [5, 10];

/** 노란색을 위로 잡은 다 맞춘 큐브 */
export const YELLOW_UP = flipUpsideDown(SOLVED);

// 흰 꽃이 다 된 큐브: 노란색 위로 잡은 맞춘 큐브에서 네 옆면을 두 번씩 돌리면 흰 모서리 4개가 위로 올라온다
export function daisyBase(): string {
  return applyMoves(YELLOW_UP, ['F2', 'R2', 'B2', 'L2']);
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

// 문제 하나를 만든다: 흰 꽃에서 바닥·윗면을 무작위로 돌려 모양을 바꾼 뒤 꽃잎 하나를 뺀다
export function makePetal(kind: PetalKind, rand = Math.random): Puzzle {
  const start = applyMoves(daisyBase(), [...randomTurns('D', rand), ...randomTurns('U', rand)]);
  const maker = pickOne(MAKERS[kind], rand);
  const state = applyMoves(start, maker.moves);
  const cells = maker.moves.reduce((c, m) => followCells(c, m), maker.from);
  const buttons = BUTTONS[kind];
  return { kind, state, cells, buttons, goal: isDaisy, distance: (s) => stepsTo(s, buttons, isDaisy, 4) };
}
