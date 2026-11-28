// 바다 지도의 섬 하나: 모래섬·주제 팻말·친구(창살)·이름·별, 지금 할 섬엔 레벨 이름표와 큐비 배를 그린다. 누르면 onTap
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { FriendShape } from '../../course/skills';
import type { Face } from '../../core/faces';
import { Friend } from '../../widgets/Friend';
import type { Outfit } from '../../widgets/outfits';
import { Boat, Fog, IslandLand, TopicSign, type Topic } from './IslandArt';

/** free: 친구를 구함 / now: 지금 할 섬 / fog: 잠김(안개) / soon: 아직 준비 중 */
export type SpotState = 'free' | 'now' | 'fog' | 'soon';

export interface Spot {
  key: string;
  name: string;
  topic: Topic;
  state: SpotState;
  friend: { shape: FriendShape; colors: Face[] };
  /** 받은 별 / 레벨 수 (준비 중 섬은 0) */
  stars: number;
  total: number;
  /** 이름 아래 작은 글 (잠김·준비 중 안내) */
  note?: string;
  /** 지금 할 레벨 이름 */
  level?: string;
  onTap: () => void;
}

/** 지도 그림의 폭 (viewBox 단위) */
export const MAP_W = 390;
/** 섬 한 줄의 높이 */
export const ROW = 250;

interface Props {
  spot: Spot;
  x: number;
  y: number;
  /** 큐비 배를 이 섬 옆에 띄운다 */
  boat: boolean;
  outfit: Outfit | null;
}

// 글자 길이에 맞춘 흰 알약 이름표 (지도 밖으로 나가지 않게 가운데를 당긴다)
function LevelPill({ x, y, text }: { x: number; y: number; text: string }) {
  const ref = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(text.length * 15 + 28);
  // 그려진 글자 폭을 재서 알약 폭을 맞춘다
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && typeof el.getComputedTextLength === 'function') setWidth(el.getComputedTextLength() + 28);
  }, [text]);
  const cx = Math.min(Math.max(x, width / 2 + 6), MAP_W - width / 2 - 6);
  return (
    <g>
      <rect x={cx - width / 2} y={y} width={width} height="30" rx="15" fill="#fff" stroke="#1b2440" strokeWidth="2.5" />
      <text ref={ref} x={cx} y={y + 21} textAnchor="middle" className="sea-pill">{text}</text>
    </g>
  );
}

// 섬 하나를 그린다 (x, y = 섬 가운데)
export function SeaIsland({ spot, x, y, boat, outfit }: Props) {
  const left = x < MAP_W / 2;
  const signX = left ? x + 114 : x - 112;
  const labelX = left ? x + 10 : x - 10;
  const ly = y + 82;
  const { shape, colors } = spot.friend;

  // 키보드로도 누를 수 있게 한다 (Enter·스페이스)
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      spot.onTap();
    }
  }

  return (
    <g className={`sea-island ${spot.state}`} role="button" tabIndex={0} aria-label={spot.name} onClick={spot.onTap} onKeyDown={onKey} filter={spot.state === 'soon' ? 'url(#sea-gray)' : undefined}>
      <rect className="sea-hit" x="0" y={y - 95} width={MAP_W} height={ROW} fill="transparent" />
      <g className="sea-tap">
        <IslandLand x={x} y={y} />
        <g transform={`translate(${x - 32},${y - 54})`}>
          {spot.state === 'soon' ? (
            <Friend shape="center" colors={['U']} look="hidden" bars={3} cagedHidden size={60} />
          ) : (
            <Friend shape={shape} colors={colors} look={spot.state === 'free' ? 'free' : 'caged'} bars={spot.total - spot.stars} size={64} />
          )}
        </g>
        {spot.state === 'fog' && (
          <>
            <Fog x={x} y={y - 6} />
            <text x={x} y={y + 6} textAnchor="middle" className="sea-fog-mark">?</text>
          </>
        )}
        {/* 팻말은 안개 위에 그려서, 잠긴 섬에서 무엇을 배우는지 미리 보이게 한다 */}
        <TopicSign x={signX} y={y - 2} topic={spot.topic} />
        {spot.state === 'free' && <text x={x + 38} y={y - 46} className="sea-sparkle">✨</text>}
        <text x={labelX} y={ly} textAnchor="middle" className="sea-name">{spot.name}</text>
        {spot.total > 0 && spot.state !== 'fog' && (
          <text x={labelX} y={ly + 27} textAnchor="middle" className="sea-stars">
            {Array.from({ length: spot.total }, (_, k) => <tspan key={k} className={k < spot.stars ? 'on' : ''}>★</tspan>)}
          </text>
        )}
        {spot.note && <text x={labelX} y={ly + 25} textAnchor="middle" className="sea-note">{spot.note}</text>}
        {spot.level && <LevelPill x={labelX} y={ly + 38} text={`▶ ${spot.level}`} />}
      </g>
      {boat && <Boat x={left ? x + 128 : x - 128} y={y + 88} outfit={outfit} />}
    </g>
  );
}
