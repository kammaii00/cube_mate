// 의견 보내기: 아이가 쓴 의견을 구글 시트(Apps Script 웹 앱)로 보낸다. 이름·연락처는 받지 않는다
import { ISLANDS } from '../../course/skills';
import { loadCourse, starsOf } from '../../course/progress';
import { loadRewards } from '../../rewards/store';

/** 의견을 받을 Apps Script 웹 앱 주소. 비어 있으면 의견 보내기 버튼을 숨긴다 */
export const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwgiKOF4cZoUOlglp_2qpSOgPuHVhxegiIIme_6hTgOa8wiSPlro_-mt0-3ZI-1Hjk/exec';
/** 의견 글자 수 한도 */
export const MAX_FEEDBACK = 500;
/** 한 번 보낸 뒤 다시 보낼 수 있을 때까지 기다리는 시간(ms) */
const WAIT_MS = 60_000;
const LAST_KEY = 'cube-mate-feedback-at';

/** 나이 고르기 칸 (시트에 그대로 적힌다) */
export const AGES = ['5살 이하', '6~7살', '8~9살', '10살 이상'] as const;

// 방금 보내서 아직 기다려야 하는지
export function tooSoon(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(LAST_KEY) ?? 0) < WAIT_MS;
  } catch {
    return false;
  }
}

// 어디까지 했는지 짧게 적는다 (빨리 맞추기 완성 횟수, 섬마다 별 수)
function progressText(): string {
  const course = loadCourse();
  const stars = ISLANDS.map((island, i) => `${starsOf(course, i)}/${island.levels.length}`).join(' ');
  return `빨리 맞추기 ${loadRewards().solves}번 · 섬 별 ${stars}`;
}

// 의견 하나를 보낸다 (보낼 곳이 받았는지는 알 수 없어서, 보내기만 성공하면 성공으로 본다)
export async function sendFeedback(text: string, age: string, lang: string): Promise<boolean> {
  if (!FEEDBACK_URL || !text.trim()) return false;
  const body = JSON.stringify({ text: text.trim().slice(0, MAX_FEEDBACK), age, lang, progress: progressText(), version: 'web' });
  try {
    // text/plain + no-cors: 브라우저가 미리 묻지 않고 바로 보낸다 (Apps Script가 받는 방식)
    await fetch(FEEDBACK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    try {
      localStorage.setItem(LAST_KEY, String(Date.now()));
    } catch {
      // 저장이 안 되는 환경이면 기다리기 없이 넘어간다
    }
    return true;
  } catch {
    return false;
  }
}
