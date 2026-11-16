// 자동 촬영 판단: 네모 칸 안에 "진짜 큐브의 한 면"이 또렷하게, 가만히 보일 때만 찍으라고 알려준다.
// 이미 찍은 면(가운데 색이 같거나 모양이 같은 면)은 절대 다시 찍지 않는다.
import type { Face } from '../core/faces';
import { colorDistance, normalizeBrightness, rgbToLab, type RGB } from './colorMath';
import type { FrameSample } from './frame';
import { rotateGrid } from './orient';

export type CaptureStatus =
  | 'unclear' // 큐브가 안 보임 (큐브 색이 아닌 칸이 있음)
  | 'unaligned' // 큐브 색은 보이지만 칸에 맞춰지지 않음 (너무 멀거나 비스듬함)
  | 'seen' // 이미 찍은 면
  | 'holding' // 큐브가 잘 보임, 멈춰 있는지 확인 중
  | 'capture'; // 지금 촬영

export interface CaptureResult {
  status: CaptureStatus;
  /** 촬영까지의 진행 정도 (0~1) */
  progress: number;
  /** 칸별로 알아본 큐브 색 (큐브 색이 아니면 null) */
  colors: (Face | null)[];
  /** status가 'seen'일 때, 이미 찍은 면 중 어느 것과 같은지 (찍은 순서 번호). 아니면 -1 */
  duplicateOf: number;
}

/** 판단 기준값. 실제 기기에서 너무 엄격하거나 느슨하면 여기만 조정하면 된다. */
export const CAPTURE_SETTINGS = {
  /** 멈춰 있다고 센 횟수가 이만큼 쌓이면 찍는다 (화면을 0.13초마다 읽으므로 6번 ≈ 0.8초) */
  stableTicks: 6,
  /** 직전과 색 차이가 이보다 작으면 멈춘 것으로 본다. 손이 조금 떨리는 정도는 봐준다 */
  moveTolerance: 40,
  /** 움직였을 때 멈춤 횟수를 깎는 양 (0으로 되돌리지 않아서, 가끔 흔들려도 괜찮다) */
  movePenalty: 2,
  /** 칸 안 색의 들쭉날쭉함이 이보다 작아야 스티커로 본다 */
  spreadTolerance: 36,
  /** 이보다 어두운 칸은 큐브 색으로 보지 않는다 (0~1) */
  minBrightness: 0.25,
  /** 선명도가 이보다 낮고 밝으면 흰색으로 본다 (0~1) */
  whiteMaxSaturation: 0.22,
  /** 흰색으로 보려면 이만큼은 밝아야 한다 (0~1) */
  whiteMinBrightness: 0.55,
  /** 흰색이 아닌 색은 선명도가 이 이상이어야 큐브 색으로 본다 (0~1) */
  colorMinSaturation: 0.45,
  /** 칸 사이 경계가 양옆 칸보다 이 비율 이상 어두워야 "틈"으로 본다 */
  seamDarkening: 0.15,
  /** 한 가지 색(또는 두 가지)뿐인 면은 벽·책상과 구분하려고 경계 12곳 중 이만큼 이상에서 틈이 보여야 한다 */
  seamsNeeded: 6,
  /** 9칸에 서로 다른 색이 이만큼 이상 보이면 틈 검사 없이 큐브로 본다 (벽에는 이런 무늬가 없다) */
  mixedColorsEnough: 3,
  /** 두 면의 칸별 색 차이 평균이 이보다 작으면 같은 면으로 본다 */
  sameFaceTolerance: 14,
  /** 한 면을 찍은 뒤 이 횟수만큼은 아무것도 찍지 않는다 (0.13초 x 8 ≈ 1초) */
  cooldownTicks: 8,
};

// 두 RGB 색의 단순 거리
function rgbGap(a: RGB, b: RGB): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// 두 색이 (밝기 차이를 무시하고) 얼마나 다른지
export function hueGap(a: RGB, b: RGB): number {
  return colorDistance(rgbToLab(normalizeBrightness(a)), rgbToLab(normalizeBrightness(b)));
}

