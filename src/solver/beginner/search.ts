// 초보자 풀이용 탐색 도구: "추적할 스티커들"이 목표 위치에 갈 때까지
// 정해진 공식(매크로)들을 조합해 가장 짧은 조합을 찾는다 (너비 우선 탐색)
import { applyMoves, parseAlg, type Move } from '../../core/moves';

/** 공식 하나: 회전 목록과, 그 공식이 각 칸을 어디로 보내는지의 표 */
export interface Macro {
  moves: Move[];
  perm: number[];
}

/** 추적 대상 스티커 하나 */
export interface Tracked {
  /** 지금 있는 칸 번호 */
  cur: number;
  /** 가야 할 칸 번호 */
  home: number;
  /** true면 정확한 칸이 아니라 "같은 면 위"에만 있으면 목표 달성 */
  faceOnly?: boolean;
}

const IDENTITY = Array.from({ length: 54 }, (_, i) => String.fromCharCode(48 + i)).join('');
const Y_TURN: Record<string, string> = { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D' };

// 회전 문자열을 공식(매크로)으로 만든다
export function makeMacro(alg: string): Macro {
  const moves = parseAlg(alg);
  const moved = applyMoves(IDENTITY, moves);
  const perm = new Array<number>(54);
  for (let to = 0; to < 54; to++) perm[moved.charCodeAt(to) - 48] = to;
  return { moves, perm };
}

// 같은 공식을 큐브의 네 방향(앞·오른쪽·뒤·왼쪽)에서 쓰는 4가지 버전으로 만든다
export function fromAllSides(alg: string): Macro[] {
  const variants: Macro[] = [];
  let current = alg;
  for (let k = 0; k < 4; k++) {
    variants.push(makeMacro(current));
    current = parseAlg(current).map((m) => Y_TURN[m[0]] + m.slice(1)).join(' ');
  }
  return variants;
}

/** 윗면만 돌리는 세 가지 회전 */
export const U_TURNS = ['U', "U'", 'U2'].map(makeMacro);
/** 18가지 기본 회전 전부 */
export const ALL_TURNS = [...'URFDLB'].flatMap((f) => [f, f + "'", f + '2'].map(makeMacro));

// 추적 스티커들이 모두 목표에 도달했는지 확인한다
function reached(pos: number[], tracked: Tracked[]): boolean {
  return tracked.every((t, i) =>
    t.faceOnly ? Math.floor(pos[i] / 9) === Math.floor(t.home / 9) : pos[i] === t.home,
  );
}

// 위치 목록을 중복 확인용 키로 만든다 (스티커가 적으면 숫자, 많으면 문자열)
function keyOf(pos: number[]): number | string {
  if (pos.length > 9) return String.fromCharCode(...pos);
  let key = 0;
  for (let i = 0; i < pos.length; i++) key = key * 54 + pos[i];
  return key;
}

// 추적 스티커들을 목표로 보내는 가장 짧은 공식 조합을 찾아 회전 목록으로 돌려준다 (없으면 null)
export function search(tracked: Tracked[], macros: Macro[], maxDepth = 10): Move[] | null {
  const start = tracked.map((t) => t.cur);
  const size = start.length;
  const nodes: number[][] = [start];
  const parent: number[] = [-1];
  const via: number[] = [-1];
  const depth: number[] = [0];
  const seen = new Set<number | string>([keyOf(start)]);

  for (let head = 0; head < nodes.length; head++) {
    const pos = nodes[head];
    if (reached(pos, tracked)) {
      const moves: Move[] = [];
      for (let n = head; parent[n] >= 0; n = parent[n]) moves.unshift(...macros[via[n]].moves);
      return moves;
    }
    if (depth[head] >= maxDepth) continue;
    for (let m = 0; m < macros.length; m++) {
      const perm = macros[m].perm;
      const next = new Array<number>(size);
      for (let i = 0; i < size; i++) next[i] = perm[pos[i]];
      const key = keyOf(next);
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push(next);
      parent.push(head);
      via.push(m);
      depth.push(depth[head] + 1);
    }
  }
  return null;
}
