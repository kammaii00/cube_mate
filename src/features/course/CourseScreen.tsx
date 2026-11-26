// 꼬마 코스(큐브 배우기 섬) 화면: 섬 지도 → 조각 알기 퀴즈 / 진짜 섞은 큐브 연습 → 결과(별·친구 구출)를 오간다
import { useEffect, useState } from 'react';
import { currentLevel, loadCourse, markIntro, recordWin, starsOf, type WinResult } from '../../course/progress';
import { ISLANDS, WINS_PER_LEVEL, isQuick, practiceLevel, puzzleOf } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { recordSolve, type SolveReward } from '../../rewards/store';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { CourseMap } from './CourseMap';
import { LevelPicker } from './LevelPicker';
import { PieceIntro, type SlideId } from './PieceIntro';
import { PracticeScreen } from './PracticeScreen';
import { PuzzleScreen } from './PuzzleScreen';
import { QuizScreen } from './QuizScreen';
import { ResultCard } from './ResultCard';
import '../done/rewards.css';
import './course.css';

interface Props {
  onHome: () => void;
}

/** 레벨에 처음 들어갈 때 보여 줄 소개 (번호 = 섬 × 10 + 레벨).
 * 조각 알기: 모서리 찾기 전엔 가운데·모서리, 꼭짓점 찾기 전엔 꼭짓점, 집 찾기 전엔 집.
 * 흰 꽃: 흰 꽃 모습과 옆 꽃잎 올리기, 아래 꽃잎, 자리 비우기.
 * 흰 십자: 흰 십자 모습과 꽃잎 내리기, 색 맞춰 내리기. 1층: 1층 모습과 오른손 춤 한 번, 여러 번, 데려와서 춤 */
const INTRO: Record<number, SlideId[]> = {
  0: ['center', 'edge'],
  1: ['corner'],
  2: ['home'],
  10: ['daisy', 'petalSide'],
  11: ['petalBottom'],
  12: ['petalBusy'],
  20: ['cross', 'crossDrop'],
  21: ['crossMatch'],
  30: ['layer', 'cornerDance1'],
  31: ['cornerDanceMore'],
  32: ['cornerBring'],
};
const introId = (island: number, level: number) => island * 10 + level;
/** 진짜 큐브 연습에서 막혔을 때 다시 볼 소개 (섬마다 화면 연습에서 배운 방법들) */
const REVIEW: Record<number, SlideId[]> = {
  1: ['petalSide', 'petalBottom', 'petalBusy'],
  2: ['crossDrop', 'crossMatch'],
  3: ['cornerDance1', 'cornerDanceMore', 'cornerBring'],
};

// 결과 뒤 "다음" 레벨: 방금 별을 받았고 다음 레벨이 있으면 다음, 아니면 같은 레벨 한 번 더
function nextAfter(island: number, level: number, result: WinResult): number {
  return result.star && level + 1 < ISLANDS[island].levels.length ? level + 1 : level;
}

type Phase =
  | { name: 'map' }
  | { name: 'pick'; island: number }
  | { name: 'intro'; island: number; level: number }
  /** review: 별을 이미 받은 빠른 레벨(퀴즈·화면 연습)을 복습 중일 때 이번 판에서 맞힌 수 (3개면 한 판 끝) */
  | { name: 'play'; island: number; level: number; no: number; review?: number }
  | { name: 'result'; island: number; level: number; helped: boolean; counted: boolean; result: WinResult; sticker: SolveReward | null; review?: boolean };

