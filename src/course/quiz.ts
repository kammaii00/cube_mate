// 조각 알기 섬의 문제 만들기: 섞인 큐브 그림에서 "이 색 조각 찾기", "이 흰 모서리는 어느 가운데 옆으로 갈까?"
import { SOLVED, type Face } from '../core/faces';
import { applyMoves } from '../core/moves';
import { randomMoves } from '../core/scramble';
import { CORNERS, EDGES, WHITE_EDGES, colorsAt, homeFace, whereIs, type Piece } from './pieces';
import type { QuizKind } from './skills';

/** 처음 보이는 면 (위·오른쪽·앞). 찾을 조각은 여기 한 칸이라도 보이게 고른다 */
const VISIBLE: Face[] = ['U', 'R', 'F'];

export interface Question {
  kind: QuizKind;
  /** 그림으로 보여 줄 섞인 큐브 */
  state: string;
  /** 찾을 조각의 색들 (whereEdge는 그 흰 모서리의 색) */
  colors: Face[];
  /** 정답 칸들 (find: 그 조각이 지금 있는 칸, where: 반짝일 조각 칸) */
  cells: Piece;
  /** whereEdge: 그 조각의 집(제자리) 칸들 = 정답 자리, 함께 반짝일 두 가운데 칸 */
  home?: Piece;
  centers?: number[];
}

// 목록에서 하나를 무작위로 고른다
function pickOne<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

// 문제 하나를 만든다
export function makeQuestion(kind: QuizKind, rand = Math.random): Question {
  // 첫 레벨(모서리 찾기)은 거의 맞춘 큐브(두 번만 돌림)에서, 나머지는 다 섞인 큐브에서
  const state = applyMoves(SOLVED, randomMoves(kind === 'findEdge' ? 2 : 25, rand));
  const pool = kind === 'findCorner' ? CORNERS : kind === 'findEdge' ? EDGES : WHITE_EDGES;
  // 보이는 곳에 있는 조각만 고른다. 집 찾기는 이미 집에 있는 조각은 뺀다
  const atHome = (p: Piece) => whereIs(state, p).every((i) => p.includes(i));
  const visible = pool.filter((p) => whereIs(state, p).some((i) => VISIBLE.includes(homeFace(i))) && !(kind === 'whereEdge' && atHome(p)));
  const piece = pickOne(visible.length ? visible : pool, rand);
  const cells = whereIs(state, piece);
  const colors = piece.map(homeFace);
  // 흰색을 앞에 두고 부른다 (예: 흰색-빨강)
  colors.sort((a, b) => (a === 'U' ? -1 : b === 'U' ? 1 : 0));
  if (kind !== 'whereEdge') return { kind, state, colors, cells };
  return { kind, state, colors, cells, home: piece, centers: piece.map((i) => Math.floor(i / 9) * 9 + 4) };
}

// 집 찾기: 누른 칸이 그 조각의 집(제자리) 칸인지 본다
export function isHomePicked(q: Question, cell: number): boolean {
  return !!q.home?.includes(cell);
}

// 누른 자리가 모서리 자리면 그 자리가 어느 두 가운데 사이인지(면 색들), 아니면 null
export function between(location: Piece): Face[] | null {
  return location.length === 2 ? location.map(homeFace) : null;
}

// 누른 칸이 찾는 조각인지 본다
export function isPicked(q: Question, cell: number): boolean {
  return q.cells.includes(cell);
}

// 누른 칸의 조각 색들 (틀렸을 때 "그건 ○-○ 조각이야"로 알려 준다)
export function pickedColors(state: string, location: Piece): Face[] {
  return colorsAt(state, location);
}

/** 회색으로 칠할 때 쓰는 글자 (면 색이 아니라서 그림에서 회색으로 보인다) */
const GRAY = 'X';

/** 누를 수 있는 모서리 빈자리 글자 (그림에서 연한 하늘색) */
const SLOT = 'S';
const EDGE_CELLS = new Set(EDGES.flat());

// 집 찾기 그림: 가운데와 찾는 조각만 색을 두고, 나머지 모서리 자리는 하늘색(누르는 곳), 꼭짓점은 회색. 맞히면 집 자리에 그 조각 색을 칠한다
export function focusState(q: Question, solved: boolean): string {
  const centers = new Set([4, 13, 22, 31, 40, 49]);
  return [...q.state]
    .map((ch, i) => {
      if (solved && q.home?.includes(i)) return homeFace(i);
      return centers.has(i) ? ch : EDGE_CELLS.has(i) ? SLOT : GRAY;
    })
    .join('');
}
