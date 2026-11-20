// 빨리 맞추기 도중 "내 큐브가 달라"를 골랐을 때: 마지막으로 "맞아"라고 한 뒤 생길 수 있는 실수 중
// 아이가 보여 준 몇 면과 맞는 것을 찾아, 지금 큐브 상태와 완성까지 가는 길을 구한다. (화면과 무관한 순수 로직)
import { FACES, type Face } from '../core/faces';
import type { Move } from '../core/moves';
import { invertMoves, listMistakes, simplifyMoves, type Mistake } from './mistakes';

/** 아이에게 물어보는 면 순서: 나를 보는 초록 앞면 → 흰 윗면 → (그래도 모르면) 빨간 오른쪽 면 */
export const ASK_FACES: Face[] = ['F', 'U', 'R'];
/** 이만큼의 면은 꼭 받는다 (한 면만으로는 잘못 짚을 수 있어서) */
export const MIN_FACES = 2;

/** 아이가 보여 준 면 하나: cells는 9칸 색 글자. anyTurn이면 카메라로 찍어서 면이 돌아가 있을 수 있다 */
export interface FaceReading {
  face: Face;
  cells: string;
  anyTurn: boolean;
}

/** 찾은 결과: 지금 큐브 상태와 그렇게 된 실수 */
export interface Found {
  state: string;
  mistake: Mistake;
}

// 3x3 칸 글자를 시계 방향으로 90°씩 turns번 돌린다
export function turnCells(cells: string, turns: number): string {
  let cur = cells;
  for (let t = 0; t < turns % 4; t++) cur = [...cur].map((_, i) => cur[(2 - (i % 3)) * 3 + Math.floor(i / 3)]).join('');
  return cur;
}

// 큐브 상태의 한 면이 아이가 보여 준 면과 같은지 본다 (카메라면 4방향 중 하나라도 같으면 같다)
function sameFace(state: string, reading: FaceReading): boolean {
  const base = FACES.indexOf(reading.face) * 9;
  const real = state.slice(base, base + 9);
  const turns = reading.anyTurn ? [0, 1, 2, 3] : [0];
  return turns.some((k) => turnCells(reading.cells, k) === real);
}

// 확인한 뒤 돌린 회전들(window)에서 생길 수 있는 실수를 모두 만든다 (checkpoint: 마지막으로 맞다고 한 상태)
export function listCandidates(checkpoint: string, window: Move[]): Map<string, Mistake> {
  return listMistakes(checkpoint, window);
}

// 아이가 보여 준 면들과 맞는 큐브 상태를 모두 찾는다
export function matchReadings(all: Map<string, Mistake>, readings: FaceReading[]): Found[] {
  return [...all].filter(([state]) => readings.every((r) => sameFace(state, r))).map(([state, mistake]) => ({ state, mistake }));
}

// 틀린 회전을 되돌린 뒤, 확인한 곳부터 남은 풀이를 그대로 하는 길 (rest: 확인한 곳부터 끝까지의 풀이)
export function undoPath(done: Move[], rest: Move[]): Move[] {
  return simplifyMoves([...invertMoves(done), ...rest]);
}

// 두 길 중 더 짧은 쪽을 고른다 (새로 푼 길이 없으면 되돌리는 길)
export function shorterPath(undo: Move[], fresh: Move[] | null): Move[] {
  return fresh && fresh.length < undo.length ? fresh : undo;
}

// 칸을 하나도 모르는 큐브(가운데만 채움)에 아이가 보여 준 면들을 채워 넣는다 (전체 입력으로 넘길 때)
export function fillReadings(empty: string, readings: FaceReading[]): string {
  let state = empty;
  for (const r of readings) {
    const base = FACES.indexOf(r.face) * 9;
    state = state.slice(0, base) + r.cells + state.slice(base + 9);
  }
  return state;
}
