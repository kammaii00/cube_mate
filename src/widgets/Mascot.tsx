// 마스코트 "큐비": 눈과 입이 달린 큐브 캐릭터
import { FACE_COLORS } from '../core/faces';
import { OutfitShape, type Outfit } from './outfits';

const STICKERS = ['R', 'D', 'B', 'U', 'U', 'U', 'F', 'L', 'D'] as const;

interface Props {
  size?: number;
  /** 변신 옷 (스티커판을 다 채우면 입는다) */
  outfit?: Outfit | null;
}

// 큐비를 SVG로 그린다 (가운데 줄에 눈, 아랫줄에 웃는 입, 변신했으면 옷)
export function Mascot({ size = 96, outfit = null }: Props) {
  // 옷을 입으면 머리 위 장식이 보이도록 위쪽 여백을 넓힌다 (큐비 크기는 그대로)
  const box = outfit ? '-6 -32 112 132' : '0 0 100 100';
  const height = outfit ? size * 1.32 : size;
  return (
    <svg className="mascot" width={outfit ? size * 1.12 : size} height={height} viewBox={box} aria-hidden="true">
      <rect x="4" y="4" width="92" height="92" rx="22" fill="#1b2440" />
      {STICKERS.map((face, i) => (
        <rect
          key={i}
          x={12 + (i % 3) * 26.5}
          y={12 + Math.floor(i / 3) * 26.5}
          width="23"
          height="23"
          rx="6"
          fill={FACE_COLORS[face]}
        />
      ))}
      <circle cx="23.5" cy="50" r="5.2" fill="#1b2440" />
      <circle cx="76.5" cy="50" r="5.2" fill="#1b2440" />
      <circle cx="25.3" cy="48.2" r="1.7" fill="#fff" />
      <circle cx="78.3" cy="48.2" r="1.7" fill="#fff" />
      <path d="M40 55 Q50 65 60 55" fill="none" stroke="#1b2440" strokeWidth="3.6" strokeLinecap="round" />
      {outfit && <OutfitShape outfit={outfit} />}
    </svg>
  );
}
