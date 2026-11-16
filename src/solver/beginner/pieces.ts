// 조각 찾기: "제자리가 여기인 조각"이 지금 큐브의 어디에 있는지 찾는다
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

// 제자리가 homeSlot인 조각을 찾아, 그 조각의 스티커별 현재 칸과 목표 칸을 돌려준다
function locate(state: string, homeSlot: number[], allSlots: number[][]): Tracked[] {
  const wanted = homeSlot.map((i) => centerColor(state, i));
  const sorted = [...wanted].sort().join('');
  for (const slot of allSlots) {
    const colors = slot.map((i) => state[i]);
    if ([...colors].sort().join('') !== sorted) continue;
    return slot.map((cur, k) => ({ cur, home: homeSlot[wanted.indexOf(colors[k])] }));
  }
  throw new Error('조각을 찾을 수 없습니다');
}

// 모서리 조각(자리 번호 기준)을 추적 대상으로 만든다
export function trackEdge(state: string, slot: number): Tracked[] {
  return locate(state, EDGE_FACELETS[slot], EDGE_FACELETS);
}

// 꼭짓점 조각(자리 번호 기준)을 추적 대상으로 만든다
export function trackCorner(state: string, slot: number): Tracked[] {
  return locate(state, CORNER_FACELETS[slot], CORNER_FACELETS);
}

// 조각의 윗면 색 스티커만 골라 "윗면을 향하기만 하면 됨" 조건으로 만든다
export function topStickerOnly(piece: Tracked[]): Tracked[] {
  return piece.filter((t) => t.home < 9).map((t) => ({ ...t, faceOnly: true }));
}
