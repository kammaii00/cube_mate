// 꼬마 코스에서 쓰는 조각 정보: 54칸을 26개 조각(같은 위치의 칸 묶음)으로 나누고, 조각이 지금 어디 있는지 찾는다
import { FACELETS, FACES, type Face } from '../core/faces';
import { applyMove, type Move } from '../core/moves';

/** 조각 하나 = 그 조각에 붙은 칸 번호들 (제자리 기준이면 그 조각의 집, 아니면 지금 위치) */
export type Piece = number[];

// 칸 번호의 제 색 (흰색 위·초록 앞으로 잡았을 때 그 칸에 있어야 할 색 = 면 글자)
export function homeFace(i: number): Face {
  return FACES[Math.floor(i / 9)];
}

// 같은 위치에 붙은 칸들을 묶어 조각 목록을 만든다
function groupPieces(): Piece[] {
  const map = new Map<string, number[]>();
  FACELETS.forEach((f, i) => {
    const key = f.pos.join(',');
    map.set(key, [...(map.get(key) ?? []), i]);
  });
  return [...map.values()];
}
export const PIECES = groupPieces();
export const EDGES = PIECES.filter((p) => p.length === 2);
export const CORNERS = PIECES.filter((p) => p.length === 3);
/** 흰색이 붙은 모서리 4개 (흰 꽃·흰 십자의 꽃잎) */
export const WHITE_EDGES = EDGES.filter((p) => p.some((i) => homeFace(i) === 'U'));

// 칸 하나가 붙어 있는 조각(위치)의 칸들
export function pieceAt(cell: number): Piece {
  return PIECES.find((p) => p.includes(cell))!;
}

// 위치(칸 묶음)에 지금 붙어 있는 색들
export function colorsAt(state: string, location: Piece): Face[] {
  return location.map((i) => state[i] as Face);
}

// 조각(제자리 칸 목록)이 지금 큐브의 어느 칸들에 가 있는지 찾는다 (색 묶음이 같은 위치)
export function whereIs(state: string, piece: Piece): Piece {
  const want = piece.map(homeFace).sort().join();
  return PIECES.find((p) => p.length === piece.length && colorsAt(state, p).sort().join() === want) ?? [];
}

const IDENTITY = Array.from({ length: 54 }, (_, i) => String.fromCharCode(48 + i)).join('');

// 회전 하나를 하면 칸들이 어느 칸으로 옮겨 가는지 구한다 (조각 소개 애니메이션에서 반짝임을 따라가게)
export function followCells(cells: number[], move: Move): number[] {
  const moved = applyMove(IDENTITY, move);
  return cells.map((i) => moved.indexOf(String.fromCharCode(48 + i)));
}
