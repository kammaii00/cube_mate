// 조각 모양 그림: 작은 블록 하나를 비스듬히 그려 윗면·앞면·오른쪽 면에 조각의 색을 칠한다 (모서리는 두 면, 꼭짓점은 세 면)
import { FACE_COLORS, type Face } from '../core/faces';

interface Props {
  /** 조각의 색들 (첫째 = 윗면, 둘째 = 앞면, 셋째 = 오른쪽 면) */
  colors: Face[];
  size?: number;
  /** true면 색 없이 점선 테두리만 그린다 (조각이 들어갈 빈자리) */
  empty?: boolean;
}

const DARK = '#1b2440';

// 블록 하나를 SVG로 그린다 (색이 없는 면은 남색 몸통, empty면 점선 빈자리)
export function PieceIcon({ colors, size = 44, empty = false }: Props) {
  if (empty) return <EmptySlot size={size} />;
  const [top, front, right] = colors.map((c) => FACE_COLORS[c]);
  return (
    <svg className="piece-icon" width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M8 18 L30 8 L52 18 L30 28 Z" fill={top ?? DARK} stroke={DARK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 18 L30 28 L30 54 L8 44 Z" fill={front ?? DARK} stroke={DARK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 28 L52 18 L52 44 L30 54 Z" fill={right ?? DARK} stroke={DARK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// 빈자리 블록: 같은 모양을 점선 테두리로만 그린다
function EmptySlot({ size }: { size: number }) {
  const line = { fill: 'none', stroke: DARK, strokeWidth: 3, strokeDasharray: '5 4', strokeLinejoin: 'round' as const };
  return (
    <svg className="piece-icon" width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M8 18 L30 8 L52 18 L52 44 L30 54 L8 44 Z" {...line} />
      <path d="M8 18 L30 28 L52 18 M30 28 L30 54" {...line} />
    </svg>
  );
}
