// 정해진 회전 묶음을 따라 하다 틀렸을 때: 아이가 했을 법한 실수들을 미리 계산해 두고,
// 아이가 알려 준 몇 면의 색과 맞는 것을 찾아 "어디서 틀렸는지"와 "돌려놓는 방법"을 구한다.
import { FACES } from '../core/faces';
import { applyMove, applyMoves, flipUpsideDown, type Move } from '../core/moves';

/** 실수의 종류: 맞게 함 / 중간에 멈춤 / 방향을 반대로 / 다른 줄을 돌림 / 한 칸 빼먹음 / 한 번 더 돌림 / 공식을 더 함 */
export type MistakeKind = 'ok' | 'stopped' | 'direction' | 'otherFace' | 'skipped' | 'extra' | 'tooMany';

export interface Mistake {
  kind: MistakeKind;
  /** 몇 번째 회전에서 일어났는지 (0부터, 묶음 전체 기준) */
  at: number;
  /** 아이가 실제로 돌린 것으로 보이는 회전들 */
  done: Move[];
  /** 돌려놓는 회전들과, 다 돌리면 어디에 도착하는지 (post: 묶음을 다 한 모습, pre: 묶음을 하기 전 모습) */
  fix: Move[];
  target: 'post' | 'pre';
}

const SUFFIX = ['', '', '2', "'"];
const TURNS = FACES.flatMap((f) => [f, f + '2', f + "'"]);

// 회전 기호를 글자와 횟수(1~3)로 나눈다
function split(move: Move): [string, number] {
  return [move[0], SUFFIX.indexOf(move.slice(1), 1)];
}

// 회전들을 거꾸로 되돌리는 회전 목록을 구한다
export function invertMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map((m) => {
    const [letter, n] = split(m);
    return letter + SUFFIX[4 - n];
  });
}

// 바로 이어지는 같은 줄 회전을 합쳐서 줄인다 (예: R R' → 없음, U U → U2)
export function simplifyMoves(moves: Move[]): Move[] {
  const out: [string, number][] = [];
  for (const move of moves) {
    const [letter, n] = split(move);
    const last = out[out.length - 1];
    if (last && last[0] === letter) {
      last[1] = (last[1] + n) % 4;
      if (last[1] === 0) out.pop();
    } else out.push([letter, n]);
  }
  return out.map(([letter, n]) => letter + SUFFIX[n]);
}

// 아이가 돌린 회전(done)에서 가장 빨리 수업으로 돌아가는 길을 구한다
function bestFix(done: Move[], moves: Move[]): Pick<Mistake, 'fix' | 'target'> {
  const back = simplifyMoves(invertMoves(done));
  const forward = simplifyMoves([...invertMoves(done), ...moves]);
  return forward.length <= back.length ? { fix: forward, target: 'post' } : { fix: back, target: 'pre' };
}

// 묶음(moves)을 하다가 생길 수 있는 실수들을 모두 만들어, 결과 상태별로 가장 그럴듯한 것 하나씩 모은다.
// formulaSize가 있으면 "공식을 한 번 더 함"도 포함한다.
export function listMistakes(pre: string, moves: Move[], formulaSize = 0): Map<string, Mistake> {
  const found = new Map<string, Mistake>();
  const rank: MistakeKind[] = ['ok', 'stopped', 'direction', 'skipped', 'tooMany', 'extra', 'otherFace'];
  const add = (kind: MistakeKind, at: number, done: Move[]) => {
    const state = applyMoves(pre, done);
    const old = found.get(state);
    const next = { kind, at, done, ...bestFix(done, moves) };
    if (!old || rank.indexOf(kind) < rank.indexOf(old.kind) || (kind === old.kind && next.fix.length < old.fix.length))
      found.set(state, next);
  };
  const n = moves.length;
  add('ok', n, moves);
  for (let k = 0; k < n; k++) add('stopped', k, moves.slice(0, k));
  if (formulaSize) for (let k = 1; k <= formulaSize; k++) add('tooMany', n, [...moves, ...moves.slice(0, k)]);
  // 한 군데만 틀리고, 그 뒤로 k번째까지 계속한 경우들
  for (let k = 1; k <= n; k++) {
    const part = moves.slice(0, k);
    for (let i = 0; i < k; i++) {
      for (const turn of TURNS)
        if (turn !== part[i]) add(turn[0] === part[i][0] ? 'direction' : 'otherFace', i, [...part.slice(0, i), turn, ...part.slice(i + 1)]);
      add('skipped', i, [...part.slice(0, i), ...part.slice(i + 1)]);
    }
    for (let i = 0; i <= k; i++)
      for (const turn of TURNS) add('extra', i, [...part.slice(0, i), turn, ...part.slice(i)]);
  }
  return found;
}

// 아이가 알려 준 색(seen: 모르는 칸은 '?')과 맞는 실수들을 고른다
export function matchMistakes(all: Map<string, Mistake>, seen: string): Mistake[] {
  const known = [...seen].map((c, i) => [c, i] as const).filter(([c]) => c !== '?');
  return [...all].filter(([state]) => known.every(([c, i]) => state[i] === c)).map(([, mistake]) => mistake);
}

// 수업에서 쓰는 방향(노란색 위)의 상태를 색 입력 화면의 기준 방향(가운데 색 = 면 글자)으로 돌려놓는다
export function toStandard(state: string): string {
  for (let s of [state, flipUpsideDown(state)])
    for (let k = 0; k < 4; k++) {
      if (FACES.every((f, i) => s[i * 9 + 4] === f)) return s;
      s = applyMove(s, 'y');
    }
  return state;
}
