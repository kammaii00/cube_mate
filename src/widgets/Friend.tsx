// 꼬마 코스에서 구해 주는 큐브 조각 친구: 가운데(한 색)·모서리(두 색)·꼭짓점(세 색) 모양에 눈과 입이 달려 있다
import { FACE_COLORS, type Face } from '../core/faces';
import type { FriendShape } from '../course/skills';

interface Props {
  shape: FriendShape;
  colors: Face[];
  size?: number;
  /** hidden: 안개 속 실루엣(?) / caged: 갇혀 있음(창살 bars개) / free: 구함 */
  look: 'hidden' | 'caged' | 'free';
  /** 갇혀 있을 때 남은 창살 수 (레벨을 깰 때마다 하나씩 사라진다) */
  bars?: number;
}

// 조각 모양에 맞게 스티커 칸(x, y, 너비, 높이, 색)을 정한다
function stickers(shape: FriendShape, colors: Face[]): [number, number, number, number, Face][] {
  if (shape === 'center') return [[14, 14, 72, 72, colors[0]]];
  if (shape === 'edge') return [[14, 14, 72, 34, colors[0]], [14, 52, 72, 34, colors[1]]];
  return [[14, 14, 72, 34, colors[0]], [14, 52, 34, 34, colors[1]], [52, 52, 34, 34, colors[2]]];
}

// 친구 하나를 SVG로 그린다
export function Friend({ shape, colors, size = 72, look, bars = 0 }: Props) {
  const hidden = look === 'hidden';
  return (
    <svg className={`friend ${look}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="6" y="6" width="88" height="88" rx="22" fill={hidden ? '#9aa6c0' : '#1b2440'} />
      {!hidden && stickers(shape, colors).map(([x, y, w, h, face], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="8" fill={FACE_COLORS[face]} />
      ))}
      {hidden ? (
        <text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="700" fill="#fff">?</text>
      ) : (
        <>
          <circle cx="36" cy="40" r="5" fill="#1b2440" />
          <circle cx="64" cy="40" r="5" fill="#1b2440" />
          <path d={look === 'free' ? 'M40 62 Q50 72 60 62' : 'M41 68 Q50 61 59 68'} fill="none" stroke="#1b2440" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {look === 'caged' && Array.from({ length: bars }, (_, i) => (
        <rect key={i} x={22 + i * 24} y="0" width="8" height="100" rx="4" fill="#55627f" opacity="0.85" />
      ))}
    </svg>
  );
}
