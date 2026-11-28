// 섬 지도: 섬 4개를 길로 잇고, 섬마다 갇힌 친구(창살)·별·레벨을 보여 준다. 열린 섬을 누르면 문제를 시작한다.
// 아래에는 아직 만들지 않은 다음 섬들을 흑백 '준비 중' 카드로 미리 보여 준다
import { islandDone, islandOpen, starsOf, currentLevel, type CourseData } from '../../course/progress';
import { ISLANDS } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { Friend } from '../../widgets/Friend';
import { levelName } from './LevelPicker';

interface Props {
  data: CourseData;
  onPick: (island: number) => void;
  /** 잠긴 섬을 눌렀을 때 */
  onLocked: () => void;
  /** 준비 중인 섬을 눌렀을 때 */
  onSoon: () => void;
}

/** 준비 중인 다음 섬 수 (2층·노란 십자·옆 색·꼭짓점·완성) */
const SOON_ISLANDS = 5;

// 위에서 아래로 섬 카드를 그린다
export function CourseMap({ data, onPick, onLocked, onSoon }: Props) {
  const { t } = useI18n();
  return (
    <ol className="island-path">
      {ISLANDS.map((island) => {
        const open = islandOpen(data, island.id);
        const done = islandDone(data, island.id);
        const stars = starsOf(data, island.id);
        const level = currentLevel(data, island.id);
        const look = done ? 'free' : open ? 'caged' : 'hidden';
        return (
          <li key={island.id}>
            <button className={`island ${look}`} onClick={() => (open ? onPick(island.id) : onLocked())}>
              <Friend shape={island.friend.shape} colors={island.friend.colors} look={look} bars={island.levels.length - stars} size={64} />
              <span className="island-text">
                <b>{t(`island${island.id}Name` as MessageKey)}</b>
                <small>{open ? t(`friend${island.id}` as MessageKey) : t('courseLocked')}</small>
                {open && (
                  <span className="island-stars" aria-label={`${stars}/${island.levels.length}`}>
                    {island.levels.map((_, k) => <i key={k} className={k < stars ? 'on' : ''}>★</i>)}
                    {!done && <em>{levelName(island.id, level, t)}</em>}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
      {Array.from({ length: SOON_ISLANDS }, (_, k) => (
        <li key={`soon${k}`}>
          <button className="island soon" onClick={onSoon}>
            <span className="soon-icon" aria-hidden>🏝</span>
            <span className="island-text">
              <b>{t(`soonIsland${k}` as MessageKey)}</b>
              <small>{t('courseSoon')}</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
