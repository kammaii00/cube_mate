// 레벨 그림: 레벨 고르기 카드·결과 화면·다음 단계 버튼에 같이 쓰는 그림 (글을 몰라도 무슨 레벨인지 알게)
import type { Face } from '../../core/faces';
import type { Move } from '../../core/moves';
import type { PuzzleKind } from '../../course/puzzle';
import { ISLANDS, practiceLevel, puzzleOf } from '../../course/skills';
import { MoveIcon } from '../../widgets/MoveIcon';
import { PieceIcon } from '../../widgets/PieceIcon';

/** 레벨 그림 한 장: 조각 그림(점선 빈자리 가능) 또는 돌리기 그림들, 오른손 춤(💃), 옆에 붙는 표시 */
interface Picture {
  colors?: Face[];
  slot?: boolean;
  moves?: Move[];
  dance?: boolean;
  mark?: string;
}
/** 퀴즈: 찾기는 조각만, 집 찾기는 점선 빈자리 */
const QUIZ_PICTURES: Picture[] = [{ colors: ['U', 'F'] }, { colors: ['U', 'F', 'R'] }, { slot: true }];
/** 화면 연습: 옆 꽃잎은 앞면 한 번, 아래 꽃잎은 두 번, 자리 비우기는 윗면 다음 앞면.
 * 흰 십자: 내리기는 앞면 두 번, 색 맞추기는 윗면 다음 앞면 두 번. 1층: 꼭짓점 + 춤 한 번 / 춤 반복 / 윗면 다음 춤 */
const PUZZLE_PICTURES: Record<PuzzleKind, Picture> = {
  side: { moves: ["F'"] },
  bottom: { moves: ["F'"], mark: '×2' },
  busy: { moves: ["U'", "F'"] },
  drop: { moves: ['F'], mark: '×2' },
  match: { moves: ['U', 'F'], mark: '×2' },
  dance1: { colors: ['U', 'F', 'R'], dance: true },
  danceMore: { colors: ['U', 'F', 'R'], dance: true, mark: '🔁' },
  bring: { moves: ['U'], dance: true },
};
/** 돌리기 그림의 면 색 (노란색 위로 잡은 큐브: 위 노랑, 앞 초록, 오른쪽 주황) */
const YELLOW_UP = { U: 'D', F: 'F', R: 'L' } as const;

// 레벨 그림을 고른다 (진짜 연습은 꼭짓점 조각 + 🤝 같이 / ✋ 혼자)
function pictureOf(island: number, level: number): Picture {
  const info = ISLANDS[island];
  if (info.kind === 'quiz') return QUIZ_PICTURES[level];
  const puzzle = puzzleOf(info, level);
  if (puzzle) return PUZZLE_PICTURES[puzzle];
  return { colors: ['U', 'F', 'R'], mark: practiceLevel(info, level).together ? '🤝' : '✋' };
}


interface Props {
  island: number;
  level: number;
  /** 크기 배율 (1 = 레벨 고르기 카드 크기) */
  scale?: number;
}

// 레벨 그림 하나를 그린다: 돌리기 그림들 또는 조각 그림, 💃, 옆 표시
export function LevelPicture({ island, level, scale = 1 }: Props) {
  const pic = pictureOf(island, level);
  const big = Math.round(58 * scale);
  const small = Math.round(46 * scale);
  return (
    <span className="level-pic" style={{ fontSize: Math.round(30 * scale) }}>
      {pic.moves ? (
        pic.moves.map((m) => <MoveIcon key={m} move={m} colors={YELLOW_UP} size={pic.moves!.length > 1 ? small : big} />)
      ) : (
        <PieceIcon colors={pic.colors ?? []} size={pic.dance ? small : big} empty={pic.slot} />
      )}
      {pic.dance && <em>💃</em>}
      {pic.mark && <em>{pic.mark}</em>}
    </span>
  );
}
