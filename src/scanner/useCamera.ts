// 카메라를 켜고 끄는 React 훅과, 화면 속 9칸의 색을 읽는 함수
import { useEffect, useRef, useState } from 'react';
import { analyzeFrame, type FrameSample } from './frame';

export type CameraStatus = 'starting' | 'ready' | 'error';

/** 정사각형 화면에서 3x3 가이드가 차지하는 비율 (가운데 72%) */
export const GUIDE_RATIO = 0.72;

// 후면 카메라를 켜서 video 요소에 연결한다. 화면을 떠나면 자동으로 끈다.
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>('starting');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    // 카메라 권한을 요청하고 영상을 재생한다
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, status };
}

// 영상의 가운데 정사각형 안 3x3 가이드 영역을 읽어 9칸의 색과 경계선 정보를 구한다
export function sampleFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): FrameSample | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const SIZE = 150; // 가이드 영역을 150x150으로 줄여서 읽는다 (칸당 50x50)
  const square = Math.min(vw, vh);
  const guide = square * GUIDE_RATIO;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, (vw - guide) / 2, (vh - guide) / 2, guide, guide, 0, 0, SIZE, SIZE);
  return analyzeFrame(ctx.getImageData(0, 0, SIZE, SIZE).data, SIZE);
}
