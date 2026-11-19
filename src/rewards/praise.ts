// 칭찬 문구와 음성: 완성할 때마다 칭찬 하나를 무작위로 골라 보여주고 들려준다
// 음성 파일은 나중에 타입캐스트로 녹음해 public/voice/ 에 넣으면 자동으로 재생된다
import type { MessageKey } from '../i18n';
import { TADA_MS, playTada } from '../voice/sfx';
import { say } from '../voice/voice';

/** 칭찬 문구 키 (음성 파일 praise-1.mp3 ~ praise-5.mp3 와 순서가 같다) */
export const PRAISE_KEYS: MessageKey[] = ['praise1', 'praise2', 'praise3', 'praise4', 'praise5'];

let lastPraise = -1;

// 바로 전 칭찬과 겹치지 않게 칭찬 하나를 무작위로 고른다 (번호는 0부터)
export function pickPraise(): number {
  const choices = PRAISE_KEYS.map((_, i) => i).filter((i) => i !== lastPraise);
  lastPraise = choices[Math.floor(Math.random() * choices.length)];
  return lastPraise;
}

// 음성 파일 하나를 재생한다. 파일이 아직 없거나 재생이 막히면 조용히 넘어간다
export function playVoice(file: string) {
  try {
    const audio = new Audio(`/voice/${file}`);
    audio.play().catch(() => {
      // 파일이 없거나 브라우저가 자동 재생을 막은 경우: 글자로만 칭찬한다
    });
  } catch {
    // 오디오를 쓸 수 없는 환경
  }
}

// 완성 축하 음성을 들려준다: "우와! 큐브를 다 맞췄어! 정말 대단해!" → "또 하고 싶으면 한 번 더 눌러!" (한국어만)
// 화면의 칭찬 글자는 무작위로 바뀌지만, 음성은 녹음된 완성 축하 한 가지를 쓴다
// 먼저 "짜잔~" 효과음(모든 언어)을 울리고, 끝나면 음성을 이어 말한다
export function playPraise(_index: number, lang: 'ko' | 'en') {
  playTada();
  if (lang === 'ko') setTimeout(() => say(['doneTitle', 'doneAgain']), TADA_MS);
}

// 큐비 변신 음성을 들려준다
export function playTransform(lang: 'ko' | 'en') {
  if (lang === 'ko') say('transform', { enqueue: true });
}
