// 1~4단계(꽃 → 흰 십자 → 1층 꼭짓점 → 2층): 사람이 배우는 규칙 그대로 한 조각씩 맞춘다.
// 넣을 자리는 언제나 "앞-오른쪽"이 되도록 큐브를 통째로 돌리므로, 아이는 같은 공식만 반복하면 된다.
import { applyMoves, type Move } from '../../core/moves';
import { CORNER_FACELETS, EDGE_FACELETS } from '../../core/validate';
import type { LessonBuilder } from './lesson';
import { CORNERS, EDGES, colorsOfSlot, findPiece, isAt, isHome, layerOf } from './pieces';
import { ALL_TURNS, search, type Tracked } from './search';

const [UR, UF] = EDGE_FACELETS;
const FR = EDGE_FACELETS[8];
const URF = CORNER_FACELETS[0];
const DFR = CORNER_FACELETS[4];
const U_CENTER = 4, R_CENTER = 13, F_CENTER = 22, D_CENTER = 31;

// 같은 방향으로 n번(0~3) 돌리는 회전 기호를 만든다
function turn(letter: string, n: number): Move[] {
  return n === 0 ? [] : [letter + ['', '', '2', "'"][n]];
}

// 큐브를 통째로 r번, 윗줄을 a번 돌려서 조건이 맞는 경우를 찾는다 (적게 돌리는 것부터)
function findSetup(state: string, allowTop: boolean, test: (s: string) => boolean): { cube: Move[]; top: Move[] } | null {
  for (const r of [0, 1, 3, 2])
    for (const a of allowTop ? [0, 1, 3, 2] : [0]) {
      const cube = turn('y', r), top = turn('U', a);
      if (test(applyMoves(state, [...cube, ...top]))) return { cube, top };
    }
  return null;
}

// 규칙이 통하지 않으면 오류를 낸다 (정상적인 큐브라면 일어나지 않는다)
function must<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`초보자 풀이 실패: ${what}`);
  return value;
}

// 남은 조각 중 가장 적게 돌려도 되는 것부터 하나씩 미션을 진행한다
function placeCheapest(b: LessonBuilder, pieces: string[], mission: (b: LessonBuilder, colors: string) => void): void {
  const remaining = [...pieces];
  while (remaining.length) {
    const costs = remaining.map((colors) => {
      const trial = b.fork();
      mission(trial, colors);
      return trial.moveCount;
    });
    const best = remaining.splice(costs.indexOf(Math.min(...costs)), 1)[0];
    mission(b, best);
  }
}

// 1단계: 흰색 모서리 조각 4개를 노란 가운데 둘레(윗면)로 올려 "꽃"을 만든다. 내려야 할 조각 목록을 돌려준다.
export function makeDaisy(b: LessonBuilder): string[] {
  const white = b.state[D_CENTER];
  const all = EDGES.bottom.map((slot) => colorsOfSlot(b.state, EDGE_FACELETS[slot]));
  const fixed = all.filter((c) => isHome(findPiece(b.state, c, EDGE_FACELETS)));
  const todo = all.filter((c) => !fixed.includes(c));
  // 흰색 스티커가 윗면을 보기만 하면 되는 추적 조건
  const petal = (colors: string): Tracked => {
    const sticker = findPiece(b.state, colors, EDGE_FACELETS).find((t) => b.state[t.cur] === white)!;
    return { cur: sticker.cur, home: U_CENTER, faceOnly: true };
  };
  const remaining = [...todo];
  const done: string[] = [];
  while (remaining.length) {
    const keep = [...fixed.flatMap((c) => findPiece(b.state, c, EDGE_FACELETS)), ...done.map(petal)];
    const options = remaining.map((colors) => must(search([...keep, petal(colors)], ALL_TURNS), '꽃잎'));
    const best = options.reduce((x, y) => (y.length < x.length ? y : x));
    const colors = remaining.splice(options.indexOf(best), 1)[0];
    b.begin(0, findPiece(b.state, colors, EDGE_FACELETS).map((t) => t.cur));
    b.add('free', best, 'petal');
    b.end();
    done.push(colors);
  }
  return todo;
}

// 2단계: 꽃잎을 하나씩, 옆 색이 같은 가운데 위로 가져간 뒤 두 번 돌려 아래로 내린다
export function dropPetals(b: LessonBuilder, petals: string[]): void {
  placeCheapest(b, petals, (lb, colors) => {
    const white = lb.state[D_CENTER];
    const side = [...colors].find((c) => c !== white)!;
    const petal = findPiece(lb.state, colors, EDGE_FACELETS);
    lb.begin(1, petal.map((t) => t.cur), petal.map((t) => t.home));
    const setup = must(findSetup(lb.state, true, (s) =>
      isAt(findPiece(s, colors, EDGE_FACELETS), UF) && s[UF[0]] === white && s[UF[1]] === s[F_CENTER]), '꽃잎 내리기');
    lb.add('turnCube', setup.cube, 'turnColor', { color: side });
    lb.add('setup', setup.top, 'setupPetal', { color: side });
    lb.add('free', ['F2'], 'drop');
    must(isHome(findPiece(lb.state, colors, EDGE_FACELETS)) || null, '흰 십자');
    lb.end();
  });
}

