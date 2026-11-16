// 순서·방향 상관없이 찍은 6면으로 큐브 상태를 복원한다.
// 가운데 색으로 어느 면인지 알아내고, 각 면이 몇 도 돌아간 채 찍혔는지는
// "실제로 존재할 수 있는 큐브가 되는 조합"을 찾아서 알아낸다.
import { FACES, type Face } from '../core/faces';
import { countProblems } from '../core/validate';
import { classifyScans, type FaceScans } from './classify';
import { colorDistance, normalizeBrightness, rgbToLab, type RGB } from './colorMath';

/** 표준 큐브 색 (가운데 색이 어느 면인지 이름 붙일 때 기준) */
const STANDARD_COLORS: Record<Face, RGB> = {
  U: [245, 245, 245],
  R: [215, 38, 61],
  F: [31, 166, 74],
  D: [255, 214, 10],
  L: [255, 123, 28],
  B: [28, 95, 212],
};

export interface ResolvedCube {
  state: string;
  /** 문제 없는 큐브로 딱 하나만 복원되었는지 */
  exact: boolean;
}

// 6개 항목의 모든 순서(720가지)를 만든다
function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

// 찍은 6면의 가운데 색을 표준 6색에 하나씩 짝지어 각 면의 이름(U/R/F/D/L/B)을 정한다
export function nameFaces(centers: RGB[]): Face[] {
  const labs = centers.map((c) => rgbToLab(normalizeBrightness(c)));
  const standards = FACES.map((f) => rgbToLab(STANDARD_COLORS[f]));
  let best: number[] = [];
  let bestCost = Infinity;
  for (const order of permutations([0, 1, 2, 3, 4, 5])) {
    const cost = order.reduce((sum, faceIndex, i) => sum + colorDistance(labs[i], standards[faceIndex]), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = order;
    }
  }
  return best.map((faceIndex) => FACES[faceIndex]);
}

// 3x3 칸 배열을 시계 방향으로 90°씩 turns번 돌린다
export function rotateGrid<T>(cells: T[], turns: number): T[] {
  let current = cells;
  for (let t = 0; t < turns % 4; t++) {
    current = current.map((_, i) => current[(2 - (i % 3)) * 3 + Math.floor(i / 3)]);
  }
  return current;
}

// 찍은 6면(순서·방향 무관)으로 큐브 상태를 복원한다
export function resolveCube(captured: RGB[][]): ResolvedCube {
  const names = nameFaces(captured.map((cells) => cells[4]));
  const scans = Object.fromEntries(names.map((face, i) => [face, captured[i]])) as FaceScans;
  const flat = classifyScans(scans);
  const grids = FACES.map((_, i) => flat.slice(i * 9, i * 9 + 9).split(''));
  const rotated = grids.map((grid) => [0, 1, 2, 3].map((turns) => rotateGrid(grid, turns).join('')));

  let bestState = flat;
  let bestScore = Infinity;
  const perfect = new Set<string>();
  for (let combo = 0; combo < 4096; combo++) {
    let state = '';
    for (let face = 0; face < 6; face++) state += rotated[face][(combo >> (face * 2)) & 3];
    const score = countProblems(state);
    if (score === 0) perfect.add(state);
    if (score < bestScore) {
      bestScore = score;
      bestState = state;
    }
  }
  return { state: bestState, exact: perfect.size === 1 };
}
