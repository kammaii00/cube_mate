// 흰 꽃 섬 화면 연습 하나: 화면 속 큐브를 돌리기 버튼으로 돌려 반짝이는 꽃잎을 노란 가운데 옆으로 올린다
import { useEffect, useState } from 'react';
import type { Face } from '../../core/faces';
import { applyMove, invertMove, type Move } from '../../core/moves';
import { isDaisy, makePetal, nextPetalMove, stepsToDaisy, type PetalKind } from '../../course/petal';
import { followCells } from '../../course/pieces';
import { WINS_PER_LEVEL } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { MoveIcon } from '../../widgets/MoveIcon';

/** 화면 회전 한 번 시간, 맞힌 뒤 다음으로 넘어가기 전 시간(ms) */
const TURN_MS = 650;
const NEXT_MS = 1300;
/** 이만큼 멀어지는 쪽으로 돌리면 눌러야 할 버튼을 반짝여 알려 준다 */
const HINT_AFTER = 2;

const TIP: Record<PetalKind, MessageKey> = { side: 'petalTipSide', bottom: 'petalTipBottom', busy: 'petalTipBusy' };

interface Props {
  kind: PetalKind;
  /** 올렸을 때 (firstTry: 멀어지는 쪽으로 한 번도 안 돌렸는지) */
  onAnswer: (firstTry: boolean) => void;
  /** 소개 다시 보기 */
  onIntro: () => void;
  /** 진행 점에 채울 수 (이 레벨에서 맞힌 횟수, 복습이면 이번 판에서 맞힌 수) */
  wins: number;
  /** 복습 중이면 true (멀어진 적이 있어도 진행 점을 채운다) */
  review?: boolean;
}

// 문제를 보여 주고 돌리기 버튼·되돌리기·처음부터를 받는다
export function PetalScreen({ kind, onAnswer, onIntro, wins, review = false }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [puzzle] = useState(() => makePetal(kind));
  /** 지금 모습, 반짝이는 꽃잎 칸, 돌리는 중인 회전, 지금까지 돌린 것들 */
  const [cube, setCube] = useState({ state: puzzle.state, cells: puzzle.cells, move: null as Move | null, id: 0, history: [] as Move[], undoing: false });
  const [away, setAway] = useState(0);
  const [note, setNote] = useState<MessageKey | null>(null);
  const [done, setDone] = useState(false);
  const [view, setView] = useState<{ kind: 'side' | 'flip' | 'reset'; id: number } | null>(null);
  const busy = !!cube.move || done;

  // 문제가 나오면 무엇을 할지 말해 준다
  useEffect(() => {
    say(['petalAsk', TIP[kind]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 버튼 하나를 돌린다 (undo면 기록에서 빼고, 아니면 기록에 더한다)
  function turn(move: Move, undo = false) {
    if (busy) return;
    setCube((c) => ({ ...c, move, id: c.id + 1, undoing: undo, history: undo ? c.history.slice(0, -1) : [...c.history, move] }));
  }

  // 회전이 끝나면: 다 됐는지, 꽃잎이 가까워졌는지 멀어졌는지 알려 준다
  function turned() {
    if (!cube.move) return;
    const before = stepsToDaisy(cube.state, puzzle.moves);
    const state = applyMove(cube.state, cube.move);
    setCube((c) => ({ ...c, state, cells: followCells(c.cells, c.move!), move: null }));
    if (isDaisy(state)) return right();
    const after = stepsToDaisy(state, puzzle.moves);
    if (after === Infinity) return showNote('petalReset');
    if (after >= before && !cube.undoing) {
      setAway((n) => n + 1);
      return showNote('petalAway');
    }
    setNote(null);
  }

  // 큐비가 한마디 하고 말풍선에 남긴다
  function showNote(key: MessageKey) {
    setNote(key);
    say(key);
  }

  // 올렸을 때: 칭찬하고 잠깐 뒤 결과를 알린다
  function right() {
    setDone(true);
    setNote(null);
    say('petalRight');
    setTimeout(() => onAnswer(away === 0), NEXT_MS);
  }

  // 처음 문제 모습으로 돌아간다
  function restart() {
    if (busy) return;
    setCube((c) => ({ state: puzzle.state, cells: puzzle.cells, move: null, id: c.id + 1, history: [], undoing: false }));
    setNote(null);
  }

  const last = cube.history[cube.history.length - 1];
  const hint = !done && !cube.move && away >= HINT_AFTER ? nextPetalMove(cube.state, puzzle.moves) : null;
  const centers = { U: cube.state[4], F: cube.state[22], R: cube.state[13] } as { U: Face; F: Face; R: Face };
  const filled = wins + (done && (review || away === 0) ? 1 : 0);
  const turnView = (k: 'side' | 'flip' | 'reset') => setView((v) => ({ kind: k, id: (v?.id ?? 0) + 1 }));
  return (
    <>
      <div className="quiz-progress" aria-label={`${filled}/${WINS_PER_LEVEL}`}>
        {Array.from({ length: WINS_PER_LEVEL }, (_, k) => <i key={k} className={k < filled ? 'on' : ''} />)}
      </div>
      <div className="cube-stage petal-stage">
        <Cube3D state={cube.state} move={cube.move} playId={cube.id} duration={TURN_MS} highlight={cube.cells} glow={!cube.move} dim={false} sticky view={view} onAnimationEnd={turned} />
      </div>
      <div className="view-buttons">
        <button className="btn small" onClick={() => turnView('side')}>⟲ {t('quizView')}</button>
        <button className="btn small" onClick={() => turnView('flip')}>↕ {t('quizFlip')}</button>
        <button className="btn small" onClick={() => turnView('reset')}>{t('quizReset')}</button>
      </div>
      <Bubble tone={done ? 'good' : note ? 'warn' : 'normal'}>
        <strong className="move-title">{t(done ? 'petalRight' : note ?? 'petalAsk')}</strong>
        {!done && <small className="course-tip">{t(TIP[kind])}</small>}
      </Bubble>
      <div className={`move-grid n${puzzle.moves.length}`}>
        {puzzle.moves.map((m) => (
          <button key={m} className={`move-btn${hint === m ? ' hint' : ''}`} disabled={busy} onClick={() => turn(m)} aria-label={m}>
            <MoveIcon move={m} colors={centers} size={50} />
            <small>{t(`moveName_${m[0]}${m.endsWith("'") ? 'i' : ''}` as MessageKey)}</small>
          </button>
        ))}
      </div>
      <div className="view-buttons">
        <button className={`btn small${note === 'petalAway' ? ' pulse' : ''}`} disabled={busy || !last} onClick={() => last && turn(invertMove(last), true)}>↶ {t('petalUndo')}</button>
        <button className="btn small" disabled={busy} onClick={restart}>{t('petalRestart')}</button>
        <button className="btn small" onClick={onIntro}>❓ {t('petalIntro')}</button>
      </div>
    </>
  );
}