// 색 하나가 큐브의 여섯 색 중 무엇인지 알아본다. 회색·베이지·검정·살색 등은 null.
// (짙은 갈색은 어두운 주황과 구분되지 않아 틈 검사에서 거른다)
export function cubeColorOf([r, g, b]: RGB): Face | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = max / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (value < CAPTURE_SETTINGS.minBrightness) return null;
  if (saturation < CAPTURE_SETTINGS.whiteMaxSaturation) {
    return value >= CAPTURE_SETTINGS.whiteMinBrightness ? 'U' : null;
  }
  if (saturation < CAPTURE_SETTINGS.colorMinSaturation) return null;
  let hue = 0;
  if (max === r) hue = ((g - b) / (max - min)) * 60;
  else if (max === g) hue = ((b - r) / (max - min)) * 60 + 120;
  else hue = ((r - g) / (max - min)) * 60 + 240;
  if (hue < 0) hue += 360;
  if (hue < 10 || hue >= 345) return 'R';
  if (hue < 38) return 'L';
  if (hue < 75) return 'D';
  if (hue < 170) return 'F';
  if (hue < 265) return 'B';
  return null;
}

// 새 면이 이미 찍은 면 중 하나와 같은지 찾는다. 같은 면이면 그 면의 번호(0부터), 아니면 -1.
// 가운데 색이 같으면 같은 면이다. 조명 때문에 가운데 색을 다르게 읽었더라도,
// 가운데를 뺀 나머지 8칸이 4방향 중 어느 쪽으로 돌려 봐도 거의 같으면 같은 면으로 본다.
export function findDuplicate(face: RGB[], captured: RGB[][]): number {
  const center = cubeColorOf(face[4]);
  for (let i = 0; i < captured.length; i++) {
    if (center !== null && cubeColorOf(captured[i][4]) === center) return i;
    for (let turns = 0; turns < 4; turns++) {
      const turned = rotateGrid(captured[i], turns);
      const average = face.reduce((sum, rgb, c) => (c === 4 ? sum : sum + hueGap(rgb, turned[c])), 0) / 8;
      if (average < CAPTURE_SETTINGS.sameFaceTolerance) return i;
    }
  }
  return -1;
}

export class AutoCapture {
  private previous: RGB[] | null = null;
  private stable = 0;
  private cooldown = 0;

  // 판단 상태를 처음으로 되돌린다
  reset(): void {
    this.previous = null;
    this.stable = 0;
    this.cooldown = 0;
  }

  // 새로 읽은 화면과 이미 찍은 면들을 받아 지금 상태를 판단한다
  update(frame: FrameSample, captured: RGB[][]): CaptureResult {
    const rgbs = frame.cells.map((c) => c.rgb);
    const before = this.previous;
    this.previous = rgbs;
    const colors = frame.cells.map((c) => (c.spread < CAPTURE_SETTINGS.spreadTolerance ? cubeColorOf(c.rgb) : null));
    const result = (status: CaptureStatus, progress = 0, duplicateOf = -1): CaptureResult => ({ status, progress, colors, duplicateOf });

    if (colors.some((c) => c === null)) {
      this.stable = 0;
      return result('unclear');
    }
    const gaps = frame.seams.filter((s) => s >= CAPTURE_SETTINGS.seamDarkening).length;
    const mixed = new Set(colors).size >= CAPTURE_SETTINGS.mixedColorsEnough;
    if (!mixed && gaps < CAPTURE_SETTINGS.seamsNeeded) {
      this.stable = 0;
      return result('unaligned');
    }
    const duplicateOf = findDuplicate(rgbs, captured);
    if (duplicateOf >= 0) {
      this.stable = 0;
      return result('seen', 0, duplicateOf);
    }
    if (this.cooldown > 0) {
      this.cooldown--;
      this.stable = 0;
      return result('holding');
    }
    const still = before !== null && rgbs.every((c, i) => rgbGap(c, before[i]) < CAPTURE_SETTINGS.moveTolerance);
    this.stable = still ? this.stable + 1 : Math.max(0, this.stable - CAPTURE_SETTINGS.movePenalty);
    if (this.stable >= CAPTURE_SETTINGS.stableTicks) {
      this.stable = 0;
      this.cooldown = CAPTURE_SETTINGS.cooldownTicks;
      return result('capture', 1);
    }
    return result('holding', this.stable / CAPTURE_SETTINGS.stableTicks);
  }
}
