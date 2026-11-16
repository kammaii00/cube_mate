// 한 면을 크게 보여주고 칸을 눌러 색을 칠하는 편집기
import { FACES, FACE_COLORS, type Face } from '../../core/faces';

/** 각 면을 정면으로 볼 때 위·오른쪽·아래·왼쪽에 붙어 있는 면 */
export const NEIGHBORS: Record<Face, { top: Face; right: Face; bottom: Face; left: Face }> = {
  F: { top: 'U', right: 'R', bottom: 'D', left: 'L' },
  R: { top: 'U', right: 'B', bottom: 'D', left: 'F' },
  B: { top: 'U', right: 'L', bottom: 'D', left: 'R' },
  L: { top: 'U', right: 'F', bottom: 'D', left: 'B' },
  U: { top: 'B', right: 'R', bottom: 'F', left: 'L' },
  D: { top: 'F', right: 'R', bottom: 'B', left: 'L' },
};

interface Props {
  state: string;
  face: Face;
  /** 문제가 의심되어 강조할 칸 번호들 */
  marked: number[];
  onPaint: (index: number) => void;
}

// 큰 3x3 칸과, 네 방향에 어떤 면이 붙어 있는지 알려주는 색 띠를 그린다.
// 가운데 칸은 면의 기준이라 바꿀 수 없다.
export function FaceEditor({ state, face, marked, onPaint }: Props) {
  const base = FACES.indexOf(face) * 9;
  const around = NEIGHBORS[face];
  // 옆 면의 색은 그 면의 가운데 칸 색을 따른다 (큐브를 다르게 잡은 상태도 보여줄 수 있게)
  const colorOf = (f: Face) => FACE_COLORS[(state[FACES.indexOf(f) * 9 + 4] as Face)] ?? FACE_COLORS[f];
  return (
    <div className="face-editor">
      <i className="edge top" style={{ background: colorOf(around.top) }} />
      <i className="edge left" style={{ background: colorOf(around.left) }} />
      <div className="face-grid">
        {Array.from({ length: 9 }, (_, cell) => {
          const index = base + cell;
          const value = state[index];
          return (
            <button
              key={index}
              className={'face-cell' + (cell === 4 ? ' center' : '') + (marked.includes(index) ? ' marked' : '')}
              style={{ background: value in FACE_COLORS ? FACE_COLORS[value as Face] : undefined }}
              disabled={cell === 4}
              onClick={() => onPaint(index)}
              aria-label={`${face}${cell + 1}`}
            />
          );
        })}
      </div>
      <i className="edge right" style={{ background: colorOf(around.right) }} />
      <i className="edge bottom" style={{ background: colorOf(around.bottom) }} />
    </div>
  );
}
