// 진짜 섞은 큐브 연습(흰 꽃·흰 십자·1층): 한 면만 보고 다 했는지 확인하고, 큐비에게 보여 줬을 때 다음 조각 하나를 고른다
import type { Face } from '../core/faces';
import { applyMoves, type Move } from '../core/moves';
import type { Chunk } from '../solver/beginner/lesson';
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
  chunks: Chunk[];
}

// 그 단계까지 남은 조각들 (초보자 풀이의 미션 순서대로, 조각마다 시작 모습·회전·회전별 묶음)
export function remainingPieces(solution: Solution, stage: number): GuideStep[] {
  const pieces: GuideStep[] = [];
  let state = solution.start;
  for (const mission of solution.missions ?? []) {
    if (mission.stage > stage) break;
    const moves = mission.chunks.flatMap((c) => c.moves);
    pieces.push({ start: state, moves, chunks: mission.chunks.flatMap((c) => c.moves.map(() => c)) });
    state = applyMoves(state, moves);
  }
  return pieces;
}

// 아직 안 한 다음 조각 하나 (그 단계까지 이미 다 했으면 null)
export function nextPiece(solution: Solution, stage: number): GuideStep | null {
  return remainingPieces(solution, stage)[0] ?? null;
}
