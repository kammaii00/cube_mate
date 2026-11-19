// 색 확인·수정 화면: 한 면씩 크게 보며 색을 칠하거나 고치고, 검증 후 풀이를 시작한다
import { useEffect, useMemo, useState } from 'react';
import { FACES, FACE_COLORS, SOLVED, emptyState, type Face } from '../../core/faces';
import { randomState } from '../../core/scramble';
import { validate, type ValidationError } from '../../core/validate';
import { useI18n, type MessageKey, type Translate } from '../../i18n';
import { solveFast, solveLearn, type Solution } from '../../solver/solverClient';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { FaceEditor, NEIGHBORS } from './FaceEditor';
import { MiniNet } from './MiniNet';

/** 면을 넘겨 보는 순서 (큐브를 옆으로 돌려 가며 네 면, 그다음 위·아래) */
const FACE_ORDER: Face[] = ['F', 'R', 'B', 'L', 'U', 'D'];

interface Props {
  initialState: string;
  /** 어떻게 들어왔는지: 직접 칠하기 / 스캔 성공 / 스캔했지만 일부가 불확실 */
  source: 'manual' | 'scan' | 'scanUnsure';
  /** 풀이 결과와, 풀이에 사용한 (수정이 반영된) 큐브 상태를 넘긴다 */
  onSolved: (solution: Solution, state: string) => void;
  onBack: () => void;
}

// 검증 오류 하나를 사용자에게 보여줄 문장으로 바꾼다
function errorText(error: ValidationError, t: Translate): string {
  switch (error.code) {
    case 'incomplete':
      return t('errIncomplete', { n: error.facelets.length });
    case 'center':
      return t('errCenter');
    case 'count': {
      const detail = FACES.filter((f) => error.counts![f] !== 9)
        .map((f) => `${t(('color' + f) as MessageKey)} ${error.counts![f]}`)
        .join(', ');
      return t('errCount', { detail });
    }
    case 'badPiece':
      return t('errBadPiece');
    case 'dupPiece':
      return t('errDupPiece');
    case 'flip':
      return t('errFlip');
    case 'twist':
      return t('errTwist');
    default:
      return t('errParity');
  }
}

// 큰 면 편집기, 색 팔레트, 작은 전개도, 검증 메시지, 풀이 시작 버튼을 그린다
export function EditScreen({ initialState, source, onSolved, onBack }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState(initialState);
  const [face, setFace] = useState<Face>('F');
  const [selected, setSelected] = useState<Face>('U');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [message, setMessage] = useState('');
  const [solving, setSolving] = useState(false);
  const say = useSay();

  // 들어오면 "색이 다 맞으면 시작해 줘!" (스캔 끝 음성이 나오는 중이면 그 뒤에 이어서)
  useEffect(() => say('editGo', { enqueue: true }), [say]);

  const counts = useMemo(
    () => Object.fromEntries(FACES.map((f) => [f, state.split(f).length - 1])) as Record<Face, number>,
    [state],
  );
  // 빈 칸은 눈에 이미 보이므로 따로 강조하지 않는다
  const marked = errors.filter((e) => e.code !== 'incomplete').flatMap((e) => e.facelets);
  const colorName = (f: Face) => t(('color' + f) as MessageKey);
  const hintKey = source === 'manual' ? 'editHintManual' : source === 'scan' ? 'editHintScan' : 'editHintUnsure';

  // 상태를 바꾸고 이전 오류 표시를 지운다
  function update(next: string) {
    setState(next);
    setErrors([]);
    setMessage('');
  }

  // 누른 칸을 선택된 색으로 칠한다
  function paint(index: number) {
    update(state.slice(0, index) + selected + state.slice(index + 1));
  }

  // 이전(-1) 또는 다음(+1) 면으로 넘긴다
  function stepFace(direction: number) {
    setFace(FACE_ORDER[(FACE_ORDER.indexOf(face) + direction + 6) % 6]);
  }

  // 입력을 검증하고, 문제가 없으면 풀이를 계산해 다음 화면으로 넘긴다
  async function startSolve(learn: boolean) {
    const found = validate(state);
    setErrors(found);
    if (found.length) {
      say(found.every((e) => e.code === 'incomplete') ? 'errIncomplete' : 'errAny');
      const first = found.flatMap((e) => e.facelets)[0];
      if (first !== undefined) setFace(FACES[Math.floor(first / 9)]);
      return;
    }
    if (state === SOLVED) {
      setMessage(t('alreadySolved'));
      say('alreadySolved');
      return;
    }
    setSolving(true);
    try {
      onSolved(await (learn ? solveLearn(state) : solveFast(state)), state);
    } catch {
      setMessage(t('errSolver'));
      say('errAny');
      setSolving(false);
    }
  }

  return (
    <main className="screen edit">
      <header className="topbar">
        <button className="link" onClick={onBack}>‹ {t('back')}</button>
        <h2>{t('editTitle')}</h2>
        <span />
      </header>
      <Bubble tone={source === 'scanUnsure' ? 'warn' : 'normal'}>{t(hintKey)}</Bubble>

      <div className="face-nav">
        <button className="round" onClick={() => stepFace(-1)} aria-label={t('editPrevFace')}>‹</button>
        <div>
          <strong>
            <i style={{ background: FACE_COLORS[face] }} />
            {t('editFace', { color: colorName(face) })}
            <small>{FACE_ORDER.indexOf(face) + 1} / 6</small>
          </strong>
          <p>{t('editFaceTop', { color: colorName(NEIGHBORS[face].top) })}</p>
        </div>
        <button className="round" onClick={() => stepFace(1)} aria-label={t('editNextFace')}>›</button>
      </div>

      <FaceEditor state={state} face={face} marked={marked} onPaint={paint} />

      <div className="palette">
        {FACES.map((f) => (
          <button
            key={f}
            className={'swatch' + (selected === f ? ' selected' : '')}
            style={{ background: FACE_COLORS[f] }}
            onClick={() => setSelected(f)}
            aria-label={colorName(f)}
          >
            <b className={counts[f] === 9 ? 'ok' : ''}>{counts[f]}</b>
          </button>
        ))}
      </div>

      <MiniNet state={state} selected={face} marked={marked} onSelect={setFace} />

      {(errors.length > 0 || message) && (
        <div className="notice" role="alert">
          {errors.map((e) => <p key={e.code}>{errorText(e, t)}</p>)}
          {message && <p>{message}</p>}
        </div>
      )}

      <div className="row">
        <button className="btn small" onClick={() => update(randomState())}>🎲 {t('editRandom')}</button>
        <button className="btn small" onClick={() => update(emptyState())}>{t('editClear')}</button>
      </div>
      <button className="btn primary" disabled={solving} onClick={() => startSolve(false)}>
        {solving ? t('editSolving') : (
          <>
            {t('editSolveFast')}
            <small className="btn-sub">{t('editSolveFastFor')}</small>
          </>
        )}
      </button>
      <button className="btn sky" disabled={solving} onClick={() => startSolve(true)}>
        {t('editSolveLearn')}
        <small className="btn-sub">{t('editSolveLearnFor')}</small>
      </button>
    </main>
  );
}
