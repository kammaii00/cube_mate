// 1층 섬의 화면 연습 문제: 흰 꼭짓점을 들어갈 자리(오른쪽 앞 아래) 위로 데려와 "오른손 춤"을 들어갈 때까지 춘다
import { applyMoves, invertMove, type Move } from '../core/moves';
import { YELLOW_UP } from './petal';
import { followCells } from './pieces';
import { DANCE, keepWhite, pickOne, randomTurns, stepsTo, type CornerKind, type Puzzle, type PuzzleButton } from './puzzle';

/** 오른쪽 앞 아래 꼭짓점 칸 (아래, 앞, 오른쪽) */
export const DFR = [29, 26, 15];
/** 1층(아래 면 + 옆면 맨 아랫줄) 칸들 */
export const FIRST_LAYER = [27, 28, 29, 30, 31, 32, 33, 34, 35, 15, 16, 17, 24, 25, 26, 42, 43, 44, 51, 52, 53];
/** 오른손 춤을 거꾸로 */
export const UNDANCE = [...DANCE].reverse().map(invertMove);
/** 윗면을 0~3번 돌리는 방법과 버튼 누르는 수 (세 번은 반대로 한 번) */
const TOP_TURNS: { moves: Move[]; cost: number }[] = [
  { moves: [], cost: 0 },
  { moves: ['U'], cost: 1 },
  { moves: ['U2'], cost: 2 },
  { moves: ["U'"], cost: 1 },
];

/** 종류마다 누를 수 있는 버튼: 춤 한 번은 춤을 네 동작으로 나눠 차례로, 여러 번은 춤 버튼만, 데려오기는 윗면 돌리기도 */
const BUTTONS: Record<CornerKind, PuzzleButton[]> = { dance1: DANCE, danceMore: ['dance'], bring: ['U', "U'", 'dance'] };

/** 종류마다 꼭짓점을 빼낸 횟수 (춤을 거꾸로 1번: 흰색 오른쪽 → 1번에 들어감, 3번: 흰색 위, 5번: 흰색 앞) */
const UNDANCES: Record<CornerKind, number[]> = { dance1: [1], danceMore: [3, 5], bring: [1, 3, 5] };

// 배운 방법(윗면을 돌려 자리 위로 데려온 뒤 춤을 들어갈 때까지)으로 몇 번 더 누르면 되는지 (안 되면 Infinity)
export function danceDistance(state: string, goal: (s: string) => boolean): number {
  let best = Infinity;
  for (const top of TOP_TURNS) {
    let s = applyMoves(state, top.moves);
    for (let k = 0; k <= 5; k++, s = applyMoves(s, DANCE))
      if (goal(s)) {
        best = Math.min(best, top.cost + k);
        break;
      }
  }
  return best;
}

// 문제 하나를 만든다: 큐브를 통째로 무작위로 돌린 1층 완성 모습에서 꼭짓점 하나를 춤을 거꾸로 춰서 뺀다
export function makeCorner(kind: CornerKind, rand = Math.random): Puzzle {
  const solved = applyMoves(YELLOW_UP, randomTurns('y', rand));
  const undo: Move[] = Array.from({ length: pickOne(UNDANCES[kind], rand) }, () => UNDANCE).flat();
  // bring: 윗면을 한 번만 돌려 놓는다 (꼭짓점이 앞-왼쪽이나 오른쪽-뒤, 화면에서 보이는 곳에 있게)
  const moves = [...undo, ...(kind === 'bring' ? [pickOne(['U', "U'"], rand)] : [])];
  const state = applyMoves(solved, moves);
  const cells = moves.reduce((c, m) => followCells(c, m), DFR);
  const goal = (s: string) => FIRST_LAYER.every((i) => s[i] === solved[i]);
  const buttons = BUTTONS[kind];
  const shown = keepWhite(state, () => true);
  // 춤 한 번(동작 나눔): 버튼 네 개를 차례대로 다 눌러야 성공 (마지막 '당기기'는 1층을 안 바꿔도 춤의 일부라 PuzzleScreen이 순서로 본다)
  if (kind === 'dance1') return { kind, state: shown, cells, slot: DFR, buttons, guided: true, goal, distance: (s) => stepsTo(s, buttons, goal, 6) };
  return { kind, state: shown, cells, slot: DFR, buttons, goal, distance: (s) => danceDistance(s, goal) };
}
