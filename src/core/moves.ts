// 큐브 회전 규칙: 회전 기호(R, U', F2 등)를 54칸 문자열에 적용한다
import { FACES, FACELETS, FACE_NORMALS, type Face, type Vec3 } from './faces';

/** 회전 하나. 예: "R"(시계 90°), "R'"(반시계 90°), "R2"(180°).
 * "y", "y'", "y2"는 큐브를 통째로 돌리는 것(윗면을 돌리는 방향과 같음)이다. */
export type Move = string;

// 두 벡터의 내적
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// 두 벡터의 외적
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// 벡터 v를 축 n 기준으로 시계 방향(그 면을 정면에서 봤을 때) 90° 돌린다
function rotateCW(v: Vec3, n: Vec3): Vec3 {
  const d = dot(v, n);
  const c = cross(n, v);
  return [n[0] * d - c[0], n[1] * d - c[1], n[2] * d - c[2]];
}

// 위치+방향을 문자열 키로 만든다 (칸 찾기용)
function slotKey(pos: Vec3, normal: Vec3): string {
  return pos.join(',') + '|' + normal.join(',');
}

const SLOT_INDEX = new Map<string, number>(
  FACELETS.map((f, i) => [slotKey(f.pos, f.normal), i]),
);

// 한 면을 시계 방향 90° 돌릴 때 "각 칸이 어디로 가는지" 표를 만든다
function buildQuarterTurn(face: Face): number[] {
  const n = FACE_NORMALS[face];
  return FACELETS.map((f, i) => {
    if (dot(f.pos, n) !== 1) return i;
    const key = slotKey(rotateCW(f.pos, n), rotateCW(f.normal, n));
    return SLOT_INDEX.get(key)!;
  });
}

const QUARTER: Record<Face, number[]> = Object.fromEntries(
  FACES.map((f) => [f, buildQuarterTurn(f)]),
) as Record<Face, number[]>;

/** 큐브를 통째로 90° 돌릴 때(윗면 시계 방향과 같은 방향) 각 칸이 어디로 가는지 */
const WHOLE_TURN: number[] = FACELETS.map(
  (f) => SLOT_INDEX.get(slotKey(rotateCW(f.pos, FACE_NORMALS.U), rotateCW(f.normal, FACE_NORMALS.U)))!,
);

// 회전 기호 뒤의 표시('', "'", '2')를 시계 방향 90° 횟수(1~3)로 바꾼다
function turnCount(move: Move): number {
  const suffix = move.slice(1);
  const turns = suffix === '' ? 1 : suffix === '2' ? 2 : suffix === "'" ? 3 : 0;
  if (turns === 0) throw new Error(`알 수 없는 회전: ${move}`);
  return turns;
}

// 큐브를 통째로 돌리는 기호(y, y', y2)이면 돌리는 횟수(1~3)를, 아니면 0을 돌려준다
export function wholeTurns(move: Move): number {
  return move[0] === 'y' ? turnCount(move) : 0;
}

// 회전 기호를 면과 횟수(시계 방향 90° 기준 1~3회)로 풀어낸다
export function parseMove(move: Move): { face: Face; turns: number } {
  const face = move[0] as Face;
  if (!FACES.includes(face)) throw new Error(`알 수 없는 회전: ${move}`);
  return { face, turns: turnCount(move) };
}

// 회전 하나를 큐브 상태에 적용한 새 상태를 돌려준다
export function applyMove(state: string, move: Move): string {
  const whole = wholeTurns(move);
  const turns = whole || parseMove(move).turns;
  const table = whole ? WHOLE_TURN : QUARTER[move[0] as Face];
  let cur = state.split('');
  for (let t = 0; t < turns; t++) {
    const next = cur.slice();
    for (let i = 0; i < 54; i++) next[table[i]] = cur[i];
    cur = next;
  }
  return cur.join('');
}

// 여러 회전을 순서대로 적용한다
export function applyMoves(state: string, moves: Move[]): string {
  return moves.reduce(applyMove, state);
}

// "R U' F2" 같은 문자열을 회전 목록으로 나눈다
export function parseAlg(alg: string): Move[] {
  return alg.trim().split(/\s+/).filter(Boolean);
}

// 회전 하나를 되돌리는 회전을 구한다
export function invertMove(move: Move): Move {
  const { face, turns } = parseMove(move);
  return turns === 2 ? move : turns === 1 ? face + "'" : face;
}

// 풀이 과정의 각 단계별 큐브 상태 목록을 만든다 (0번 = 시작 상태)
export function statesAlong(start: string, moves: Move[]): string[] {
  const states = [start];
  for (const m of moves) states.push(applyMove(states[states.length - 1], m));
  return states;
}

// 큐브 전체를 앞뒤 축으로 180° 뒤집은 상태를 구한다 (위↔아래, 왼쪽↔오른쪽이 바뀌고 앞면은 그대로)
export function flipUpsideDown(state: string): string {
  const next = new Array<string>(54);
  for (let i = 0; i < 54; i++) next[flipFacelet(i)] = state[i];
  return next.join('');
}

// 큐브를 위아래로 뒤집었을 때 칸 하나가 옮겨 가는 칸 번호를 구한다
export function flipFacelet(index: number): number {
  const f = FACELETS[index];
  const pos: Vec3 = [-f.pos[0] || 0, -f.pos[1] || 0, f.pos[2]];
  const normal: Vec3 = [-f.normal[0] || 0, -f.normal[1] || 0, f.normal[2]];
  return SLOT_INDEX.get(slotKey(pos, normal))!;
}

// 여섯 면이 각각 한 가지 색으로 채워졌는지(=완성인지) 확인한다
export function isSolved(state: string): boolean {
  for (let face = 0; face < 6; face++)
    for (let cell = 1; cell < 9; cell++) if (state[face * 9 + cell] !== state[face * 9]) return false;
  return true;
}
