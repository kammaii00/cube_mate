import { describe, expect, it } from 'vitest';
import { FACES, SOLVED } from '../src/core/faces';
import { applyMoves } from '../src/core/moves';
import { randomMoves } from '../src/core/scramble';
import { countProblems } from '../src/core/validate';
import { AutoCapture, CAPTURE_SETTINGS, cubeColorOf, hueGap } from '../src/scanner/autoCapture';
import { analyzeFrame } from '../src/scanner/frame';
import type { RGB } from '../src/scanner/colorMath';
import { resolveCube, rotateGrid } from '../src/scanner/orient';

const BASE: Record<string, RGB> = {
  U: [235, 235, 230], R: [200, 30, 40], F: [20, 160, 70],
  D: [240, 210, 20], L: [245, 120, 25], B: [20, 80, 200],
};
const noisy = (rgb: RGB, dim: number) =>
  rgb.map((v) => Math.max(0, Math.min(255, v * dim * (0.92 + Math.random() * 0.16) + (Math.random() - 0.5) * 12))) as RGB;

// 큐브 상태를 "아무 순서, 아무 방향"으로 찍은 6면으로 바꾼다
function photograph(state: string, dim: number): RGB[][] {
  const faces = FACES.map((_, fi) => {
    const cells = Array.from({ length: 9 }, (_, c) => noisy(BASE[state[fi * 9 + c]], dim));
    return rotateGrid(cells, Math.floor(Math.random() * 4));
  });
  return faces.sort(() => Math.random() - 0.5);
}

describe('방향 자동 추론', () => {
  it('정상 큐브는 문제 0, 망가진 큐브는 0보다 크다', () => {
    expect(countProblems(SOLVED)).toBe(0);
    expect(countProblems(applyMoves(SOLVED, randomMoves(30)))).toBe(0);
    const broken = SOLVED.split('');
    [broken[5], broken[10]] = [broken[10], broken[5]];
    expect(countProblems(broken.join(''))).toBeGreaterThan(0);
  });
  it('순서·방향을 섞어 찍어도 원래 상태를 복원한다', () => {
    let exact = 0;
    const trials = 150;
    for (let i = 0; i < trials; i++) {
      const state = applyMoves(SOLVED, randomMoves(30));
      const result = resolveCube(photograph(state, 0.5 + Math.random() * 0.5));
      if (result.exact) {
        exact++;
        expect(result.state).toBe(state);
      }
    }
    console.log(`유일하게 복원된 비율: ${exact}/${trials}`);
    expect(exact).toBeGreaterThan(trials * 0.95);
  }, 120000);
  it('완성된 큐브도 복원한다', () => {
    const result = resolveCube(photograph(SOLVED, 0.8));
    expect(result.state).toBe(SOLVED);
    expect(result.exact).toBe(true);
  });
});

// 큐브 한 면을 찍은 것 같은 가상 화면(150x150)을 만든다. gap이 0이면 틈 없는 평평한 화면이 된다.
function fakeImage(colors: RGB[], gap: number, offset = 0): number[] {
  const size = 150;
  const data: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x - offset, sy = y - offset;
      const col = Math.min(2, Math.max(0, Math.floor(sx / 50))), row = Math.min(2, Math.max(0, Math.floor(sy / 50)));
      const inGap = [sx % 50, sy % 50].some((v) => ((v + 50) % 50) < gap || ((v + 50) % 50) >= 50 - gap);
      const [r, g, b] = inGap ? [15, 15, 18] : colors[row * 3 + col];
      data.push(r, g, b, 255);
    }
  }
  return data;
}
const faceColors = (center: RGB) => Array.from({ length: 9 }, (_, i) => (i === 4 ? center : i % 2 ? BASE.B : BASE.U));
const cubeFrame = (center: RGB, offset = 0) => analyzeFrame(fakeImage(faceColors(center), 3, offset), 150);
const run = (auto: AutoCapture, frame: ReturnType<typeof cubeFrame>, times: number, centers: RGB[] = []) =>
  Array.from({ length: times }, () => auto.update(frame, centers).status);

