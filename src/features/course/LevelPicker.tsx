// 레벨 고르기: 별을 받은 레벨이 있는 섬에 다시 들어오면, 열린 레벨 중 하고 싶은 걸 고른다 (복습)
import { useEffect } from 'react';
import type { Face } from '../../core/faces';
import type { Move } from '../../core/moves';
import type { PetalKind } from '../../course/petal';
import { currentLevel, islandDone, type CourseData } from '../../course/progress';
import { ISLANDS, WINS_PER_LEVEL, practiceLevel, puzzleOf } from '../../course/skills';
import { useI18n, type MessageKey, type Translate } from '../../i18n';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { MoveIcon } from '../../widgets/MoveIcon';
import { PieceIcon } from '../../widgets/PieceIcon';
import { StarIcon } from '../../widgets/StarIcon';

interface Props {
  data: CourseData;
  island: number;
  onPick: (level: number) => void;
}

// 레벨 이름: 퀴즈는 "모서리 찾기"처럼 하는 일, 화면 연습은 "옆 꽃잎 올리기" 등, 진짜 연습은 "같이 해 보기 / 혼자 해 보기"
export function levelName(island: number, level: number, t: Translate): string {
  const info = ISLANDS[island];
  if (info.kind === 'quiz') return t(`courseQuiz${level}` as MessageKey);
  const puzzle = puzzleOf(info, level);
  if (puzzle) return t(`coursePuzzle_${puzzle}` as MessageKey);
  return t(practiceLevel(info, level).together ? 'courseTogether' : 'courseAlone');
}

/** 레벨 그림 한 장: 조각 그림(점선 빈자리 가능) 또는 돌리기 그림들, 옆에 붙는 표시 */
interface Picture {
  colors?: Face[];
  slot?: boolean;
  moves?: Move[];
  mark?: string;
}
/** 퀴즈: 찾기는 조각만, 집 찾기는 점선 빈자리 */
const QUIZ_PICTURES: Picture[] = [{ colors: ['U', 'F'] }, { colors: ['U', 'F', 'R'] }, { slot: true }];
/** 화면 연습: 옆 꽃잎은 앞면 한 번, 아래 꽃잎은 두 번, 자리 비우기는 윗면 다음 앞면 */
const PUZZLE_PICTURES: Record<PetalKind, Picture> = {
  side: { moves: ["F'"] },
  bottom: { moves: ["F'"], mark: '×2' },
  busy: { moves: ["U'", "F'"] },
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

// 레벨마다 그림 카드를 그린다: 그림 · 이름(작게) · 성공 점 3개 · 별(다 하면 노란 별, 아니면 빈 별)
export function LevelPicker({ data, island, onPick }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const info = ISLANDS[island];
  const open = islandDone(data, island) ? info.levels.length - 1 : currentLevel(data, island);

  // 화면이 열리면 큐비가 무엇을 할지 물어본다 (글을 몰라도 알 수 있게)
  useEffect(() => {
    say('courseChoose');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Bubble><strong className="move-title">{t('courseChoose')}</strong></Bubble>
      <ol className="level-list">
        {info.levels.map((_, k) => {
          const wins = data.wins[island][k];
          const star = wins >= WINS_PER_LEVEL;
          const pic = pictureOf(island, k);
          return (
            <li key={k}>
              <button className="level-card" disabled={k > open} onClick={() => onPick(k)} aria-label={levelName(island, k, t)}>
                <span className="level-pic">
                  {pic.moves ? pic.moves.map((m) => <MoveIcon key={m} move={m} colors={YELLOW_UP} size={pic.moves!.length > 1 ? 46 : 58} />) : <PieceIcon colors={pic.colors ?? []} size={58} empty={pic.slot} />}
                  {pic.mark && <em>{pic.mark}</em>}
                </span>
                <span className="level-info">
                  <small>{levelName(island, k, t)}</small>
                  <span className="level-dots">
                    {Array.from({ length: WINS_PER_LEVEL }, (_, d) => <i key={d} className={d < wins ? 'on' : ''} />)}
                  </span>
                </span>
                <StarIcon filled={star} size={42} />
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
