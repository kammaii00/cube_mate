// 화면 연습 하나: 화면 속 큐브를 돌리기 버튼(또는 오른손 춤)으로 돌려 반짝이는 조각을 제자리로 보낸다 (흰 꽃·흰 십자·1층)
import { useEffect, useState } from 'react';
import type { Face } from '../../core/faces';
import { applyMove, type Move } from '../../core/moves';
import { makePuzzle } from '../../course/makePuzzle';
import { followCells } from '../../course/pieces';
import { DANCE, buttonMoves, nextButton, type PuzzleButton, type PuzzleKind } from '../../course/puzzle';
import { WINS_PER_LEVEL } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { StampRow } from '../../widgets/PraiseStamp';
import { MoveIcon } from '../../widgets/MoveIcon';

/** 화면 회전 한 번 시간, 오른손 춤 안의 회전 한 번 시간, 맞힌 뒤 다음으로 넘어가기 전 시간(ms) */
const TURN_MS = 650;
const DANCE_MS = 420;
const DANCE_LEAD_MS = 150;
const NEXT_MS = 1300;
/** 이만큼 멀어지는 쪽으로 돌리면 눌러야 할 버튼을 반짝여 알려 준다 */
const HINT_AFTER = 2;

/** 섬마다 묻는 말 / 다 했을 때 / 멀어졌을 때 문구 */
const PETAL = { ask: 'petalAsk', right: 'petalRight', away: 'petalAway' } as const;
const CROSS = { ask: 'crossAsk', right: 'crossRight', away: 'petalAway' } as const;
const CORNER = { ask: 'cornerAsk', right: 'cornerRight', away: 'cornerAway' } as const;
const TEXT: Record<PuzzleKind, { ask: MessageKey; right: MessageKey; away: MessageKey; tip: MessageKey }> = {
  side: { ...PETAL, tip: 'petalTipSide' },
  bottom: { ...PETAL, tip: 'petalTipBottom' },
  busy: { ...PETAL, tip: 'petalTipBusy' },
  drop: { ...CROSS, tip: 'crossTipDrop' },
  match: { ...CROSS, tip: 'crossTipMatch' },
  dance1: { ...CORNER, tip: 'cornerTipDance1' },
  danceMore: { ...CORNER, tip: 'cornerTipDanceMore' },
  bring: { ...CORNER, tip: 'cornerTipBring' },
};

interface Props {
  kind: PuzzleKind;
  /** 다 했을 때 (firstTry: 힌트(버튼 반짝임) 없이 해냈는지. 몇 번 틀려도 스스로 고치면 도장) */
  onAnswer: (firstTry: boolean) => void;
  /** 소개 다시 보기 */
  onIntro: () => void;
  /** 진행 점에 채울 수 (이 레벨에서 맞힌 횟수, 복습이면 이번 판에서 맞힌 수) */
  wins: number;
  /** 복습 중이면 true (멀어진 적이 있어도 진행 점을 채운다) */
  review?: boolean;
}

// 버튼 이름 문구 (예: 앞면 ↷, 오른손 춤)
function buttonName(b: PuzzleButton): MessageKey {
  return (b === 'dance' ? 'moveName_dance' : `moveName_${b[0]}${b.endsWith("'") ? 'i' : ''}`) as MessageKey;
}

