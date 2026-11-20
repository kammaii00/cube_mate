// CubeScene(3D 큐브)을 React 화면에 끼워 넣는 컴포넌트
import { useEffect, useRef } from 'react';
import type { Move } from '../core/moves';
import { useI18n } from '../i18n';
import { CubeScene, type Marks } from './CubeScene';

interface Props {
  /** 표시할 큐브 상태 (move가 있으면 회전 전 상태) */
  state: string;
  /** 애니메이션으로 보여줄 회전 (없으면 정지 화면) */
  move?: Move | null;
  /** 값이 바뀌면 같은 회전을 다시 재생한다 */
  playId?: number;
  /** 90° 회전 한 번에 걸리는 시간(ms). 아이들이 눈으로 따라갈 수 있게 느리게 잡는다 */
  duration?: number;
  /** 정지 화면일 때 이 칸들만 선명하게, 나머지는 흐리게 보여준다 */
  highlight?: number[] | null;
  /** 정지 화면일 때 "이 조각"과 "들어갈 자리"를 화살표로 표시할 칸들 */
  marks?: Marks | null;
  /** true면 highlight 칸 둘레에 반짝이는 테두리를 그리고, 회전 전에는 돌릴 줄 테두리를 먼저 반짝인다 */
  glow?: boolean;
  /** 회전할 때 짚어 줄 칸: 돌리기 전 칸(from)과 돌린 뒤 칸(to). 분홍 테두리가 따라 움직인다 */
  watch?: { from: number; to: number } | null;
  /** true면 큐브가 제자리에서 천천히 돈다 (완성 화면용) */
  spin?: boolean;
  /** 애니메이션이 끝났을 때 호출 */
  onAnimationEnd?: () => void;
}

// 3D 큐브를 표시하고, move가 주어지면 그 회전을 재생한다
export function Cube3D({ state, move, playId = 0, duration = 1100, highlight, marks, glow = false, watch, spin = false, onAnimationEnd }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CubeScene | null>(null);
  const endRef = useRef(onAnimationEnd);
  endRef.current = onAnimationEnd;

  useEffect(() => {
    const scene = new CubeScene(containerRef.current!, spin);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [spin]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setLabels({ piece: t('pointPiece'), slot: t('pointSlot') });
    if (!move) {
      scene.setState(state, highlight, marks, glow);
      return;
    }
    let active = true;
    scene.playMove(state, move, duration, glow, watch).then(() => active && endRef.current?.());
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, move, playId, duration, spin, glow, highlight?.join(','), marks?.piece?.join(','), marks?.slot?.join(','), watch?.from, t]);

  return <div ref={containerRef} className="cube3d" />;
}
