// 연습·체험용으로 큐브를 무작위로 섞는다
import { FACES, SOLVED } from './faces';
import { applyMoves, type Move } from './moves';

// 같은 면이 연달아 나오지 않는 무작위 회전 목록을 만든다
export function randomMoves(length = 25, rand: () => number = Math.random): Move[] {
  const suffixes = ['', "'", '2'];
  const moves: Move[] = [];
  let last = '';
  while (moves.length < length) {
    const face = FACES[Math.floor(rand() * 6)];
    if (face === last) continue;
    moves.push(face + suffixes[Math.floor(rand() * 3)]);
    last = face;
  }
  return moves;
}

// 무작위로 섞인 (항상 풀 수 있는) 큐브 상태를 만든다
export function randomState(): string {
  return applyMoves(SOLVED, randomMoves());
}
