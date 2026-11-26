// 꼬마 코스의 섬 정의: 조각 알기 퀴즈(화면만) → 진짜 섞은 큐브로 흰 꽃 → 흰 십자 → 1층
import type { Face } from '../core/faces';
import type { PuzzleKind } from './puzzle';

/** 구해 줄 친구의 모양: 가운데 조각(한 색) / 모서리(두 색) / 꼭짓점(세 색) */
export type FriendShape = 'center' | 'edge' | 'corner';

/** 퀴즈 레벨: 모서리 찾기 / 꼭짓점 찾기 / 이 조각은 어디로 가야 할까 */
export type QuizKind = 'findEdge' | 'findCorner' | 'whereEdge';

/** 진짜 연습 레벨: together면 큐비한테 보여 주고 배우기를 써도 성공으로 센다, 아니면 혼자 한 것만 */
export interface PracticeLevel {
  together: boolean;
}

/** 화면 연습 레벨: 화면 속 큐브를 버튼으로 돌려 조각 하나 제자리로 (꽃잎 올리기·내리기, 꼭짓점 넣기) */
export interface PuzzleLevel {
  puzzle: PuzzleKind;
}

/** 레벨 하나: 퀴즈 종류 / 진짜 큐브 연습 / 화면 연습 */
export type CourseLevel = QuizKind | PracticeLevel | PuzzleLevel;

export interface Island {
  id: number;
  kind: 'quiz' | 'practice';
  friend: { shape: FriendShape; colors: Face[] };
  /** quiz: 레벨별 문제 종류 */
  quiz?: QuizKind[];
  /** practice: 초보자 풀이의 몇 번째 단계까지 하는지 (0 흰 꽃, 1 흰 십자, 2 1층) */
  stage?: number;
  /** 레벨들 (practice 섬은 화면 연습 레벨 뒤에 진짜 큐브 연습 레벨) */
  levels: CourseLevel[];
}

const PRACTICE_LEVELS: PracticeLevel[] = [{ together: true }, { together: false }];

export const ISLANDS: Island[] = [
  {
    id: 0,
    kind: 'quiz',
    friend: { shape: 'center', colors: ['U'] },
    quiz: ['findEdge', 'findCorner', 'whereEdge'],
    levels: ['findEdge', 'findCorner', 'whereEdge'],
  },
  {
    id: 1,
    kind: 'practice',
    friend: { shape: 'edge', colors: ['U', 'F'] },
    stage: 0,
    levels: [{ puzzle: 'side' }, { puzzle: 'bottom' }, { puzzle: 'busy' }, ...PRACTICE_LEVELS],
  },
  {
    id: 2,
    kind: 'practice',
    friend: { shape: 'edge', colors: ['U', 'R'] },
    stage: 1,
    levels: [{ puzzle: 'drop' }, { puzzle: 'match' }, ...PRACTICE_LEVELS],
  },
  {
    id: 3,
    kind: 'practice',
    friend: { shape: 'corner', colors: ['U', 'F', 'R'] },
    stage: 2,
    levels: [{ puzzle: 'dance1' }, { puzzle: 'danceMore' }, { puzzle: 'bring' }, ...PRACTICE_LEVELS],
  },
];

// 진짜 연습 레벨 정보를 꺼낸다
export function practiceLevel(island: Island, level: number): PracticeLevel {
  return island.levels[level] as PracticeLevel;
}

// 화면 연습 레벨이면 그 종류, 아니면 null
export function puzzleOf(island: Island, level: number): PuzzleKind | null {
  const info = island.levels[level];
  return typeof info === 'object' && 'puzzle' in info ? info.puzzle : null;
}

// 화면에서 빨리 푸는 레벨인지 (퀴즈·화면 연습: 맞히면 결과 카드 없이 바로 다음 문제, 도움 없이 맞혀야 셈)
export function isQuick(island: Island, level: number): boolean {
  return island.kind === 'quiz' || puzzleOf(island, level) !== null;
}

/** 한 레벨에서 별을 받으려면 성공해야 하는 횟수 (퀴즈는 처음에 맞힌 문제, 연습은 다 맞춘 횟수) */
export const WINS_PER_LEVEL = 3;
