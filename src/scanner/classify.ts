// 촬영한 6면(각 9칸)의 색을 6가지 큐브 색으로 분류한다
import { FACES, type Face } from '../core/faces';
import { colorDistance, normalizeBrightness, rgbToLab, type Lab, type RGB } from './colorMath';

/** 면별로 촬영한 9칸의 평균 색 */
export type FaceScans = Record<Face, RGB[]>;

// 기준색 6개에 맞춰 54칸을 배정한다. 가운데 칸은 고정이고,
// 색마다 정확히 9칸이 되도록 가장 확실한(기준색과 가까운) 칸부터 채운다.
function assign(labs: Lab[], refs: Lab[]): number[] {
  const result: number[] = new Array(54).fill(-1);
  const remaining = FACES.map(() => 8);
  const candidates: { index: number; color: number; dist: number }[] = [];
  labs.forEach((lab, index) => {
    if (index % 9 === 4) {
      result[index] = Math.floor(index / 9);
      return;
    }
    refs.forEach((ref, color) => candidates.push({ index, color, dist: colorDistance(lab, ref) }));
  });
  candidates.sort((a, b) => a.dist - b.dist);
  for (const { index, color } of candidates) {
    if (result[index] >= 0 || remaining[color] === 0) continue;
    result[index] = color;
    remaining[color]--;
  }
  return result;
}

// 같은 색으로 배정된 칸들의 평균으로 기준색을 다시 계산한다
function averageRefs(labs: Lab[], assigned: number[]): Lab[] {
  return FACES.map((_, color) => {
    const members = labs.filter((_, i) => assigned[i] === color);
    return [0, 1, 2].map((k) => members.reduce((sum, m) => sum + m[k], 0) / members.length) as Lab;
  });
}

// 각 면의 가운데 칸 색을 기준으로 54칸을 분류해 큐브 상태 문자열을 만든다.
// 한 번 분류한 뒤 기준색을 평균값으로 다듬어 다시 분류해 정확도를 높인다.
export function classifyScans(scans: FaceScans): string {
  const labs = FACES.flatMap((f) => scans[f].map((rgb) => rgbToLab(normalizeBrightness(rgb))));
  let refs = FACES.map((_, i) => labs[i * 9 + 4]);
  let assigned = assign(labs, refs);
  for (let round = 0; round < 3; round++) {
    refs = averageRefs(labs, assigned);
    assigned = assign(labs, refs);
  }
  return assigned.map((color) => FACES[color]).join('');
}
