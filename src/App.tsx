// 앱의 최상위: 어떤 화면을 보여줄지와 화면 사이에 넘길 데이터를 관리한다
import { useEffect, useState } from 'react';
import { SOLVED, emptyState } from './core/faces';
import { applyMoves, type Move } from './core/moves';
import { CourseScreen } from './features/course/CourseScreen';
import { DoneScreen } from './features/done/DoneScreen';
import { EditScreen } from './features/edit/EditScreen';
import { GuideScreen } from './features/guide/GuideScreen';
import { LearnScreen } from './features/learn/LearnScreen';
import { formulaUse } from './features/learn/frames';
import { HomeScreen } from './features/home/HomeScreen';
import { ScanScreen } from './features/scan/ScanScreen';
import { recordSolve, rewardFor, type SolveReward } from './rewards/store';
import { warmUpSolver, type Solution } from './solver/solverClient';

type Screen = 'home' | 'scan' | 'edit' | 'guide' | 'done' | 'course';

// 홈 → 스캔/입력 → 확인 → 풀이 안내 → 완성 순서로 화면을 전환한다
export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [cubeState, setCubeState] = useState(emptyState);
  const [source, setSource] = useState<'manual' | 'scan' | 'scanUnsure'>('manual');
  const [solution, setSolution] = useState<Solution>({ start: emptyState(), moves: [], missions: null });
  /** 빨리 맞추기 도중 '달라'에서 다시 길을 찾은 횟수 (안내 화면을 새로 시작하는 데 쓴다) */
  const [recovered, setRecovered] = useState(0);
  const [reward, setReward] = useState<SolveReward>(() => rewardFor(0));

  // 앱이 열리면 풀이 엔진 준비를 미리 시작한다
  useEffect(() => warmUpSolver(), []);

  // 확인·수정 화면을 주어진 큐브 상태로 연다
  function openEditor(state: string, from: 'manual' | 'scan' | 'scanUnsure') {
    setCubeState(state);
    setSource(from);
    setScreen('edit');
  }

  // 큐브를 다 맞추면 스티커 한 장을 기록하고 완성 화면으로 간다
  function finish() {
    setReward(recordSolve());
    setScreen('done');
  }

  // '달라'에서 지금 모습을 찾았을 때: 그 모습에서 새 풀이로 안내를 다시 시작한다 (남은 회전이 없으면 완성)
  function resumeFrom(start: string, moves: Move[]) {
    if (!moves.length) return finish();
    setSolution({ start, moves, missions: null });
    setRecovered((n) => n + 1);
  }

  // 지금 모습을 못 찾았을 때: 카메라로 전부 찍거나, 받은 면을 채운 채 색 입력 화면으로 간다
  function reenter(state: string, how: 'scan' | 'paint') {
    if (how === 'scan') setScreen('scan');
    else openEditor(state, 'manual');
  }

  switch (screen) {
    case 'scan':
      return (
        <ScanScreen
          onComplete={(state, exact) => openEditor(state, exact ? 'scan' : 'scanUnsure')}
          onManual={() => openEditor(emptyState(), 'manual')}
          onBack={() => setScreen('home')}
        />
      );
    case 'edit':
      return (
        <EditScreen
          key={cubeState}
          initialState={cubeState}
          source={source}
          onSolved={(solved, state) => {
            setRecovered(0);
            setCubeState(state);
            setSolution(solved);
            setScreen('guide');
          }}
          onBack={() => setScreen('home')}
        />
      );
    case 'guide':
      if (solution.missions) {
        return <LearnScreen solution={solution} onDone={finish} onBack={() => setScreen('edit')} onReenter={(state) => openEditor(state, 'manual')} />;
      }
      return (
        <GuideScreen
          key={recovered}
          solution={solution}
          resumed={recovered > 0}
          onDone={finish}
          onBack={() => setScreen('edit')}
          onRecovered={resumeFrom}
          onReenter={reenter}
        />
      );
    case 'done':
      return (
        <DoneScreen
          state={solution.missions ? applyMoves(solution.start, solution.moves) : SOLVED}
          formulas={solution.missions ? formulaUse(solution.missions) : null}
          moveCount={solution.moves.length}
          reward={reward}
          onRestart={() => setScreen('home')}
        />
      );
    case 'course':
      return (
        <CourseScreen onHome={() => setScreen('home')} />
      );
    default:
      return (
        <HomeScreen
          onScan={() => setScreen('scan')}
          onManual={() => openEditor(emptyState(), 'manual')}
          onCourse={() => setScreen('course')}
        />
      );
  }
}
