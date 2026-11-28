// 바다 지도 그림 조각: 모두 같은 모양의 모래섬(야자수), 배우는 모양을 그린 주제 팻말, 큐비가 탄 배, 안개
import { FACE_COLORS, type Face } from '../../core/faces';
import { Mascot } from '../../widgets/Mascot';
import type { Outfit } from '../../widgets/outfits';

const INK = '#1b2440';
const WOOD = '#8a5a2b';
/** 팻말 그림에서 아직 신경 쓰지 않는 칸 */
const GRAY = '#6b7690';

/** 섬마다 팻말에 그리는 주제 */
export type Topic = 'pieces' | 'flower' | 'cross' | 'layer' | 'layer2' | 'ycross' | 'side' | 'corner' | 'done';
/** 지금 있는 섬의 팻말 주제 (조각 알기·흰 꽃·흰 십자·1층) */
export const ISLAND_TOPICS: Topic[] = ['pieces', 'flower', 'cross', 'layer'];

/** 팻말의 3×3 면 그림 ('S' = 회색 칸)과 옆 색 띠 (mid: 가운데 칸만, full: 줄 전체) */
const TOPIC_FACE: Record<Exclude<Topic, 'pieces'>, { cells: string; strips?: 'mid' | 'full' }> = {
  flower: { cells: 'SUSUDUSUS' },
  cross: { cells: 'SUSUUUSUS' },
  layer: { cells: 'UUUUUUUUU' },
  layer2: { cells: 'SSSRRRRRR' },
  ycross: { cells: 'SDSDDDSDS' },
  side: { cells: 'SDSDDDSDS', strips: 'mid' },
  corner: { cells: 'DSDSDSDSD' },
  done: { cells: 'DDDDDDDDD', strips: 'full' },
};

// 야자수 한 그루를 그린다 (x, y = 줄기 밑동)
function Palm({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M0 0 q6 -26 2 -46" stroke={WOOD} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M2 -46 q-20 -8 -30 4 M2 -46 q20 -8 30 4 M2 -46 q-12 -18 -26 -14 M2 -46 q12 -18 26 -14" stroke="#4ea94a" strokeWidth="7" fill="none" strokeLinecap="round" />
    </g>
  );
}

// 모래섬 하나를 그린다 (모든 섬이 같은 모양: 얕은 물·모래·풀밭·야자수)
export function IslandLand({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 34} rx="92" ry="30" fill="#bfe9fb" />
      <ellipse cx={x} cy={y + 30} rx="78" ry="24" fill="#d9ae5c" />
      <ellipse cx={x} cy={y + 24} rx="78" ry="24" fill="#f3d38b" />
      <ellipse cx={x} cy={y + 16} rx="60" ry="17" fill="#7fd06e" />
      <Palm x={x + 44} y={y + 12} />
    </g>
  );
}

// 조각 알기 섬 팻말: 가운데·모서리·꼭짓점 조각 세 개
function PiecesPicture() {
  const c = FACE_COLORS;
  return (
    <g>
      <rect x="-27" y="-32" width="16" height="16" rx="3" fill={INK} />
      <rect x="-24" y="-29" width="10" height="10" rx="2" fill={c.R} />
      <rect x="-8" y="-39" width="16" height="30" rx="3" fill={INK} />
      <rect x="-5" y="-36" width="10" height="11" rx="2" fill={c.U} />
      <rect x="-5" y="-23" width="10" height="11" rx="2" fill={c.F} />
      <rect x="11" y="-39" width="16" height="30" rx="3" fill={INK} />
      <rect x="14" y="-36" width="10" height="11" rx="2" fill={c.U} />
      <rect x="14" y="-23" width="4.5" height="11" rx="1" fill={c.F} />
      <rect x="19.5" y="-23" width="4.5" height="11" rx="1" fill={c.R} />
    </g>
  );
}

