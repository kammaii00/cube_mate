// 초보자 공식(층별 풀이) 7단계로 큐브를 푼다.
// 노란색을 위, 초록을 앞으로 잡은 상태에서 아래층(흰색)부터 차례로 맞춘다.
import { applyMoves, flipUpsideDown, isSolved, parseMove, type Move } from '../../core/moves';
import { CORNERS, EDGES, topStickerOnly, trackCorner, trackEdge } from './pieces';
import { ALL_TURNS, U_TURNS, fromAllSides, search, type Macro, type Tracked } from './search';

export interface BeginnerSolution {
  /** 안내 시작 상태 (노란색 위, 초록 앞 기준으로 뒤집은 상태) */
  start: string;
  moves: Move[];
  /** 각 회전이 속한 단계 번호 (0~6) */
  stages: number[];
}

/** 단계별로 쓰는 공식들 */
const MACROS: Record<string, Macro[]> = {
  corners: [...U_TURNS, ...fromAllSides("R U R' U'"), ...fromAllSides("F' U' F U")],
  middle: [...U_TURNS, ...fromAllSides("U R U' R' U' F' U F"), ...fromAllSides("U' F' U F U R U' R'")],
  topCross: [...U_TURNS, ...fromAllSides("F R U R' U' F'"), ...fromAllSides("F U R U' R' F'")],
  topFace: [...U_TURNS, ...fromAllSides("R U R' U R U2 R'")],
  topCorners: [...U_TURNS, ...fromAllSides("R' F R' B2 R F' R' B2 R2")],
  topEdges: [...fromAllSides("R U' R U R U R U' R' U' R2"), ...fromAllSides("R2 U R U R' U' R' U' R' U R'")],
};

// 탐색 결과가 없으면 오류를 낸다 (정상적인 큐브라면 일어나지 않는다)
function mustFind(tracked: Tracked[], macros: Macro[]): Move[] {
  const moves = search(tracked, macros);
  if (!moves) throw new Error('초보자 풀이를 찾지 못했습니다');
  return moves;
}

// 같은 면을 연달아 돌리는 회전을 하나로 합치고, 서로 상쇄되면 없앤다
function simplify(steps: { move: Move; stage: number }[]): { move: Move; stage: number }[] {
  const out: { move: Move; stage: number }[] = [];
  for (const step of steps) {
    const last = out[out.length - 1];
    if (!last || last.move[0] !== step.move[0]) {
      out.push({ ...step });
      continue;
    }
    const turns = (parseMove(last.move).turns + parseMove(step.move).turns) % 4;
    if (turns === 0) out.pop();
    else last.move = step.move[0] + ['', '', '2', "'"][turns];
  }
  return out;
}

// 큐브 상태(흰색 위 기준)를 받아 초보자 공식 풀이를 만든다
export function solveBeginner(input: string): BeginnerSolution {
  const start = flipUpsideDown(input);
  let state = start;
  const steps: { move: Move; stage: number }[] = [];

  // 찾은 회전들을 기록하고 큐브 상태에 반영한다
  const run = (stage: number, moves: Move[]) => {
    moves.forEach((move) => steps.push({ move, stage }));
    state = applyMoves(state, moves);
  };

  // 남은 조각 중 가장 적은 회전으로 넣을 수 있는 것부터 하나씩 제자리에 넣는다
  const placeOneByOne = (
    stage: number,
    slots: number[],
    track: (s: string, slot: number) => Tracked[],
    keep: () => Tracked[],
    macros: Macro[],
  ): number[] => {
    const remaining = [...slots];
    const done: number[] = [];
    while (remaining.length) {
      const options = remaining.map((slot) => ({
        slot,
        moves: mustFind([...keep(), ...done.flatMap((d) => track(state, d)), ...track(state, slot)], macros),
      }));
      const best = options.reduce((a, b) => (b.moves.length < a.moves.length ? b : a));
      run(stage, best.moves);
      done.push(best.slot);
      remaining.splice(remaining.indexOf(best.slot), 1);
    }
    return done;
  };

  const bottomEdges = () => EDGES.bottom.flatMap((s) => trackEdge(state, s));
  const bottomCorners = () => CORNERS.bottom.flatMap((s) => trackCorner(state, s));
  const topEdgesUp = () => EDGES.top.flatMap((s) => topStickerOnly(trackEdge(state, s)));
  const topCornersUp = () => CORNERS.top.flatMap((s) => topStickerOnly(trackCorner(state, s)));
  const topCornersHome = () => CORNERS.top.flatMap((s) => trackCorner(state, s));
  const topEdgesHome = () => EDGES.top.flatMap((s) => trackEdge(state, s));

  // 1단계: 아랫면 흰색 십자
  run(0, mustFind(bottomEdges(), ALL_TURNS));
  // 2단계: 1층 꼭짓점 4개
  placeOneByOne(1, CORNERS.bottom, trackCorner, bottomEdges, MACROS.corners);
  // 3단계: 2층 모서리 4개
  placeOneByOne(2, EDGES.middle, trackEdge, () => [...bottomEdges(), ...bottomCorners()], MACROS.middle);
  // 4단계: 윗면 노란 십자
  run(3, mustFind(topEdgesUp(), MACROS.topCross));
  // 5단계: 윗면 전체를 노랗게
  run(4, mustFind([...topEdgesUp(), ...topCornersUp()], MACROS.topFace));
  // 6단계: 윗층 꼭짓점을 제자리로
  run(5, mustFind([...topEdgesUp(), ...topCornersHome()], MACROS.topCorners));
  // 7단계: 윗층 모서리를 제자리로
  run(6, mustFind([...topCornersHome(), ...topEdgesHome()], MACROS.topEdges));

  const final = simplify(steps);
  const moves = final.map((s) => s.move);
  if (!isSolved(applyMoves(start, moves))) throw new Error('초보자 풀이 검증 실패');
  return { start, moves, stages: final.map((s) => s.stage) };
}
