// 색 비교용 계산: RGB를 사람 눈의 색 차이에 가까운 Lab 값으로 바꾼다

export type RGB = [number, number, number];
export type Lab = [number, number, number];

// sRGB 채널 값(0~255)을 선형 밝기로 바꾼다
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Lab 변환에 쓰는 보조 함수
function labCurve(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

// 가장 밝은 채널이 255가 되도록 맞춰 조명 밝기의 영향을 없앤다
export function normalizeBrightness(rgb: RGB): RGB {
  const max = Math.max(rgb[0], rgb[1], rgb[2], 1);
  return [(rgb[0] / max) * 255, (rgb[1] / max) * 255, (rgb[2] / max) * 255];
}

// RGB 색을 Lab 색으로 바꾼다
export function rgbToLab([r, g, b]: RGB): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const x = labCurve((0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047);
  const y = labCurve(0.2126 * lr + 0.7152 * lg + 0.0722 * lb);
  const z = labCurve((0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// 두 Lab 색의 차이 (작을수록 비슷한 색)
export function colorDistance(a: Lab, b: Lab): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

// RGB 색을 CSS 색 문자열로 바꾼다
export function rgbToCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
