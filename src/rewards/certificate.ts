// 상장 그림 만들기: 아이 이름이 들어간 상장을 캔버스에 그려 사진(PNG)으로 내보낸다
import { FACE_COLORS } from '../core/faces';

const W = 1080;
const H = 1350;
const INK = '#1b2440';
const GOLD = '#e0a400';
const DISPLAY = "'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

/** 상장에 들어갈 글자들 (화면 언어로 미리 번역해서 넘긴다) */
export interface CertificateText {
  title: string;
  name: string;
  body: string[];
  count: string;
  date: string;
  from: string;
}

// 둥근 사각형 경로를 만든다
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 상장 바탕: 크림색 종이, 금색 이중 테두리, 네 모서리 큐브 색 점
function drawFrame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 18;
  ctx.strokeStyle = GOLD;
  roundRect(ctx, 40, 40, W - 80, H - 80, 40);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  roundRect(ctx, 76, 76, W - 152, H - 152, 28);
  ctx.stroke();
  const colors = Object.values(FACE_COLORS);
  [[120, 120], [W - 120, 120], [120, H - 120], [W - 120, H - 120]].forEach(([x, y], i) => {
    ctx.fillStyle = colors[(i + 1) % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 큐비 얼굴을 캔버스에 그린다 (Mascot.tsx와 같은 모양, 왼쪽 위 기준 size 크기)
function drawCubie(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 100;
  const order = ['R', 'D', 'B', 'U', 'U', 'U', 'F', 'L', 'D'] as const;
  ctx.fillStyle = INK;
  roundRect(ctx, x + 4 * s, y + 4 * s, 92 * s, 92 * s, 22 * s);
  ctx.fill();
  order.forEach((face, i) => {
    ctx.fillStyle = FACE_COLORS[face];
    roundRect(ctx, x + (12 + (i % 3) * 26.5) * s, y + (12 + Math.floor(i / 3) * 26.5) * s, 23 * s, 23 * s, 6 * s);
    ctx.fill();
  });
  ctx.fillStyle = INK;
  [23.5, 76.5].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(x + cx * s, y + 50 * s, 5.2 * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 40 * s, y + 55 * s);
  ctx.quadraticCurveTo(x + 50 * s, y + 65 * s, x + 60 * s, y + 55 * s);
  ctx.stroke();
}

// 가운데 정렬 글자 한 줄을 쓴다 (너무 길면 폭에 맞게 줄인다)
function centerText(ctx: CanvasRenderingContext2D, text: string, y: number, px: number, color = INK) {
  ctx.fillStyle = color;
  ctx.font = `${px}px ${DISPLAY}`;
  const max = W - 260;
  const width = ctx.measureText(text).width;
  if (width > max) ctx.font = `${Math.floor((px * max) / width)}px ${DISPLAY}`;
  ctx.fillText(text, W / 2, y);
}

// 상장 전체를 그려 캔버스로 돌려준다 (글꼴이 다 불러와진 뒤에 그린다)
export async function drawCertificate(text: CertificateText): Promise<HTMLCanvasElement> {
  try {
    // 한글 글꼴은 글자 묶음별로 나눠 내려받으므로, 상장에 쓸 글자를 모두 넘겨 미리 불러온다
    const allText = [text.title, text.name, ...text.body, text.count, text.date, text.from].join('');
    await document.fonts.load(`80px ${DISPLAY}`, allText);
  } catch {
    // 글꼴을 못 불러오면 기본 글꼴로 그린다
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFrame(ctx);
  centerText(ctx, '🏅', 230, 120);
  centerText(ctx, text.title, 390, 120);
  centerText(ctx, text.name, 560, 96, '#d7263d');
  ctx.fillStyle = GOLD;
  ctx.fillRect(W / 2 - 220, 630, 440, 6);
  text.body.forEach((line, i) => centerText(ctx, line, 730 + i * 74, 50));
  centerText(ctx, text.count, 1000, 44, '#1fa64a');
  centerText(ctx, text.date, 1080, 40, '#55627f');
  drawCubie(ctx, W / 2 - 170, 1130, 90);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `48px ${DISPLAY}`;
  ctx.fillText(text.from, W / 2 - 60, 1177);
  return canvas;
}

// 상장 그림을 기기에 저장한다: 휴대폰은 공유 창(사진 저장), 그 밖에는 파일 내려받기
export async function saveCertificate(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // 아이가 공유 창을 닫았으면 그대로 끝내고, 공유가 안 되는 경우만 내려받기로 넘어간다
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
