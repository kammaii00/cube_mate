// "혼자 해보기"에서 틀렸을 때 돌려놓기: 보이는 면의 색을 물어 어디서 틀렸는지 찾고, 돌려놓는 회전을 하나씩 안내한다
import { useEffect, useMemo, useRef, useState } from 'react';
import { FACES, FACE_COLORS, type Face } from '../../core/faces';
import { applyMoves } from '../../core/moves';
import { useI18n, type MessageKey, type Translate } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { FORMULAS, type Chunk } from '../../solver/beginner/lesson';
import { listMistakes, matchMistakes, toStandard, type Mistake } from '../../solver/beginner/mistakes';
import { Bubble } from '../../widgets/Bubble';
import { FaceEditor } from '../edit/FaceEditor';
import { describeMove } from '../guide/moveText';

interface Props {
  /** 묶음을 하기 전과 다 한 뒤의 큐브 상태 */
  pre: string;
  post: string;
  chunk: Chunk;
  /** 돌려놓기가 끝났을 때: 묶음을 다 한 모습(post)인지, 하기 전 모습(pre)인지 알려준다 */
  onResume: (target: 'post' | 'pre') => void;
  onCancel: () => void;
  /** 못 찾았을 때: 지금까지 칠한 면을 넘겨 색 입력 화면에서 나머지를 받는다 */
  onReenter: (state: string) => void;
}

/** 색을 물어보는 면 순서: 윗면 → 앞면 → 오른쪽 면 */
const ASK: Face[] = ['U', 'F', 'R'];
/** 이만큼의 면은 꼭 물어본다 (한 면만으로는 잘못 짚을 수 있어서) */
const MIN_FACES = 2;

type Phase = { name: 'paint'; face: number } | { name: 'found'; mistake: Mistake } | { name: 'fix'; mistake: Mistake; step: number }
  | { name: 'arrived'; target: 'post' | 'pre'; note?: string } | { name: 'lost' };

// 가운데 칸만 채워진 빈 상태를 만든다 (가운데 색은 지금 잡은 방향 그대로)
function blank(post: string): string {
  return [...post].map((c, i) => (i % 9 === 4 ? c : '?')).join('');
}

// 어디서 틀렸는지를 아이에게 말해 줄 문장을 만든다
function explain(mistake: Mistake, chunk: Chunk, t: Translate): string {
  const size = chunk.formula ? FORMULAS[chunk.formula].length : chunk.moves.length;
  const i = (mistake.at % size) + 1;
  const pos = (chunk.reps ?? 1) > 1 ? t('repairPosRep', { r: Math.floor(mistake.at / size) + 1, i }) : t('repairPos', { i });
  const move = chunk.moves[mistake.at] ? describeMove(chunk.moves[mistake.at], t).title : '';
  if (mistake.kind === 'stopped' && mistake.at === 0) return t('repairNotStarted');
  const key = ('repair' + mistake.kind[0].toUpperCase() + mistake.kind.slice(1)) as MessageKey;
  return t(key, { pos, move });
}

