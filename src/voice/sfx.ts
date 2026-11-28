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

// 도장 "쿵": 낮은 음이 빠르게 내려가며 사라지고, 짧은 종이 소리(잡음)를 섞는다
export function playStamp(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.14);
  gain.gain.setValueAtTime(0.55, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.2);
  const noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const ngain = ac.createGain();
  src.buffer = noise;
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  ngain.gain.value = 0.25;
  src.connect(filter).connect(ngain).connect(ac.destination);
  src.start(t);
}

/** 별 소리가 시작되는 때(ms): 큰 별이 튀어나오는 애니메이션(0.9초 뒤 시작)에 맞춘다 */
export const STAR_SOUND_DELAY = 950;

// 별 "반짝반짝 띠링~": 높은 음들이 빠르게 올라가며 반짝인 뒤, 맑은 종소리 화음이 길게 울린다
export function playStarWin(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093].forEach((f, i) => note(ac, f, t + i * 0.055, 0.22, 0.13));
  [1567.98, 2093, 2637.02].forEach((f) => note(ac, f, t + 0.38, 1.1, 0.1));
  [523.25, 783.99].forEach((f) => note(ac, f, t + 0.38, 0.9, 0.12));
}
