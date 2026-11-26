// 조각 친구 소개: 다 맞춘 큐브에서 가운데·모서리·꼭짓점 조각을 반짝이게 하고, 한 줄을 돌렸다 되돌리며 "같이 다닌다"를 보여 준다
import { useEffect, useState } from 'react';
import { SOLVED } from '../../core/faces';
import { applyMove, applyMoves, invertMove, type Move } from '../../core/moves';
import { daisyBase } from '../../course/petal';
import { CORNERS, EDGES, followCells } from '../../course/pieces';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';

/** 소개 한 장: 처음 모습, 반짝일 칸, 보여 줄 회전들(없으면 멈춘 그림), 설명 문구 */
interface Slide {
  /** 처음 모습 (없으면 다 맞춘 큐브) */
  base?: string;
  /** 처음에 함께 밝게 보여 줄 같은 종류 조각 전부 (예: 모서리 12개) */
  all?: number[];
  cells: number[];
  /** 차례로 돌린 뒤 거꾸로 되돌리기를 반복한다 (finish가 있으면 되돌리지 않는다) */
  moves: Move[];
  /** 다 돌리면 이 칸들을 반짝인 뒤 처음 모습으로 돌아가 다시 돌린다 (꽃잎 올리기: 꽃잎 4개) */
  finish?: number[];
  text: MessageKey;
}

/** 흰 꽃 소개 그림들: 다 된 흰 꽃, 꽃잎이 옆에 / 바닥에 / 자리가 차 있을 때 */
const DAISY = daisyBase();
const UF = [7, 19];
const PETALS = [1, 3, 5, 7];
const after = (moves: Move[]) => ({ base: applyMoves(DAISY, moves), cells: moves.reduce((c, m) => followCells(c, m), UF), finish: PETALS });

export const SLIDES: Record<'center' | 'edge' | 'corner' | 'home' | 'daisy' | 'petalSide' | 'petalBottom' | 'petalBusy', Slide> = {
  center: { cells: [4, 13, 22, 31, 40, 49], moves: ['F'], text: 'introCenter' },
  edge: { all: EDGES.flat(), cells: [7, 19], moves: ['F'], text: 'introEdge' },
  corner: { all: CORNERS.flat(), cells: [8, 9, 20], moves: ['R'], text: 'introCorner' },
  home: { cells: [4, 5, 10, 13], moves: [], text: 'introHome' },
  daisy: { base: DAISY, cells: [1, 3, 4, 5, 7], moves: ['U'], text: 'introDaisy' },
  petalSide: { ...after(['F']), moves: ["F'"], text: 'introPetalSide' },
  petalBottom: { ...after(['F2']), moves: ['F', 'F'], text: 'introPetalBottom' },
  petalBusy: { ...after(['F', 'U']), moves: ["U'", "F'"], text: 'introPetalBusy' },
};
export type SlideId = keyof typeof SLIDES;

/** 멈춰서 보여 주는 시간과 회전 시간(ms) */
const STILL_MS = 1300;
const TURN_MS = 1200;
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
  const slide = SLIDES[slides[k]];
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
    const timer = setTimeout(() => setView((v) => ({ ...v, move, id: v.id + 1 })), STILL_MS);
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
        <Cube3D state={view.state} move={view.move} playId={view.id} duration={TURN_MS} highlight={showAll ? slide.all : finished ? slide.finish : view.cells} keepHighlight glow flash={flash} onAnimationEnd={turned} />
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