describe('자동 촬영 판단', () => {
  it('큐브 색 알아보기: 여섯 색은 맞히고 회색·베이지·살색·검정은 거른다', () => {
    expect(FACES.map((f) => cubeColorOf(BASE[f]))).toEqual([...FACES]);
    expect(FACES.map((f) => cubeColorOf(BASE[f].map((v) => v * 0.5) as RGB)).slice(1)).toEqual(FACES.slice(1));
    for (const other of [[120, 120, 120], [20, 20, 20], [224, 172, 140], [90, 70, 60]] as RGB[])
      expect(cubeColorOf(other)).toBeNull();
  });
  it('큐브가 칸에 맞춰져 멈춰 있으면 약 1초 뒤에 찍는다', () => {
    const statuses = run(new AutoCapture(), cubeFrame(BASE.F), CAPTURE_SETTINGS.stableTicks + 1);
    expect(statuses.slice(0, -1).every((s) => s === 'holding')).toBe(true);
    expect(statuses[statuses.length - 1]).toBe('capture');
  });
  it('큐브가 조금 어긋나 있어도(칸의 10%) 알아본다', () => {
    expect(run(new AutoCapture(), cubeFrame(BASE.F, 5), 3)).toEqual(['holding', 'holding', 'holding']);
  });
  it('틈이 없는 평평한 배경(벽·책상·종이)은 색이 큐브 같아도 찍지 않는다', () => {
    for (const wall of [BASE.U, BASE.D, BASE.L]) {
      const flat = analyzeFrame(fakeImage(Array(9).fill(wall), 0), 150);
      expect(run(new AutoCapture(), flat, 20).every((s) => s === 'unclear')).toBe(true);
    }
    const blocks = analyzeFrame(fakeImage(faceColors(BASE.F), 0), 150);
    expect(run(new AutoCapture(), blocks, 20).every((s) => s === 'unclear')).toBe(true);
  });
  it('큐브 색이 아닌 칸이 하나라도 있으면 찍지 않는다 (손가락이 가린 경우 등)', () => {
    const colors = faceColors(BASE.F);
    colors[0] = [224, 172, 140];
    const frame = analyzeFrame(fakeImage(colors, 3), 150);
    const result = new AutoCapture().update(frame, []);
    expect(result.status).toBe('unclear');
    expect(result.colors[0]).toBeNull();
    expect(result.colors[4]).toBe('F');
  });
  it('한 면을 찍은 뒤에는 큐브를 움직여야 다음 면을 찍는다', () => {
    const auto = new AutoCapture();
    run(auto, cubeFrame(BASE.F), CAPTURE_SETTINGS.stableTicks + 1);
    expect(run(auto, cubeFrame(BASE.R), 15).every((s) => s === 'seen')).toBe(true);
    auto.update(analyzeFrame(fakeImage(Array(9).fill([40, 40, 40] as RGB), 0), 150), [BASE.F]);
    const next = run(auto, cubeFrame(BASE.R), CAPTURE_SETTINGS.stableTicks + 1, [BASE.F]);
    expect(next[next.length - 1]).toBe('capture');
  });
  it('이미 찍은 면은 다시 찍지 않고, 비슷한 색(빨강/주황, 흰색/노랑)은 다른 면으로 본다', () => {
    expect(run(new AutoCapture(), cubeFrame(BASE.F), 12, [BASE.F.map((v) => v * 0.8) as RGB]).every((s) => s === 'seen')).toBe(true);
    expect(hueGap(BASE.R, BASE.L)).toBeGreaterThan(30);
    expect(hueGap(BASE.U, BASE.D)).toBeGreaterThan(30);
    expect(new AutoCapture().update(cubeFrame(BASE.L), [BASE.R]).status).toBe('holding');
  });
});
