// 회전 기호(R, U' 등)를 초보자가 이해할 수 있는 문장으로 바꾼다
import { parseMove, wholeTurns, type Move } from '../../core/moves';
import type { MessageKey, Translate } from '../../i18n';

export interface MoveDescription {
  /** 주 안내 문장. 예: "오른쪽 줄을 위로" */
  title: string;
  /** 보조 설명 (화살표 보는 법, 횟수 등) */
  note: string;
}

// 회전 하나에 대한 안내 문장을 만든다. 화살표 보는 법 설명은 첫 회전(intro가 true)에서만 붙인다.
export function describeMove(move: Move, t: Translate, intro = false): MoveDescription {
  const whole = wholeTurns(move);
  if (whole) return { title: t(('mvY' + (whole === 1 ? '' : whole)) as MessageKey), note: t('mvYNote') };
  const { face, turns } = parseMove(move);
  const key = ('mv' + face + (turns === 1 ? '' : turns)) as MessageKey;
  const notes = intro ? [t('guideWatch')] : [];
  if (face === 'B') notes.push(t('mvBNote'));
  else if (turns !== 2) notes.push(t('mvQuarter'));
  return { title: t(key), note: notes.join(', ') };
}
