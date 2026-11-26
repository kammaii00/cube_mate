// 칭찬 도장: 빨간 잉크로 찍은 웃는 얼굴(웃는 눈 + 볼터치). 한 번 성공할 때마다 하나씩 찍힌다
import { useEffect, useId } from 'react';
import { playStamp } from '../voice/sfx';

const RED = '#e5383b';
/** 도장마다 살짝 다르게 기울인 각도 (손으로 찍은 느낌) */
const TILTS = [-12, 8, -4];
/** 새로 찍히는 도장이 화면에 닿는 시각(ms): 이때 "쿵" 소리를 낸다 (CSS stamp-in과 맞춤) */
const LAND_MS = 520;

interface Props {
  size?: number;
  tilt?: number;
  /** 방금 받은 도장이면 true: 위에서 "쿵" 찍히는 움직임과 소리 */
  fresh?: boolean;
}

// 도장 하나를 그린다 (40px 이상이면 잉크 번짐 효과를 넣는다)
export function PraiseStamp({ size = 60, tilt = -10, fresh = false }: Props) {
  const id = `ink${useId().replace(/:/g, '')}`;
  const ink = size >= 40;

  // 새 도장이면 찍히는 순간에 소리를 낸다
  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(playStamp, LAND_MS);
    return () => clearTimeout(timer);
  }, [fresh]);

  return (
    <svg className={`praise-stamp${fresh ? ' fresh' : ''}`} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      {ink && (
        <defs>
          <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" result="d" />
            <feComponentTransfer in="n" result="m">
              <feFuncA type="discrete" tableValues="1 1 1 1 1 1 0.55 1 1" />
            </feComponentTransfer>
            <feComposite in="d" in2="m" operator="in" />
          </filter>
        </defs>
      )}
      <g transform={`rotate(${tilt} 40 40)`} filter={ink ? `url(#${id})` : undefined} fill={RED} stroke={RED}>
        <circle cx="40" cy="40" r="36" fillOpacity="0.07" strokeWidth="4" />
        <circle cx="40" cy="40" r="29.5" fill="none" strokeWidth="1.6" />
        <g transform="translate(40 42) scale(1.18) translate(-40 -43)">
          <path d="M25.5 37 Q31 30 36.5 37 M43.5 37 Q49 30 54.5 37" fill="none" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M27 44 H53 Q52 58 40 58 Q28 58 27 44 Z" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="22.5" cy="45" rx="3.6" ry="2.4" stroke="none" opacity="0.45" />
          <ellipse cx="57.5" cy="45" rx="3.6" ry="2.4" stroke="none" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
}

interface RowProps {
  /** 받은 도장 수 */
  count: number;
  /** 칸 수 (받은 도장 + 점선 빈칸) */
  total: number;
  size: number;
  /** 방금 받은 도장의 칸 번호 (없으면 -1) */
  fresh?: number;
}

// 도장 칸 한 줄: 받은 만큼 도장, 나머지는 점선 빈칸
export function StampRow({ count, total, size, fresh = -1 }: RowProps) {
  return (
    <span className="stamp-row" aria-label={`${count}/${total}`}>
      {Array.from({ length: total }, (_, k) =>
        k < count ? (
          <PraiseStamp key={k} size={size} tilt={TILTS[k % TILTS.length]} fresh={k === fresh} />
        ) : (
          <span key={k} className={`stamp-slot${size < 32 ? ' thin' : ''}`} style={{ width: size, height: size }} />
        ),
      )}
    </span>
  );
}
