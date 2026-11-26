// 돌리기 버튼 그림: 비스듬한 3×3 큐브에서 움직이는 줄(층)만 색을 칠하고, 그 줄을 따라 가는 큰 화살표를 그린다
import { FACE_COLORS, type Face } from '../core/faces';
import { parseMove, type Move } from '../core/moves';

interface Props {
  move: Move;
  /** 지금 큐브의 위·앞·오른쪽 가운데 색 (움직이는 줄을 그 색으로 칠한다) */
  colors: { U: Face; F: Face; R: Face };
  size?: number;
}

type Side = 'U' | 'F' | 'R';
type Point = [number, number];

const DARK = '#1b2440';
const BLANK = '#e3e8f2';

/** 면 안의 위치(u 가로, v 세로, 0~1)를 그림 좌표로 옮긴다 (PieceIcon과 같은 비스듬한 큐브) */
const MAP: Record<Side, (u: number, v: number) => Point> = {
  U: (u, v) => [30 + 22 * u - 22 * v, 8 + 10 * u + 10 * v],
  F: (u, v) => [8 + 22 * u, 18 + 10 * u + 26 * v],
  R: (u, v) => [30 + 22 * u, 28 - 10 * u + 26 * v],
};

/** 돌리기마다 움직이는 칸 (면별로 [가로 칸, 세로 칸] 0~2) */
function moving(face: Side, side: Side, col: number, row: number): boolean {
  if (face === 'U') return side === 'U' || row === 0;
  if (face === 'R') return side === 'R' || (side === 'F' && col === 2) || (side === 'U' && col === 2);
  return side === 'F' || (side === 'U' && row === 2) || (side === 'R' && col === 0);
}

/** 화살표 길: 위 줄은 앞·오른쪽 윗줄을 따라 가로로, 오른쪽 줄은 앞면 오른쪽 세로줄에서 윗면으로, 앞면은 앞면 위로 넘어가는 반원 */
const PATHS: Record<Side, Point[]> = {
  U: [MAP.R(0.92, 0.17), MAP.F(1, 0.17), MAP.F(0.08, 0.17)],
  R: [MAP.F(0.83, 0.92), MAP.F(0.83, 0), MAP.U(0.83, 0.25)],
  F: [MAP.F(0.12, 0.85), MAP.F(0.12, 0.2), MAP.F(0.5, -0.05), MAP.F(0.88, 0.2), MAP.F(0.88, 0.85)],
};

// 점들을 잇는 부드러운 선 (가운데 점들은 둥글게 꺾는다)
function linePath(points: Point[]): string {
  if (points.length === 3) return `M${points[0]} Q${points[1]} ${points[2]}`;
  const [a, b, c, d, e] = points;
  return `M${a} L${b} Q${c} ${d} L${e}`.replace(/,/g, ' ');
}

// 끝점에서 들어오는 방향으로 화살촉 삼각형을 만든다
function headPath(from: Point, to: Point, size = 7): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / len, dy / len];
  const tip: Point = [to[0] + ux * size * 0.6, to[1] + uy * size * 0.6];
  const back: Point = [to[0] - ux * size * 0.6, to[1] - uy * size * 0.6];
  const left: Point = [back[0] - uy * size * 0.7, back[1] + ux * size * 0.7];
  const right: Point = [back[0] + uy * size * 0.7, back[1] - ux * size * 0.7];
  return `M${tip} L${left} L${right} Z`.replace(/,/g, ' ');
}

// 돌리기 하나를 그림으로 그린다 (반대 방향은 화살표 길을 거꾸로)
export function MoveIcon({ move, colors, size = 56 }: Props) {
  const { face, turns } = parseMove(move);
  const turning = face as Side;
  const points = turns === 3 ? [...PATHS[turning]].reverse() : PATHS[turning];
  const line = linePath(points).replace(/,/g, ' ');
  const head = headPath(points[points.length - 2], points[points.length - 1]);
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      {(['U', 'F', 'R'] as const).map((side) =>
        [0, 1, 2].flatMap((row) =>
          [0, 1, 2].map((col) => {
            const corners = [MAP[side](col / 3, row / 3), MAP[side]((col + 1) / 3, row / 3), MAP[side]((col + 1) / 3, (row + 1) / 3), MAP[side](col / 3, (row + 1) / 3)];
            const fill = moving(turning, side, col, row) ? FACE_COLORS[colors[side]] : BLANK;
            return <path key={`${side}${row}${col}`} d={`M${corners.join(' L')} Z`.replace(/,/g, ' ')} fill={fill} stroke={DARK} strokeWidth="1.2" strokeLinejoin="round" />;
          }),
        ),
      )}
      <path d="M8 18 L30 8 L52 18 L52 44 L30 54 L8 44 Z M8 18 L30 28 L52 18 M30 28 L30 54" fill="none" stroke={DARK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={line} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={head} fill="#fff" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <path d={line} fill="none" stroke={DARK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={head} fill={DARK} stroke={DARK} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
