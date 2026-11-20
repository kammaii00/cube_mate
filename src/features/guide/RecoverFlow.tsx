// 빨리 맞추기 도중 '달라'를 골랐을 때: 면 2~3개만 찍거나 칠하게 해서 지금 큐브 모습을 찾고, 거기서부터 다시 길을 찾는다
import { useEffect, useMemo, useState } from 'react';
import { FACES, emptyState, type Face } from '../../core/faces';
import type { Move } from '../../core/moves';
import { useI18n, type MessageKey } from '../../i18n';
import { ASK_FACES, MIN_FACES, fillReadings, listCandidates, matchReadings, shorterPath, undoPath, type FaceReading, type Found } from '../../solver/recover';
import { solveFast } from '../../solver/solverClient';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { FacePaint } from '../edit/FacePaint';
import { FaceCamera } from '../scan/FaceCamera';

interface Props {
  /** 마지막으로 "맞아"라고 한 때의 큐브 상태 */
  checkpoint: string;
  /** 그 뒤로 안내한 회전들 */
  recent: Move[];
  /** 그때부터 완성까지 남은 풀이 전체 */
  rest: Move[];
  /** 지금 모습을 찾았을 때: 지금 상태와 완성까지 가는 회전들 */
  onResolved: (start: string, moves: Move[]) => void;
  /** 다시 보니 그림과 똑같을 때 */
  onSame: () => void;
  /** 못 찾았을 때: 받은 면을 채운 상태와 함께 전체 입력(카메라 찍기 / 직접 칠하기)으로 넘긴다 */
  onFull: (state: string, how: 'scan' | 'paint') => void;
  onCancel: () => void;
}

type Phase = { name: 'ask'; k: number } | { name: 'search' } | { name: 'lost' };

// 면 묻기 → 찾기 → (찾으면) 새 길로 이어 가기 / (못 찾으면) 전체 입력 고르기
export function RecoverFlow({ checkpoint, recent, rest, onResolved, onSame, onFull, onCancel }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const candidates = useMemo(() => listCandidates(checkpoint, recent), [checkpoint, recent]);
  const [phase, setPhase] = useState<Phase>({ name: 'ask', k: 0 });
  const [readings, setReadings] = useState<FaceReading[]>([]);
  const [camera, setCamera] = useState(true);
  const [painted, setPainted] = useState(emptyState);
  const [hold, setHold] = useState(false);
  const face: Face = phase.name === 'ask' ? ASK_FACES[phase.k] : 'F';

  // 면을 물을 때마다 큐비가 어느 면을 보여 줄지(칠할지) 말해 준다
  useEffect(() => {
    if (phase.name === 'ask') say([...(phase.k === 0 ? ['recoverStart'] : []), (camera ? 'recoverShow' : 'recoverPaint') + face]);
    else if (phase.name === 'lost') say('recoverLost');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, camera]);

  // 찾은 모습에서 완성까지: 틀린 것을 되돌리는 길과 새로 푼 길 중 더 짧은 쪽으로 이어 간다
  async function resume({ state, mistake }: Found) {
    if (mistake.kind === 'ok') return onSame();
    setPhase({ name: 'search' });
    const fresh = await solveFast(state).then((s) => s.moves).catch(() => null);
    onResolved(state, shorterPath(undoPath(mistake.done, rest), fresh));
  }

  // 한 면을 받았을 때: 답이 하나로 좁혀졌으면 이어 가고, 아니면 다음 면을 묻는다
  function addReading(cells: string, anyTurn: boolean) {
    if (phase.name !== 'ask') return;
    const next = [...readings.slice(0, phase.k), { face, cells, anyTurn }];
    setReadings(next);
    setHold(false);
    const matches = next.length >= MIN_FACES ? matchReadings(candidates, next) : null;
    if (matches?.length === 1) resume(matches[0]);
    else if (matches?.length === 0 || next.length === ASK_FACES.length) setPhase({ name: 'lost' });
    else setPhase({ name: 'ask', k: phase.k + 1 });
  }

  // 찍어야 할 면이 아닌 면이 보이면(방금 찍은 면은 빼고) 잡는 법을 알려준다
  function wrongCenter(shown: Face) {
    if (readings.some((r) => r.face === shown)) return;
    setHold(true);
    say('recoverHold', { cooldown: 5000 });
  }

  // 처음부터 다시 묻는다
  function retry() {
    setReadings([]);
    setPainted(emptyState());
    setPhase({ name: 'ask', k: 0 });
  }

  if (phase.name === 'search') return <Bubble>{t('recoverSearching')}</Bubble>;

  if (phase.name === 'lost') {
    const filled = fillReadings(emptyState(), readings);
    return (
      <>
        <Bubble tone="warn"><strong className="move-title">{t('recoverLost')}</strong></Bubble>
        <button className="btn primary big" onClick={() => onFull(filled, camera ? 'scan' : 'paint')}>
          {t(camera ? 'recoverScanAll' : 'recoverPaintAll')}
        </button>
        <button className="btn big" onClick={() => onFull(filled, camera ? 'paint' : 'scan')}>
          {t(camera ? 'recoverPaintAll' : 'recoverScanAll')}
        </button>
        <div className="row">
          <button className="btn small" onClick={retry}>{t('recoverRetry')}</button>
          <button className="btn small" onClick={onCancel}>{t('recoverQuit')}</button>
        </div>
      </>
    );
  }

  const base = FACES.indexOf(face) * 9;
  const full = !painted.slice(base, base + 9).includes('?');
  const ask = ((camera ? 'recoverShow' : 'recoverPaint') + face) as MessageKey;
  return (
    <>
      <Bubble tone={hold ? 'warn' : 'normal'}>
        <strong className="move-title">{t(hold ? 'recoverHold' : ask)}</strong>
      </Bubble>
      <p className="repair-count">{t('recoverFaceNo', { i: phase.k + 1 })}</p>
      {camera ? (
        <FaceCamera center={face} onFace={(cells) => addReading(cells, true)} onWrongCenter={wrongCenter} onError={() => setCamera(false)} />
      ) : (
        <>
          <FacePaint key={face} state={painted} face={face} onChange={setPainted} />
          <button className="btn primary big" disabled={!full} onClick={() => addReading(painted.slice(base, base + 9), false)}>
            {t('recoverPainted')}
          </button>
        </>
      )}
      <div className="row">
        <button className="btn small" onClick={() => setCamera(!camera)}>{t(camera ? 'recoverUsePaint' : 'recoverUseCamera')}</button>
        <button className="btn small" onClick={onCancel}>{t('recoverQuit')}</button>
      </div>
    </>
  );
}
