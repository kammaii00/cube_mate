// 둥근 별 그림: 꼭짓점이 둥근 별. 채운 별(노랑)과 빈 별(테두리만) 두 가지
interface Props {
  filled: boolean;
  size?: number;
}

const DARK = '#1b2440';
const SUN = '#ffd60a';

// 별 하나를 SVG로 그린다
export function StarIcon({ filled, size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 5 L29.6 17.3 L43 18.8 L33 27.9 L35.8 41.2 L24 34.4 L12.2 41.2 L15 27.9 L5 18.8 L18.4 17.3 Z"
        fill={filled ? SUN : '#fff'}
        stroke={DARK}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
