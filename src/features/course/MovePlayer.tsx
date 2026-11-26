// 꼬마 코스의 "따라 돌리기": 큐비가 정한 회전들(섞기·힌트·다 맞추기)을 3D로 한 번씩 보여 주고 아이가 따라 돌린다
import { useEffect, useMemo, useState } from 'react';
import { parseMove, statesAlong, wholeTurns, type Move } from '../../core/moves';
import type { Chunk } from '../../solver/beginner/lesson';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { describeMove } from '../guide/moveText';
import { whyText } from './whyText';

/** 빨리 맞추기와 같은 속도 (90° 한 번에 1.5초) */
const TURN_MS = 1500;

interface Props {
  start: string;
  moves: Move[];
  /** 첫 회전 앞에 들려줄 말 (문구 키) */
  intro: MessageKey;
  /** 위에 보여 줄 진행 글자 (문구 키, {i}/{n}) */
  stepLabel: MessageKey;
  /** 회전마다 그 회전이 속한 묶음 (있으면 "왜 이렇게 돌리는지"를 함께 보여 준다) */
  chunks?: Chunk[];
  /** 마지막 회전까지 따라 했을 때 */
  onDone: () => void;
}

// 회전 하나를 안내하는 음성 이름 (빨리 맞추기와 같은 녹음, 큐브 통째로 돌리기는 녹음이 없다)
function turnVoice(move: Move, first: boolean): string[] {
  if (wholeTurns(move)) return [];
  return [turnKey(move, first)];
}

// 한 줄 돌리기 음성 키
function turnKey(move: Move, first: boolean): string {
  const half = parseMove(move).turns === 2;
  return first ? (half ? 'guideTurn2' : 'guideTurn') : half ? 'guideThen2' : 'guideThen';
}

// 회전을 하나씩 보여 주고, 다음/이전/다시 보기로 넘긴다
export function MovePlayer({ start, moves, intro, stepLabel, chunks, onDone }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const states = useMemo(() => statesAlong(start, moves), [start, moves]);
  const [step, setStep] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [again, setAgain] = useState(false);
  const move = moves[step];
  const first = step === 0 || again;
  /** 지금 회전이 그 묶음 안에서 몇 번째인지 (오른손 춤 몇 번째인지 알려 줄 때 쓴다) */
  let pos = 0;
  while (chunks && step - pos > 0 && chunks[step - pos - 1] === chunks[step]) pos++;

  // 회전이 바뀌거나 다시 보기를 누르면 그 회전을 말해 준다 (처음에는 안내 말부터)
  useEffect(() => {
    say([...(step === 0 && !again ? [intro] : []), ...turnVoice(move, first)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  // 주어진 회전으로 가서 애니메이션을 다시 튼다 (마지막 다음이면 끝)
  function goTo(next: number) {
    if (next >= moves.length) return onDone();
    setAgain(next <= step);
    setStep(Math.max(0, next));
    setPlayId((id) => id + 1);
  }

  return (
    <>
      <p className="course-step">{t(stepLabel, { i: step + 1, n: moves.length })}</p>
      <div className="cube-stage">
        <Cube3D state={states[step]} move={move} playId={playId} duration={TURN_MS} glow />
      </div>
      <Bubble>
        {step === 0 && !again && <small>{t(intro)}</small>}
        <strong className="move-title">{describeMove(move, t, first, true).title}</strong>
        {chunks?.[step] && <small className="course-tip">{whyText(chunks[step], t, pos)}</small>}
      </Bubble>
      <button className="btn primary big" onClick={() => goTo(step + 1)}>{t('guideNext')} ▶</button>
      <div className="row">
        <button className="btn small" disabled={step === 0} onClick={() => goTo(step - 1)}>◀ {t('guidePrev')}</button>
        <button className="btn small" onClick={() => goTo(step)}>↻ {t('guideReplay')}</button>
      </div>
    </>
  );
}
