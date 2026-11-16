// 앱의 최상위: 어떤 화면을 보여줄지와 화면 사이에 넘길 데이터를 관리한다
import { useEffect, useState } from 'react';
import { SOLVED, emptyState } from './core/faces';
import { flipUpsideDown } from './core/moves';
import { DoneScreen } from './features/done/DoneScreen';
import { EditScreen } from './features/edit/EditScreen';
import { GuideScreen } from './features/guide/GuideScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { ScanScreen } from './features/scan/ScanScreen';
import { warmUpSolver, type Solution } from './solver/solverClient';

type Screen = 'home' | 'scan' | 'edit' | 'guide' | 'done';

// 홈 → 스캔/입력 → 확인 → 풀이 안내 → 완성 순서로 화면을 전환한다
export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [cubeState, setCubeState] = useState(emptyState);
  const [source, setSource] = useState<'manual' | 'scan' | 'scanUnsure'>('manual');
  const [solution, setSolution] = useState<Solution>({ start: emptyState(), moves: [], stages: null });

  // 앱이 열리면 풀이 엔진 준비를 미리 시작한다
  useEffect(() => warmUpSolver(), []);

  // 확인·수정 화면을 주어진 큐브 상태로 연다
  function openEditor(state: string, from: 'manual' | 'scan' | 'scanUnsure') {
    setCubeState(state);
    setSource(from);
    setScreen('edit');
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
            setCubeState(state);
            setSolution(solved);
            setScreen('guide');
          }}
          onBack={() => setScreen('home')}
        />
      );
    case 'guide':
      return (
        <GuideScreen
          solution={solution}
          onDone={() => setScreen('done')}
          onBack={() => setScreen('edit')}
        />
      );
    case 'done':
      return (
        <DoneScreen
          state={solution.stages ? flipUpsideDown(SOLVED) : SOLVED}
          moveCount={solution.moves.length}
          onRestart={() => setScreen('home')}
        />
      );
    default:
      return <HomeScreen onScan={() => setScreen('scan')} onManual={() => openEditor(emptyState(), 'manual')} />;
  }
}
