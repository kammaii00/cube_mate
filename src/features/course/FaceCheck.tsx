// 한 면만 보여 주기(카메라) 또는 칠하기: 흰 꽃·흰 십자·1층을 다 했는지 그 면의 9칸으로 확인한다
import { useEffect, useState } from 'react';
import { FACES, emptyState, type Face } from '../../core/faces';
import { useI18n, type MessageKey } from '../../i18n';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { FacePaint } from '../edit/FacePaint';
import { FaceCamera } from '../scan/FaceCamera';

interface Props {
  /** 보여 줄 면의 가운데 색 (D 노랑 / U 흰색) */
  center: Face;
  onCells: (cells: string) => void;
  onCancel: () => void;
}

// 카메라로 한 면을 찍고, 카메라가 안 되면 칠하기로 바꾼다
export function FaceCheck({ center, onCells, onCancel }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [camera, setCamera] = useState(true);
  const [painted, setPainted] = useState(emptyState);
  const ask = ((camera ? 'practiceShow' : 'practicePaint') + center) as MessageKey;
  const base = FACES.indexOf(center) * 9;
  const full = !painted.slice(base, base + 9).includes('?');

  // 어느 면을 보여 줄지(칠할지) 말해 준다
  useEffect(() => {
    say(ask);
  }, [ask, say]);

  return (
    <>
      <Bubble>
        <strong className="move-title">{t(ask)}</strong>
        <small>{t('practiceAnyWay')}</small>
      </Bubble>
      {camera ? (
        <FaceCamera center={center} onFace={onCells} onWrongCenter={() => say(ask, { cooldown: 5000 })} onError={() => setCamera(false)} />
      ) : (
        <>
          <FacePaint state={painted} face={center} onChange={setPainted} edges={false} />
          <button className="btn primary big" disabled={!full} onClick={() => onCells(painted.slice(base, base + 9))}>
            {t('recoverPainted')}
          </button>
        </>
      )}
      <div className="row">
        <button className="btn small" onClick={() => setCamera(!camera)}>{t(camera ? 'recoverUsePaint' : 'recoverUseCamera')}</button>
        <button className="btn small" onClick={onCancel}>{t('back')}</button>
      </div>
    </>
  );
}
