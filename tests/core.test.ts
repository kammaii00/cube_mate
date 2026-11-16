import { describe, expect, it } from 'vitest';
import Cube from 'cubejs';
import { SOLVED, emptyState } from '../src/core/faces';
import { applyMove, applyMoves, invertMove, parseAlg } from '../src/core/moves';
import { randomMoves } from '../src/core/scramble';
import { validate } from '../src/core/validate';
import { classifyScans, type FaceScans } from '../src/scanner/classify';
import { FACES } from '../src/core/faces';
import type { RGB } from '../src/scanner/colorMath';

describe('회전 규칙', () => {
  it('18가지 회전이 모두 cubejs와 같은 결과를 낸다', () => {
    for (const f of FACES) for (const s of ['', "'", '2']) {
      expect(applyMove(SOLVED, f + s)).toBe(new Cube().move(f + s).asString());
    }
  });
  it('무작위 회전 200세트가 cubejs와 일치한다', () => {
    for (let i = 0; i < 200; i++) {
      const moves = randomMoves(30);
      expect(applyMoves(SOLVED, moves)).toBe(new Cube().move(moves.join(' ')).asString());
    }
  });
  it('회전을 거꾸로 적용하면 원래대로 돌아온다', () => {
    const moves = randomMoves(40);
    const back = moves.slice().reverse().map(invertMove);
    expect(applyMoves(applyMoves(SOLVED, moves), back)).toBe(SOLVED);
  });
});

describe('상태 검증', () => {
  const swap = (s: string, a: number, b: number) => {
    const arr = s.split('');
    [arr[a], arr[b]] = [arr[b], arr[a]];
    return arr.join('');
  };
  it('정상 상태는 통과한다', () => {
    expect(validate(SOLVED)).toEqual([]);
    for (let i = 0; i < 300; i++) expect(validate(applyMoves(SOLVED, randomMoves(30)))).toEqual([]);
  });
  it('빈 칸을 잡아낸다', () => {
    expect(validate(emptyState())[0].code).toBe('incomplete');
  });
  it('색 개수 오류를 잡아낸다', () => {
    expect(validate('R' + SOLVED.slice(1))[0].code).toBe('count');
  });
  it('모서리 뒤집힘을 잡아낸다', () => {
    expect(validate(swap(SOLVED, 5, 10)).map((e) => e.code)).toEqual(['flip']);
  });
  it('꼭짓점 돌아감을 잡아낸다', () => {
    const a = SOLVED.split('');
    [a[8], a[9], a[20]] = [a[20], a[8], a[9]];
    expect(validate(a.join('')).map((e) => e.code)).toEqual(['twist']);
  });
  it('조각 두 개 교환을 잡아낸다', () => {
    const s = swap(swap(SOLVED, 5, 7), 10, 19);
    expect(validate(s).map((e) => e.code)).toEqual(['parity']);
  });
  it('존재하지 않는 조각을 잡아낸다', () => {
    expect(validate(swap(SOLVED, 10, 28))[0].code).toBe('badPiece');
  });
});

describe('풀이 엔진', () => {
  it('무작위 상태 50개를 풀어 완성 상태에 도달한다', () => {
    Cube.initSolver();
    for (let i = 0; i < 50; i++) {
      const state = applyMoves(SOLVED, randomMoves(30));
      const alg = Cube.fromString(state).solve();
      const moves = parseAlg(alg);
      expect(moves.length).toBeLessThanOrEqual(22);
      expect(applyMoves(state, moves)).toBe(SOLVED);
    }
  }, 60000);
});

describe('색 분류', () => {
  it('조명이 어둡고 노이즈가 있어도 54칸을 정확히 분류한다', () => {
    const base: Record<string, RGB> = {
      U: [235, 235, 230], R: [200, 30, 40], F: [20, 160, 70],
      D: [240, 210, 20], L: [245, 120, 25], B: [20, 80, 200],
    };
    // 무작위 노이즈라 아주 드물게(수천 번에 한 번) 틀릴 수 있어, 500번 중 2번까지는 허용한다
    let wrong = 0;
    for (let trial = 0; trial < 500; trial++) {
      const state = applyMoves(SOLVED, randomMoves(30));
      const dim = 0.45 + Math.random() * 0.55;
      const scans = {} as FaceScans;
      FACES.forEach((f, fi) => {
        scans[f] = Array.from({ length: 9 }, (_, c) =>
          base[state[fi * 9 + c]].map((v) =>
            Math.max(0, Math.min(255, v * dim * (0.9 + Math.random() * 0.2) + (Math.random() - 0.5) * 16)),
          ) as RGB,
        );
      });
      if (classifyScans(scans) !== state) wrong++;
    }
    expect(wrong).toBeLessThanOrEqual(2);
  });
});
