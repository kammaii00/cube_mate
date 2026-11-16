// 큐브 전개도: 54칸을 펼쳐 보여주고 칸을 눌러 색을 바꾼다
import { FACES, FACE_COLORS, type Face } from '../../core/faces';

/** 전개도에서 각 면이 놓이는 위치 (칸 단위: 열, 행) */
const FACE_ORIGIN: Record<Face, [number, number]> = {
  U: [3, 0],
  L: [0, 3],
  F: [3, 3],
  R: [6, 3],
  B: [9, 3],
  D: [3, 6],
};

interface Props {
  state: string;
  /** 문제가 의심되어 강조할 칸 번호들 */
  marked: number[];
  onPaint: (index: number) => void;
}

// 십자 모양 전개도를 그린다. 가운데 칸은 면의 기준이라 바꿀 수 없다.
export function NetEditor({ state, marked, onPaint }: Props) {
  return (
    <div className="net">
      {FACES.flatMap((face, fi) =>
        Array.from({ length: 9 }, (_, cell) => {
          const index = fi * 9 + cell;
          const [col, row] = FACE_ORIGIN[face];
          const value = state[index];
          const isCenter = cell === 4;
          return (
            <button
              key={index}
              className={'net-cell' + (isCenter ? ' center' : '') + (marked.includes(index) ? ' marked' : '')}
              style={{
                gridColumn: col + (cell % 3) + 1,
                gridRow: row + Math.floor(cell / 3) + 1,
                background: value in FACE_COLORS ? FACE_COLORS[value as Face] : undefined,
              }}
              disabled={isCenter}
              onClick={() => onPaint(index)}
              aria-label={`${face}${cell + 1}`}
            />
          );
        }),
      )}
    </div>
  );
}
