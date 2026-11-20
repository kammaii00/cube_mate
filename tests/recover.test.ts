// 빨리 맞추기 도중 실수 찾기(recover)와 색 짚기 칸 고르기(watchSticker) 테스트
import { describe, expect, it } from 'vitest';
import { FACES, SOLVED } from '../src/core/faces';
import { applyMoves, parseAlg } from '../src/core/moves';
import { pickWatch } from '../src/features/guide/watchSticker';
import { ASK_FACES, fillReadings, listCandidates, matchReadings, turnCells, undoPath, type FaceReading } from '../src/solver/recover';
import { emptyState } from '../src/core/faces';

const SOLUTION = parseAlg("R U F' D2 L B' U2 R' F D'");
const START = applyMoves(SOLVED, parseAlg("D F' R U2 B L' D2 F U' R'"));

// 큐브 상태에서 아이가 보여 줄 면을 읽어 온다 (turns만큼 돌려서 찍힌 것처럼)
function read(state: string, face: (typeof FACES)[number], turns = 0, anyTurn = false): FaceReading {
  const base = FACES.indexOf(face) * 9;
  return { face, cells: turnCells(state.slice(base, base + 9), turns), anyTurn };
}

describe('실수 찾기', () => {
  const checkpoint = applyMoves(START, SOLUTION.slice(0, 5));
  const recent = SOLUTION.slice(5, 10);
  const rest = SOLUTION.slice(5);
  const all = listCandidates(checkpoint, recent);

  it('앞면·윗면 두 면으로 한 번 반대로 돌린 실수를 찾는다', () => {
    const done = [...recent];
    done[2] = "D2" === done[2] ? 'D' : done[2].length > 1 ? done[2][0] : done[2] + "'";
    const real = applyMoves(checkpoint, done);
    const found = matchReadings(all, ASK_FACES.slice(0, 2).map((f) => read(real, f)));
    expect(found.map((f) => f.state)).toContain(real);
    const exact = found.find((f) => f.state === real)!;
    expect(applyMoves(real, undoPath(exact.mistake.done, rest))).toBe(SOLVED);
  });

  it('카메라로 돌아간 채 찍혀도 찾는다', () => {
    const done = [...recent.slice(0, 3), ...recent.slice(4)];
    const real = applyMoves(checkpoint, done);
    const found = matchReadings(all, [read(real, 'F', 1, true), read(real, 'U', 3, true), read(real, 'R', 2, true)]);
    expect(found.map((f) => f.state)).toContain(real);
  });

  it('맞게 했으면 ok로 찾는다', () => {
    const real = applyMoves(checkpoint, recent);
    const found = matchReadings(all, ASK_FACES.slice(0, 2).map((f) => read(real, f)));
    expect(found).toHaveLength(1);
    expect(found[0].mistake.kind).toBe('ok');
  });

  it('실수를 여러 번 하면 못 찾는다', () => {
    const real = applyMoves(checkpoint, parseAlg("B2 L2 F2 R2 U2 D2 B L"));
    expect(matchReadings(all, ASK_FACES.map((f) => read(real, f)))).toHaveLength(0);
  });

  it('받은 면을 빈 큐브에 채운다', () => {
    const filled = fillReadings(emptyState(), [read(START, 'F')]);
    expect(filled.slice(18, 27)).toBe(START.slice(18, 27));
    expect(filled[0]).toBe('?');
  });
});

describe('색 짚기', () => {
  it('모든 회전에서 돌린 뒤 보이는 곳에 도착하는 칸을 고른다 (가능하면 처음부터 보이던 칸)', () => {
    for (const f of FACES)
      for (const suffix of ['', "'", '2']) {
        const move = f + suffix;
        const watch = pickWatch(START, move)!;
        expect(watch).not.toBeNull();
        if (!['L2', 'D2', 'B2'].includes(move)) expect(watch.from).toBeLessThan(27);
        expect(watch.to).toBeLessThan(27);
        // 짚은 칸 색이 회전 뒤 도착한 칸에 그대로 있다
        expect(applyMoves(START, [move])[watch.to]).toBe(START[watch.from]);
        expect(watch.color).toBe(START[watch.from]);
      }
  });
});
