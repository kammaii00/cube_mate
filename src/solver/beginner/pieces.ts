// 조각 찾기: 색 조합으로 조각을 찾아, 지금 어디에 있고 어디로 가야 하는지 알려준다.
// 큐브를 통째로 돌려도(가운데 색이 옮겨가도) 가운데 색을 기준으로 하므로 그대로 쓸 수 있다.
import { FACELETS } from '../../core/faces';
import { CORNER_FACELETS, EDGE_FACELETS } from '../../core/validate';
import type { Tracked } from './search';

/** 모서리 조각 자리 번호 (윗층 0~3, 아래층 4~7, 가운데층 8~11) */
export const EDGES = { top: [0, 1, 2, 3], bottom: [4, 5, 6, 7], middle: [8, 9, 10, 11] };
/** 꼭짓점 조각 자리 번호 (윗층 0~3, 아래층 4~7) */
export const CORNERS = { top: [0, 1, 2, 3], bottom: [4, 5, 6, 7] };

// 어떤 칸이 속한 면의 가운데 색을 구한다 (그 칸에 와야 하는 색)
function centerColor(state: string, index: number): string {
  return state[Math.floor(index / 9) * 9 + 4];
}

// 어떤 자리에 와야 하는 조각의 색 조합을 (정렬된 글자로) 구한다
export function colorsOfSlot(state: string, slot: number[]): string {
  return slot.map((i) => centerColor(state, i)).sort().join('');
}

// 색 조합이 colors인 조각을 찾아, 스티커별 현재 칸과 목표 칸을 돌려준다
export function findPiece(state: string, colors: string, allSlots: number[][]): Tracked[] {
  const home = allSlots.find((slot) => colorsOfSlot(state, slot) === colors);
  const now = allSlots.find((slot) => slot.map((i) => state[i]).sort().join('') === colors);
  if (!home || !now) throw new Error('조각을 찾을 수 없습니다');
  return now.map((cur) => ({ cur, home: home.find((h) => centerColor(state, h) === state[cur])! }));
}

// 모서리 조각(자리 번호 기준)을 추적 대상으로 만든다
export function trackEdge(state: string, slot: number): Tracked[] {
  return findPiece(state, colorsOfSlot(state, EDGE_FACELETS[slot]), EDGE_FACELETS);
}

// 꼭짓점 조각(자리 번호 기준)을 추적 대상으로 만든다
export function trackCorner(state: string, slot: number): Tracked[] {
  return findPiece(state, colorsOfSlot(state, CORNER_FACELETS[slot]), CORNER_FACELETS);
}

// 조각의 윗면 색 스티커만 골라 "윗면을 향하기만 하면 됨" 조건으로 만든다
export function topStickerOnly(piece: Tracked[]): Tracked[] {
  return piece.filter((t) => t.home < 9).map((t) => ({ ...t, faceOnly: true }));
}

// 조각이 모두 제자리에 바르게 들어가 있는지 확인한다
export function isHome(piece: Tracked[]): boolean {
  return piece.every((t) => t.cur === t.home);
}

// 조각이 주어진 자리(칸 번호 묶음)에 있는지 확인한다 (방향은 상관없음)
export function isAt(piece: Tracked[], slot: number[]): boolean {
  return piece.every((t) => slot.includes(t.cur));
}

// 조각이 몇 층에 있는지 구한다 (1: 윗층, 0: 가운데층, -1: 아래층)
export function layerOf(piece: Tracked[]): number {
  return Math.min(...piece.map((t) => FACELETS[t.cur].pos[1]));
}
