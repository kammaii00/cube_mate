import { describe, expect, it } from 'vitest';
import { FACELETS, SOLVED } from '../src/core/faces';
import { applyMoves, flipUpsideDown, isSolved } from '../src/core/moves';
import { randomMoves } from '../src/core/scramble';
import { buildFrames, formulaUse, stagePicture } from '../src/features/learn/frames';
import { solveBeginner } from '../src/solver/beginner';
import { FORMULAS } from '../src/solver/beginner/lesson';

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
  it('큐브를 통째로 돌리기(y)는 네 번 하면 제자리이고, 윗면 색은 그대로다', () => {
    const state = applyMoves(SOLVED, randomMoves(30));
    expect(applyMoves(state, ['y', 'y', 'y', 'y'])).toBe(state);
    expect(applyMoves(state, ['y', "y'"])).toBe(state);
    expect(applyMoves(state, ['y2'])).toBe(applyMoves(state, ['y', 'y']));
    const turned = applyMoves(SOLVED, ['y']);
    expect(turned[4]).toBe('U');
    expect(turned[22]).toBe('R'); // 오른쪽 면이 앞으로 온다
    expect(isSolved(turned)).toBe(true);
  });
  it('수업 계획: 공식 묶음은 공식을 그대로 반복하고, 장면을 따라가면 완성된다', () => {
    for (let i = 0; i < 40; i++) {
      const { start, moves, missions } = solveBeginner(applyMoves(SOLVED, randomMoves(30)));
      for (const mission of missions)
        for (const chunk of mission.chunks) {
          if (chunk.kind === 'formula') {
            const one = FORMULAS[chunk.formula!];
            expect(chunk.moves).toEqual(Array.from({ length: chunk.reps! }, () => one).flat());
          }
          if (chunk.kind === 'turnCube') expect(chunk.moves.every((m) => m[0] === 'y')).toBe(true);
          if (chunk.kind === 'setup') expect(chunk.moves.every((m) => m[0] === 'U')).toBe(true);
        }
      const frames = buildFrames(start, missions);
      const steps = frames.filter((f) => f.type === 'move');
      expect(steps.map((f) => f.move)).toEqual(moves);
      // 회전 장면의 상태는 직전 회전을 적용한 결과와 같아야 한다
      let state = start;
      for (const step of steps) {
        expect(step.state).toBe(state);
        state = applyMoves(state, [step.move!]);
      }
      expect(isSolved(state)).toBe(true);
      // "혼자 해보기"는 확인 장면으로 건너뛰고, 확인 장면의 상태는 그 묶음을 다 한 결과다
      frames.forEach((frame, k) => {
        if (frame.type !== 'try') return;
        const check = frames[frame.jumpTo!];
        expect(check.type).toBe('tryCheck');
        expect(check.state).toBe(applyMoves(frame.state, frame.chunk!.moves));
        expect(check.jumpTo).toBe(k + 1);
      });
      // 단계 완성 그림에서 밝게 보이는 칸은 실제로 맞춰져 있어야 한다 (가운데 색과 같음)
      for (const frame of frames.filter((f) => f.type === 'stageDone' && f.stage > 0)) {
        const picture = stagePicture(frame.stage, frame.state);
        for (const cell of picture.highlight)
          expect(picture.state[cell]).toBe(picture.state[Math.floor(cell / 9) * 9 + 4]);
      }
      expect(formulaUse(missions).every(([, count]) => count > 0)).toBe(true);
      // 1~4단계 미션에는 "들어갈 자리"가 있고, 그 자리는 한 조각 안의 칸들이며 색이 가운데 색과 맞는다
      let at = start;
      for (const mission of missions) {
        if (mission.stage >= 1 && mission.stage <= 3) {
          expect(mission.slot?.length).toBe(mission.piece.length);
          expect(new Set(mission.slot!.map((c) => FACELETS[c].pos.join())).size).toBe(1);
          mission.slot!.forEach((cell, k) => expect(at[mission.piece[k]]).toBe(at[Math.floor(cell / 9) * 9 + 4]));
        } else expect(mission.slot).toBeUndefined();
        at = mission.chunks.reduce((st, c) => applyMoves(st, c.moves), at);
      }
    }
  });
  it('이미 완성된 큐브는 회전이 없다', () => {
    expect(solveBeginner(SOLVED).moves).toEqual([]);
  });
});