// 3단계: 흰색 꼭짓점 4개를 "오른쪽 공식 / 앞쪽 공식"으로 1층에 넣는다 (oneDance면 앞쪽 공식 대신 오른쪽 공식 5번)
export function placeCorners(b: LessonBuilder, oneDance = false): void {
  const pieces = CORNERS.bottom.map((slot) => colorsOfSlot(b.state, CORNER_FACELETS[slot]));
  placeCheapest(b, pieces, (lb, colors) => {
    const find = (s: string) => findPiece(s, colors, CORNER_FACELETS);
    if (isHome(find(lb.state))) return;
    const white = lb.state[D_CENTER];
    lb.begin(2, find(lb.state).map((t) => t.cur), find(lb.state).map((t) => t.home));
    for (let guard = 0; guard < 4 && !isHome(find(lb.state)); guard++) {
      if (layerOf(find(lb.state)) < 0) {
        // 아래층에 잘못 끼어 있으면: 그 자리를 앞-오른쪽으로 가져와 공식 한 번으로 꺼낸다
        const out = must(findSetup(lb.state, false, (s) => isAt(find(s), DFR)), '꼭짓점 꺼내기');
        lb.add('turnCube', out.cube, 'turnStuck');
        lb.formula('right', 1, 'cornerStuck');
        continue;
      }
      const setup = must(findSetup(lb.state, true, (s) =>
        isAt(find(s), URF) && find(s).every((t) => DFR.includes(t.home))), '꼭짓점 준비');
      lb.add('turnCube', setup.cube, 'turnSlot');
      lb.add('setup', setup.top, 'setupAbove');
      // 흰색 스티커가 보는 방향에 따라 공식이 정해진다
      const facing = Math.floor(find(lb.state).find((t) => lb.state[t.cur] === white)!.cur / 9);
      if (facing === 1) lb.formula('right', 1, 'cornerRight');
      else if (facing === 2) lb.formula(oneDance ? 'right' : 'front', oneDance ? 5 : 1, 'cornerFront');
      else lb.formula('right', 3, 'cornerUp');
    }
    must(isHome(find(lb.state)) || null, '1층 꼭짓점');
    lb.end();
  });
}

// 4단계: 노란색이 없는 모서리 조각 4개를 2층에 넣는다
export function placeMiddleEdges(b: LessonBuilder): void {
  const pieces = EDGES.middle.map((slot) => colorsOfSlot(b.state, EDGE_FACELETS[slot]));
  placeCheapest(b, pieces, (lb, colors) => {
    const find = (s: string) => findPiece(s, colors, EDGE_FACELETS);
    if (isHome(find(lb.state))) return;
    lb.begin(3, find(lb.state).map((t) => t.cur), find(lb.state).map((t) => t.home));
    for (let guard = 0; guard < 4 && !isHome(find(lb.state)); guard++) {
      if (layerOf(find(lb.state)) === 0) {
        // 2층에 잘못 끼어 있으면: 앞-오른쪽으로 가져와 공식 한 번으로 윗층으로 꺼낸다
        const out = must(findSetup(lb.state, false, (s) => isAt(find(s), FR)), '모서리 꺼내기');
        lb.add('turnCube', out.cube, 'turnStuck');
        lb.formula('toRight', 1, 'edgeStuck');
        continue;
      }
      // 조각의 옆 색이 앞 가운데와 같게 붙는 경우(오른쪽으로 보내기)와, 오른쪽 가운데와 같게 붙는 경우(앞으로 보내기)
      const front = findSetup(lb.state, true, (s) =>
        isAt(find(s), UF) && s[UF[1]] === s[F_CENTER] && s[UF[0]] === s[R_CENTER]);
      const right = front ? null : must(findSetup(lb.state, true, (s) =>
        isAt(find(s), UR) && s[UR[1]] === s[R_CENTER] && s[UR[0]] === s[F_CENTER]), '모서리 준비');
      const setup = (front ?? right)!;
      lb.add('turnCube', setup.cube, 'turnSlot');
      const top = applyMoves(lb.state, setup.top);
      lb.add('setup', setup.top, 'setupMatch', { color: front ? top[F_CENTER] : top[R_CENTER] });
      if (front) lb.formula('toRight', 1, 'edgeFront');
      else lb.formula('toFront', 1, 'edgeRight');
    }
    must(isHome(find(lb.state)) || null, '2층 모서리');
    lb.end();
  });
}
