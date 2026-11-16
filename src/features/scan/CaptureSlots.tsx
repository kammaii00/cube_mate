// 찍은 면 표시줄: 여섯 가지 색(가운데 색) 칸이 있고, 찍은 면은 작은 그림과 ✓로 채워진다
import { FACE_COLORS, type Face } from '../../core/faces';
import { useI18n, type MessageKey } from '../../i18n';
import { rgbToCss, type RGB } from '../../scanner/colorMath';
import { cubeColorOf } from '../../scanner/autoCapture';

/** 표시줄에 늘어놓는 순서 */
const SLOT_ORDER: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];

interface Props {
  captured: RGB[][];
  /** 깜빡여서 "이 면은 이미 찍었어요"라고 알려줄 면 */
  highlight: Face | null;
  /** 찍은 면을 눌러 지울 때 부르는 함수 (찍은 순서 번호) */
  onRemove: (index: number) => void;
}

// 가운데 색 여섯 칸을 그린다. 아직 못 찍은 색은 점선 칸으로 남아 "다음에 보여줄 면"을 알려준다.
export function CaptureSlots({ captured, highlight, onRemove }: Props) {
  const { t } = useI18n();
  return (
    <div className="scan-slots">
      {SLOT_ORDER.map((face) => {
        const index = captured.findIndex((cells) => cubeColorOf(cells[4]) === face);
        const done = index >= 0;
        const name = t(('color' + face) as MessageKey);
        return (
          <button
            key={face}
            type="button"
            className={'scan-slot' + (done ? ' filled' : '') + (highlight === face ? ' dup' : '')}
            style={{ '--face': FACE_COLORS[face] } as React.CSSProperties}
            disabled={!done}
            aria-label={done ? t('scanSlotDone', { color: name }) : t('scanSlotTodo', { color: name })}
            onClick={() => onRemove(index)}
          >
            <span className="thumb">
              {done
                ? captured[index].map((rgb, i) => <i key={i} style={{ background: rgbToCss(rgb) }} />)
                : <b />}
            </span>
            {done && <em>✓</em>}
            <small>{name}</small>
          </button>
        );
      })}
    </div>
  );
}
