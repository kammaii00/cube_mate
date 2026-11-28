// 꼬마 코스의 "따라 돌리기": 큐비가 정한 회전들을 3D로 한 번씩 보여 주고 아이가 따라 돌린다.
// 같이 해 보기는 "목표 → 이유 → 동작" 순서: 조각이 갈 자리를 먼저 보여 주고, 묶음이 바뀔 때마다 왜 하는지 먼저 말한다
import { useEffect, useMemo, useState } from 'react';
import { FACE_COLORS, type Face } from '../../core/faces';
import { parseMove, statesAlong, wholeTurns, type Move } from '../../core/moves';
import type { GuideChunk } from '../../course/guide';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { describeMove } from '../guide/moveText';
import { DanceStrip } from './DanceStrip';
import { whyKey, whySlide, type GoalCard } from './guideText';
import { PieceIntro } from './PieceIntro';
import type { SlideId } from './introSlides';

/** 빨리 맞추기와 같은 속도 (90° 한 번에 1.5초) */
const TURN_MS = 1500;
/** 묶음의 첫 회전은 이유를 먼저 듣도록 화살표를 보여 준 뒤 이만큼 기다렸다가 돌린다(ms) */
const WHY_LEAD_MS = 2600;

interface Props {
  start: string;
  moves: Move[];
  /** 첫 회전 앞에 들려줄 말 (문구 키) */
  intro: MessageKey;
  /** 위에 보여 줄 진행 글자 (문구 키, {i}/{n}) */
  stepLabel: MessageKey;
  /** 회전마다 그 회전이 속한 묶음 (있으면 묶음이 바뀔 때마다 "왜 이렇게 돌리는지"를 먼저 보여 준다) */
  chunks?: GuideChunk[];
  /** 주면 첫 회전 전에 목표(조각이 갈 자리)를 먼저 보여 준다 */
  goal?: GoalCard;
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

// 지금 큐브의 위·앞·오른쪽 가운데 색 (춤 그림 색칠용)
function centersOf(state: string): { U: Face; F: Face; R: Face } {
  return { U: state[4], F: state[22], R: state[13] } as { U: Face; F: Face; R: Face };
}

// 목표를 보여 준 뒤 회전을 하나씩 보여 주고, 다음/이전/다시 보기로 넘긴다
export function MovePlayer({ start, moves, intro, stepLabel, chunks, goal, onDone }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const states = useMemo(() => statesAlong(start, moves), [start, moves]);
  const [step, setStep] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [again, setAgain] = useState(false);
  /** true면 첫 회전 전에 목표 그림을 보여 주는 중 */
  const [atGoal, setAtGoal] = useState(!!goal);
  /** 다시 보는 중인 소개 장면 (배운 방법 버튼) */
  const [review, setReview] = useState<SlideId | null>(null);
  const move = moves[step];
  const first = step === 0 || again;
  const chunk = chunks?.[step];
  /** 지금 회전이 그 묶음 안에서 몇 번째인지 (0이면 묶음의 첫 회전: 이유를 먼저 말한다) */
  let pos = 0;
  while (chunks && step - pos > 0 && chunks[step - pos - 1] === chunk) pos++;
  const why = chunk && pos === 0 ? whyKey(chunk) : null;

  // 목표를 말해 주고, 회전이 바뀌거나 다시 보기를 누르면 (묶음 첫 회전이면 이유부터) 그 회전을 말해 준다
  useEffect(() => {
    if (atGoal && goal) say([intro, goal.text]);
    else say([...(step === 0 && !again && !goal ? [intro] : []), ...(why ? [why] : []), ...turnVoice(move, first)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  // 목표를 다 봤으면 첫 회전을 시작한다
  function startMoves() {
    setAtGoal(false);
    setPlayId((id) => id + 1);
  }

  // 주어진 회전으로 가서 애니메이션을 다시 튼다 (마지막 다음이면 끝)
  function goTo(next: number) {
    if (next >= moves.length) return onDone();
    setAgain(next <= step);
    setStep(Math.max(0, next));
    setPlayId((id) => id + 1);
  }

  if (review) return <PieceIntro slides={[review]} onDone={() => setReview(null)} doneLabel="practiceReviewOk" />;
  if (atGoal && goal)
    return (
      <>
        <p className="course-step">{t(stepLabel, { i: 0, n: moves.length })}</p>
        <div className="cube-stage">
          <Cube3D
            state={goal.view.state}
            highlight={goal.view.highlight}
            marks={{ piece: goal.view.piece, slot: goal.view.slot, label: { text: t(goal.label), color: goal.color && FACE_COLORS[goal.color] }, quietSlot: true }}
            glow
          />
        </div>
        <Bubble>
          <small>{t(intro)}</small>
          <strong className="move-title">{t(goal.text)}</strong>
        </Bubble>
        <button className="btn primary big" onClick={startMoves}>{t('practiceReviewOk')} ▶</button>
      </>
    );

  const title = describeMove(move, t, first, true).title;
  const how = chunk ? whySlide(chunk) : null;
  return (
    <>
      <p className="course-step">{t(stepLabel, { i: step + 1, n: moves.length })}</p>
      <div className="cube-stage">
        <Cube3D state={states[step]} move={move} playId={playId} duration={TURN_MS} lead={why ? WHY_LEAD_MS : undefined} glow />
      </div>
      <Bubble>
        {step === 0 && !again && !goal && <small>{t(intro)}</small>}
        {why ? <strong className="move-title">{t(why)}</strong> : <strong className="move-title">{title}</strong>}
        {why ? <span className="move-sub">{title}</span> : chunk && <small className="course-tip">{t(whyKey(chunk))}</small>}
        {chunk?.dance && <DanceStrip at={pos % 4} round={Math.floor(pos / 4) + 1} rounds={chunk.reps} colors={centersOf(states[step])} />}
        {how && <button className="link how-to" onClick={() => setReview(how.slide)}>📖 {t('courseHowTo', { name: t(how.name) })}</button>}
      </Bubble>
      <button className="btn primary big" onClick={() => goTo(step + 1)}>{t('guideNext')} ▶</button>
      <div className="row">
        <button className="btn small" disabled={step === 0} onClick={() => goTo(step - 1)}>◀ {t('guidePrev')}</button>
        <button className="btn small" onClick={() => goTo(step)}>↻ {t('guideReplay')}</button>
      </div>
    </>
  );
}
