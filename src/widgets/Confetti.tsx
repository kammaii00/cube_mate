// 완성 축하용 색종이: 큐브 색 조각들이 위에서 떨어진다
import { FACES, FACE_COLORS } from '../core/faces';

const PIECES = 28;

// 화면 전체에 떨어지는 색종이 조각들을 그린다 (모양은 CSS 애니메이션)
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: FACE_COLORS[FACES[i % 6]],
            animationDelay: `${(i % 7) * 0.18}s`,
            animationDuration: `${2.4 + (i % 5) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}
