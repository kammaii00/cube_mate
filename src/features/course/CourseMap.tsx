// 섬 지도(바다 지도): 위는 하늘, 아래는 바다인 한 장면(배경은 CourseScreen의 useSeaBackground). 모두 같은 모양의 섬들을 지그재그 뱃길로 잇는다. 섬 옆 팻말엔 배우는 모양, 지금 할 섬 옆엔 큐비 배.
// 잠긴 섬은 안개에 가리고, 아직 만들지 않은 다음 섬은 흑백 '준비 중'으로 미리 보여 준다. 열린 섬을 누르면 문제를 시작한다
import { useEffect, useRef } from 'react';
import { islandDone, islandOpen, starsOf, currentLevel, type CourseData } from '../../course/progress';
import { ISLANDS } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { boardsDone, loadRewards } from '../../rewards/store';
import { outfitFor } from '../../widgets/outfits';
import { ISLAND_TOPICS, type Topic } from './IslandArt';
import { levelName } from './LevelPicker';
import { MAP_W, ROW, SeaIsland, type Spot } from './SeaIsland';

interface Props {
  data: CourseData;
  onPick: (island: number) => void;
  /** 잠긴 섬을 눌렀을 때 */
  onLocked: () => void;
  /** 준비 중인 섬을 눌렀을 때 */
  onSoon: () => void;
}

/** 준비 중인 다음 섬의 팻말 주제 (2층·노란 십자·옆 색·꼭짓점·완성) */
const SOON_TOPICS: Topic[] = ['layer2', 'ycross', 'side', 'corner', 'done'];
/** 지도 맨 위 여백 */
const TOP = 30;

// 섬 자리: 왼쪽·오른쪽을 번갈아 내려간다
function spotPos(i: number) {
  return { x: i % 2 ? 262 : 128, y: TOP + i * ROW + 110 };
}

// 섬 자리들을 잇는 굽은 점선 뱃길
function routePath(count: number): string {
  const pts = Array.from({ length: count }, (_, i) => spotPos(i));
  return pts
    .map((p, i) => (i ? `Q ${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 60 : -60)} ${(pts[i - 1].y + p.y) / 2} ${p.x} ${p.y}` : `M ${p.x} ${p.y}`))
    .join(' ');
}

// 바다 지도를 그리고, 처음 열 때 지금 할 섬이 화면 가운데 오게 스크롤한다
export function CourseMap({ data, onPick, onLocked, onSoon }: Props) {
  const { t } = useI18n();
  const nowRef = useRef<SVGGElement>(null);
  const outfit = outfitFor(boardsDone(loadRewards().solves));

  const spots: Spot[] = [
    ...ISLANDS.map((island): Spot => {
      const open = islandOpen(data, island.id);
      const done = islandDone(data, island.id);
      return {
        key: `island${island.id}`,
        name: t(`island${island.id}Name` as MessageKey),
        topic: ISLAND_TOPICS[island.id],
        state: done ? 'free' : open ? 'now' : 'fog',
        friend: island.friend,
        stars: starsOf(data, island.id),
        total: island.levels.length,
        note: open ? undefined : t('courseLocked'),
        level: open && !done ? levelName(island.id, currentLevel(data, island.id), t) : undefined,
        onTap: () => (open ? onPick(island.id) : onLocked()),
      };
    }),
    ...SOON_TOPICS.map((topic, k): Spot => ({
      key: `soon${k}`,
      name: t(`soonIsland${k}` as MessageKey),
      topic,
      state: 'soon',
      friend: { shape: 'center', colors: ['U'] },
      stars: 0,
      total: 0,
      note: t('courseSoon'),
      onTap: onSoon,
    })),
  ];
  // 큐비 배는 지금 할 섬 옆에 (다 깼으면 마지막 섬 옆에)
  const now = spots.findIndex((s) => s.state === 'now');
  const boatAt = now >= 0 ? now : ISLANDS.length - 1;
  const height = TOP + spots.length * ROW + 20;

  // 지도에 처음 들어왔을 때 지금 할 섬이 화면 가운데 오게 스크롤한다
  useEffect(() => {
    nowRef.current?.scrollIntoView?.({ block: 'center' });
  }, []);

  return (
    <div className="sea-map">
      <svg viewBox={`0 0 ${MAP_W} ${height}`} role="list">
        <defs>
          <filter id="sea-gray">
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <path d={routePath(spots.length)} stroke="#fff" strokeWidth="5" strokeDasharray="4 12" strokeLinecap="round" fill="none" opacity="0.9" />
        {spots.map((spot, i) => (
          <g key={spot.key} role="listitem" ref={i === boatAt ? nowRef : undefined}>
            <SeaIsland spot={spot} {...spotPos(i)} boat={i === boatAt} outfit={outfit} />
          </g>
        ))}
      </svg>
    </div>
  );
}
