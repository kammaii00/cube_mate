// 5~8단계(노란 십자 → 노란 면 → 꼭짓점 자리 → 모서리 자리): 윗줄 돌리기와 공식 하나만으로 맞춘다.
// 큐브를 통째로 돌리지 않으므로 아이는 "모양을 맞춰 잡고 → 공식"만 반복하면 된다.
import { CORNER_FACELETS, EDGE_FACELETS } from '../../core/validate';
import { FORMULAS, type FormulaId, type LessonBuilder, type Why } from './lesson';
import { CORNERS, EDGES, topStickerOnly, trackCorner, trackEdge } from './pieces';
import { U_TURNS, makeMacro, searchPath, type Tracked } from './search';

// 윗면 모서리 4칸 중 노란 칸의 모양(점 / ㄴ자 / 일자)을 알아낸다
function crossShape(state: string): Why {
  const yellow = state[4];
  const [back, left, right, front] = [1, 3, 5, 7].map((i) => state[i] === yellow);
  if (!back && !left && !right && !front) return 'shapeDot';
  return (back && front) || (left && right) ? 'shapeLine' : 'shapeL';
}

// 한 단계를 푼다: "윗줄 돌리기 + 공식 하나"의 가장 짧은 조합을 찾아 묶음으로 기록한다
function runStage(
  b: LessonBuilder, stage: number, tracked: Tracked[], piece: number[],
  formula: FormulaId, setupWhy: Why, whyOf: (state: string) => Why,
): void {
  const macros = [...U_TURNS, makeMacro(FORMULAS[formula].join(' '))];
  const path = searchPath(tracked, macros, 12);
  if (!path) throw new Error(`초보자 풀이 실패: ${stage + 1}단계`);
  b.begin(stage, piece);
  for (const index of path) {
    if (index < U_TURNS.length) b.add('setup', macros[index].moves, setupWhy);
    else b.formula(formula, 1, whyOf(b.state));
  }
  b.end();
}

// 5~8단계를 차례로 진행한다
export function solveLastLayer(b: LessonBuilder): void {
  const edgesUp = () => EDGES.top.flatMap((s) => topStickerOnly(trackEdge(b.state, s)));
  const cornersUp = () => CORNERS.top.flatMap((s) => topStickerOnly(trackCorner(b.state, s)));
  const cornersHome = () => CORNERS.top.flatMap((s) => trackCorner(b.state, s));
  const edgesHome = () => EDGES.top.flatMap((s) => trackEdge(b.state, s));
  const topFace = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const topCorners = CORNERS.top.flatMap((s) => CORNER_FACELETS[s]);
  const topEdges = EDGES.top.flatMap((s) => EDGE_FACELETS[s]);

  runStage(b, 4, edgesUp(), topFace, 'cross', 'setupShape', crossShape);
  runStage(b, 5, [...edgesUp(), ...cornersUp()], topFace, 'fish', 'setupShape', () => 'fish');
  runStage(b, 6, [...edgesUp(), ...cornersHome()], topCorners, 'corners', 'setupLast', () => 'swapCorners');
  runStage(b, 7, [...cornersHome(), ...edgesHome()], topEdges, 'edges', 'setupLast', () => 'cycleEdges');
}
