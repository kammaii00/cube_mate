// 완성 화면: 색종이·칭찬으로 축하하고, 스티커를 붙여 주고, 상장을 받을 수 있게 한다
import { useEffect, useState } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { PRAISE_KEYS, pickPraise, playPraise } from '../../rewards/praise';
import { boardsDone, type SolveReward } from '../../rewards/store';
import { Confetti } from '../../widgets/Confetti';
import { Mascot } from '../../widgets/Mascot';
import { outfitFor } from '../../widgets/outfits';
import { CertificateSheet } from './CertificateSheet';
import { StickerBoard } from './StickerBoard';
import { TransformPopup } from './TransformPopup';
import './rewards.css';

interface Props {
  /** 완성된 큐브 상태 (사용자가 잡고 있는 방향 그대로) */
  state: string;
  moveCount: number;
  /** 배우면서 맞췄을 때: 공식별 사용 횟수 */
  formulas?: [string, number][] | null;
  /** 이번 완성으로 받은 보상 (스티커 수, 변신 여부) */
  reward: SolveReward;
  onRestart: () => void;
}

// 축하 → 스티커판 → 상장·다시 하기 순서로 보여준다
export function DoneScreen({ state, moveCount, formulas, reward, onRestart }: Props) {
  const { t, lang } = useI18n();
  const [praise] = useState(pickPraise);
  const [showTransform, setShowTransform] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const outfit = outfitFor(boardsDone(reward.solves));

  // 화면이 열리면 칭찬 음성을 들려주고, 판을 다 채웠으면 잠시 뒤 변신 창을 띄운다
  useEffect(() => {
    playPraise(praise, lang);
    if (!reward.transformed) return;
    const timer = setTimeout(() => setShowTransform(true), 1800);
    return () => clearTimeout(timer);
    // 화면이 처음 열릴 때 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="screen done">
      <Confetti />
      <div className="celebrate">
        <div className="celebrate-cubie"><Mascot size={84} outfit={outfit} /></div>
        <div className="praise-bubble">
          <b>{t(PRAISE_KEYS[praise] as MessageKey)}</b>
          <span>{t('doneText', { n: moveCount })}</span>
        </div>
      </div>
      <Cube3D state={state} spin />
      <StickerBoard onBoard={reward.onBoard} />
      {formulas && formulas.length > 0 && (
        <div className="learned">
          <b>{t('doneLearned')}</b>
          {formulas.map(([id, count]) => (
            <span key={id}>{t(('formula' + id[0].toUpperCase() + id.slice(1)) as MessageKey)} ×{count}</span>
          ))}
        </div>
      )}
      <div className="done-actions">
        <button className="btn sky big" onClick={() => setShowCert(true)}>{t('certOpen')}</button>
        <button className="btn primary big" onClick={onRestart}>{t('doneAgain')}</button>
      </div>
      {showTransform && outfit && <TransformPopup outfit={outfit} onClose={() => setShowTransform(false)} />}
      {showCert && <CertificateSheet solves={reward.solves} onClose={() => setShowCert(false)} />}
    </main>
  );
}
