// 카메라 화면 한 장(네모 칸 영역)을 분석한다: 9칸의 색과, 칸 사이 경계선이 보이는지
import type { RGB } from './colorMath';

/** 한 칸에서 읽은 값: 평균 색과, 칸 안에서 색이 얼마나 들쭉날쭉한지 */
export interface CellSample {
  rgb: RGB;
  spread: number;
}

/** 화면 한 장의 분석 결과 */
export interface FrameSample {
  cells: CellSample[];
  /** 칸 사이 경계 12곳이 양옆 칸보다 얼마나 어두운지 (0~1, 클수록 뚜렷한 틈) */
  seams: number[];
}

/** 경계선을 찾을 때 좌우(상하)로 살피는 범위: 칸 크기의 이 비율만큼 */
const SEAM_BAND = 0.25;

// 픽셀의 밝기를 구한다
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// 정사각형 이미지의 사각 영역에서 평균 색과 표준편차(색이 고른 정도)를 계산한다
function measure(data: ArrayLike<number>, size: number, x0: number, y0: number, w: number, h: number): CellSample {
  const sum = [0, 0, 0];
  const squares = [0, 0, 0];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) {
        sum[k] += data[i + k];
        squares[k] += data[i + k] * data[i + k];
      }
    }
  }
  const n = w * h;
  const mean = sum.map((v) => v / n) as RGB;
  const deviation = mean.map((m, k) => Math.sqrt(Math.max(0, squares[k] / n - m * m)));
  return { rgb: mean, spread: (deviation[0] + deviation[1] + deviation[2]) / 3 };
}

// 경계선 근처에서 가장 어두운 줄의 밝기를 찾는다.
// vertical이 true면 세로 경계(x 위치 line 근처), false면 가로 경계를 살핀다.
function darkestLine(data: ArrayLike<number>, size: number, line: number, from: number, to: number, vertical: boolean): number {
  const band = Math.round((size / 3) * SEAM_BAND);
  let darkest = Infinity;
  for (let offset = -band; offset <= band; offset++) {
    let total = 0;
    for (let along = from; along < to; along++) {
      const x = vertical ? line + offset : along;
      const y = vertical ? along : line + offset;
      const i = (y * size + x) * 4;
      total += luminance(data[i], data[i + 1], data[i + 2]);
    }
    darkest = Math.min(darkest, total / (to - from));
  }
  return darkest;
}

// size x size 크기의 RGBA 픽셀을 받아 9칸의 색과 12곳의 경계 뚜렷함을 구한다
export function analyzeFrame(data: ArrayLike<number>, size: number): FrameSample {
  const cell = size / 3;
  const patch = Math.round(cell * 0.4);
  const inset = Math.round((cell - patch) / 2);
  const cells: CellSample[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      cells.push(measure(data, size, Math.round(c * cell) + inset, Math.round(r * cell) + inset, patch, patch));

  const brightness = cells.map((s) => luminance(s.rgb[0], s.rgb[1], s.rgb[2]));
  const seams: number[] = [];
  // 경계 하나가 양옆 칸 중 어두운 쪽보다 얼마나 더 어두운지 기록한다
  const addSeam = (a: number, b: number, line: number, track: number, vertical: boolean) => {
    const from = Math.round(track * cell + cell * 0.25);
    const to = Math.round(track * cell + cell * 0.75);
    const neighbor = Math.min(brightness[a], brightness[b]);
    const dark = darkestLine(data, size, Math.round(line * cell), from, to, vertical);
    seams.push(Math.max(0, (neighbor - dark) / Math.max(neighbor, 1)));
  };
  for (let line = 1; line <= 2; line++) {
    for (let track = 0; track < 3; track++) {
      addSeam(track * 3 + line - 1, track * 3 + line, line, track, true); // 세로 경계: 같은 행의 좌우 칸
      addSeam((line - 1) * 3 + track, line * 3 + track, line, track, false); // 가로 경계: 같은 열의 위아래 칸
    }
  }
  return { cells, seams };
}
