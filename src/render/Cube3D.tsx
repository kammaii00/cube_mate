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
  /** true면 회전하는 동안에도 highlight 칸만 선명하게 둔다 (돌릴 줄을 흐리게 강조하지 않음) */
  keepHighlight?: boolean;
  /** false면 highlight 밖 칸을 흐리게 하지 않는다 (테두리만 그린다) */
  dim?: boolean;
  /** true면 끌어서 돌린 방향을 손을 떼도 그대로 둔다 */
  sticky?: boolean;
  /** 보는 방향 바꾸기 명령 (id가 바뀔 때마다 한 번 실행) */
  view?: { kind: 'side' | 'flip' | 'reset'; id: number } | null;
  /** 잠깐 분홍 테두리로 깜빡일 칸들 (id가 바뀔 때마다 한 번) */
  flash?: { cells: number[]; id: number } | null;
  /** 칸을 눌렀을 때 그 칸 번호를 알려 받는다 (끌어서 돌려 보기와 구분: 거의 안 움직이고 뗀 경우만) */
  onPick?: (cell: number) => void;
  /** 애니메이션이 끝났을 때 호출 */
  onAnimationEnd?: () => void;
}

// 3D 큐브를 표시하고, move가 주어지면 그 회전을 재생한다
export function Cube3D({ state, move, playId = 0, duration = 1100, highlight, marks, glow = false, watch, spin = false, sticky = false, keepHighlight = false, dim = true, view, flash, onPick, onAnimationEnd }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CubeScene | null>(null);
  const endRef = useRef(onAnimationEnd);
  endRef.current = onAnimationEnd;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const scene = new CubeScene(containerRef.current!, spin);
    sceneRef.current = scene;
    scene.setPickListener((cell) => pickRef.current?.(cell));
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
      scene.setState(state, highlight, marks, glow, dim);
      return;
    }
    let active = true;
    scene.playMove(state, move, duration, glow, watch, keepHighlight ? highlight : null).then(() => active && endRef.current?.());
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, move, playId, duration, spin, glow, dim, highlight?.join(','), marks?.piece?.join(','), marks?.slot?.join(','), watch?.from, t]);

  // 끌어 돌린 방향 유지, 보는 방향 버튼, 깜빡임은 각각 바뀔 때만 적용한다
  useEffect(() => sceneRef.current?.setSticky(sticky), [sticky, spin]);
  useEffect(() => {
    if (view) sceneRef.current?.turnView(view.kind);
  }, [view?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (flash) sceneRef.current?.flash(flash.cells);
  }, [flash?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="cube3d" />;
}
