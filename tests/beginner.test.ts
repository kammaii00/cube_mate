import { describe, expect, it } from 'vitest';
import { SOLVED } from '../src/core/faces';
import { applyMoves, flipUpsideDown, isSolved } from '../src/core/moves';
import { randomMoves } from '../src/core/scramble';
import { solveBeginner } from '../src/solver/beginner';

describe('배우며 풀기 (초보자 공식)', () => {
  it('뒤집기는 두 번 하면 원래대로 돌아오고 완성 상태를 유지한다', () => {
    const state = applyMoves(SOLVED, randomMoves(30));
    expect(flipUpsideDown(flipUpsideDown(state))).toBe(state);
    expect(isSolved(flipUpsideDown(SOLVED))).toBe(true);
    expect(isSolved(state)).toBe(false);
  });
  it('무작위 상태 100개를 모두 완성하고 단계 순서가 뒤로 가지 않는다', () => {
    let total = 0, max = 0, slowest = 0;
    for (let i = 0; i < 100; i++) {
      const state = applyMoves(SOLVED, randomMoves(30));
      const t = performance.now();
      const { start, moves, stages } = solveBeginner(state);
      slowest = Math.max(slowest, performance.now() - t);
      expect(isSolved(applyMoves(start, moves))).toBe(true);
      expect(stages.length).toBe(moves.length);
      for (let k = 1; k < stages.length; k++) expect(stages[k]).toBeGreaterThanOrEqual(stages[k - 1]);
      total += moves.length; max = Math.max(max, moves.length);
    }
    console.log(`평균 ${Math.round(total / 100)}회전, 최대 ${max}회전, 가장 느린 계산 ${Math.round(slowest)}ms`);
  }, 300000);
  it('이미 완성된 큐브는 회전이 없다', () => {
    expect(solveBeginner(SOLVED).moves).toEqual([]);
  });
});
