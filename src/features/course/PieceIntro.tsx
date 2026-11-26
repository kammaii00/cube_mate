// 소개 화면: 장면(introSlides)마다 큐브를 돌려 보이며 설명한다 (조각 친구, 꽃잎 올리기·내리기, 오른손 춤)
import { useEffect, useState } from 'react';
import { SOLVED } from '../../core/faces';
import { applyMove, invertMove, type Move } from '../../core/moves';
import { followCells } from '../../course/pieces';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { SLIDES, type Slide, type SlideId } from './introSlides';

export type { SlideId };

/** 멈춰서 보여 주는 시간과 회전 시간(ms) */
const STILL_MS = 1300;
const TURN_MS = 1200;
/** 빨리 돌리는 장면(오른손 춤)의 멈춤·회전 시간(ms) */
const FAST_STILL_MS = 250;
const FAST_TURN_MS = 520;
const FAST_LEAD_MS = 150;
/** 같은 종류 조각 전부를 보여 주는 시간, 다 맞춘 칸을 반짝이는 시간(ms) */
const ALL_MS = 2600;
const FINISH_MS = 2000;

interface Props {
  slides: SlideId[];
  onDone: () => void;
  /** 마지막 장 버튼 문구 (없으면 "찾으러 가자!") */
  doneLabel?: MessageKey;
}

// 소개를 한 장씩 보여 주고, 마지막 장에서 "시작하기"로 끝낸다
export function PieceIntro({ slides, onDone, doneLabel = 'introStart' }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [k, setK] = useState(0);
  const slide: Slide = SLIDES[slides[k]];
  const last = k === slides.length - 1;
  /** 지금 모습, 반짝이는 칸, 돌리는 중인 회전, 한 바퀴(돌리기 → 되돌리기, 또는 돌리기 → 반짝) 중 몇 번째 회전인지 */
  const [view, setView] = useState({ state: slide.base ?? SOLVED, cells: slide.cells, move: null as Move | null, id: 0, step: 0 });
  /** true면 같은 종류 조각 전부를 밝게 보여 주는 중 (그다음 하나만 움직인다) */
  const [showAll, setShowAll] = useState(!!slide.all);
  /** 다 맞췄을 때 반짝이는 칸 (id가 바뀔 때마다 한 번) */
  const [flash, setFlash] = useState<{ cells: number[]; id: number } | null>(null);

  // 장이 바뀌면 처음 모습으로 돌아가고 설명을 말해 준다
  useEffect(() => {
    setView({ state: slide.base ?? SOLVED, cells: slide.cells, move: null, id: 0, step: 0 });
    setShowAll(!!slide.all);
    say(slide.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  // 같은 종류 조각 전부를 잠깐 보여 준 뒤 하나만 남긴다
  useEffect(() => {
    if (!showAll) return;
    const timer = setTimeout(() => setShowAll(false), ALL_MS);
    return () => clearTimeout(timer);
  }, [showAll]);

  // 멈춘 그림을 잠깐 보여 준 뒤 다음 회전을 튼다 (앞 절반은 차례로 돌리기, 뒤 절반은 거꾸로 되돌리기).
  // finish가 있으면 다 돌린 뒤 반짝이다가 처음 모습으로 돌아간다
  useEffect(() => {
    const n = slide.moves.length;
    if (showAll || !n || view.move) return;
    if (slide.finish && view.step === n) {
      setFlash((f) => ({ cells: slide.finish!, id: (f?.id ?? 0) + 1 }));
      const timer = setTimeout(() => setView({ state: slide.base ?? SOLVED, cells: slide.cells, move: null, id: view.id, step: 0 }), FINISH_MS);
      return () => clearTimeout(timer);
    }
    const move = view.step < n ? slide.moves[view.step] : invertMove(slide.moves[2 * n - 1 - view.step]);
    const timer = setTimeout(() => setView((v) => ({ ...v, move, id: v.id + 1 })), slide.fast ? FAST_STILL_MS : STILL_MS);
    return () => clearTimeout(timer);
  }, [view, slide, showAll]);

  // 회전이 끝나면 돌린 뒤 모습과 옮겨 간 칸으로 바꾼다. 되돌려서 처음 모습이 되면 전부 밝히기부터 다시 반복한다
  function turned() {
    if (!view.move) return;
    const step = slide.finish ? view.step + 1 : (view.step + 1) % (2 * slide.moves.length);
    setView({ state: applyMove(view.state, view.move), cells: followCells(view.cells, view.move), move: null, id: view.id, step });
    if (step === 0 && slide.all) setShowAll(true);
  }

  const finished = !!slide.finish && view.step === slide.moves.length;
  return (
    <>
      <div className="cube-stage">
        <Cube3D
          state={view.state}
          move={view.move}
          playId={view.id}
          duration={slide.fast ? FAST_TURN_MS : TURN_MS}
          lead={slide.fast ? FAST_LEAD_MS : undefined}
          highlight={showAll ? slide.all : finished ? slide.finish : view.cells}
          keepHighlight
          bright={slide.bright}
          glow={!slide.fast || !view.move}
          dim={!slide.flip}
          sticky={!!slide.flip}
          view={slide.flip ? { kind: 'flip', id: k + 1 } : null}
          flash={flash}
          onAnimationEnd={turned}
        />
      </div>
      <Bubble>
        <strong className="move-title">{t(slide.text)}</strong>
        {showAll && <small>{t(`${slide.text}All` as MessageKey)}</small>}
        <small className="course-tip">{t(`${slide.text}Note` as MessageKey)}</small>
      </Bubble>
      <button className="btn primary big" onClick={() => (last ? onDone() : setK(k + 1))}>
        {t(last ? doneLabel : 'introNext')}
      </button>
    </>
  );
}