// 색 칠하기 → 찾기 → 돌려놓기 → 수업으로 돌아가기를 차례로 진행한다
export function RepairFlow({ pre, post, chunk, onResume, onCancel, onReenter }: Props) {
  const { t } = useI18n();
  const [seen, setSeen] = useState(() => blank(post));
  const [selected, setSelected] = useState<Face>(post[4] as Face);
  const [phase, setPhase] = useState<Phase>({ name: 'paint', face: 0 });
  const [playId, setPlayId] = useState(0);
  const mistakes = useRef<Map<string, Mistake> | null>(null);
  const colorName = (letter: string) => t(('color' + letter) as MessageKey);

  // 실수 목록을 구한다 (계산이 조금 걸리므로 한 번만 만들고 다시 쓴다)
  function allMistakes(): Map<string, Mistake> {
    mistakes.current ??= listMistakes(pre, chunk.moves, chunk.formula ? FORMULAS[chunk.formula].length : 0);
    return mistakes.current;
  }

  // 아이가 첫 면을 칠하는 동안 미리 계산해 둔다
  useEffect(() => {
    const timer = setTimeout(allMistakes, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 한 면을 다 칠했을 때: 답이 하나로 좁혀졌는지 보고, 아니면 다음 면을 묻는다
  function submitFace(face: number) {
    const asked = face + 1;
    const matches = asked >= MIN_FACES ? matchMistakes(allMistakes(), seen) : null;
    if (matches?.length === 1) {
      const mistake = matches[0];
      // 돌려놓을 것이 없으면(맞게 했거나 아직 시작 전이면) 바로 수업으로 돌아간다
      setPhase(mistake.fix.length ? { name: 'found', mistake } : { name: 'arrived', target: mistake.target, note: mistake.kind === 'ok' ? t('repairOk') : t('repairNotStarted') });
    } else if (matches?.length === 0 || asked === ASK.length) setPhase({ name: 'lost' });
    else setPhase({ name: 'paint', face: asked });
  }

  const wrongState = useMemo(
    () => (phase.name === 'found' || phase.name === 'fix' ? applyMoves(pre, phase.mistake.done) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase.name === 'found' || phase.name === 'fix' ? phase.mistake : null],
  );

  if (phase.name === 'paint') {
    const face = ASK[phase.face];
    const base = FACES.indexOf(face) * 9;
    const full = !seen.slice(base, base + 9).includes('?');
    const params = { front: colorName(post[22]), right: colorName(post[13]) };
    return (
      <>
        <Bubble>{t(`repairFace${phase.face + 1}` as MessageKey, params)}</Bubble>
        <p className="repair-count">{t('repairFaceNo', { i: phase.face + 1 })}</p>
        <FaceEditor state={seen} face={face} marked={[]} onPaint={(i) => setSeen(seen.slice(0, i) + selected + seen.slice(i + 1))} />
        <div className="palette">
          {FACES.map((f) => (
            <button
              key={f}
              className={'swatch' + (selected === f ? ' selected' : '')}
              style={{ background: FACE_COLORS[f] }}
              onClick={() => setSelected(f)}
              aria-label={colorName(f)}
            />
          ))}
        </div>
        <button className="btn primary big" disabled={!full} onClick={() => submitFace(phase.face)}>{t('repairPainted')}</button>
        <div className="row">
          {phase.face > 0 && <button className="btn small" onClick={() => setPhase({ name: 'paint', face: phase.face - 1 })}>◀ {t('guidePrev')}</button>}
          <button className="btn small" onClick={onCancel}>{t('repairQuit')}</button>
        </div>
      </>
    );
  }

  if (phase.name === 'lost') {
    return (
      <>
        <Bubble tone="warn">
          <strong className="move-title">{t('repairLostHead')}</strong>
          <span>{t('repairLostText')}</span>
        </Bubble>
        <button className="btn primary big" onClick={() => onReenter(toStandard(seen))}>{t('repairLostEnter')}</button>
        <div className="row">
          <button className="btn small" onClick={() => setPhase({ name: 'paint', face: 0 })}>{t('repairRetry')}</button>
          <button className="btn small" onClick={onCancel}>{t('repairQuit')}</button>
        </div>
      </>
    );
  }

  if (phase.name === 'arrived') {
    const ok = phase.target === 'post';
    return (
      <>
        <div className="cube-stage"><Cube3D state={ok ? post : pre} /></div>
        <Bubble tone="good">
          <strong className="move-title">{phase.note ?? t(ok ? 'repairBackPost' : 'repairBackPre')}</strong>
        </Bubble>
        <button className="btn primary big" onClick={() => onResume(phase.target)}>{t(ok ? 'repairContinue' : 'repairTogether')}</button>
      </>
    );
  }

  const { mistake } = phase;
  if (phase.name === 'found') {
    return (
      <>
        <div className="cube-stage"><Cube3D state={wrongState} /></div>
        <Bubble tone="good">
          <strong className="move-title">{t('repairFoundHead')}</strong>
          <span>{explain(mistake, chunk, t)}</span>
          <small>{t('repairIsThis', { n: mistake.fix.length })}</small>
        </Bubble>
        <button className="btn primary big" onClick={() => setPhase({ name: 'fix', mistake, step: 0 })}>{t('repairFixStart')}</button>
        <div className="row">
          <button className="btn small" onClick={() => setPhase({ name: 'lost' })}>{t('repairNotThis')}</button>
        </div>
      </>
    );
  }

  // 돌려놓는 회전을 하나씩 보여준다
  const move = mistake.fix[phase.step];
  const last = phase.step === mistake.fix.length - 1;
  return (
    <>
      <div className="cube-stage">
        <Cube3D state={applyMoves(wrongState, mistake.fix.slice(0, phase.step))} move={move} playId={playId} />
        <div className="mission-tag">{t('repairStep', { i: phase.step + 1, n: mistake.fix.length })}</div>
      </div>
      <Bubble>
        <strong className="move-title">{describeMove(move, t).title}</strong>
      </Bubble>
      <button
        className="btn primary big"
        onClick={() => {
          setPlayId((id) => id + 1);
          setPhase(last ? { name: 'arrived', target: mistake.target } : { name: 'fix', mistake, step: phase.step + 1 });
        }}
      >
        {t('guideNext')} ▶
      </button>
      <div className="row">
        {phase.step > 0 && <button className="btn small" onClick={() => setPhase({ name: 'fix', mistake, step: phase.step - 1 })}>◀ {t('guidePrev')}</button>}
        <button className="btn small" onClick={() => setPlayId((id) => id + 1)}>↻ {t('guideReplay')}</button>
      </div>
    </>
  );
}
