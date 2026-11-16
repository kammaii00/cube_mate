// 입력된 큐브가 실제로 존재할 수 있는 상태인지 검사한다
import { FACES, type Face } from './faces';

export type ValidationCode =
  | 'incomplete' // 아직 안 채운 칸이 있음
  | 'center' // 가운데 칸 색이 잘못됨
  | 'count' // 어떤 색이 9칸이 아님
  | 'badPiece' // 존재하지 않는 색 조합의 조각
  | 'dupPiece' // 같은 조각이 두 번 나옴
  | 'flip' // 모서리 조각 하나가 뒤집힘
  | 'twist' // 꼭짓점 조각 하나가 돌아감
  | 'parity'; // 조각 두 개가 서로 바뀜

export interface ValidationError {
  code: ValidationCode;
  /** 의심되는 칸 번호들 (화면에서 강조 표시) */
  facelets: number[];
  /** count 오류일 때: 색별 개수 */
  counts?: Record<Face, number>;
}

// 표준 칸 번호: U=0~8, R=9~17, F=18~26, D=27~35, L=36~44, B=45~53
export const CORNER_FACELETS = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
];
export const EDGE_FACELETS = [
  [5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25],
  [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14],
];
const CORNER_COLORS = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
const EDGE_COLORS = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

// 순열이 짝수 번 교환인지(0) 홀수 번 교환인지(1) 계산한다
function permutationParity(perm: number[]): number {
  let parity = 0;
  for (let i = 0; i < perm.length; i++)
    for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) parity ^= 1;
  return parity;
}

// 색 개수(각 9칸)를 검사한다
function checkCounts(state: string): ValidationError | null {
  const counts = Object.fromEntries(FACES.map((f) => [f, 0])) as Record<Face, number>;
  for (const ch of state) if (ch in counts) counts[ch as Face]++;
  if (FACES.every((f) => counts[f] === 9)) return null;
  const over = FACES.filter((f) => counts[f] > 9);
  const facelets = [...state].flatMap((ch, i) => (over.includes(ch as Face) ? [i] : []));
  return { code: 'count', facelets, counts };
}

// 조각(꼭짓점/모서리)들을 읽어 어떤 조각이 어느 방향으로 있는지 알아낸다
function readPieces(
  state: string,
  slots: number[][],
  colors: string[],
): { perm: number[]; ori: number[]; bad: number[]; dup: number[] } {
  const size = slots[0].length;
  const perm: number[] = [];
  const ori: number[] = [];
  const bad: number[] = [];
  const dup: number[] = [];
  const seen = new Map<number, number[]>();
  for (const slot of slots) {
    const found = state[slot[0]] + state[slot[1]] + (size === 3 ? state[slot[2]] : '');
    let piece = -1;
    let twist = 0;
    for (let o = 0; o < size && piece < 0; o++) {
      const rotated = found.slice(o) + found.slice(0, o);
      piece = colors.indexOf(rotated);
      twist = o;
    }
    if (piece < 0) {
      bad.push(...slot);
      continue;
    }
    if (seen.has(piece)) dup.push(...slot, ...seen.get(piece)!);
    seen.set(piece, slot);
    perm.push(piece);
    ori.push(twist);
  }
  return { perm, ori, bad, dup };
}

// 큐브 상태를 검사해 문제 목록을 돌려준다 (빈 배열이면 정상)
export function validate(state: string): ValidationError[] {
  if (state.length !== 54) throw new Error('큐브 상태는 54칸이어야 합니다');
  const missing = [...state].flatMap((ch, i) => (ch === '?' ? [i] : []));
  if (missing.length) return [{ code: 'incomplete', facelets: missing }];

  const wrongCenters = FACES.flatMap((f, i) => (state[i * 9 + 4] === f ? [] : [i * 9 + 4]));
  if (wrongCenters.length) return [{ code: 'center', facelets: wrongCenters }];

  const countError = checkCounts(state);
  if (countError) return [countError];

  const corners = readPieces(state, CORNER_FACELETS, CORNER_COLORS);
  const edges = readPieces(state, EDGE_FACELETS, EDGE_COLORS);
  const bad = [...corners.bad, ...edges.bad];
  if (bad.length) return [{ code: 'badPiece', facelets: bad }];
  const dup = [...new Set([...corners.dup, ...edges.dup])];
  if (dup.length) return [{ code: 'dupPiece', facelets: dup }];

  const errors: ValidationError[] = [];
  if (edges.ori.reduce((a, b) => a + b, 0) % 2 !== 0) errors.push({ code: 'flip', facelets: [] });
  if (corners.ori.reduce((a, b) => a + b, 0) % 3 !== 0) errors.push({ code: 'twist', facelets: [] });
  if (permutationParity(corners.perm) !== permutationParity(edges.perm))
    errors.push({ code: 'parity', facelets: [] });
  return errors;
}

// 큐브 상태에 "말이 안 되는 부분"이 몇 군데인지 센다 (0이면 정상).
// 카메라 스캔에서 각 면이 어느 방향으로 찍혔는지 추론할 때 점수로 쓴다.
export function countProblems(state: string): number {
  const corners = readPieces(state, CORNER_FACELETS, CORNER_COLORS);
  const edges = readPieces(state, EDGE_FACELETS, EDGE_COLORS);
  const broken = (corners.bad.length + corners.dup.length) / 3 + (edges.bad.length + edges.dup.length) / 2;
  if (broken > 0) return broken + 3;
  let problems = 0;
  if (edges.ori.reduce((a, b) => a + b, 0) % 2 !== 0) problems++;
  if (corners.ori.reduce((a, b) => a + b, 0) % 3 !== 0) problems++;
  if (permutationParity(corners.perm) !== permutationParity(edges.perm)) problems++;
  return problems;
}
