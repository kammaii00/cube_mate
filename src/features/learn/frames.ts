// 수업 계획(미션 목록)을 화면에 한 장씩 보여줄 "장면" 목록으로 펼친다.
// 장면 종류: 잡는 법 → [단계 소개 → (조각 찾기 → 회전들 …) → 단계 완성] × 8
import { FACELETS } from '../../core/faces';
import { applyMove, applyMoves, flipFacelet, flipUpsideDown, type Move } from '../../core/moves';
import type { Chunk, FormulaId, Mission } from '../../solver/beginner/lesson';

export type FrameType = 'hold' | 'stageIntro' | 'mission' | 'try' | 'move' | 'tryCheck' | 'stageDone';

export interface Frame {
  type: FrameType;
  stage: number;
  /** 이 장면에서 보여줄 큐브 상태 (회전 장면이면 돌리기 전 상태) */
  state: string;
  mission?: Mission;
  /** 이 단계의 몇 번째 미션인지 (1부터)와 전체 개수 */
  missionNo?: number;
  missionTotal?: number;
  chunk?: Chunk;
  move?: Move;
  /** 묶음 안에서 몇 번째 회전인지 (0부터) */
  moveNo?: number;
  /** 혼자 해보기 → 확인 장면 번호, 확인 → 첫 회전 장면 번호 */
  jumpTo?: number;
}

/** 공식을 이만큼 같이 해 본 뒤부터 "혼자 해 볼까요?"를 묻는다 */
const GUIDED_TIMES = 1;
/** 그림을 뒤집어 아래쪽을 보여주는 단계 (흰 십자, 1층) */
const FLIPPED_STAGES = [1, 2];

// 단계가 끝났을 때 맞춰져 있어야 하는 칸들 (그림에서 밝게 보여줄 칸)
function stageCells(stage: number): number[] {
  const all = FACELETS.map((_, i) => i);
  const isCenter = (i: number) => i % 9 === 4;
  const height = (i: number) => FACELETS[i].pos[1];
  const isEdge = (i: number) => FACELETS[i].pos.filter((v) => v === 0).length === 1;
  const topCross = [1, 3, 4, 5, 7];
  const lower = all.filter((i) => height(i) <= 0);
  switch (stage) {
    case 0: return topCross;
    case 1: return all.filter((i) => isCenter(i) ? i !== 4 : height(i) < 0 && isEdge(i));
    case 2: return all.filter((i) => height(i) < 0 || (isCenter(i) && i !== 4));
    case 3: return lower;
    case 4: return [...lower, ...topCross];
    case 5: return [...lower, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    case 6: return all.filter((i) => height(i) <= 0 || i < 9 || !isEdge(i));
    default: return all;
  }
}

// 단계 그림에 쓸 상태와 밝게 보여줄 칸을 구한다 (아래층 단계는 뒤집어서 보여준다)
export function stagePicture(stage: number, state: string): { state: string; highlight: number[]; flipped: boolean } {
  const cells = stageCells(stage);
  if (!FLIPPED_STAGES.includes(stage)) return { state, highlight: cells, flipped: false };
  return { state: flipUpsideDown(state), highlight: cells.map(flipFacelet), flipped: true };
}

// 공식별로 몇 번 썼는지 센다 (완성 화면에 보여줄 "오늘 쓴 공식")
export function formulaUse(missions: Mission[]): [FormulaId, number][] {
  const counts = new Map<FormulaId, number>();
  for (const mission of missions)
    for (const chunk of mission.chunks)
      if (chunk.formula) counts.set(chunk.formula, (counts.get(chunk.formula) ?? 0) + (chunk.reps ?? 1));
  return [...counts];
}

// 수업 계획을 장면 목록으로 펼친다
export function buildFrames(start: string, missions: Mission[]): Frame[] {
  const frames: Frame[] = [{ type: 'hold', stage: missions[0]?.stage ?? 0, state: start }];
  const practiced = new Map<FormulaId, number>();
  let state = start;
  const stages = [...new Set(missions.map((m) => m.stage))];
  for (const stage of stages) {
    const list = missions.filter((m) => m.stage === stage);
    const goal = list.reduce((s, m) => m.chunks.reduce((s2, c) => applyMoves(s2, c.moves), s), state);
    frames.push({ type: 'stageIntro', stage, state: goal });
    list.forEach((mission, k) => {
      const info = { stage, mission, missionNo: k + 1, missionTotal: list.length };
      if (stage <= 3) frames.push({ type: 'mission', state, ...info });
      for (const chunk of mission.chunks) {
        const times = chunk.formula ? practiced.get(chunk.formula) ?? 0 : 0;
        const tryIndex = chunk.formula && times >= GUIDED_TIMES ? frames.length : -1;
        if (tryIndex >= 0) frames.push({ type: 'try', state, chunk, ...info });
        chunk.moves.forEach((move, moveNo) => {
          frames.push({ type: 'move', state, chunk, move, moveNo, ...info });
          state = applyMove(state, move);
        });
        if (tryIndex >= 0) {
          frames[tryIndex].jumpTo = frames.length;
          frames.push({ type: 'tryCheck', state, chunk, jumpTo: tryIndex + 1, ...info });
        }
        if (chunk.formula) practiced.set(chunk.formula, times + 1);
      }
    });
    if (stage !== stages[stages.length - 1]) frames.push({ type: 'stageDone', stage, state });
  }
  return frames;
}
