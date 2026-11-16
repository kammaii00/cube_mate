// 배우면서 맞추기 화면: 단계마다 방법을 먼저 배우고, 조각 하나씩 "왜 이렇게 돌리는지"와 함께 맞춘다
import { useMemo, useState } from 'react';
import { FACE_COLORS, type Face } from '../../core/faces';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { STAGE_COUNT } from '../../solver/beginner/lesson';
import type { Solution } from '../../solver/solverClient';
import { LearnPanel } from './LearnPanels';
import { buildFrames, stagePicture } from './frames';

interface Props {
  solution: Solution;
  onDone: () => void;
  onBack: () => void;
}

// 장면을 한 장씩 넘기며 수업을 진행한다
export function LearnScreen({ solution, onDone, onBack }: Props) {
  const { t } = useI18n();
  const frames = useMemo(() => buildFrames(solution.start, solution.missions ?? []), [solution]);
  const [index, setIndex] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [showFormula, setShowFormula] = useState(false);
  const frame = frames[index];

  // 주어진 장면으로 간다
  function show(next: number) {
    setIndex(next);
    setPlayId((id) => id + 1);
    setShowFormula(false);
  }

  // 다음(step=1) 또는 이전(step=-1) 장면으로 간다. "혼자 했어요" 확인 장면은 건너뛴다.
  function move(step: 1 | -1) {
    let next = index + step;
    while (frames[next]?.type === 'tryCheck') next += step;
    if (next >= frames.length) onDone();
    else show(Math.max(0, next));
  }

  // 그림 장면(단계 소개·완성)과 조각 찾기 장면은 밝게 보여줄 칸이 있다
  const picture =
    frame.type === 'stageIntro' || frame.type === 'stageDone' ? stagePicture(frame.stage, frame.state)
    : { state: frame.state, highlight: frame.type === 'mission' ? frame.mission!.piece : null, flipped: false };
  const marks = frame.type === 'mission' ? { piece: frame.mission!.piece, slot: frame.mission!.slot } : null;
  const caption =
    frame.type === 'stageIntro' ? t(picture.flipped ? 'stageFlipped' : 'stageGoalPic')
    : frame.type === 'stageDone' && picture.flipped ? t('stageFlipped')
    : null;
  const title = frame.type === 'hold'
    ? t('learnHoldTitle')
    : `${t('stageLabel', { i: frame.stage + 1 })} · ${t(`stage${frame.stage + 1}Title` as MessageKey)}`;
  const missionTag = frame.mission && frame.stage <= 3 && frame.type !== 'mission';

  return (
    <main className={'screen guide learn ' + frame.type}>
      <header className="topbar">
        <button className="link" onClick={onBack}>‹ {t('back')}</button>
        <h2>{title}</h2>
        <span />
      </header>
      <div className="stage-dots" aria-hidden>
        {Array.from({ length: STAGE_COUNT }, (_, i) => (
          <i key={i} className={frame.type === 'hold' || i > frame.stage ? '' : i < frame.stage ? 'past' : 'now'} />
        ))}
      </div>

      <div className="cube-stage">
        <Cube3D
          state={picture.state}
          move={frame.type === 'move' ? frame.move : null}
          highlight={picture.highlight}
          marks={marks}
          playId={playId}
        />
        {caption && <div className="cube-caption">{caption}</div>}
        {missionTag && (
          <div className="mission-tag">
            {frame.mission!.piece.map((cell) => (
              <i key={cell} style={{ background: FACE_COLORS[frames[missionStart(frames, index)].state[cell] as Face] }} />
            ))}
            {t(`mission${frame.stage + 1}Count` as MessageKey, { i: frame.missionNo!, n: frame.missionTotal! })}
          </div>
        )}
      </div>

      <LearnPanel
        frame={frame}
        total={solution.moves.length}
        showFormula={showFormula}
        onNext={() => move(1)}
        onPrev={() => move(-1)}
        onReplay={() => setPlayId((id) => id + 1)}
        onJump={show}
        onShowFormula={() => setShowFormula(true)}
      />
      {frame.type === 'move' && <p className="hint">{t('learnKeep')}</p>}
      {frame.type === 'mission' && <p className="hint">{t('dragHint')}</p>}
    </main>
  );
}

// 지금 장면이 속한 미션의 "조각 찾기" 장면 번호를 구한다 (조각 색을 그 시점의 상태에서 읽기 위해)
function missionStart(frames: ReturnType<typeof buildFrames>, index: number): number {
  let i = index;
  while (i > 0 && !(frames[i].type === 'mission' && frames[i].mission === frames[index].mission)) i--;
  return i;
}
