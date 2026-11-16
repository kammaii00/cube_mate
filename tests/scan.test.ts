import { describe, expect, it } from 'vitest';
import { FACES, SOLVED } from '../src/core/faces';
import { applyMoves } from '../src/core/moves';
import { randomMoves } from '../src/core/scramble';
import { countProblems } from '../src/core/validate';
import { AutoCapture, CAPTURE_SETTINGS, cubeColorOf, findDuplicate } from '../src/scanner/autoCapture';
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
const solidFace = (color: RGB) => Array<RGB>(9).fill(color);
const frameOf = (colors: RGB[], gap: number, offset = 0) => analyzeFrame(fakeImage(colors, gap, offset), 150);
const cubeFrame = (center: RGB, offset = 0) => frameOf(faceColors(center), 3, offset);
// 같은 화면을 times번 연속으로 읽힌 것처럼 판단시킨다
const run = (auto: AutoCapture, frame: ReturnType<typeof cubeFrame>, times: number, captured: RGB[][] = []) =>
  Array.from({ length: times }, () => auto.update(frame, captured).status);
const cellsOf = (frame: ReturnType<typeof cubeFrame>) => frame.cells.map((c) => c.rgb);

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
  it('여러 색이 섞인 면은 칸 사이 틈이 흐리게 보이거나 어긋나 있어도 찍는다', () => {
    for (const gap of [0, 1]) {
      const statuses = run(new AutoCapture(), frameOf(faceColors(BASE.F), gap, 5), CAPTURE_SETTINGS.stableTicks + 1);
      expect(statuses).toContain('capture');
    }
  });
  it('손이 떨려서 가끔 화면이 크게 변해도 곧 찍는다 (한 번 흔들렸다고 처음부터 다시 세지 않는다)', () => {
    const auto = new AutoCapture();
    const steady = cubeFrame(BASE.F);
    const shaken = analyzeFrame(fakeImage(faceColors(BASE.F).map((c) => c.map((v) => Math.min(255, v + 60)) as RGB), 3), 150);
    const statuses: string[] = [];
    for (let i = 0; i < 14; i++) statuses.push(auto.update(i === 3 ? shaken : steady, []).status);
    expect(statuses).toContain('capture');
  });
  it('색이 한 가지뿐인 평평한 배경(벽·책상·종이)은 찍지 않는다', () => {
    for (const wall of [BASE.U, BASE.D, BASE.L]) {
      const statuses = run(new AutoCapture(), frameOf(solidFace(wall), 0), 20);
      expect(statuses.every((s) => s === 'unaligned')).toBe(true);
    }
  });
  it('완성된 큐브(한 가지 색) 면은 틈이 보일 때만 찍는다', () => {
    expect(run(new AutoCapture(), frameOf(solidFace(BASE.R), 3), CAPTURE_SETTINGS.stableTicks + 1)).toContain('capture');
    expect(run(new AutoCapture(), frameOf(solidFace(BASE.R), 0), 20)).not.toContain('capture');
  });
  it('큐브 색이 아닌 칸이 하나라도 있으면 찍지 않는다 (손가락이 가린 경우 등)', () => {
    const colors = faceColors(BASE.F);
    colors[0] = [224, 172, 140];
    const result = new AutoCapture().update(frameOf(colors, 3), []);
    expect(result.status).toBe('unclear');
    expect(result.colors[0]).toBeNull();
    expect(result.colors[4]).toBe('F');
  });
});

// 가운데 색은 center, 주변 칸은 면마다 다른 무늬인 한 면 (진짜 큐브의 서로 다른 면처럼)
const surround = (center: RGB, k: number): RGB[] =>
  Array.from({ length: 9 }, (_, i) => (i === 4 ? center : BASE[FACES[(k + i * 2 + (i % 3)) % 6]]));

describe('같은 면 중복 촬영 방지', () => {
  const faceF = cellsOf(cubeFrame(BASE.F));
  it('이미 찍은 면(가운데 색이 같은 면)은 몇 번을 보여줘도 다시 찍지 않는다', () => {
    const auto = new AutoCapture();
    const statuses = run(auto, cubeFrame(BASE.F), 30, [faceF]);
    expect(statuses.every((s) => s === 'seen')).toBe(true);
    expect(auto.update(cubeFrame(BASE.F), [faceF]).duplicateOf).toBe(0);
  });
  it('찍은 직후에 같은 면이 계속 보여도 두 번째 촬영은 없다', () => {
    const auto = new AutoCapture();
    const captured: RGB[][] = [];
    let shots = 0;
    for (let i = 0; i < 40; i++) {
      const result = auto.update(cubeFrame(BASE.F), captured);
      if (result.status === 'capture') {
        shots++;
        captured.push(cellsOf(cubeFrame(BASE.F)));
      }
    }
    expect(shots).toBe(1);
  });
  it('조명 때문에 가운데 색을 다르게 읽어도, 모양이 같으면 같은 면으로 본다 (큐브를 돌려도 마찬가지)', () => {
    const warm = faceF.map((rgb, i) => (i === 4 ? ([240, 225, 40] as RGB) : rgb)); // 가운데가 노랑처럼 보임
    expect(cubeColorOf(warm[4])).toBe('D');
    for (let turns = 0; turns < 4; turns++) {
      const turned = rotateGrid(faceF, turns);
      expect(findDuplicate(turned.map((c) => c.map((v) => v * 0.8) as RGB), [faceF])).toBe(0);
    }
  });
  it('다른 면은 중복으로 보지 않고, 빨강/주황·흰색/노랑 면도 구분한다', () => {
    expect(findDuplicate(cellsOf(frameOf(surround(BASE.R, 2), 3)), [faceF])).toBe(-1);
    expect(findDuplicate(solidFace(BASE.L), [solidFace(BASE.R)])).toBe(-1);
    expect(findDuplicate(solidFace(BASE.U), [solidFace(BASE.D)])).toBe(-1);
    expect(new AutoCapture().update(frameOf(surround(BASE.L, 2), 3), [cellsOf(frameOf(surround(BASE.R, 3), 3))]).status).toBe('holding');
  });
  it('여섯 면을 차례로 보여주면 딱 여섯 번만 찍힌다', () => {
    const auto = new AutoCapture();
    const captured: RGB[][] = [];
    const centers = [BASE.F, BASE.R, BASE.D, BASE.L, BASE.B, BASE.U];
    for (const center of centers) {
      // 면 하나를 25번(약 3초) 보여준다. 마지막 면 말고는 이후에 다음 면이 이어진다
      for (let i = 0; i < 25; i++) {
        const frame = frameOf(surround(center, centers.indexOf(center)), 3);
        if (auto.update(frame, captured).status === 'capture') captured.push(cellsOf(frame));
      }
    }
    expect(captured.length).toBe(6);
    expect(new Set(captured.map((f) => cubeColorOf(f[4]))).size).toBe(captured.length);
  });
});
