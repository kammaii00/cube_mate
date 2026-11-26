// 초보자 풀이 묶음의 "왜 이렇게 돌리는지" 문구를 만든다 (옛 배우기 모드의 why* 문구를 그대로 쓴다)
import { FACES, type Face } from '../../core/faces';
import type { MessageKey, Translate } from '../../i18n';
import type { Chunk } from '../../solver/beginner/lesson';

// 묶음 하나의 이유 문장 (예: "색이 맞았어요! 두 번 돌려서 꽃잎을 아래로 내려요")
export function whyText(chunk: Chunk, t: Translate): string {
  const key = ('why' + chunk.why[0].toUpperCase() + chunk.why.slice(1)) as MessageKey;
  const color = chunk.color && FACES.includes(chunk.color as Face) ? t(('color' + chunk.color) as MessageKey) : '';
  return t(key, { color });
}
