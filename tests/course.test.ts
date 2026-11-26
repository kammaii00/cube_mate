// 꼬마 코스 테스트: 조각 알기 퀴즈, 한 면 확인, 큐비가 알려 줄 다음 조각
import { describe, expect, it } from 'vitest';
import { SOLVED } from '../src/core/faces';
import { applyMoves, flipUpsideDown } from '../src/core/moves';
import { randomState } from '../src/core/scramble';
import { checkFace, nextPiece, remainingPieces } from '../src/course/practice';
import { daisyBase, isDaisy, makePetal, nextPetalMove, stepsToDaisy } from '../src/course/petal';
import { focusState, isPicked, makeQuestion } from '../src/course/quiz';
import { solveBeginner } from '../src/solver/beginner';

// 같은 결과가 나오도록 고정된 난수
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('조각 알기 퀴즈', () => {
  it('찾을 조각의 칸에는 그 조각의 색들이 있다', () => {
    const rand = seeded(9);
    for (const kind of ['findEdge', 'findCorner', 'whereEdge'] as const)
      for (let n = 0; n < 20; n++) {
        const q = makeQuestion(kind, rand);
        expect(q.cells.map((i) => q.state[i]).sort().join()).toBe([...q.colors].sort().join());
        expect(isPicked(q, q.cells[0])).toBe(true);
        if (kind === 'whereEdge') {
          expect(q.colors[0]).toBe('U');
          // 집 = 제자리 칸들 (지금 그 조각이 집에 있지 않음), 반짝일 가운데는 흰색과 옆 색
          expect(q.home!.map((i) => 'URFDLB'[Math.floor(i / 9)]).sort().join()).toBe([...q.colors].sort().join());
          expect(q.home!.some((i) => !q.cells.includes(i))).toBe(true);
          expect(q.centers!.map((i) => i % 9)).toEqual([4, 4]);
        }
      }
  });
});

describe('한 면 확인', () => {
  it('흰 꽃: 노란 면 둘레 4칸이 흰색이면 성공', () => {
    expect(checkFace(0, 'DUDUDUDUD')).toEqual({ ok: true, count: 4, total: 4 });
    expect(checkFace(0, 'DUDRDUDUD').count).toBe(3);
  });
  it('1층: 흰 면 9칸이 모두 흰색이어야 성공', () => {
    expect(checkFace(2, 'UUUUUUUUU').ok).toBe(true);
    expect(checkFace(1, 'RURUUUFUB').ok).toBe(true);
    expect(checkFace(2, 'RURUUUFUB').ok).toBe(false);
  });
});

describe('큐비가 알려 줄 다음 조각', () => {
  it('풀이에서 그 단계까지의 첫 조각을 꺼내고, 시작 모습이 이어진다', () => {
    const state = randomState();
    const sol = solveBeginner(state);
    const solution = { start: sol.start, moves: sol.moves, missions: sol.missions };
    const first = nextPiece(solution, 2)!;
    expect(first.start).toBe(flipUpsideDown(state));
    expect(first.moves.length).toBe(first.chunks.length);
    expect(nextPiece({ start: SOLVED, moves: [], missions: [] }, 0)).toBeNull();
  });
  it('남은 조각들은 이어지고, 마지막 조각까지 하면 흰 꽃이 된다', () => {
    const sol = solveBeginner(randomState());
    const left = remainingPieces({ start: sol.start, moves: sol.moves, missions: sol.missions }, 0);
    expect(left.length).toBeGreaterThan(0);
    left.slice(1).forEach((p, i) => expect(p.start).toBe(applyMoves(left[i].start, left[i].moves)));
    const last = left[left.length - 1];
    expect(isDaisy(applyMoves(last.start, last.moves))).toBe(true);
  });
});

describe('집 찾기 회색 그림', () => {
  it('가운데와 찾는 조각만 색, 맞히면 집 자리에 색이 옮겨 간다', () => {
    const q = makeQuestion('whereEdge', seeded(7));
    const before = focusState(q, false);
    [4, 13, 22, 31, 40, 49].forEach((i) => expect(before[i]).toBe(q.state[i]));
    q.cells.forEach((i) => expect(before[i]).toBe(q.state[i]));
    expect([...before].filter((ch) => ch === 'X').length).toBe(54 - 6 - 2);
    const after = focusState(q, true);
    q.home!.forEach((i) => expect('URFDLB'[Math.floor(i / 9)]).toBe(after[i]));
    q.cells.forEach((i) => expect(after[i]).toBe('X'));
  });
});

describe('흰 꽃 화면 연습', () => {
  it('흰 꽃 그림은 노란 가운데 둘레가 모두 흰색', () => {
    expect(isDaisy(daisyBase())).toBe(true);
  });
  it('옆은 1번, 아래·자리 비우기는 2번이면 꽃이 되고, 반짝이는 칸은 흰 모서리', () => {
    const want = { side: 1, bottom: 2, busy: 2 } as const;
    (['side', 'bottom', 'busy'] as const).forEach((kind, n) => {
      const rand = seeded(n + 3);
      for (let i = 0; i < 30; i++) {
        const p = makePetal(kind, rand);
        expect(stepsToDaisy(p.state, p.moves)).toBe(want[kind]);
        expect(p.cells.map((c) => p.state[c]).sort()[0]).not.toBe('D');
        expect(p.cells.some((c) => p.state[c] === 'U')).toBe(true);
        const m = nextPetalMove(p.state, p.moves)!;
        expect(stepsToDaisy(applyMoves(p.state, [m]), p.moves)).toBe(want[kind] - 1);
      }
    });
  });
});
