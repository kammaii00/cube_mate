// 꼬마 코스(큐브 배우기 섬) 화면: 섬 지도 → 조각 알기 퀴즈 / 진짜 섞은 큐브 연습 → 결과(별·친구 구출)를 오간다
import { useEffect, useState } from 'react';
import { currentLevel, firstOpenLevel, loadCourse, markIntro, recordWin, starsOf, type WinResult } from '../../course/progress';
import { ISLANDS, WINS_PER_LEVEL, isQuick, practiceLevel, puzzleOf } from '../../course/skills';
import { useI18n, type MessageKey } from '../../i18n';
import { recordSolve, type SolveReward } from '../../rewards/store';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { CourseMap } from './CourseMap';
import { IslandTitle } from './IslandTitle';
import { LevelPicker } from './LevelPicker';
import { LevelTitle } from './LevelTitle';
import { PieceIntro, type SlideId } from './PieceIntro';
import { PracticeScreen } from './PracticeScreen';
import { PuzzleScreen } from './PuzzleScreen';
import { QuizScreen } from './QuizScreen';
import { ResultCard } from './ResultCard';
import { useSeaBackground } from './useSeaBackground';
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

/** 단계 제목 카드 옵션 */
interface TitleOptions {
  nextUp?: boolean;
  newIsland?: boolean;
  sea?: boolean;
}

// 결과 뒤 "다음" 레벨: 방금 별을 받았으면 아직 별이 없는 첫 레벨, 아니면 같은 레벨 한 번 더
function nextAfter(island: number, level: number, result: WinResult): number {
  const open = firstOpenLevel(result.data, island);
  return result.star && open >= 0 ? open : level;
}

type Phase =
  | { name: 'map' }
  /** sea: 지도에서 와서 바다 위에서 고른다 (결과 카드에서 오면 섬 안이니 체크무늬) */
  | { name: 'pick'; island: number; sea?: boolean }
  /** 새 단계 전에 제목을 크게 보여 주는 중 (nextUp: 결과 카드 "다음"으로 옴, newIsland: 처음 가는 섬, sea: 지도에서 와서 바다 위에 띄움) */
  | { name: 'title'; island: number; level: number } & TitleOptions
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
  /** 지도 말풍선 문구 (준비 중인 섬을 누르면 바뀐다) */
  const [mapNote, setMapNote] = useState<MessageKey>('courseMapHello');
  const sea = phase.name === 'map' || ((phase.name === 'title' || phase.name === 'pick') && !!phase.sea);
  useSeaBackground(sea);

  // 지도에 오면 인사한다 (자주 반복하지 않게)
  useEffect(() => {
    if (phase.name !== 'map') return;
    setMapNote('courseMapHello');
    say('courseMapHello', { cooldown: 60000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name]);

  // 준비 중인 섬을 눌렀을 때: 말풍선과 음성으로 곧 열린다고 알려 준다
  function soon() {
    setMapNote('courseSoonTap');
    say('courseSoonTap');
  }

  // 지도에서 섬을 눌렀을 때: 별을 받은 레벨이 있으면 레벨을 고르고, 처음이면 바로 지금 레벨로 간다 (둘 다 바다 위에서 보여 준다)
  function enter(island: number) {
    if (starsOf(data, island) > 0) return setPhase({ name: 'pick', island, sea: true });
    titled(island, currentLevel(data, island), { newIsland: data.wins[island].every((w) => w === 0), sea: true });
  }

  // 다른 단계로 갈 때: 제목을 먼저 크게 보여 준 뒤 그 단계를 시작한다 (지도·새 섬에서 오면 바다 위에서, 섬에 들어가는 느낌)
  function titled(island: number, level: number, options: TitleOptions = {}) {
    setPhase({ name: 'title', island, level, ...options });
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

  // 결과 카드의 다음 버튼: 섬을 다 깼으면 다음 섬의 할 레벨로(마지막 섬이면 지도), 아니면 다음 레벨이나 한 번 더
  // 같은 레벨을 한 번 더 할 때는 제목 없이 바로 시작한다
  function next(island: number, level: number, result: WinResult) {
    if (!result.rescued) {
      const to = nextAfter(island, level, result);
      return to === level ? play(island, level) : titled(island, to, { nextUp: true });
    }
    if (island + 1 < ISLANDS.length) return titled(island + 1, currentLevel(result.data, island + 1), { nextUp: true, newIsland: true, sea: true });
    setPhase({ name: 'map' });
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
  const header = (
    <header className="topbar">
      <button className="link" onClick={phase.name === 'map' ? onHome : () => setPhase({ name: 'map' })}>‹ {t('back')}</button>
      {island === null ? <h2>{t('courseTitle')}</h2> : <IslandTitle island={island} />}
      <span />
    </header>
  );
  return (
    <main className="screen guide course">
      {sea ? (
        // 바다 장면: 위는 하늘 띠(바다 지도를 내려도 뒤로 버튼과 큐비 말풍선은 위에 남는다)
        <div className="sea-top">
          {header}
          {phase.name === 'map' && <Bubble><strong className="move-title">{t(mapNote)}</strong></Bubble>}
        </div>
      ) : (
        header
      )}
      {phase.name === 'map' && <CourseMap data={data} onPick={enter} onLocked={() => say('courseLocked')} onSoon={soon} />}
      {phase.name === 'pick' && <LevelPicker data={data} island={phase.island} onPick={(level) => titled(phase.island, level, { sea: phase.sea })} />}
      {phase.name === 'title' && (
        <LevelTitle island={phase.island} level={phase.level} nextUp={!!phase.nextUp} newIsland={!!phase.newIsland} onDone={() => play(phase.island, phase.level)} />
      )}
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
            onNext={() => next(phase.island, phase.level, phase.result)}
            onMap={() => setPhase({ name: 'map' })}
          />
        </>
      )}
    </main>
  );
}
