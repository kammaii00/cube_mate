// 마스코트 "큐비": 눈과 입이 달린 큐브 캐릭터
import { FACE_COLORS } from '../core/faces';

const STICKERS = ['R', 'D', 'B', 'U', 'U', 'U', 'F', 'L', 'D'] as const;

interface Props {
  size?: number;
}

// 큐비를 SVG로 그린다 (가운데 줄에 눈, 아랫줄에 웃는 입)
export function Mascot({ size = 96 }: Props) {
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
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
    </svg>
  );
}