// 문제를 보여 주고 돌리기 버튼·되돌리기·처음부터를 받는다
export function PuzzleScreen({ kind, onAnswer, onIntro, wins, review = false }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const text = TEXT[kind];
  const [puzzle] = useState(() => makePuzzle(kind));
  /** 지금 모습, 반짝이는 칸, 남은 회전들(맨 앞이 지금 도는 것), 버튼 누르기 전 모습, 지금까지 누른 버튼들 */
  const [cube, setCube] = useState({ state: puzzle.state, cells: puzzle.cells, queue: [] as Move[], from: puzzle.state, id: 0, history: [] as PuzzleButton[], undoing: false, dance: false });
  const [away, setAway] = useState(0);
  const [note, setNote] = useState<'away' | 'reset' | null>(null);
  const [done, setDone] = useState(false);
  const move = cube.queue[0] ?? null;
  const busy = !!move || done;

  // 문제가 나오면 무엇을 할지 말해 준다
  useEffect(() => {
    say([text.ask, text.tip]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 버튼 하나를 누른다 (undo면 기록에서 빼고 거꾸로 돌리고, 아니면 기록에 더한다)
  function tap(button: PuzzleButton, undo = false) {
    if (busy) return;
    const history = undo ? cube.history.slice(0, -1) : [...cube.history, button];
    setCube((c) => ({ ...c, queue: buttonMoves(button, undo), from: c.state, id: c.id + 1, history, undoing: undo, dance: button === 'dance' }));
  }

  // 회전 하나가 끝나면 다음 회전을 튼다. 버튼 하나를 다 돌렸으면: 다 됐는지, 가까워졌는지 멀어졌는지 알려 준다
  function turned() {
    if (!move) return;
    const state = applyMove(cube.state, move);
    const rest = cube.queue.slice(1);
    setCube((c) => ({ ...c, state, cells: followCells(c.cells, move), queue: rest, id: rest.length ? c.id + 1 : c.id }));
    if (rest.length) return;
    if (puzzle.goal(state)) return right();
    const after = puzzle.distance(state);
    if (cube.undoing && after !== Infinity) return setNote(null);
    if (after === Infinity || after >= puzzle.distance(cube.from)) {
      setAway((n) => n + 1);
      return showNote(after === Infinity ? 'reset' : 'away');
    }
    setNote(null);
  }

  // 큐비가 한마디 하고 말풍선에 남긴다
  function showNote(kind: 'away' | 'reset') {
    setNote(kind);
    say(kind === 'away' ? text.away : 'petalReset');
  }

  // 다 했을 때: 칭찬하고 잠깐 뒤 결과를 알린다 (힌트가 나오기 전에 해냈으면 도장)
  function right() {
    setDone(true);
    setNote(null);
    say(text.right);
    setTimeout(() => onAnswer(away < HINT_AFTER), NEXT_MS);
  }

  // 처음 문제 모습으로 돌아간다
  function restart() {
    if (busy) return;
    setCube((c) => ({ ...c, state: puzzle.state, cells: puzzle.cells, queue: [], id: c.id + 1, history: [], undoing: false }));
    setNote(null);
  }

  const last = cube.history[cube.history.length - 1];
  const hint = !done && !move && away >= HINT_AFTER ? nextButton(cube.state, puzzle) : null;
  const centers = { U: cube.state[4], F: cube.state[22], R: cube.state[13] } as { U: Face; F: Face; R: Face };
  const filled = wins + (done && (review || away < HINT_AFTER) ? 1 : 0);
  const title = done ? text.right : note === 'away' ? text.away : note === 'reset' ? 'petalReset' : text.ask;
  return (
    <>
      <div className="quiz-progress" aria-label={`${filled}/${WINS_PER_LEVEL}`}>
        <StampRow count={filled} total={WINS_PER_LEVEL} size={30} fresh={filled > wins ? filled - 1 : -1} />
      </div>
      <div className="cube-stage petal-stage">
        <Cube3D state={cube.state} move={move} playId={cube.id} duration={cube.dance ? DANCE_MS : TURN_MS} lead={cube.dance ? DANCE_LEAD_MS : undefined} highlight={cube.cells} glow={!move} dim={false} sticky onAnimationEnd={turned} />
      </div>
      <Bubble tone={done ? 'good' : note ? 'warn' : 'normal'}>
        <strong className="move-title">{t(title)}</strong>
        {!done && <small className="course-tip">{t(text.tip)}</small>}
      </Bubble>
      <div className={`move-grid n${puzzle.buttons.length}`}>
        {puzzle.buttons.map((b) => (
          <button key={b} className={`move-btn${hint === b ? ' hint' : ''}${b === 'dance' ? ' dance' : ''}`} disabled={busy} onClick={() => tap(b)} aria-label={t(buttonName(b))}>
            {b === 'dance' ? (
              <span className="dance-icons">{DANCE.map((m) => <MoveIcon key={m} move={m} colors={centers} size={34} />)}</span>
            ) : (
              <MoveIcon move={b} colors={centers} size={50} />
            )}
            <small>{t(buttonName(b))}</small>
          </button>
        ))}
      </div>
      <div className="view-buttons">
        <button className={`btn small${note ? ' pulse' : ''}`} disabled={busy || !last} onClick={() => last && tap(last, true)}>↶ {t('petalUndo')}</button>
        <button className={`btn small${note === 'reset' ? ' pulse' : ''}`} disabled={busy} onClick={restart}>{t('petalRestart')}</button>
        <button className="btn small" onClick={onIntro}>❓ {t('petalIntro')}</button>
      </div>
    </>
  );
}
