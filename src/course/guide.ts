// 같이 해 보기에서 큐비가 이끄는 조각 하나를 "목표 → 이유 → 동작"으로 나눈다:
// 조각이 갈 자리(목표)와, 같은 목적의 회전 묶음마다 왜 하는지(이유)를 꼬마 코스 말로 정한다
import type { Face } from '../core/faces';
import { applyMoves, parseMove, type Move } from '../core/moves';
import type { Chunk, Mission } from '../solver/beginner/lesson';
import { followCells } from './pieces';

/** 꼬마 코스에서 말해 주는 이유 (흰 꽃은 꽃잎 올리기를 더 잘게 나눈다) */
export type GuideWhy =
  | 'petalBusy' | 'petalMove' | 'petalSide' | 'petalBottom'
  | 'turnColor' | 'setupPetal' | 'drop'
  | 'turnSlot' | 'setupAbove' | 'cornerRight' | 'cornerFront' | 'cornerUp' | 'turnStuck' | 'cornerStuck';

/** 같은 이유로 하는 회전 묶음 (dance면 오른손 춤을 reps번 춘다) */
export interface GuideChunk {
  why: GuideWhy;
  moves: Move[];
  dance: boolean;
  reps: number;
  /** 맞춰야 하는 가운데 색 (흰 십자: 꽃잎 옆 색) */
  color?: string;
}

/** 노란 위 큐브의 꽃잎 자리(윗면 모서리 칸) */
const PETAL_SPOTS = [1, 3, 5, 7];
/** 흰색 (면 글자) */
const WHITE = 'U';

/** 흰 십자·1층 묶음은 풀이의 이유를 그대로 쓴다 */
const SAME: Partial<Record<Chunk['why'], GuideWhy>> = {
  turnColor: 'turnColor', setupPetal: 'setupPetal', drop: 'drop',
  turnSlot: 'turnSlot', setupAbove: 'setupAbove', turnStuck: 'turnStuck',
  cornerRight: 'cornerRight', cornerFront: 'cornerFront', cornerUp: 'cornerUp', cornerStuck: 'cornerStuck',
};

// 칸이 윗줄(위 줄을 돌리면 움직이는 칸)에 있는지
function onTopLayer(cell: number): boolean {
  return followCells([cell], 'U')[0] !== cell;
}

// 흰 꽃 꽃잎 하나의 회전들을 묶음으로 나눈다: 윗면 돌리기(자리 비우기·옮기기), 옆면 돌리기(올리기·옮기기)
function splitPetal(start: string, moves: Move[], piece: number[]): GuideChunk[] {
  const out: GuideChunk[] = [];
  let state = start;
  let white = piece.find((i) => start[i] === WHITE) ?? piece[0];
  for (let i = 0; i < moves.length; ) {
    const face = parseMove(moves[i]).face;
    let j = i + 1;
    while (j < moves.length && parseMove(moves[j]).face === face) j++;
    const group = moves.slice(i, j);
    // 윗면: 다른 꽃잎이 이미 있고 이 꽃잎은 아래쪽에 있으면 "자리 비우기", 아니면 "옮기기"
    const busy = PETAL_SPOTS.some((c) => c !== white && state[c] === WHITE) && !onTopLayer(white);
    state = applyMoves(state, group);
    white = group.reduce((c, m) => followCells([c], m)[0], white);
    const lifted = PETAL_SPOTS.includes(white);
    const why: GuideWhy = face === 'U' ? (busy ? 'petalBusy' : 'petalMove')
      : !lifted ? 'petalMove'
      : group.length === 1 && parseMove(group[0]).turns === 2 ? 'petalBottom' : 'petalSide';
    const last = out[out.length - 1];
    if (last && last.why === why && why === 'petalMove') last.moves.push(...group);
    else out.push({ why, moves: [...group], dance: false, reps: 1 });
    i = j;
  }
  return out;
}

// 미션(조각 하나)의 묶음들을 꼬마 코스 묶음으로 바꾼다
export function guideChunks(start: string, mission: Mission): GuideChunk[] {
  return mission.chunks.flatMap((c): GuideChunk[] => {
    if (c.why === 'petal') return splitPetal(applyMoves(start, movesBefore(mission, c)), c.moves, followAll(mission.piece, movesBefore(mission, c)));
    return [{ why: SAME[c.why] ?? 'petalMove', moves: c.moves, dance: c.formula === 'right', reps: c.reps ?? 1, color: c.color }];
  });
}

// 미션 안에서 그 묶음 앞에 한 회전들
function movesBefore(mission: Mission, chunk: Chunk): Move[] {
  return mission.chunks.slice(0, mission.chunks.indexOf(chunk)).flatMap((c) => c.moves);
}

// 칸들이 회전들을 따라 옮겨 간 칸
function followAll(cells: number[], moves: Move[]): number[] {
  return moves.reduce((c, m) => followCells(c, m), cells);
}

// 조각이 갈 자리 (시작 모습 기준 칸들): 흰 십자·1층은 풀이가 정한 자리, 흰 꽃은 다 돌린 뒤 꽃잎이 놓인 자리
export function guideSlot(mission: Mission): number[] {
  if (mission.slot) return mission.slot;
  return followAll(mission.piece, mission.chunks.flatMap((c) => c.moves));
}

/** 목표 그림: 갈 자리는 하늘색으로 칠하고, 조각과 자리 두 곳만 반짝인다 (조각은 화살표 이름표로 가리킨다) */
export interface GoalView {
  state: string;
  highlight: number[];
  piece: number[];
  slot: number[];
  /** 흰 십자: 꽃잎 옆 색 (이름표 색과 목표 문구에 쓴다) */
  side?: Face;
  /** 조각이 이미 자기 자리에 거꾸로 들어가 있으면 true (자리를 하늘색으로 덮지 않는다) */
  stuck: boolean;
}

// 조각 하나의 목표 그림을 만든다 (조각이 자기 자리에 거꾸로 있으면 진짜 색 그대로 조각만 반짝인다)
export function goalView(start: string, piece: number[], slot: number[], stage: number): GoalView {
  const side = stage === 1 ? (piece.map((i) => start[i]).find((c) => c !== WHITE) as Face | undefined) : undefined;
  const stuck = [...piece].sort().join() === [...slot].sort().join();
  if (stuck) return { state: start, highlight: piece, piece, slot: [], side, stuck };
  const state = [...start].map((c, i) => (slot.includes(i) ? 'S' : c)).join('');
  return { state, highlight: [...piece, ...slot], piece, slot, side, stuck };
}
