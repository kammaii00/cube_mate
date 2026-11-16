// 풀이 안내 화면: 3D 큐브와 화살표로 회전을 한 번씩 천천히 보여준다
import { useEffect, useMemo, useState } from 'react';
import { statesAlong } from '../../core/moves';
import { useI18n } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import type { Solution } from '../../solver/solverClient';
import { Bubble } from '../../widgets/Bubble';
import { describeMove } from './moveText';

interface Props {
  solution: Solution;
  onDone: () => void;
  onBack: () => void;
}

// 0단계(잡는 법 안내)부터 마지막 회전까지 한 번씩 진행한다
export function GuideScreen({ solution, onDone, onBack }: Props) {
  const { start, moves } = solution;
  const { t } = useI18n();
  const states = useMemo(() => statesAlong(start, moves), [start, moves]);
  const [step, setStep] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [auto, setAuto] = useState(false);
  const [animating, setAnimating] = useState(false);
  const total = moves.length;
  const move = step > 0 ? moves[step - 1] : null;
  const description = move ? describeMove(move, t, step === 1) : null;

  // 단계를 바꾸고 해당 회전 애니메이션을 재생한다
  function goTo(next: number) {
    if (next > total) {
      onDone();
      return;
    }
    setStep(Math.max(0, next));
    setPlayId((id) => id + 1);
    setAnimating(next > 0);
  }

  // 자동 넘기기가 켜져 있으면 애니메이션이 끝나고 잠시 뒤 다음 단계로 간다
  useEffect(() => {
    if (!auto || animating || step === 0 || step >= total) return;
    const timer = setTimeout(() => goTo(step + 1), 2500);
    return () => clearTimeout(timer);
  });

  return (
    <main className="screen guide">
      <header className="topbar">
        <button className="link" onClick={onBack}>‹ {t('back')}</button>
        <h2>{step === 0 ? t('guideHoldTitle') : t('guideStep', { i: step, n: total })}</h2>
        <span />
      </header>
      <div className="progress"><i style={{ width: `${(step / total) * 100}%` }} /></div>

      <div className="cube-stage">
        <Cube3D
          state={states[Math.max(0, step - 1)]}
          move={move}
          playId={playId}
          onAnimationEnd={() => setAnimating(false)}
        />
      </div>

      {description ? (
        <Bubble>
          <strong className="move-title">{description.title}</strong>
          {description.note && <small>{description.note}</small>}
        </Bubble>
      ) : (
        <Bubble>
          <strong className="move-title">{t('guideTotal', { n: total })}</strong>
          <small>{t('guideHold')}</small>
        </Bubble>
      )}

      {step === 0 ? (
        <button className="btn primary big" onClick={() => goTo(1)}>{t('guideStart')}</button>
      ) : (
        <>
          <button className="btn primary big" onClick={() => goTo(step + 1)}>
            {step === total ? t('guideFinish') : `${t('guideNext')} ▶`}
          </button>
          <div className="row">
            <button className="btn small" onClick={() => goTo(step - 1)}>◀ {t('guidePrev')}</button>
            <button className="btn small" onClick={() => goTo(step)}>↻ {t('guideReplay')}</button>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            {t('guideAuto')}
          </label>
        </>
      )}
      <p className="hint">{step === 0 ? '' : t('guideKeep')}</p>
    </main>
  );
}
