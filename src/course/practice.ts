// 진짜 섞은 큐브 연습(흰 꽃·흰 십자·1층): 한 면만 보고 다 했는지 확인하고, 큐비에게 보여 줬을 때 다음 조각 하나를 고른다
import type { Face } from '../core/faces';
import { applyMoves, type Move } from '../core/moves';
import { guideChunks, guideSlot, type GuideChunk } from './guide';
import { PIECES, pieceAt } from './pieces';
import type { Solution } from '../solver/solverClient';

/** 단계별로 확인할 면 (가운데 색): 흰 꽃은 노란 면, 십자·1층은 흰 면 */
export function checkCenter(stage: number): Face {
  return stage === 0 ? 'D' : 'U';
}

// 보여 준 면(9칸 색 글자, 방향 무관)으로 단계를 다 했는지와 몇 개 했는지 센다
export function checkFace(stage: number, cells: string): { ok: boolean; count: number; total: number } {
  const spots = stage === 2 ? [0, 1, 2, 3, 5, 6, 7, 8] : [1, 3, 5, 7];
  const count = spots.filter((i) => cells[i] === 'U').length;
  return { ok: count === spots.length, count, total: spots.length };
}

/** 큐비가 따라 하게 해 줄 조각 하나: 시작 모습(노란색 위), 회전들, 회전마다 붙일 묶음(이유 설명) */
export interface GuideStep {
  start: string;
  moves: Move[];
  chunks: GuideChunk[];
  /** 조각의 칸들과 그 조각이 갈 자리의 칸들 (시작 모습 기준, 목표 그림용) */
  piece: number[];
  slot: number[];
  /** 이 조각의 색들 (정렬한 글자, 예: 'FU') — 다른 모습에서 이 조각을 찾을 때 쓴다 */
  colors: string;
  /** 이 조각이 속한 단계 (0 흰 꽃, 1 흰 십자, 2 1층) */
  stage: number;
}

// 그 단계까지 남은 조각들 (초보자 풀이의 미션 순서대로, 조각마다 시작 모습·회전·회전별 묶음)
export function remainingPieces(solution: Solution, stage: number): GuideStep[] {
  const pieces: GuideStep[] = [];
  let state = solution.start;
  for (const mission of solution.missions ?? []) {
    if (mission.stage > stage) break;
    const moves = mission.chunks.flatMap((c) => c.moves);
    const colors = mission.piece.map((i) => state[i]).sort().join('');
    const chunks = guideChunks(state, mission).flatMap((c) => c.moves.map(() => c));
    pieces.push({ start: state, moves, chunks, colors, piece: mission.piece, slot: guideSlot(mission), stage: mission.stage });
    state = applyMoves(state, moves);
  }
  return pieces;
}

// from번째 조각부터 같은 단계에 남은 조각들이 그 조각 시작 모습에서 있는 칸들 (반짝이게 보여 줄 때)
export function remainingCells(pieces: GuideStep[], from: number): number[] {
  const state = pieces[from]?.start;
  if (!state) return [];
  const sameColors = (colors: string) => PIECES.find((p) => p.map((i) => state[i]).sort().join('') === colors) ?? [];
  return sameStage(pieces, from).flatMap((p) => sameColors(p.colors));
}

// from번째 조각부터, 그 조각과 같은 단계인 남은 조각들
export function sameStage(pieces: GuideStep[], from: number): GuideStep[] {
  return pieces.slice(from).filter((p) => p.stage === pieces[from]?.stage);
}

/** 노란 위 큐브의 윗면 모서리 칸 (꽃잎 자리) */
const PETAL_SPOTS = [1, 3, 5, 7];

// 조각 사이 쉬는 화면 그림: 노란 가운데와 이미 된 조각은 밝게(bright), 더 맞춰야 할 곳은 노란 테두리(highlight).
// 흰 꽃은 빈 꽃잎 자리에 테두리, 십자·1층은 남은 조각에 테두리 (단계는 from번째 조각의 단계)
export function betweenView(pieces: GuideStep[], from: number): { highlight: number[]; bright: number[] } {
  const state = pieces[from]?.start ?? '';
  if (pieces[from]?.stage !== 0) return { highlight: remainingCells(pieces, from), bright: [4] };
  const done = PETAL_SPOTS.filter((i) => state[i] === 'U');
  return { highlight: PETAL_SPOTS.filter((i) => state[i] !== 'U'), bright: [4, ...done.flatMap(pieceAt)] };
}

// 아직 안 한 다음 조각 하나 (그 단계까지 이미 다 했으면 null)
export function nextPiece(solution: Solution, stage: number): GuideStep | null {
  return remainingPieces(solution, stage)[0] ?? null;
}
