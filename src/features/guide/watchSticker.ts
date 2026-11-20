// 매번 돌릴 때 "이 칸이 어디로 가는지 봐!"라고 짚어 줄 칸 하나를 고른다 (화면과 무관한 순수 로직)
import { FACES, type Face } from '../../core/faces';
import { applyMove, type Move } from '../../core/moves';

/** 짚을 칸: 돌리기 전 칸 번호(from), 돌린 뒤 칸 번호(to), 그 칸의 색 */
export interface Watch {
  from: number;
  to: number;
  color: Face;
}

/** 아이 눈에 보이는 면(위·오른쪽·앞)의 칸 번호는 0~26 */
const VISIBLE = 27;
/** 더 잘 보이는 면 순서: 앞 → 위 → 오른쪽 */
const FACE_RANK: Face[] = ['F', 'U', 'R'];
/** 칸마다 다른 글자를 붙여 회전 뒤 어디로 갔는지 추적하는 표식 */
const TAGS = Array.from({ length: 54 }, (_, i) => String.fromCharCode(0x100 + i)).join('');

// 회전 하나에서 각 칸이 옮겨 가는 칸 번호 표를 만든다
function destinations(move: Move): number[] {
  const after = applyMove(TAGS, move);
  return Array.from({ length: 54 }, (_, i) => after.indexOf(TAGS[i]));
}

// 돌린 뒤 아이 눈에 보이는 면(위·오른쪽·앞)에 도착하는 칸 중 하나를 고른다. 돌리기 전에도 보이던 칸을 먼저,
// 그다음 같이 움직이는 칸 중 색이 하나뿐인 칸, 앞면에 가까운 칸 순서로 고른다.
// (L2·D2·B2는 보이던 칸이 모두 뒤로 가므로, 뒤에서 나와 보이는 곳에 도착하는 칸을 고른다)
export function pickWatch(state: string, move: Move): Watch | null {
  const to = destinations(move);
  const moving = Array.from({ length: 54 }, (_, i) => i).filter((i) => to[i] !== i && to[i] < VISIBLE && state[i] !== '?');
  if (!moving.length) return null;
  const count = (c: string) => moving.filter((i) => state[i] === c).length;
  const rank = (i: number) =>
    (i < VISIBLE ? 0 : 100) + (count(state[i]) === 1 ? 0 : 10) + FACE_RANK.indexOf(FACES[Math.floor(to[i] / 9)]);
  const best = [...moving].sort((a, b) => rank(a) - rank(b) || a - b)[0];
  return { from: best, to: to[best], color: state[best] as Face };
}

/** 면 글자 → 음성 파일에 쓰는 색 글자 (흰 W, 빨 R, 초 G, 노 Y, 주 O, 파 B) */
const COLOR_CODE: Record<Face, string> = { U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' };

// 짚은 칸 색에 맞는 문구·음성 이름(watchR 등)을 구한다
export function watchKey(color: Face): `watch${string}` {
  return `watch${COLOR_CODE[color]}`;
}
