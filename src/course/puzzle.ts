// 화면 연습 공통: 문제 모양, 돌리기 버튼(한 면 돌리기 또는 "오른손 춤"), 목표까지 몇 번 남았는지 찾기
import { applyMoves, invertMove, type Move } from '../core/moves';
import { PIECES } from './pieces';

/** 흰 꽃 섬: 옆 꽃잎 / 아래 꽃잎 / 자리 비우고 올리기 */
export type PetalKind = 'side' | 'bottom' | 'busy';
/** 흰 십자 섬: 맞춰진 꽃잎 내리기 / 색 맞춰 내리기 */
export type CrossKind = 'drop' | 'match';
/** 1층 섬: 오른손 춤 한 번 / 들어갈 때까지 여러 번 / 자리 위로 데려와서 춤 */
export type CornerKind = 'dance1' | 'danceMore' | 'bring';
export type PuzzleKind = PetalKind | CrossKind | CornerKind;

/** 버튼 하나: 한 면 돌리기, 또는 오른손 춤(R U R' U' 네 번을 한 번에) */
export type PuzzleButton = Move | 'dance';
export const DANCE: Move[] = ['R', 'U', "R'", "U'"];

export interface Puzzle {
  kind: PuzzleKind;
  /** 노란색이 위인 큐브 그림 */
  state: string;
  /** 반짝일 조각이 지금 있는 칸들 */
  cells: number[];
  /** 누를 수 있는 버튼들 */
  buttons: PuzzleButton[];
  /** 조각이 들어갈 빈자리 칸 (비어 있는 동안 하늘색으로 칠한다) */
  slot?: number[];
  /** true면 buttons를 그 순서대로 하나씩 다 눌러야 성공: 차례인 버튼이 처음부터 늘 반짝인다 (오른손 춤을 한 동작씩 배울 때) */
  guided?: boolean;
  /** 다 됐는지 */
  goal: (state: string) => boolean;
  /** 다 될 때까지 버튼을 몇 번 더 눌러야 하는지 (너무 멀면 Infinity) */
  distance: (state: string) => number;
}

// 버튼 하나가 실제로 돌리는 회전들 (undo면 거꾸로)
export function buttonMoves(button: PuzzleButton, undo = false): Move[] {
  const moves = button === 'dance' ? DANCE : [button];
  return undo ? [...moves].reverse().map(invertMove) : moves;
}

// 목표까지 버튼을 최소 몇 번 눌러야 하는지 (max번 안에 안 되면 Infinity)
export function stepsTo(state: string, buttons: PuzzleButton[], goal: (s: string) => boolean, max: number): number {
  let layer = [state];
  const seen = new Set(layer);
  for (let depth = 0; depth <= max; depth++) {
    if (layer.some(goal)) return depth;
    const next: string[] = [];
    for (const s of layer)
      for (const b of buttons) {
        const t = press(s, b);
        if (!seen.has(t)) {
          seen.add(t);
          next.push(t);
        }
      }
    layer = next;
  }
  return Infinity;
}

// 버튼 하나를 누른 뒤 모습
export function press(state: string, button: PuzzleButton): string {
  return applyMoves(state, buttonMoves(button));
}

// 지금 눌러야 할 버튼 하나 (목표에 한 걸음 가까워지는 첫 버튼, 없으면 null)
export function nextButton(state: string, puzzle: Pick<Puzzle, 'buttons' | 'distance'>): PuzzleButton | null {
  const now = puzzle.distance(state);
  if (now === 0 || now === Infinity) return null;
  return puzzle.buttons.find((b) => puzzle.distance(press(state, b)) === now - 1) ?? null;
}

// 빈자리 칸이 아직 회색(X)이면 하늘색(S)으로 칠한 그림 (조각이 들어오면 그 색이 보인다)
export function paintSlot(state: string, slot?: number[]): string {
  if (!slot) return state;
  return [...state].map((c, i) => (c === 'X' && slot.includes(i) ? 'S' : c)).join('');
}

// 흰색 조각(keep이 고른 모양)과 가운데만 색을 남기고 나머지는 회색(X)으로 바꾼다
export function keepWhite(state: string, keep: (piece: number[]) => boolean): string {
  const gray = new Set(PIECES.filter((p) => p.length > 1 && !(p.some((i) => state[i] === 'U') && keep(p))).flat());
  return [...state].map((c, i) => (gray.has(i) ? 'X' : c)).join('');
}

// 목록에서 하나를 무작위로 고른다
export function pickOne<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

// 같은 회전을 0~3번 무작위로 만든다
export function randomTurns(face: string, rand: () => number, min = 0): Move[] {
  return Array.from({ length: min + Math.floor(rand() * (4 - min)) }, () => face);
}
