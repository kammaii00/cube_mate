// 화면 연습 문제 만들기: 종류에 따라 흰 꽃 / 흰 십자 / 1층 문제를 만든다
import { makeCorner } from './corner';
import { makeCross } from './cross';
import { makePetal } from './petal';
import type { CornerKind, CrossKind, PetalKind, Puzzle, PuzzleKind } from './puzzle';

const PETALS: PuzzleKind[] = ['side', 'bottom', 'busy'];
const CROSSES: PuzzleKind[] = ['drop', 'match'];

// 종류에 맞는 문제 하나를 만든다
export function makePuzzle(kind: PuzzleKind, rand = Math.random): Puzzle {
  if (PETALS.includes(kind)) return makePetal(kind as PetalKind, rand);
  if (CROSSES.includes(kind)) return makeCross(kind as CrossKind, rand);
  return makeCorner(kind as CornerKind, rand);
}
