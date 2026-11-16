// 회전 기호(R, U' 등)를 초보자가 이해할 수 있는 문장으로 바꾼다
import { parseMove, type Move } from '../../core/moves';
import type { MessageKey, Translate } from '../../i18n';

export interface MoveDescription {
  /** 주 안내 문장. 예: "오른쪽 줄을 위로" */
  title: string;
  /** 보조 설명 (화살표 보는 법, 횟수 등) */
  note: string;
}

// 회전 하나에 대한 안내 문장을 만든다
export function describeMove(move: Move, t: Translate): MoveDescription {
  const { face, turns } = parseMove(move);
  const key = ('mv' + face + (turns === 1 ? '' : turns)) as MessageKey;
  const notes = [t('guideWatch')];
  if (face === 'B') notes.push(t('mvBNote'));
  else if (turns !== 2) notes.push(t('mvQuarter'));
  return { title: t(key), note: notes.join(', ') };
}
