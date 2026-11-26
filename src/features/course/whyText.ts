// 초보자 풀이 묶음의 "왜 이렇게 돌리는지" 문구를 만든다 (옛 배우기 모드의 why* 문구, 1층 꼭짓점은 꼬마 코스의 "오른손 춤" 문구)
import { FACES, type Face } from '../../core/faces';
import type { MessageKey, Translate } from '../../i18n';
import type { Chunk, Why } from '../../solver/beginner/lesson';

/** 1층 꼭짓점 묶음은 "오른손 춤 n번"으로 말한다 */
const DANCE_WHY: Partial<Record<Why, MessageKey>> = {
  cornerRight: 'courseWhyCornerRight',
  cornerFront: 'courseWhyCornerFront',
  cornerUp: 'courseWhyCornerUp',
  cornerStuck: 'courseWhyCornerStuck',
};

// 묶음 하나의 이유 문장 (예: "색이 맞았어요! 두 번 돌려서 꽃잎을 아래로 내려요"). pos: 묶음 안에서 몇 번째 회전인지
export function whyText(chunk: Chunk, t: Translate, pos = 0): string {
  const dance = chunk.formula === 'right' ? DANCE_WHY[chunk.why] : undefined;
  if (dance) {
    const n = chunk.reps ?? 1;
    return n > 1 ? `${t(dance)} ${t('courseWhyDanceNow', { r: Math.floor(pos / 4) + 1, n })}` : t(dance);
  }
  const key = ('why' + chunk.why[0].toUpperCase() + chunk.why.slice(1)) as MessageKey;
  const color = chunk.color && FACES.includes(chunk.color as Face) ? t(('color' + chunk.color) as MessageKey) : '';
  return t(key, { color });
}
