// 한 면을 크게 보여주고 아래 색 고르기 판으로 칸을 칠하는 묶음 (편집기 + 색 판)
import { useState } from 'react';
import { FACES, FACE_COLORS, type Face } from '../../core/faces';
import { useI18n, type MessageKey } from '../../i18n';
import { FaceEditor } from './FaceEditor';

interface Props {
  /** 54칸 상태 (모르는 칸은 '?') */
  state: string;
  face: Face;
  onChange: (state: string) => void;
}

// 고른 색으로 누른 칸을 칠한다 (처음 고른 색은 그 면의 가운데 색)
export function FacePaint({ state, face, onChange }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Face>(face);
  return (
    <>
      <FaceEditor state={state} face={face} marked={[]} onPaint={(i) => onChange(state.slice(0, i) + selected + state.slice(i + 1))} />
      <div className="palette">
        {FACES.map((f) => (
          <button
            key={f}
            className={'swatch' + (selected === f ? ' selected' : '')}
            style={{ background: FACE_COLORS[f] }}
            onClick={() => setSelected(f)}
            aria-label={t(('color' + f) as MessageKey)}
          />
        ))}
      </div>
    </>
  );
}
