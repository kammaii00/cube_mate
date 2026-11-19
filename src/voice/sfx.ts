// 효과음: 녹음 파일 없이 브라우저 소리 합성(Web Audio)으로 직접 만든다 → 저작권 걱정이 없다

let ctx: AudioContext | null = null;
/** 마지막으로 "짜잔"을 울린 시각 (화면이 두 번 그려져도 한 번만 울리게) */
let lastTada = 0;

// 소리 합성기를 하나만 만들어 같이 쓴다 (못 쓰는 환경이면 null)
function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// 음 하나를 정해진 시각에 짧게 울린다 (부드럽게 커졌다 작아지는 실로폰 같은 소리)
function note(ac: AudioContext, freq: number, at: number, length: number, volume: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/** "짜잔~" 소리 길이(ms): 이 뒤에 음성을 이어 틀면 겹치지 않는다 */
export const TADA_MS = 1100;

// "짜잔~": 도-미-솔을 빠르게 올라간 뒤 높은 도 화음을 길게 울린다
export function playTada(): void {
  if (Date.now() - lastTada < 500) return;
  lastTada = Date.now();
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.05;
  [523.25, 659.25, 783.99].forEach((f, i) => note(ac, f, t + i * 0.09, 0.25, 0.25));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => note(ac, f, t + 0.3, 0.8, 0.16));
}
