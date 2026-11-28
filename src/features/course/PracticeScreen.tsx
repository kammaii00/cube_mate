// 진짜 섞은 큐브 연습(흰 꽃·흰 십자·1층): 마구 섞기 → 같이 해 보기면 (앞 섬 단계는 먼저 혼자 만들고) 큐비한테 보여 주고
// 조각마다 같이, 혼자 해 보기면 혼자 하기(막히면 보여 주고 한 조각 같이 하기) → 한 면 확인 → (옆 색 확인)
import { useEffect, useMemo, useState } from 'react';
import { SOLVED, emptyState } from '../../core/faces';
import { applyMoves, flipUpsideDown, parseAlg } from '../../core/moves';
import { betweenView, checkCenter, checkFace, remainingPieces, sameStage, type GuideStep } from '../../course/practice';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { solveLearn } from '../../solver/solverClient';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { stagePicture } from '../learn/frames';
import { EditScreen } from '../edit/EditScreen';
import { ScanScreen } from '../scan/ScanScreen';
import { FaceCheck } from './FaceCheck';
import { IslandTitle } from './IslandTitle';
import { goalCard } from './guideText';
import { MovePlayer } from './MovePlayer';
import { PieceIntro, type SlideId } from './PieceIntro';
import { BeforeCard, NotYetCard, StageDoneCard } from './StageCards';

/** 노란색이 위인 다 맞춘 큐브 (잡는 법 그림) */
const YELLOW_UP = flipUpsideDown(SOLVED);
/** 흰 꽃 그림: 노란 위 큐브에서 앞·뒤·오른쪽·왼쪽을 두 번씩 돌리면 흰 십자가 위로 올라와 꽃이 된다 */
const DAISY = applyMoves(YELLOW_UP, parseAlg('F2 R2 B2 L2'));

interface Props {
  /** 섬 번호 (제목·문구용) */
  island: number;
  /** 초보자 풀이 단계 (0 흰 꽃, 1 흰 십자, 2 1층) */
  stage: number;
  /** 혼자 해 보기 레벨이면 true. false(같이 해 보기)면 섞은 뒤 바로 보여 주고 조각마다 큐비가 이끈다 */
  alone: boolean;
  /** 막혔을 때 다시 볼 소개 장들 (흰 꽃: 꽃잎 올리는 법 3가지). 없으면 다시 보기 버튼이 없다 */
  review?: SlideId[];
  onWin: (helped: boolean) => void;
  onBack: () => void;
}

type Phase = 'mix' | 'before' | 'notYet' | 'stageGo' | 'work' | 'review' | 'scan' | 'paint' | 'thinking' | 'hold' | 'guide' | 'between' | 'face' | 'sides';
/** 같이 해 보기에서 보여 주는 까닭: 앞 단계를 혼자 다 만들었는지 확인(check), 앞 단계부터 같이 만들기(help) */
type Ask = 'check' | 'help' | null;

// 목표 그림: 흰 꽃은 꽃 모양, 십자·1층은 뒤집어 아래쪽(흰 면)을 본 모습
function goalPicture(stage: number) {
  if (stage === 0) return { state: DAISY, highlight: [1, 3, 4, 5, 7, 13, 22], flipped: false };
  return stagePicture(stage, YELLOW_UP);
}

