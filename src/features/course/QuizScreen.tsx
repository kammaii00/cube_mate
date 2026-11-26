// 조각 알기 섬의 문제 하나: 섞인 큐브 그림에서 조각을 찾아 누르거나, 흰 모서리의 집(옆 가운데 색)을 고른다
import { useEffect, useState } from 'react';
import type { Face } from '../../core/faces';
import { between, focusState, isHomePicked, isPicked, makeQuestion, pickedColors } from '../../course/quiz';
import { pieceAt } from '../../course/pieces';
import { WINS_PER_LEVEL, type QuizKind } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { PieceIcon } from '../../widgets/PieceIcon';

/** 맞힌 뒤 다음으로 넘어가기 전 잠깐 보여 주는 시간(ms) */
const NEXT_MS = 1300;

const ASK: Record<QuizKind, MessageKey> = { findEdge: 'quizFindEdge', findCorner: 'quizFindCorner', whereEdge: 'quizWhere' };
const TEXT: Record<QuizKind, MessageKey> = { findEdge: 'quizFindEdgeText', findCorner: 'quizFindCornerText', whereEdge: 'quizWhereText' };
const TIP: Record<QuizKind, MessageKey> = { findEdge: 'quizTipEdge', findCorner: 'quizTipCorner', whereEdge: 'quizTipWhere' };

interface Props {
  kind: QuizKind;
  /** 맞혔을 때 (firstTry: 한 번에 맞혔는지) */
  onAnswer: (firstTry: boolean) => void;
  /** 조각 소개 다시 보기 */
  onIntro: () => void;
  /** 이 레벨에서 지금까지 맞힌 횟수 (별까지 3번) */
  wins: number;
  /** 복습 중이면 true (한 번에 못 맞혀도 진행 점을 채운다) */
  review?: boolean;
}

// 문제를 보여 주고 누르기/고르기를 받는다
export function QuizScreen({ kind, onAnswer, onIntro, wins, review = false }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [q] = useState(() => makeQuestion(kind));
  const [wrong, setWrong] = useState<number[] | null>(null);
  /** 틀린 조각 깜빡임, 보는 방향 버튼 명령 (id가 바뀔 때마다 한 번) */
  const [flash, setFlash] = useState<{ cells: number[]; id: number } | null>(null);
  const [view, setView] = useState<{ kind: 'side' | 'flip' | 'reset'; id: number } | null>(null);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const names = (list: Face[]) => list.map((c) => t(('color' + c) as MessageKey)).join('-');

  // 문제가 나오면 무엇을 할지 말해 준다
  useEffect(() => {
    say(ASK[kind]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 맞혔을 때: 칭찬하고 잠깐 뒤 결과를 알린다
  function right() {
    setDone(true);
    say('quizRight');
    setTimeout(() => onAnswer(tries === 0), NEXT_MS);
  }

  // 칸을 눌렀을 때: 조각 찾기는 그 조각, 집 찾기는 그 조각의 집 자리를 눌러야 맞다
  function pick(cell: number) {
    if (done) return;
    const where = kind === 'whereEdge';
    if (where ? isHomePicked(q, cell) : isPicked(q, cell)) {
      if (where) setFlash((f) => ({ cells: q.home!, id: (f?.id ?? 0) + 1 }));
      return right();
    }
    setTries((n) => n + 1);
    setWrong(pieceAt(cell));
    setFlash((f) => ({ cells: pieceAt(cell), id: (f?.id ?? 0) + 1 }));
    say(where ? 'quizWhereWrong' : 'quizWrong');
  }

  const where = kind === 'whereEdge';
  const highlight = where ? (done ? q.home! : [...q.cells, ...q.centers!]) : done ? q.cells : null;
  const filled = wins + (done && (review || tries === 0) ? 1 : 0);
  const [a, b, c] = q.colors.map((f) => t(('color' + f) as MessageKey));
  // 틀렸을 때 알려 줄 말: 조각 찾기는 "그건 ○-○ 조각", 집 찾기는 "거긴 ○과 ○ 사이"
  const wrongText = (location: number[]) => {
    if (!where) return t('quizWrongIs', { colors: names(pickedColors(q.state, location)) });
    const sides = between(location);
    return sides ? t('quizWhereWrongIs', { a: t(('color' + sides[0]) as MessageKey), b: t(('color' + sides[1]) as MessageKey) }) : t('quizWhereEdgeOnly');
  };
  // 보는 방향 버튼을 누른다
  const turnView = (kind: 'side' | 'flip' | 'reset') => setView((v) => ({ kind, id: (v?.id ?? 0) + 1 }));
  return (
    <>
      <div className="quiz-progress" aria-label={`${filled}/${WINS_PER_LEVEL}`}>
        {Array.from({ length: WINS_PER_LEVEL }, (_, k) => <i key={k} className={k < filled ? 'on' : ''} />)}
      </div>
      <div className="cube-stage">
        <Cube3D state={where ? focusState(q, done) : q.state} highlight={highlight} glow={done || where} dim={!where} sticky view={view} flash={flash} onPick={pick} />
      </div>
      <div className="view-buttons">
        <button className="btn small" onClick={() => turnView('side')}>⟲ {t('quizView')}</button>
        <button className="btn small" onClick={() => turnView('flip')}>↕ {t('quizFlip')}</button>
        <button className="btn small" onClick={() => turnView('reset')}>{t('quizReset')}</button>
      </div>
      <Bubble tone={done ? 'good' : tries ? 'warn' : 'normal'}>
        <span className="quiz-ask">
          {!done && <PieceIcon colors={q.colors} />}
          <strong className="move-title">{done ? t(where ? 'quizHomeRight' : 'quizRight') : t(TEXT[kind], { a, b, c: c ?? '' })}</strong>
        </span>
        {wrong && !done && <small>{wrongText(wrong)}</small>}
        <small className="course-tip">{t(TIP[kind])}</small>
      </Bubble>
      <p className="hint">{t('quizDrag')}</p>
      <button className="btn small" onClick={onIntro}>{t('introAgain')}</button>
    </>
  );
}
