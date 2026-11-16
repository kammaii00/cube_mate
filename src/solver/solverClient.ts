// 화면에서 풀이 워커를 쉽게 쓰기 위한 창구
import { SOLVED } from '../core/faces';
import { applyMoves, isSolved, parseAlg, type Move } from '../core/moves';
import type { BeginnerSolution } from './beginner';

/** 풀이 안내 화면에 넘기는 풀이 결과 */
export interface Solution {
  /** 안내를 시작할 때의 큐브 상태 */
  start: string;
  moves: Move[];
  /** 배우며 풀기일 때만: 각 회전이 속한 단계 번호 (0~6) */
  stages: number[] | null;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: unknown) => void; reject: (e: Error) => void }>();

// 워커를 (한 번만) 만들고 응답 처리기를 연결한다
function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent) => {
    const { type, id, result, message } = event.data;
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (type === 'done') job.resolve(result);
    else job.reject(new Error(message));
  };
  return worker;
}

// 워커에 요청을 보내고 응답을 기다린다
function request<T>(type: 'solve' | 'learn', facelets: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: resolve as (r: unknown) => void, reject });
    getWorker().postMessage({ type, id, facelets });
  });
}

// 앱 시작 시 미리 호출해 빠른 풀이 엔진 준비를 끝내 둔다
export function warmUpSolver(): void {
  getWorker().postMessage({ type: 'init' });
}

// 빠른 풀이를 계산한다. 결과가 실제로 완성에 도달하는지 한 번 더 확인한다.
export async function solveFast(facelets: string): Promise<Solution> {
  const moves = parseAlg(await request<string>('solve', facelets));
  if (applyMoves(facelets, moves) !== SOLVED) throw new Error('풀이 검증 실패');
  return { start: facelets, moves, stages: null };
}

// 배우며 풀기(초보자 공식) 풀이를 계산하고 완성에 도달하는지 확인한다
export async function solveLearn(facelets: string): Promise<Solution> {
  const result = await request<BeginnerSolution>('learn', facelets);
  if (!isSolved(applyMoves(result.start, result.moves))) throw new Error('풀이 검증 실패');
  return result;
}
