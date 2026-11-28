// 레벨 고르기: 별을 받은 레벨이 있는 섬에 다시 들어오면, 열린 레벨 중 하고 싶은 걸 고른다 (복습)
import { useEffect } from 'react';
import { currentLevel, islandDone, type CourseData } from '../../course/progress';
import { ISLANDS, WINS_PER_LEVEL, practiceLevel, puzzleOf } from '../../course/skills';
import { useI18n, type MessageKey, type Translate } from '../../i18n';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { StampRow } from '../../widgets/PraiseStamp';
import { StarIcon } from '../../widgets/StarIcon';
import { LevelPicture } from './LevelPicture';

interface Props {
  data: CourseData;
  island: number;
  onPick: (level: number) => void;
}

// 레벨 이름의 문구 키 (= 음성 파일 이름): 퀴즈는 "모서리 찾기"처럼 하는 일, 화면 연습은 "옆 꽃잎 올리기" 등, 진짜 연습은 "같이 해 보기 / 혼자 해 보기"
export function levelKey(island: number, level: number): MessageKey {
  const info = ISLANDS[island];
  if (info.kind === 'quiz') return `courseQuiz${level}` as MessageKey;
  const puzzle = puzzleOf(info, level);
  if (puzzle) return `coursePuzzle_${puzzle}` as MessageKey;
  return practiceLevel(info, level).together ? 'courseTogether' : 'courseAlone';
}

// 레벨 이름을 지금 언어로 돌려준다
export function levelName(island: number, level: number, t: Translate): string {
  return t(levelKey(island, level));
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
          return (
            <li key={k}>
              <button className="level-card" disabled={k > open} onClick={() => onPick(k)} aria-label={levelName(island, k, t)}>
                <LevelPicture island={island} level={k} />
                <span className="level-info">
                  <small>{levelName(island, k, t)}</small>
                  <StampRow count={wins} total={WINS_PER_LEVEL} size={26} />
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
