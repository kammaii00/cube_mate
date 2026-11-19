// 카메라 스캔 화면: 큐브를 돌려 가며 보여주면 한 면씩 저절로 찍는다 (순서·방향 무관, 같은 면은 한 번만)
import { useEffect, useRef, useState } from 'react';
import { FACE_COLORS, type Face } from '../../core/faces';
import { useI18n, type MessageKey } from '../../i18n';
import { AutoCapture, cubeColorOf, findDuplicate, type CaptureStatus } from '../../scanner/autoCapture';
import type { RGB } from '../../scanner/colorMath';
import { resolveCube } from '../../scanner/orient';
import { sampleFrame, useCamera } from '../../scanner/useCamera';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { CaptureSlots } from './CaptureSlots';

/** 화면을 읽는 간격(ms) */
const TICK = 130;
/** 안내 문구(직접 찍기 결과 등)를 보여주는 시간(ms) */
const NOTICE_MS = 2200;

interface Props {
  /** 6면을 다 찍으면 복원한 큐브 상태와, 확실히 복원됐는지를 넘긴다 */
  onComplete: (state: string, exact: boolean) => void;
  onManual: () => void;
  onBack: () => void;
}

type Phase = CaptureStatus | 'captured';

// 자동 촬영을 진행하고, 6면이 모이면 큐브 상태를 복원해 넘겨준다
export function ScanScreen({ onComplete, onManual, onBack }: Props) {
  const { t } = useI18n();
  const { videoRef, status } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detector = useRef(new AutoCapture());
  const capturedRef = useRef<RGB[][]>([]);
  const noticeTimer = useRef<number>();
  const noticeUntil = useRef(0);
  const [captured, setCaptured] = useState<RGB[][]>([]);
  const [phase, setPhase] = useState<Phase>('unclear');
  const [progress, setProgress] = useState(0);
  const [seen, setSeen] = useState<(Face | null)[]>([]);
  const [lastFace, setLastFace] = useState<Face | null>(null);
  const [dupFace, setDupFace] = useState<Face | null>(null);
  const [notice, setNotice] = useState<{ key: MessageKey; face: Face | null } | null>(null);
  const [flash, setFlash] = useState(0);
  const say = useSay();

  // 들어오면 찍는 법을 말해 주고, 카메라를 못 쓰면 어른을 부르라고 한다
  useEffect(() => {
    if (status === 'error') say('scanError');
    else if (status === 'starting') say('scanIntro');
  }, [status, say]);

  // 카메라 안내가 바뀌면 짧게 말해 준다 (자주 바뀌므로 말하는 중이면 끊지 않고, 같은 말은 몇 초에 한 번만)
  useEffect(() => {
    if (phase === 'unaligned') say('scanAlign', { interrupt: false, cooldown: 8000 });
    else if (phase === 'seen') say('scanSeen', { interrupt: false, cooldown: 6000 });
  }, [phase, say]);

  // 찍은 면 목록을 바꾼다 (화면 표시용 상태와 판단용 참조를 함께 갱신)
  function store(next: RGB[][]) {
    capturedRef.current = next;
    setCaptured(next);
  }

  // 잠깐 보여줄 안내 문구를 띄운다
  function showNotice(key: MessageKey, face: Face | null = null) {
    setNotice({ key, face });
    say(key, { cooldown: 1500 });
    setDupFace(face);
    noticeUntil.current = Date.now() + NOTICE_MS;
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }

  // 한 면을 추가하고, 6면이 모이면 큐브 상태를 복원해 넘긴다
  function addFace(colors: RGB[]) {
    const next = [...capturedRef.current, colors];
    store(next);
    const color = cubeColorOf(colors[4]);
    setLastFace(color);
    say([`scanCaptured_${color}`, next.length === 6 ? 'scanAllDone' : 'scanNext']);
    setDupFace(null);
    setNotice(null);
    setFlash((n) => n + 1);
    setPhase('captured');
    navigator.vibrate?.(60);
    if (next.length === 6) {
      const result = resolveCube(next);
      onComplete(result.state, result.exact);
    }
  }

  // 카메라가 켜져 있는 동안 화면을 계속 읽어, 멈춰 있는 새 면이 보이면 자동으로 찍는다
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || capturedRef.current.length >= 6) return;
      const frame = sampleFrame(videoRef.current, canvasRef.current);
      if (!frame) return;
      const result = detector.current.update(frame, capturedRef.current);
      setProgress(result.progress);
      setSeen(result.colors);
      if (result.duplicateOf >= 0) setDupFace(cubeColorOf(capturedRef.current[result.duplicateOf][4]));
      else if (Date.now() > noticeUntil.current) setDupFace(null);
      if (result.status === 'capture') {
        addFace(frame.cells.map((c) => c.rgb));
        return;
      }
      // 방금 찍은 면이 아직 보이는 동안에는 "찰칵!" 안내를 유지한다
      setPhase((prev) => (prev === 'captured' && result.status === 'seen' ? prev : result.status));
    }, TICK);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, videoRef]);

  // 자동으로 안 찍힐 때: 지금 보이는 화면을 한 면으로 찍는다 (가운데 색이 불분명하거나 이미 찍은 면이면 막는다)
  function captureNow() {
    const frame = videoRef.current && canvasRef.current && sampleFrame(videoRef.current, canvasRef.current);
    if (!frame) return;
    const face = frame.cells.map((c) => c.rgb);
    if (!cubeColorOf(face[4])) return showNotice('scanNoCenter');
    const duplicate = findDuplicate(face, capturedRef.current);
    if (duplicate >= 0) return showNotice('scanSeen', cubeColorOf(capturedRef.current[duplicate][4]));
    addFace(face);
  }

  // 찍은 면 하나를 지우고 다시 찍을 수 있게 한다
  function removeFace(index: number) {
    store(capturedRef.current.filter((_, i) => i !== index));
    detector.current.reset();
    setPhase('unclear');
    setLastFace(null);
    setDupFace(null);
  }

  const messageKey: Record<Phase, MessageKey> = {
    unclear: 'scanIntro',
    unaligned: 'scanAlign',
    holding: 'scanHolding',
    seen: 'scanSeen',
    captured: 'scanCaptured',
    capture: 'scanCaptured',
  };
  const colorOf = (face: Face | null) => (face ? t(('color' + face) as MessageKey) : '');
  const shownFace = notice ? notice.face : phase === 'captured' ? lastFace : phase === 'seen' ? dupFace : null;
  const text = t(notice?.key ?? messageKey[phase], { color: colorOf(shownFace), n: 6 - captured.length });
  const centerFace = seen[4] ?? null;
  const chip =
    phase === 'seen' && dupFace ? t('scanChipSeen', { color: colorOf(dupFace) })
    : phase === 'holding' && centerFace ? t('scanChipHolding', { color: colorOf(centerFace) })
    : null;
  const gridClass = phase === 'seen' ? ' dup' : phase === 'holding' || phase === 'captured' ? ' holding' : '';

  return (
    <main className="screen scan">
      <header className="topbar">
        <button className="link" onClick={onBack}>‹ {t('back')}</button>
        <h2>{t('scanTitle')}</h2>
        <span className="step-count">{t('scanCount', { n: captured.length })}</span>
      </header>

      <div className="camera">
        <video ref={videoRef} playsInline muted />
        <div className={'scan-grid' + gridClass}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{seen[i] && <i style={{ background: FACE_COLORS[seen[i]!] }} />}</span>
          ))}
        </div>
        {chip && <div className={'camera-chip' + (phase === 'seen' ? ' dup' : '')}>{chip}</div>}
        <div className="hold-bar"><i style={{ width: `${progress * 100}%` }} /></div>
        {flash > 0 && <div key={flash} className="flash" />}
        {status !== 'ready' && (
          <div className="camera-msg">{status === 'starting' ? t('scanStarting') : t('scanError')}</div>
        )}
      </div>
      <canvas ref={canvasRef} hidden />

      {status === 'error' ? (
        <button className="btn primary big" onClick={onManual}>🎨 {t('manualStart')}</button>
      ) : (
        <>
          <Bubble tone={phase === 'captured' || phase === 'holding' ? 'good' : phase === 'seen' || notice ? 'warn' : 'normal'}>
            {text}
          </Bubble>
          <CaptureSlots captured={captured} highlight={dupFace} onRemove={removeFace} />
          <div className="row">
            <button className="btn small" disabled={status !== 'ready'} onClick={captureNow}>📸 {t('scanManual')}</button>
            <button className="btn small" disabled={!captured.length} onClick={() => removeFace(captured.length - 1)}>{t('scanUndo')}</button>
          </div>
          <p className="hint">💡 {t('scanTip')}</p>
        </>
      )}
    </main>
  );
}
