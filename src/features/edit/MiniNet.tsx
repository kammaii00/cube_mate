// 작은 전개도: 여섯 면을 한눈에 보여주고, 면을 누르면 그 면을 크게 편집한다
import { FACES, FACE_COLORS, type Face } from '../../core/faces';

/** 전개도에서 각 면이 놓이는 자리 (열, 행) */
const FACE_SPOT: Record<Face, [number, number]> = {
  U: [2, 1],
  L: [1, 2],
  F: [2, 2],
  R: [3, 2],
  B: [4, 2],
  D: [2, 3],
};

interface Props {
  state: string;
  selected: Face;
  /** 문제가 의심되는 칸 번호들 (해당 면에 표시) */
  marked: number[];
  onSelect: (face: Face) => void;
}

// 십자 모양 전개도를 그린다. 지금 편집 중인 면과 문제가 있는 면을 표시한다.
export function MiniNet({ state, selected, marked, onSelect }: Props) {
  return (
    <div className="mini-net">
      {FACES.map((face, fi) => {
        const [col, row] = FACE_SPOT[face];
        const hasProblem = marked.some((index) => Math.floor(index / 9) === fi);
        return (
          <button
            key={face}
            className={'mini-net-face' + (face === selected ? ' selected' : '') + (hasProblem ? ' marked' : '')}
            style={{ gridColumn: col, gridRow: row }}
            onClick={() => onSelect(face)}
            aria-label={face}
          >
            {Array.from({ length: 9 }, (_, cell) => {
              const value = state[fi * 9 + cell];
              return <i key={cell} style={{ background: value in FACE_COLORS ? FACE_COLORS[value as Face] : undefined }} />;
            })}
          </button>
        );
      })}
    </div>
  );
}