// 연습 한 번을 처음부터 끝까지 진행한다
export function PracticeScreen({ island, stage, alone, review, onWin, onBack }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [phase, setPhase] = useState<Phase>('mix');
  const [helped, setHelped] = useState(false);
  const [note, setNote] = useState<{ key: MessageKey; params?: Record<string, number> } | null>(null);
  /** 보여 준 큐브에서 남은 조각들과, 지금 같이 하는 조각 번호 */
  const [pieces, setPieces] = useState<GuideStep[]>([]);
  const [index, setIndex] = useState(0);
  const [ask, setAsk] = useState<Ask>(null);
  /** 마지막으로 보여 준 큐브 모습 (아직이라고 했을 때 다시 찍지 않고 같이 만들려고) */
  const [shown, setShown] = useState('');
  /** 방금 끝난 단계와, 축하한 뒤 갈 곳 (다시 잡기 또는 바로 다음 조각) */
  const [stageDone, setStageDone] = useState<{ done: number; next: 'hold' | 'guide' } | null>(null);
  const goal = useMemo(() => goalPicture(stage), [stage]);
  const prev = useMemo(() => goalPicture(Math.max(stage - 1, 0)), [stage]);
  /** 같이 해 보기에서 혼자 만들 앞 단계가 있는지 (흰 십자·1층 섬) */
  const first = !alone && stage > 0;
  /** 큐비한테 보여 주기에서 돌아갈 곳 */
  const retry: Phase = alone ? 'work' : first ? 'before' : 'mix';

  // 단계가 바뀔 때 할 말
  useEffect(() => {
    if (phase === 'mix') say(['practiceMix', 'practiceHold', ...(alone || first ? [] : ['courseTogetherNote' as const])]);
    else if (phase === 'before') say([`practiceBefore${stage}`, 'practiceBeforeNote']);
    else if (phase === 'notYet') say(`practiceNotYet${stage}`);
    else if (phase === 'stageGo' && stageDone) say(`practiceStageDone${stageDone.done}`);
    else if (phase === 'work') say(note ? [note.key] : [`practiceGoal${island}`, `practiceTip${island}`]);
    else if (phase === 'sides') say('practiceSides');
    else if (phase === 'hold') say('practiceRehold');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 같이 해 보기에서 앞 단계를 다 만들었다고(check) 또는 같이 만들자고(help) 하고 큐비한테 보여 주러 간다
  function show(why: Ask) {
    setAsk(why);
    setPhase('scan');
  }

  // 큐비한테 보여 줬을 때: 지금 모습에서 남은 조각들을 같이 한다 (이미 다 됐으면 확인으로).
  // 앞 단계를 다 만들었다고 했으면 정말 됐는지 보고, 됐으면 축하한 뒤 이번 단계만 같이 한다
  async function scanned(state: string, why: Ask = ask) {
    setShown(state);
    setPhase('thinking');
    // 흰 꽃은 꽃을 꼭 완성한다 (흰 꽃 섬, 흰 십자 섬에서 흰 꽃부터 같이 만들 때)
    const fullDaisy = stage === 0 || (stage === 1 && why === 'help');
    const solution = await solveLearn(state, { oneDance: true, fullDaisy }).catch(() => null);
    if (!solution) {
      setNote({ key: 'practiceScanFail' });
      return setPhase('work');
    }
    const left = remainingPieces(solution, stage);
    if (!left.length) {
      setNote({ key: 'practiceAlready' });
      return setPhase('face');
    }
    setHelped(true);
    setPieces(left);
    setIndex(0);
    if (why !== 'check') return setPhase('hold');
    if (left[0].stage < stage) return setPhase('notYet');
    finishStage(stage - 1, 'hold');
  }

  // 한 단계를 끝냈을 때: "흰 꽃 완성! 이제 …" 하고 축하한 뒤 다음 단계로 간다
  function finishStage(done: number, next: 'hold' | 'guide') {
    setStageDone({ done, next });
    setPhase('stageGo');
  }

  // 조각 하나를 같이 다 했을 때: 마지막 조각이었으면 바로 완성, 단계가 끝났으면 축하, 남았으면 다음 조각도 같이 할지 고르게 한다
  function guided() {
    const next = pieces[index + 1];
    if (!next) return onWin(true);
    if (next.stage !== pieces[index].stage) return finishStage(pieces[index].stage, 'guide');
    say('practiceLeft');
    setPhase('between');
  }

  // 다음 조각도 같이 한다 (다시 찍지 않고 이어서)
  function nextTogether() {
    setIndex(index + 1);
    setPhase('guide');
  }

  // 한 면을 보여 줬을 때: 다 됐으면 (십자·1층은 옆 색 확인 뒤) 성공, 아니면 몇 개 됐는지 알려 준다
  function checked(cells: string) {
    const result = checkFace(stage, cells);
    if (!result.ok) {
      setNote({ key: 'practiceCount', params: { n: result.count, total: result.total } });
      return setPhase('work');
    }
    if (stage === 0) onWin(helped);
    else setPhase('sides');
  }

  if (phase === 'scan') return <ScanScreen onComplete={(state) => scanned(state)} onManual={() => setPhase('paint')} onBack={() => setPhase(retry)} />;
  // 직접 칠하기: 큐브 색을 다 칠하면 카메라로 보여 준 것과 똑같이 다음 조각 하나를 같이 한다
  if (phase === 'paint') return <EditScreen initialState={emptyState()} source="manual" onSolved={() => undefined} onReady={(state) => scanned(state)} onBack={() => setPhase(retry)} />;

  return (
    <main className="screen guide course">
      <header className="topbar">
        <button className="link" onClick={phase === 'mix' || phase === 'work' ? onBack : () => setPhase(phase === 'before' ? 'mix' : retry)}>‹ {t('back')}</button>
        <IslandTitle island={island} />
        <span />
      </header>
      {phase === 'mix' && (
        <>
          <div className="cube-stage"><Cube3D state={YELLOW_UP} highlight={[4, 22]} glow /></div>
          <Bubble>
            <strong className="move-title">{t('practiceMix')}</strong>
            <small>{t('practiceHold')}</small>
            {!first && <small className="course-tip">{t(alone ? 'courseAloneNote' : 'courseTogetherNote')}</small>}
          </Bubble>
          <button className="btn primary big" onClick={() => setPhase(alone ? 'work' : first ? 'before' : 'scan')}>{t('practiceMixed')}</button>
        </>
      )}
      {phase === 'before' && <BeforeCard stage={stage} picture={prev} onMade={() => show('check')} onHelp={() => show('help')} />}
      {phase === 'notYet' && <NotYetCard stage={stage} picture={prev} onRetry={() => setPhase('before')} onHelp={() => scanned(shown, 'help')} />}
      {phase === 'stageGo' && stageDone && (
        <StageDoneCard done={stageDone.done} picture={goalPicture(stageDone.done)} onNext={() => (stageDone.next === 'hold' ? setPhase('hold') : nextTogether())} />
      )}
      {phase === 'work' && (
        <>
          <div className="cube-stage">
            <Cube3D state={goal.state} highlight={goal.highlight} />
            <div className="cube-caption">{t(goal.flipped ? 'stageFlipped' : 'stageGoalPic')}</div>
          </div>
          <Bubble tone={note?.key === 'practiceCount' || note?.key === 'practiceSidesFix' ? 'warn' : 'normal'}>
            {note && <strong className="move-title">{t(note.key, note.params)}</strong>}
            <small>{t(`practiceGoal${island}` as MessageKey)}</small>
            <small className="course-tip">{t(`practiceTip${island}` as MessageKey)}</small>
          </Bubble>
          <button className="btn primary big" onClick={() => setPhase('face')}>{t('practiceDone')}</button>
          <div className={review ? 'row' : ''}>
            {review && <button className="btn small" onClick={() => setPhase('review')}>{t('practiceReview')}</button>}
            <button className="btn small" onClick={() => setPhase('scan')}>{t('practiceAsk')}</button>
          </div>
          <p className="hint">{t('practiceAskNote')}</p>
        </>
      )}
      {phase === 'thinking' && <Bubble>{t('practiceThinking')}</Bubble>}
      {phase === 'review' && review && <PieceIntro slides={review} onDone={() => setPhase('work')} doneLabel="practiceReviewOk" />}
      {phase === 'hold' && (
        <>
          <div className="cube-stage"><Cube3D state={YELLOW_UP} highlight={[4, 22]} glow /></div>
          <Bubble><strong className="move-title">{t('practiceRehold')}</strong></Bubble>
          <button className="btn primary big" onClick={() => setPhase('guide')}>{t('practiceHeld')}</button>
        </>
      )}
      {phase === 'guide' && pieces[index] && (
        <MovePlayer
          key={index}
          start={pieces[index].start}
          moves={pieces[index].moves}
          chunks={pieces[index].chunks}
          goal={goalCard(pieces[index])}
          intro="practiceGuideIntro"
          stepLabel="courseGuideStep"
          onDone={guided}
        />
      )}
      {phase === 'between' && pieces[index + 1] && (
        <>
          <div className="cube-stage"><Cube3D state={pieces[index + 1].start} {...betweenView(pieces, index + 1)} glow /></div>
          <Bubble tone="good"><strong className="move-title">{t('practiceLeft', { n: sameStage(pieces, index + 1).length })}</strong></Bubble>
          <button className="btn primary big" onClick={nextTogether}>{t('practiceNextTogether')}</button>
          {alone && (
            <button
              className="btn big"
              onClick={() => {
                setNote({ key: 'practiceNowTry' });
                setPhase('work');
              }}
            >
              {t('practiceTryAlone')}
            </button>
          )}
        </>
      )}
      {phase === 'face' && <FaceCheck center={checkCenter(stage)} stage={stage} onCells={checked} onCancel={() => setPhase('work')} />}
      {phase === 'sides' && (
        <>
          <div className="cube-stage">
            <Cube3D state={goal.state} highlight={goal.highlight} glow />
            <div className="cube-caption">{t('stageFlipped')}</div>
          </div>
          <Bubble><strong className="move-title">{t('practiceSides')}</strong></Bubble>
          <div className="row">
            <button className="btn big" onClick={() => onWin(helped)}>⭕ {t('checkYes')}</button>
            <button
              className="btn big"
              onClick={() => {
                setNote({ key: 'practiceSidesFix' });
                setPhase('work');
              }}
            >
              ❌ {t('checkNo')}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
