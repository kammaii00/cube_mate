// 큐비 음성 재생기: public/voice/<이름>.mp3 를 순서대로 틀고, 마지막으로 한 말을 기억해 다시 들려준다.
// 녹음은 한국어만 있어서 한국어일 때만 소리를 낸다. 파일이 없거나 재생이 막히면 조용히 넘어간다.
import { useCallback } from 'react';
import { useI18n } from '../i18n';

export interface SayOptions {
  /** 지금 나오는 말을 끊고 바로 말한다 (기본 true). false면 말하는 중일 땐 건너뛴다 */
  interrupt?: boolean;
  /** 말하는 중이면 끊지 않고 뒤에 이어서 말한다 */
  enqueue?: boolean;
  /** 같은 말을 이 시간(ms) 안에 이미 했다면 건너뛴다 (카메라 안내처럼 자주 바뀌는 말용) */
  cooldown?: number;
}

/** 대기열에 넣으면 소리 대신 잠깐 쉬는 표시 (한 템포 쉬고 다음 말) */
export const PAUSE = '_pause';
const PAUSE_MS = 1000;

let current: HTMLAudioElement | null = null;
let currentName: string | null = null;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;
let queue: string[] = [];
/** 큐비를 누르면 다시 들려줄 마지막 말 */
let lastSaid: string[] = [];
const lastAt = new Map<string, number>();
/** 마지막으로 새 말을 시작한 시각 */
let lastStart = 0;

// 대기열의 다음 파일을 튼다
function playNext(): void {
  const name = queue.shift();
  currentName = name ?? null;
  pauseTimer = null;
  if (!name) {
    current = null;
    return;
  }
  if (name === PAUSE) {
    pauseTimer = setTimeout(playNext, PAUSE_MS);
    return;
  }
  lastAt.set(name, Date.now());
  try {
    const audio = new Audio(`/voice/${name}.mp3`);
    current = audio;
    audio.onended = playNext;
    audio.onerror = playNext;
    audio.play().catch((e: unknown) => {
      // 브라우저가 자동 재생을 막음: 이번 말은 글자로만 보여준다 (파일이 없을 때는 onerror가 다음으로 넘긴다)
      if (e instanceof DOMException && e.name === 'NotAllowedError' && current === audio) {
        current = null;
        queue = [];
      }
    });
  } catch {
    current = null;
    queue = [];
  }
}

// 지금 말하는 중인지 알려준다
export function isSpeaking(): boolean {
  return current !== null || pauseTimer !== null;
}

// 말하던 것을 멈추고 대기열을 비운다
export function stopVoice(): void {
  if (current) {
    current.onended = null;
    current.onerror = null;
    current.pause();
  }
  if (pauseTimer) clearTimeout(pauseTimer);
  pauseTimer = null;
  current = null;
  currentName = null;
  queue = [];
}

// 음성 파일 이름(확장자 없이) 하나 또는 여러 개를 차례로 말한다
export function say(names: string | string[], options: SayOptions = {}): void {
  const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
  if (!list.length) return;
  const { interrupt = true, enqueue = false, cooldown = 0 } = options;
  // 화면이 두 번 그려져 같은 말을 연달아 시키면 처음부터 다시 틀지 않는다
  if (!enqueue && list.join() === lastSaid.join() && Date.now() - lastStart < 300) return;
  if (cooldown && list.some((n) => Date.now() - (lastAt.get(n) ?? 0) < cooldown)) return;
  if (enqueue && isSpeaking()) {
    // 같은 말이 이미 나오는 중이거나 기다리는 중이면 또 넣지 않는다 (두 번 재생 방지)
    if (list.every((n) => n === currentName || queue.includes(n))) return;
    queue.push(...list);
    lastSaid = [...lastSaid, ...list];
    return;
  }
  if (!interrupt && isSpeaking()) return;
  stopVoice();
  lastStart = Date.now();
  queue = [...list];
  lastSaid = list;
  playNext();
}

// 마지막으로 한 말을 처음부터 다시 들려준다 (큐비를 눌렀을 때)
export function replayVoice(): void {
  if (lastSaid.length) {
    lastStart = 0;
    say(lastSaid);
  }
}

// 화면에서 쓰는 말하기 함수: 한국어일 때만 소리를 낸다
export function useSay(): (names: string | string[], options?: SayOptions) => void {
  const { lang } = useI18n();
  return useCallback((names, options) => {
    if (lang === 'ko') say(names, options);
  }, [lang]);
}