// 3×3 면 그림 (옆 색 띠가 있으면 조금 작게 그리고 네 변에 띠를 붙인다)
function FacePicture({ topic }: { topic: Exclude<Topic, 'pieces'> }) {
  const { cells, strips } = TOPIC_FACE[topic];
  const half = strips ? 18 : 22;
  const step = strips ? 11 : 13.5;
  const cell = strips ? 10 : 11.5;
  const start = -half + (strips ? 2 : 3);
  const cy = -24;
  const len = strips === 'full' ? 32 : 10;
  const sides: [number, number, number, number, Face][] = [
    [-len / 2, cy - half - 7, len, 5, 'B'],
    [-len / 2, cy + half + 2, len, 5, 'F'],
    [-half - 7, cy - len / 2, 5, len, 'L'],
    [half + 2, cy - len / 2, 5, len, 'R'],
  ];
  return (
    <g>
      <rect x={-half} y={cy - half} width={half * 2} height={half * 2} rx="7" fill={INK} />
      {[...cells].map((f, i) => (
        <rect key={i} x={start + (i % 3) * step} y={cy + start + Math.floor(i / 3) * step} width={cell} height={cell} rx="2.5" fill={f === 'S' ? GRAY : FACE_COLORS[f as Face]} />
      ))}
      {strips && sides.map(([x, y, w, h, f]) => <rect key={f} x={x} y={y} width={w} height={h} rx="2" fill={FACE_COLORS[f]} />)}
    </g>
  );
}

// 주제 팻말: 나무 기둥 + 판자 위에 배우는 모양 그림 (x, y = 기둥 윗부분)
export function TopicSign({ x, y, topic, post = true }: { x: number; y: number; topic: Topic; post?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {post && <rect x="-3" y="0" width="6" height="40" rx="2" fill={WOOD} />}
      <rect x="-32" y="-54" width="64" height="60" rx="8" fill="#e9c27a" stroke={INK} strokeWidth="3" />
      {topic === 'pieces' ? <PiecesPicture /> : <FacePicture topic={topic} />}
    </g>
  );
}

// 큐비(메인 화면과 같은 그림, 변신 옷까지)가 탄 돛단배 (x, y = 배 윗면 가운데)
export function Boat({ x, y, outfit }: { x: number; y: number; outfit: Outfit | null }) {
  const size = 38;
  const k = size / 100;
  // 옷을 입으면 큐비 그림 위·왼쪽에 여백이 생기므로 그만큼 당긴다
  const dx = outfit ? 6 * k : 0;
  const dy = outfit ? 32 * k : 0;
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1="4" y1="0" x2="4" y2="-50" stroke={INK} strokeWidth="3" />
      <path d="M6 -48 l26 34 h-26 z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g transform={`translate(${-37 - dx},${-38 - dy})`}>
        <Mascot size={size} outfit={outfit} />
      </g>
      <path d="M-40 0 h76 l-13 19 h-50 z" fill="#c8553d" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

// 잠긴 섬을 덮는 안개
export function Fog({ x, y }: { x: number; y: number }) {
  return (
    <g opacity="0.88">
      <ellipse cx={x - 40} cy={y + 6} rx="56" ry="34" fill="#eef6fb" />
      <ellipse cx={x + 34} cy={y - 4} rx="62" ry="40" fill="#f4f9fc" />
      <ellipse cx={x} cy={y + 26} rx="86" ry="28" fill="#eef6fb" />
    </g>
  );
}

// 기둥 없는 작은 팻말 그림 (섬 안 화면 제목 옆에 붙여 어느 섬인지 보여 준다)
export function SignIcon({ topic, size = 30 }: { topic: Topic; size?: number }) {
  return (
    <svg className="sign-icon" width={size} height={(size * 64) / 68} viewBox="-34 -56 68 64" aria-hidden="true">
      <TopicSign x={0} y={0} topic={topic} post={false} />
    </svg>
  );
}
