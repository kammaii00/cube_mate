// 풀이 안내 화면: 3D 큐브와 화살표로 회전을 한 번씩 천천히 보여준다
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseMove, statesAlong } from '../../core/moves';
import { useI18n } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import type { Solution } from '../../solver/solverClient';
import { PAUSE, useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { describeMove } from './moveText';

// 빨리 맞추기는 어린아이가 눈으로 따라오도록 90° 회전 한 번을 1.5초로 천천히 보여준다 (기본 1.1초)
const TURN_MS = 1500;
// 잡는 법 안내(0단계)에서 흰색(위)·빨강(오른쪽)·초록(앞) 가운데 칸만 선명하게 보여 기준 색을 알려준다
const HOLD_CENTERS = [4, 13, 22];
/** 다음 회전으로 넘어갈 때 무작위로 들려줄 짧은 칭찬 */
const PRAISES = Array.from({ length: 10 }, (_, i) => `guidePraise${i + 1}`);

// 잡는 법을 다시 알려줄 단계: 전체 회전의 1/3, 2/3 지점 (첫 회전은 이미 잡는 법을 들었으니 제외)
function isKeepStep(step: number, total: number): boolean {
  return step > 1 && (step === Math.round(total / 3) || step === Math.round((total * 2) / 3));
}
let lastPraise = '';

// 바로 전 칭찬과 겹치지 않게 칭찬 하나를 무작위로 고른다
function pickPraise(): string {
  const choices = PRAISES.filter((p) => p !== lastPraise);
  lastPraise = choices[Math.floor(Math.random() * choices.length)];
  return lastPraise;
}

// 단계 s를 마치고 다음으로 넘어갈 때 앞에 붙일 응원 음성을 고른다 (중간·마지막 직전은 정해진 말)
function cheerFor(s: number, total: number): string {
  if (total - s === 1) return 'guideLast';
  if (s === Math.floor(total / 2)) return 'guideHalf';
  return pickPraise();
}

// 회전 하나를 안내하는 음성 이름 (화면 문구와 같은 말)
function turnVoice(move: string, full: boolean): string {
  const { turns } = parseMove(move);
  return full ? (turns === 2 ? 'guideTurn2' : 'guideTurn') : turns === 2 ? 'guideThen2' : 'guideThen';
}

interface Props {
  solution: Solution;
  onDone: () => void;
  onBack: () => void;
}

// 0단계(잡는 법 안내)부터 마지막 회전까지 한 번씩 진행한다
export function GuideScreen({ solution, onDone, onBack }: Props) {
  const { start, moves } = solution;
  const { t } = useI18n();
  const say = useSay();
  /** 다음 단계 안내 앞에 붙일 응원 음성 (앞으로 넘어갈 때만) */
  const cheer = useRef<string | null>(null);
  /** "모르겠으면 다시 보기" 음성은 한 번만 */
  const helped = useRef(false);
  const states = useMemo(() => statesAlong(start, moves), [start, moves]);
  const [step, setStep] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [auto, setAuto] = useState(false);
  const [animating, setAnimating] = useState(false);
  /** 뒤로/다시 보기로 온 회전이면 "그다음" 대신 처음 문장(화살표 방향으로)을 다시 보여준다 */
  const [again, setAgain] = useState(false);
  const total = moves.length;
  const move = step > 0 ? moves[step - 1] : null;
  // 첫 회전이 끝나면 "다시 보기" 버튼을 반짝여, 모르면 다시 볼 수 있다는 걸 알려준다 (음성 cubiHelp와 함께)
  const hintReplay = step === 1 && !animating;
  const description = move ? describeMove(move, t, step === 1 || again, true) : null;

  // 단계를 바꾸고 해당 회전 애니메이션을 재생한다
  function goTo(next: number) {
    if (next > total) {
      onDone();
      return;
    }
    cheer.current = next === step + 1 && step > 0 ? cheerFor(step, total) : null;
    setAgain(next <= step);
    setStep(Math.max(0, next));
    setPlayId((id) => id + 1);
    setAnimating(next > 0);
  }

  // 단계가 바뀌거나 다시 보기를 누르면 큐비가 그 단계 안내를 말해 준다
  useEffect(() => {
    if (step === 0) {
      say(['guideTotal', 'guideHold']);
      return;
    }
    // 행동 안내를 먼저 하고, 1/3·2/3 지점에서는 한 템포 쉬었다가 잡는 법을 다시 알려준다
    const keep = !again && isKeepStep(step, total) ? [PAUSE, 'guideKeep'] : [];
    const pre = cheer.current ? [cheer.current] : [];
    say([...pre, turnVoice(moves[step - 1], step === 1 || again), ...keep]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  // 첫 회전을 보고 나면 "모르겠으면 다시 보기를 눌러 줘"를 한 번 이어서 말한다
  useEffect(() => {
    if (!hintReplay || helped.current) return;
    helped.current = true;
    say('cubiHelp', { enqueue: true });
  }, [hintReplay, say]);

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
          duration={TURN_MS}
          highlight={step === 0 ? HOLD_CENTERS : null}
          glow
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
            <button className={`btn small${hintReplay ? ' glow' : ''}`} onClick={() => goTo(step)}>↻ {t('guideReplay')}</button>
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
