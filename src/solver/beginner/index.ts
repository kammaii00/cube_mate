// 초보자 공식(층별 풀이) 8단계로 큐브를 풀고, 그 과정을 "수업 계획"으로 만든다.
// 노란색을 위로 잡은 상태에서 흰 꽃 → 흰 십자 → 1층 → 2층 → 윗면 순서로 맞춘다.
import { applyMoves, flipUpsideDown, isSolved, type Move } from '../../core/moves';
import { dropPetals, makeDaisy, placeCorners, placeMiddleEdges } from './firstLayers';
import { solveLastLayer } from './lastLayer';
import { LessonBuilder, type Mission } from './lesson';

export interface BeginnerSolution {
  /** 안내 시작 상태 (노란색이 위로 오게 뒤집은 상태) */
  start: string;
  moves: Move[];
  /** 각 회전이 속한 단계 번호 (0~7) */
  stages: number[];
  /** 수업 계획: 조각 하나를 맞추는 "미션"들의 목록 */
  missions: Mission[];
}

// 큐브 상태(흰색 위 기준)를 받아 초보자 공식 풀이와 수업 계획을 만든다
export function solveBeginner(input: string): BeginnerSolution {
  const start = flipUpsideDown(input);
  const builder = new LessonBuilder(start);
  if (!isSolved(start)) {
    dropPetals(builder, makeDaisy(builder));
    placeCorners(builder);
    placeMiddleEdges(builder);
    solveLastLayer(builder);
  }
  const moves: Move[] = [];
  const stages: number[] = [];
  for (const mission of builder.missions)
    for (const chunk of mission.chunks)
      for (const move of chunk.moves) {
        moves.push(move);
        stages.push(mission.stage);
      }
  if (!isSolved(applyMoves(start, moves))) throw new Error('초보자 풀이 검증 실패');
  return { start, moves, stages, missions: builder.missions };
}
