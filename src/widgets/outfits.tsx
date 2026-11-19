// 큐비 변신 옷: 스티커판을 다 채울 때마다 큐비가 하나씩 새 옷을 입는다
// (Mascot의 100x100 좌표 위에 겹쳐 그린다. 머리 위 장식은 위쪽 여백(-30)까지 쓴다)

/** 변신 순서: 왕관 → 마법사 모자 → 선글라스 → 파티 모자, 그 뒤는 다시 처음부터 */
export const OUTFITS = ['crown', 'wizard', 'shades', 'party'] as const;
export type Outfit = (typeof OUTFITS)[number];

// 다 채운 스티커판 수로 지금 입을 옷을 고른다 (0장이면 옷 없음)
export function outfitFor(boards: number): Outfit | null {
  return boards > 0 ? OUTFITS[(boards - 1) % OUTFITS.length] : null;
}

const INK = '#1b2440';

// 옷 하나를 SVG 조각으로 그린다
export function OutfitShape({ outfit }: { outfit: Outfit }) {
  switch (outfit) {
    case 'crown':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M24 8 L22 -18 L38 -4 L50 -24 L62 -4 L78 -18 L76 8 Z" fill="#ffd60a" />
          <circle cx="50" cy="-8" r="4" fill="#d7263d" />
          <circle cx="33" cy="-3" r="3" fill="#2f6bff" />
          <circle cx="67" cy="-3" r="3" fill="#1fa64a" />
        </g>
      );
    case 'wizard':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M20 8 L56 -28 L80 8 Z" fill="#6c4cff" />
          <ellipse cx="50" cy="8" rx="38" ry="7" fill="#6c4cff" />
          <path d="M48 -10 l2.5 5 5.5 .8 -4 3.9 1 5.5 -5 -2.6 -5 2.6 1 -5.5 -4 -3.9 5.5 -.8z" fill="#ffd60a" strokeWidth="1.5" />
        </g>
      );
    case 'shades':
      // 남색 몸통 위에서도 잘 보이도록 분홍 테두리 + 하늘색 반사광
      return (
        <g stroke="#ff4f9a" strokeWidth="4" strokeLinejoin="round">
          <rect x="9" y="39" width="31" height="23" rx="8" fill={INK} />
          <rect x="60" y="39" width="31" height="23" rx="8" fill={INK} />
          <path d="M40 47 Q50 42 60 47" fill="none" />
          <path d="M15 45 L24 45" stroke="#9ee0ff" strokeWidth="3" strokeLinecap="round" />
          <path d="M66 45 L75 45" stroke="#9ee0ff" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'party':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M30 8 L50 -26 L70 8 Z" fill="#ff7b1c" />
          <path d="M40 -4 L60 -4 M45 -15 L55 -15" stroke="#ffd60a" strokeWidth="4" />
          <circle cx="50" cy="-28" r="6" fill="#d7263d" />
        </g>
      );
  }
}
