// 카메라 스캔 화면: 큐브를 돌려 가며 보여주면 한 면씩 저절로 찍는다 (순서·방향 무관)
import { useEffect, useRef, useState } from 'react';
import { FACE_COLORS, type Face } from '../../core/faces';
import { useI18n, type MessageKey } from '../../i18n';
import { AutoCapture, type CaptureStatus } from '../../scanner/autoCapture';
import { rgbToCss, type RGB } from '../../scanner/colorMath';
import { resolveCube } from '../../scanner/orient';
import { sampleFrame, useCamera } from '../../scanner/useCamera';
import { Bubble } from '../../widgets/Bubble';

/** 화면을 읽는 간격(ms) */
const TICK = 130;

interface Props {
  /** 6면을 다 찍으면 복원한 큐브 상태와, 확실히 복원됐는지를 넘긴다 */
  onComplete: (state: string, exact: boolean) => void;
  onManual: () => void;
  onBack: () => void;
}

// 자동 촬영을 진행하고, 6면이 모이면 큐브 상태를 복원해 넘겨준다
export function ScanScreen({ onComplete, onManual, onBack }: Props) {
  const { t } = useI18n();
  const { videoRef, status } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detector = useRef(new AutoCapture());
  const capturedRef = useRef<RGB[][]>([]);
  const [captured, setCaptured] = useState<RGB[][]>([]);
  const [phase, setPhase] = useState<CaptureStatus | 'captured'>('unclear');
  const [progress, setProgress] = useState(0);
  const [seen, setSeen] = useState<(Face | null)[]>([]);
  const [flash, setFlash] = useState(0);

  // 찍은 면 목록을 바꾼다 (화면 표시용 상태와 판단용 참조를 함께 갱신)
  function store(next: RGB[][]) {
    capturedRef.current = next;
    setCaptured(next);
  }

  // 한 면을 추가하고, 6면이 모이면 큐브 상태를 복원해 넘긴다
  function addFace(colors: RGB[]) {
    const next = [...capturedRef.current, colors];
    store(next);
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
      const result = detector.current.update(frame, capturedRef.current.map((face) => face[4]));
      setProgress(result.progress);
      setSeen(result.colors);
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

  // 자동으로 안 찍힐 때: 지금 보이는 화면을 그대로 한 면으로 찍는다
  function captureNow() {
    const frame = videoRef.current && canvasRef.current && sampleFrame(videoRef.current, canvasRef.current);
    if (frame) addFace(frame.cells.map((c) => c.rgb));
  }

  // 방금 찍은 면을 지운다
  function undo() {
    store(capturedRef.current.slice(0, -1));
    detector.current.reset();
    setPhase('unclear');
  }

  const messageKey: Record<typeof phase, MessageKey> = {
    unclear: 'scanIntro',
    holding: 'scanHolding',
    seen: 'scanSeen',
    captured: 'scanCaptured',
    capture: 'scanCaptured',
  };

  return (
    <main className="screen scan">
      <header className="topbar">
        <button className="link" onClick={onBack}>‹ {t('back')}</button>
        <h2>{t('scanTitle')}</h2>
        <span className="step-count">{t('scanCount', { n: captured.length })}</span>
      </header>

      <div className="camera">
        <video ref={videoRef} playsInline muted />
        <div className={'scan-grid' + (phase === 'holding' || phase === 'seen' || phase === 'captured' ? ' holding' : '')}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{seen[i] && <i style={{ background: FACE_COLORS[seen[i]!] }} />}</span>
          ))}
        </div>
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
          <Bubble tone={phase === 'captured' || phase === 'holding' ? 'good' : 'normal'}>{t(messageKey[phase])}</Bubble>
          <div className="scan-slots">
            {Array.from({ length: 6 }, (_, slot) => (
              <div key={slot} className={'scan-slot' + (captured[slot] ? ' filled' : '')}>
                {(captured[slot] ?? Array(9).fill(null)).map((rgb: RGB | null, i: number) => (
                  <i key={i} style={rgb ? { background: rgbToCss(rgb) } : undefined} />
                ))}
              </div>
            ))}
          </div>
          <div className="row">
            <button className="btn small" disabled={status !== 'ready'} onClick={captureNow}>📸 {t('scanManual')}</button>
            <button className="btn small" disabled={!captured.length} onClick={undo}>{t('scanUndo')}</button>
          </div>
          <p className="hint">💡 {t('scanTip')}</p>
        </>
      )}
    </main>
  );
}
