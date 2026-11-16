// 풀이 계산을 화면과 분리된 백그라운드(워커)에서 수행한다.
// 계산에 시간이 걸려도 화면이 멈추지 않게 하기 위함이다.
import Cube from 'cubejs';
import { solveBeginner } from './beginner';

let ready = false;

// 빠른 풀이 엔진의 준비 계산을 (한 번만) 수행한다
function ensureReady(): void {
  if (ready) return;
  Cube.initSolver();
  ready = true;
}

// 빠른 풀이: 22회전 이하의 풀이를 회전 문자열로 돌려준다
function solveFast(facelets: string): string {
  ensureReady();
  const cube = Cube.fromString(facelets);
  return cube.isSolved() ? '' : cube.solve();
}

// 화면 쪽에서 온 요청(준비/빠른 풀이/배우며 풀기)을 처리하고 결과를 돌려보낸다
self.onmessage = (event: MessageEvent) => {
  const { type, id, facelets } = event.data;
  try {
    if (type === 'init') {
      ensureReady();
      self.postMessage({ type: 'ready' });
    } else if (type === 'learn') {
      self.postMessage({ type: 'done', id, result: solveBeginner(facelets) });
    } else {
      self.postMessage({ type: 'done', id, result: solveFast(facelets) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, message: String(error) });
  }
};
