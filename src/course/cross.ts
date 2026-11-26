// 흰 십자 섬의 화면 연습 문제: 위에 모인 꽃잎 하나를, 옆 색이 같은 가운데 위로 데려가 두 번 돌려 아래로 내리기
import { applyMoves, type Move } from '../core/moves';
import { YELLOW_UP, isDaisy } from './petal';
import { EDGES } from './pieces';
import { keepWhite, pickOne, randomTurns, stepsTo, type CrossKind, type Puzzle } from './puzzle';

/** 윗면 모서리 자리: 윗면 칸, 옆면 칸, 그 아래 가운데 칸 (앞, 오른쪽, 뒤, 왼쪽) */
const TOP = [
  { up: 7, side: 19, center: 22 },
  { up: 5, side: 10, center: 13 },
  { up: 1, side: 46, center: 49 },
  { up: 3, side: 37, center: 40 },
];
/** 내릴 때 돌릴 수 있는 면의 가운데 칸 (화면에 보이는 앞·오른쪽) */
const DROP_CENTERS = [22, 13];
const BUTTONS: Record<CrossKind, Move[]> = {
  drop: ['F', "F'", 'R', "R'"],
  match: ['U', "U'", 'F', "F'", 'R', "R'"],
};

// 꽃잎이 그 아래 가운데와 옆 색이 같은지 (바로 내려도 되는지)
function aligned(state: string, k: number): boolean {
  const p = TOP[k];
  return state[p.up] === 'U' && state[p.side] === state[p.center];
}

// 꽃잎 순서가 여러 가지인 흰 꽃: 십자 조각을 하나씩 올리면서 사이사이 윗면을 무작위로 돌린다
function randomDaisy(rand: () => number): string {
  for (;;) {
    const lift = ['F2', 'R2', 'B2', 'L2'].flatMap((m) => [...randomTurns('U', rand), m]);
    const state = applyMoves(YELLOW_UP, [...lift, ...randomTurns('U', rand)]);
    if (isDaisy(state)) return state;
  }
}

// 그 꽃잎(조각)이 집(흰 면 십자 자리)에 들어갔는지 보는 함수를 만든다
function homeGoal(state: string, cells: number[]): (s: string) => boolean {
  const colors = cells.map((i) => state[i]).sort().join('');
  const home = EDGES.find((p) => p.map((i) => YELLOW_UP[i]).sort().join('') === colors)!;
  return (s) => home.every((i) => s[i] === YELLOW_UP[i]);
}

// 문제 하나를 만든다. drop: 딱 하나만 색이 맞은 꽃잎이 앞이나 오른쪽에 있다. match: 맞은 꽃잎이 없고, 앞·오른쪽 가운데로 갈 꽃잎 하나를 고른다
export function makeCross(kind: CrossKind, rand = Math.random): Puzzle {
  for (;;) {
    const state = randomDaisy(rand);
    const ready = TOP.map((_, k) => aligned(state, k));
    let k: number;
    if (kind === 'drop') {
      if (ready.filter(Boolean).length !== 1 || !(ready[0] || ready[1])) continue;
      k = ready.indexOf(true);
    } else {
      if (ready.some(Boolean)) continue;
      k = pickOne([0, 1, 2, 3].filter((j) => DROP_CENTERS.some((c) => state[TOP[j].side] === state[c])), rand);
    }
    const cells = [TOP[k].up, TOP[k].side];
    const [buttons, goal] = [BUTTONS[kind], homeGoal(state, cells)];
    return { kind, state: keepWhite(state, (p) => p.length === 2), cells, buttons, goal, distance: (s) => stepsTo(s, buttons, goal, 5) };
  }
}
