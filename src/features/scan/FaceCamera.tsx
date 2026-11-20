// 카메라로 큐브 한 면만 찍는 작은 화면 (빨리 맞추기 도중 '달라'를 골랐을 때 쓴다)
import { useEffect, useRef, useState } from 'react';
import { FACE_COLORS, type Face } from '../../core/faces';
import { AutoCapture } from '../../scanner/autoCapture';
import { sampleFrame, useCamera } from '../../scanner/useCamera';

/** 화면을 읽는 간격(ms) */
const TICK = 130;

interface Props {
  /** 찍어야 하는 면의 가운데 색 */
  center: Face;
  /** 9칸 색 글자를 다 읽으면 넘긴다 */
  onFace: (cells: string) => void;
  /** 가운데 색이 다른 면을 보여 줬을 때 (보여 준 면의 가운데 색) */
  onWrongCenter: (shown: Face) => void;
  /** 카메라를 쓸 수 없을 때 */
  onError: () => void;
}

// 카메라 화면 위에 3x3 칸을 그리고, 9칸이 큐브 색으로 멈춰 보이면 그 면을 찍는다
export function FaceCamera({ center, onFace, onWrongCenter, onError }: Props) {
  const { videoRef, status } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detector = useRef(new AutoCapture());
  const handlers = useRef({ onFace, onWrongCenter, center });
  handlers.current = { onFace, onWrongCenter, center };
  const [seen, setSeen] = useState<(Face | null)[]>([]);
  const [progress, setProgress] = useState(0);

  // 카메라를 못 켜면 칠하기로 넘어가게 알린다
  useEffect(() => {
    if (status === 'error') onError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 찍을 면이 바뀌면 판단을 처음부터 다시 한다
  useEffect(() => detector.current.reset(), [center]);

  // 화면을 계속 읽다가 한 면이 멈춰 보이면 찍는다 (가운데 색이 다르면 잡는 법을 다시 알려준다)
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const frame = sampleFrame(videoRef.current, canvasRef.current);
      if (!frame) return;
      const result = detector.current.update(frame, []);
      setSeen(result.colors);
      setProgress(result.progress);
      if (result.status !== 'capture') return;
      const cells = result.colors.join('');
      if (cells[4] !== handlers.current.center) handlers.current.onWrongCenter(cells[4] as Face);
      else {
        navigator.vibrate?.(60);
        handlers.current.onFace(cells);
      }
      detector.current.reset();
    }, TICK);
    return () => clearInterval(timer);
  }, [status, videoRef]);

  return (
    <>
      <div className="camera">
        <video ref={videoRef} playsInline muted />
        <div className={'scan-grid' + (progress > 0 ? ' holding' : '')}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{seen[i] && <i style={{ background: FACE_COLORS[seen[i]!] }} />}</span>
          ))}
        </div>
        <div className="hold-bar"><i style={{ width: `${progress * 100}%` }} /></div>
      </div>
      <canvas ref={canvasRef} hidden />
    </>
  );
}
