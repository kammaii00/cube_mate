// 자동 촬영 판단: 네모 칸 안에 "진짜 큐브의 한 면"이 또렷하게, 가만히 보일 때만 찍으라고 알려준다
import type { Face } from '../core/faces';
import { colorDistance, normalizeBrightness, rgbToLab, type RGB } from './colorMath';
import type { FrameSample } from './frame';

export type CaptureStatus =
  | 'unclear' // 큐브가 안 보임 (큐브 색이 아니거나, 칸 사이 틈이 안 보이거나, 흔들림)
  | 'seen' // 이미 찍은 면
  | 'holding' // 큐브가 잘 보임, 멈춰 있는지 확인 중
  | 'capture'; // 지금 촬영

export interface CaptureResult {
  status: CaptureStatus;
  /** 촬영까지의 진행 정도 (0~1) */
  progress: number;
  /** 칸별로 알아본 큐브 색 (큐브 색이 아니면 null) */
  colors: (Face | null)[];
}

/** 판단 기준값. 실제 기기에서 너무 엄격하거나 느슨하면 여기만 조정하면 된다. */
export const CAPTURE_SETTINGS = {
  /** 연속으로 몇 번 멈춰 있어야 찍는지 (화면을 0.13초마다 읽으므로 7번 ≈ 0.9초) */
  stableTicks: 7,
  /** 직전과 색 차이가 이보다 작으면 멈춘 것으로 본다 */
  moveTolerance: 24,
  /** 칸 안 색의 들쭉날쭉함이 이보다 작아야 스티커로 본다 */
  spreadTolerance: 36,
  /** 가운데 색이 이미 찍은 면과 이만큼 이상 달라야 새 면으로 본다 */
  noveltyTolerance: 20,
  /** 이보다 어두운 칸은 큐브 색으로 보지 않는다 (0~1) */
  minBrightness: 0.25,
  /** 선명도가 이보다 낮고 밝으면 흰색으로 본다 (0~1) */
  whiteMaxSaturation: 0.22,
  /** 흰색으로 보려면 이만큼은 밝아야 한다 (0~1) */
  whiteMinBrightness: 0.55,
  /** 흰색이 아닌 색은 선명도가 이 이상이어야 큐브 색으로 본다 (0~1) */
  colorMinSaturation: 0.45,
  /** 칸 사이 경계가 양옆 칸보다 이 비율 이상 어두워야 "틈"으로 본다 */
  seamDarkening: 0.2,
  /** 경계 12곳 중 몇 곳 이상에서 틈이 보여야 큐브로 보는지 */
  seamsNeeded: 10,
};

// 두 RGB 색의 단순 거리
function rgbGap(a: RGB, b: RGB): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// 두 색이 (밝기 차이를 무시하고) 같은 색 계열인지 비교하기 위한 거리
export function hueGap(a: RGB, b: RGB): number {
  return colorDistance(rgbToLab(normalizeBrightness(a)), rgbToLab(normalizeBrightness(b)));
}

// 색 하나가 큐브의 여섯 색 중 무엇인지 알아본다. 회색·베이지·검정·살색 등은 null. (짙은 갈색은 어두운 주황과 구분되지 않아 틈 검사에서 거른다)
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

export class AutoCapture {
  private previous: RGB[] | null = null;
  private stable = 0;
  /** 한 면을 찍은 뒤에는 큐브가 한 번 움직여야(안 보였다가 다시 보여야) 다음 면을 찍는다 */
  private armed = true;

  // 판단 상태를 처음으로 되돌린다
  reset(): void {
    this.previous = null;
    this.stable = 0;
    this.armed = true;
  }

  // 새로 읽은 화면과 이미 찍은 면들의 가운데 색을 받아 지금 상태를 판단한다
  update(frame: FrameSample, capturedCenters: RGB[]): CaptureResult {
    const rgbs = frame.cells.map((c) => c.rgb);
    const before = this.previous;
    this.previous = rgbs;
    const colors = frame.cells.map((c) => (c.spread < CAPTURE_SETTINGS.spreadTolerance ? cubeColorOf(c.rgb) : null));

    const gaps = frame.seams.filter((s) => s >= CAPTURE_SETTINGS.seamDarkening).length;
    const isCube = colors.every((c) => c !== null) && gaps >= CAPTURE_SETTINGS.seamsNeeded;
    if (!isCube) {
      this.stable = 0;
      this.armed = true;
      return { status: 'unclear', progress: 0, colors };
    }
    const known = capturedCenters.some((center) => hueGap(center, rgbs[4]) < CAPTURE_SETTINGS.noveltyTolerance);
    if (known || !this.armed) {
      this.stable = 0;
      return { status: 'seen', progress: 0, colors };
    }
    const still = before !== null && rgbs.every((c, i) => rgbGap(c, before[i]) < CAPTURE_SETTINGS.moveTolerance);
    this.stable = still ? this.stable + 1 : 0;
    if (this.stable >= CAPTURE_SETTINGS.stableTicks) {
      this.stable = 0;
      this.armed = false;
      return { status: 'capture', progress: 1, colors };
    }
    return { status: 'holding', progress: this.stable / CAPTURE_SETTINGS.stableTicks, colors };
  }
}
