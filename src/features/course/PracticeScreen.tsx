// 진짜 섞은 큐브 연습(흰 꽃·흰 십자·1층): 마구 섞기 → 혼자 하기(시범 보기·큐비한테 보여 주고 한 조각 같이 하기) → 한 면 확인 → (옆 색 확인)
import { useEffect, useMemo, useState } from 'react';
import { SOLVED, emptyState } from '../../core/faces';
import { applyMoves, flipUpsideDown, parseAlg } from '../../core/moves';
import { checkCenter, checkFace, remainingPieces, type GuideStep } from '../../course/practice';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { solveLearn } from '../../solver/solverClient';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { stagePicture } from '../learn/frames';
import { EditScreen } from '../edit/EditScreen';
import { ScanScreen } from '../scan/ScanScreen';
import { FaceCheck } from './FaceCheck';
import { MovePlayer } from './MovePlayer';
import { PieceIntro, type SlideId } from './PieceIntro';

/** 노란색이 위인 다 맞춘 큐브 (잡는 법 그림) */
const YELLOW_UP = flipUpsideDown(SOLVED);
/** 흰 꽃 그림: 노란 위 큐브에서 앞·뒤·오른쪽·왼쪽을 두 번씩 돌리면 흰 십자가 위로 올라와 꽃이 된다 */
const DAISY = applyMoves(YELLOW_UP, parseAlg('F2 R2 B2 L2'));

interface Props {
  /** 섬 번호 (제목·문구용) */
  island: number;
  /** 초보자 풀이 단계 (0 흰 꽃, 1 흰 십자, 2 1층) */
  stage: number;
  /** 혼자 해 보기 레벨이면 true (큐비한테 보여 주기를 쓰면 성공 횟수에 안 들어간다고 알려 준다) */
  alone: boolean;
  /** 막혔을 때 다시 볼 소개 장들 (흰 꽃: 꽃잎 올리는 법 3가지). 없으면 다시 보기 버튼이 없다 */
  review?: SlideId[];
  onWin: (helped: boolean) => void;
  onBack: () => void;
}

type Phase = 'mix' | 'work' | 'review' | 'scan' | 'paint' | 'thinking' | 'guide' | 'between' | 'face' | 'sides';

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
  const goal = useMemo(() => goalPicture(stage), [stage]);

  // 단계가 바뀔 때 할 말
  useEffect(() => {
    if (phase === 'mix') say(['practiceMix', 'practiceHold']);
    else if (phase === 'work') say(note ? [note.key] : [`practiceGoal${island}`, `practiceTip${island}`]);
    else if (phase === 'sides') say('practiceSides');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 큐비한테 보여 줬을 때: 지금 모습에서 다음 조각 하나를 같이 한다 (이미 다 됐으면 확인으로)
  async function scanned(state: string) {
    setPhase('thinking');
    const solution = await solveLearn(state).catch(() => null);
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
    setPhase('guide');
  }

  // 조각 하나를 같이 다 했을 때: 마지막 조각이었으면 바로 완성, 남았으면 다음 조각도 같이 할지 고르게 한다
  function guided() {
    if (index + 1 >= pieces.length) return onWin(true);
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

  if (phase === 'scan') return <ScanScreen onComplete={scanned} onManual={() => setPhase('paint')} onBack={() => setPhase('work')} />;
  // 직접 칠하기: 큐브 색을 다 칠하면 카메라로 보여 준 것과 똑같이 다음 조각 하나를 같이 한다
  if (phase === 'paint') return <EditScreen initialState={emptyState()} source="manual" onSolved={() => undefined} onReady={scanned} onBack={() => setPhase('work')} />;

  const title = t(`island${island}Name` as MessageKey);
  return (
    <main className="screen guide course">
      <header className="topbar">
        <button className="link" onClick={phase === 'mix' || phase === 'work' ? onBack : () => setPhase('work')}>‹ {t('back')}</button>
        <h2>{title}</h2>
        <span />
      </header>
      {phase === 'mix' && (
        <>
          <div className="cube-stage"><Cube3D state={YELLOW_UP} highlight={[4, 22]} glow /></div>
          <Bubble>
            <strong className="move-title">{t('practiceMix')}</strong>
            <small>{t('practiceHold')}</small>
            {alone && <small className="course-tip">{t('courseAloneNote')}</small>}
          </Bubble>
          <button className="btn primary big" onClick={() => setPhase('work')}>{t('practiceMixed')}</button>
        </>
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
      {phase === 'guide' && pieces[index] && (
        <MovePlayer
          key={index}
          start={pieces[index].start}
          moves={pieces[index].moves}
          chunks={pieces[index].chunks}
          intro="practiceGuideIntro"
          stepLabel="courseGuideStep"
          onDone={guided}
        />
      )}
      {phase === 'between' && pieces[index + 1] && (
        <>
          <div className="cube-stage"><Cube3D state={pieces[index + 1].start} /></div>
          <Bubble tone="good"><strong className="move-title">{t('practiceLeft', { n: pieces.length - index - 1 })}</strong></Bubble>
          <button className="btn primary big" onClick={nextTogether}>{t('practiceNextTogether')}</button>
          <button
            className="btn big"
            onClick={() => {
              setNote({ key: 'practiceNowTry' });
              setPhase('work');
            }}
          >
            {t('practiceTryAlone')}
          </button>
        </>
      )}
      {phase === 'face' && <FaceCheck center={checkCenter(stage)} onCells={checked} onCancel={() => setPhase('work')} />}
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