// 섬과 문제 사이를 오가며 기록을 저장한다
export function CourseScreen({ onHome }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [data, setData] = useState(loadCourse);
  const [phase, setPhase] = useState<Phase>({ name: 'map' });
  const [count, setCount] = useState(0);

  // 지도에 오면 인사한다 (자주 반복하지 않게)
  useEffect(() => {
    if (phase.name === 'map') say('courseMapHello', { cooldown: 60000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name]);

  // 지도에서 섬을 눌렀을 때: 별을 받은 레벨이 있으면 레벨을 고르고, 처음이면 바로 지금 레벨로 간다
  function enter(island: number) {
    if (starsOf(data, island) > 0) return setPhase({ name: 'pick', island });
    play(island, currentLevel(data, island));
  }

  // 그 레벨로 문제(퀴즈 하나 / 화면 연습 하나 / 진짜 큐브 연습 한 번)를 시작한다. 처음이면 소개부터
  function play(island: number, level: number, review = 0) {
    const id = introId(island, level);
    if (INTRO[id] && !data.intro.includes(id)) return setPhase({ name: 'intro', island, level });
    start(island, level, review);
  }

  // 문제를 바로 시작한다 (별 받은 빠른 레벨이면 복습 한 판으로)
  function start(island: number, level: number, review: number) {
    setCount((n) => n + 1);
    const reviewing = isQuick(ISLANDS[island], level) && data.wins[island][level] >= WINS_PER_LEVEL;
    setPhase({ name: 'play', island, level, no: count + 1, review: reviewing ? review : undefined });
  }

  // 소개를 다 봤을 때: 기록하고 문제를 시작한다
  function introDone(island: number, level: number) {
    setData((d) => markIntro(d, introId(island, level)));
    start(island, level, 0);
  }

  // 성공을 기록한다. 퀴즈는 별·구출이 없으면 결과 카드 없이 바로 다음 문제로 간다
  function won(island: number, level: number, helped: boolean, review?: number) {
    const info = ISLANDS[island];
    // 복습: 3문제를 맞히면 한 판 끝 (별·기록은 그대로)
    if (review !== undefined) {
      if (review + 1 < WINS_PER_LEVEL) return play(island, level, review + 1);
      return setPhase({ name: 'result', island, level, helped: false, counted: false, result: { data, star: false, rescued: false }, sticker: null, review: true });
    }
    const quick = isQuick(info, level);
    const counted = quick ? !helped : practiceLevel(info, level).together || !helped;
    const result = recordWin(data, island, level, counted);
    setData(result.data);
    if (quick && !result.star && !result.rescued) return play(island, level);
    setPhase({ name: 'result', island, level, helped, counted, result, sticker: result.rescued ? recordSolve() : null });
  }

  if (phase.name === 'play' && !isQuick(ISLANDS[phase.island], phase.level))
    return (
      <PracticeScreen
        key={phase.no}
        island={phase.island}
        stage={ISLANDS[phase.island].stage!}
        alone={!practiceLevel(ISLANDS[phase.island], phase.level).together}
        review={REVIEW[phase.island]}
        onWin={(helped) => won(phase.island, phase.level, helped)}
        onBack={() => setPhase({ name: 'map' })}
      />
    );

  const island = phase.name === 'map' ? null : phase.island;
  return (
    <main className="screen guide course">
      <header className="topbar">
        <button className="link" onClick={phase.name === 'map' ? onHome : () => setPhase({ name: 'map' })}>‹ {t('back')}</button>
        <h2>{island === null ? t('courseTitle') : t(`island${island}Name` as MessageKey)}</h2>
        <span />
      </header>
      {phase.name === 'map' && (
        <>
          <Bubble><strong className="move-title">{t('courseMapHello')}</strong></Bubble>
          <CourseMap data={data} onPick={enter} onLocked={() => say('courseLocked')} />
        </>
      )}
      {phase.name === 'pick' && <LevelPicker data={data} island={phase.island} onPick={(level) => play(phase.island, level)} />}
      {phase.name === 'intro' && <PieceIntro slides={INTRO[introId(phase.island, phase.level)]} onDone={() => introDone(phase.island, phase.level)} />}
      {phase.name === 'play' && puzzleOf(ISLANDS[phase.island], phase.level) && (
        <PuzzleScreen
          key={phase.no}
          kind={puzzleOf(ISLANDS[phase.island], phase.level)!}
          onAnswer={(firstTry) => won(phase.island, phase.level, !firstTry, phase.review)}
          onIntro={() => setPhase({ name: 'intro', island: phase.island, level: phase.level })}
          wins={phase.review ?? data.wins[phase.island][phase.level]}
          review={phase.review !== undefined}
        />
      )}
      {phase.name === 'play' && ISLANDS[phase.island].kind === 'quiz' && (
        <QuizScreen
          key={phase.no}
          kind={ISLANDS[phase.island].quiz![phase.level]}
          onAnswer={(firstTry) => won(phase.island, phase.level, !firstTry, phase.review)}
          onIntro={() => setPhase({ name: 'intro', island: phase.island, level: phase.level })}
          wins={phase.review ?? data.wins[phase.island][phase.level]}
          review={phase.review !== undefined}
        />
      )}
      {phase.name === 'result' && (
        <>
          <ResultCard
            island={phase.island}
            level={phase.level}
            helped={phase.helped}
            counted={phase.counted}
            result={phase.result}
            sticker={phase.sticker}
            review={phase.review}
            onLevels={() => setPhase({ name: 'pick', island: phase.island })}
            onNext={() => (phase.result.rescued ? setPhase({ name: 'map' }) : play(phase.island, nextAfter(phase.island, phase.level, phase.result)))}
            onMap={() => setPhase({ name: 'map' })}
          />
        </>
      )}
    </main>
  );
}
