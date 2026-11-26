// 소개 장면들: 조각 친구(가운데·모서리·꼭짓점·집), 흰 꽃 꽃잎 올리기, 흰 십자 꽃잎 내리기, 1층 오른손 춤
import { applyMoves, invertMove, type Move } from '../../core/moves';
import { DFR, FIRST_LAYER, UNDANCE } from '../../course/corner';
import { UF, YELLOW_UP, daisyBase } from '../../course/petal';
import { CORNERS, EDGES, followCells } from '../../course/pieces';
import { DANCE, keepWhite } from '../../course/puzzle';
import type { MessageKey } from '../../i18n';

/** 소개 한 장: 처음 모습, 반짝일 칸, 보여 줄 회전들(없으면 멈춘 그림), 설명 문구 */
export interface Slide {
  /** 처음 모습 (없으면 다 맞춘 큐브) */
  base?: string;
  /** 처음에 함께 밝게 보여 줄 같은 종류 조각 전부 (예: 모서리 12개) */
  all?: number[];
  cells: number[];
  /** 차례로 돌린 뒤 거꾸로 되돌리기를 반복한다 (finish가 있으면 되돌리지 않는다) */
  moves: Move[];
  /** 다 돌리면 이 칸들을 반짝인 뒤 처음 모습으로 돌아가 다시 돌린다 (예: 꽃잎 4개) */
  finish?: number[];
  /** 큐브를 뒤집어 아래(흰 면)를 보여 준다 */
  flip?: boolean;
  /** 흐리게 하지 않고 늘 밝게 둘 칸 (꽃잎 소개: 노란 가운데와 꽃잎 자리) */
  bright?: number[];
  /** 빨리 돌린다 (오른손 춤처럼 회전이 많을 때) */
  fast?: boolean;
  text: MessageKey;
}

/** 흰 꽃 소개 그림들: 다 된 흰 꽃, 꽃잎이 옆에 / 바닥에 / 자리가 차 있을 때 */
const DAISY = daisyBase();
const PETALS = [1, 3, 5, 7];
// 꽃잎 자리에 흰색이 아닌 조각이 있으면 그 조각을 통째로 회색(X)으로 바꾼다
function grayNonPetals(state: string): string {
  const gray = new Set(EDGES.filter((p) => p.some((i) => PETALS.includes(i) && state[i] !== 'U')).flat());
  return [...state].map((c, i) => (gray.has(i) ? 'X' : c)).join('');
}
const after = (moves: Move[]) => ({ base: grayNonPetals(applyMoves(DAISY, moves)), cells: moves.reduce((c, m) => followCells(c, m), UF), finish: PETALS, bright: [4, ...PETALS] });

// 처음 모습에서 칸들이 회전들을 따라 어디로 가는지
const follow = (cells: number[], moves: Move[]) => moves.reduce((c, m) => followCells(c, m), cells);

/** 흰 십자: 흰 모서리와 가운데만 색을 남긴 그림. 꽃잎을 앞 가운데 위로 데려와 두 번 돌려 내린다 */
const edgesOnly = (s: string) => keepWhite(s, (p) => p.length === 2);
const CROSS_CELLS = [28, 30, 32, 34, 16, 25, 43, 52];
const drop = (setup: Move[], moves: Move[]) => {
  const cells = follow(UF, setup);
  return { base: edgesOnly(applyMoves(DAISY, setup)), cells, moves, finish: follow(cells, moves) };
};

/** 1층: 흰 조각과 가운데만 색을 남긴 그림. 꼭짓점을 춤을 거꾸로 춰서 뺀 모습에서 다시 춤으로 넣는다 */
const dance = (times: number, top: Move[] = []) => {
  const setup = [...Array.from({ length: times }, () => UNDANCE).flat(), ...top];
  const moves = [...top.map(invertMove).reverse(), ...Array.from({ length: times }, () => DANCE).flat()];
  return { base: keepWhite(applyMoves(YELLOW_UP, setup), () => true), cells: follow(DFR, setup), moves, finish: DFR, fast: true };
};

export const SLIDES = {
  center: { cells: [4, 13, 22, 31, 40, 49], moves: ['F'], text: 'introCenter' },
  edge: { all: EDGES.flat(), cells: [7, 19], moves: ['F'], text: 'introEdge' },
  corner: { all: CORNERS.flat(), cells: [8, 9, 20], moves: ['R'], text: 'introCorner' },
  home: { cells: [4, 5, 10, 13], moves: [], text: 'introHome' },
  daisy: { base: DAISY, cells: [1, 3, 4, 5, 7], moves: ['U'], text: 'introDaisy' },
  petalSide: { ...after(['F']), moves: ["F'"], text: 'introPetalSide' },
  petalBottom: { ...after(['F2']), moves: ['F', 'F'], text: 'introPetalBottom' },
  petalBusy: { ...after(['F', 'U']), moves: ["U'", "F'"], text: 'introPetalBusy' },
  cross: { base: edgesOnly(YELLOW_UP), cells: CROSS_CELLS, moves: [], flip: true, text: 'introCross' },
  crossDrop: { ...drop([], ['F', 'F']), text: 'introCrossDrop' },
  crossMatch: { ...drop(["U'"], ['U', 'F', 'F']), text: 'introCrossMatch' },
  layer: { base: keepWhite(YELLOW_UP, () => true), cells: FIRST_LAYER, moves: [], flip: true, text: 'introLayer' },
  cornerDance1: { ...dance(1), text: 'introCornerDance1' },
  cornerDanceMore: { ...dance(3), text: 'introCornerDanceMore' },
  cornerBring: { ...dance(1, ["U'"]), text: 'introCornerBring' },
} satisfies Record<string, Slide>;
export type SlideId = keyof typeof SLIDES;
