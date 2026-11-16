// 배우면서 맞추기의 "수업 계획" 자료 구조: 단계 → 미션(조각 하나) → 묶음(왜 하는지가 같은 회전들)
import { applyMoves, parseAlg, type Move } from '../../core/moves';

export const STAGE_COUNT = 8;

/** 아이가 외울 공식들. 모두 위·오른쪽·앞(화면에 보이는 면) 위주로만 돌린다 */
export const FORMULAS = {
  right: parseAlg("R U R' U'"),
  front: parseAlg("F' U' F U"),
  toRight: parseAlg("U R U' R' U' F' U F"),
  toFront: parseAlg("U' F' U F U R U' R'"),
  cross: parseAlg("F R U R' U' F'"),
  fish: parseAlg("R U R' U R U2 R'"),
  corners: parseAlg("R' F R' B2 R F' R' B2 R2"),
  edges: parseAlg("R U' R U R U R U' R' U' R2"),
} satisfies Record<string, Move[]>;
export type FormulaId = keyof typeof FORMULAS;

/** 단계마다 새로 배우는 공식 */
export const STAGE_FORMULAS: FormulaId[][] = [[], [], ['right', 'front'], ['toRight', 'toFront'], ['cross'], ['fish'], ['corners'], ['edges']];

/** 묶음의 종류: 자유롭게 돌리기 / 큐브 통째로 돌리기 / 윗줄 돌려 준비하기 / 공식 */
export type ChunkKind = 'free' | 'turnCube' | 'setup' | 'formula';

/** 그 묶음을 왜 하는지 (화면 문구의 열쇠) */
export type Why =
  | 'petal' | 'turnColor' | 'setupPetal' | 'drop'
  | 'turnSlot' | 'turnStuck' | 'setupAbove' | 'cornerRight' | 'cornerFront' | 'cornerUp' | 'cornerStuck'
  | 'setupMatch' | 'edgeFront' | 'edgeRight' | 'edgeStuck'
  | 'setupShape' | 'shapeDot' | 'shapeL' | 'shapeLine' | 'fish'
  | 'setupLast' | 'swapCorners' | 'cycleEdges';

export interface Chunk {
  kind: ChunkKind;
  moves: Move[];
  why: Why;
  /** 공식 묶음일 때: 어떤 공식을 몇 번 하는지 */
  formula?: FormulaId;
  reps?: number;
  /** 문구에 넣을 색 글자 (예: 맞춰야 하는 가운데 색) */
  color?: string;
}

export interface Mission {
  /** 단계 번호 (0~7) */
  stage: number;
  /** 이 미션에서 다루는 조각의 칸 번호들 (미션을 시작할 때의 위치) */
  piece: number[];
  chunks: Chunk[];
}

// 미션과 묶음을 차례로 쌓아 가며 큐브 상태를 함께 갱신하는 도구
export class LessonBuilder {
  missions: Mission[] = [];
  private current: Mission | null = null;

  constructor(public state: string) {}

  // 같은 상태에서 시작하는 연습용 복사본을 만든다 (어느 조각부터 할지 비교할 때 사용)
  fork(): LessonBuilder {
    return new LessonBuilder(this.state);
  }

  // 지금까지 쌓은 회전 수
  get moveCount(): number {
    return this.missions.reduce((sum, m) => sum + m.chunks.reduce((n, c) => n + c.moves.length, 0), 0);
  }

  // 새 미션을 시작한다
  begin(stage: number, piece: number[]): void {
    this.current = { stage, piece, chunks: [] };
  }

  // 묶음 하나를 추가하고 큐브에 적용한다 (회전이 없으면 아무것도 하지 않는다)
  add(kind: ChunkKind, moves: Move[], why: Why, extra: Partial<Chunk> = {}): void {
    if (!moves.length || !this.current) return;
    this.current.chunks.push({ kind, moves, why, ...extra });
    this.state = applyMoves(this.state, moves);
  }

  // 공식을 reps번 하는 묶음을 추가한다. 바로 앞 묶음이 같은 공식·같은 이유면 횟수만 늘린다.
  formula(id: FormulaId, reps: number, why: Why): void {
    const moves = Array.from({ length: reps }, () => FORMULAS[id]).flat();
    const last = this.current?.chunks[this.current.chunks.length - 1];
    if (last && last.formula === id && last.why === why) {
      last.moves = [...last.moves, ...moves];
      last.reps = (last.reps ?? 1) + reps;
      this.state = applyMoves(this.state, moves);
    } else this.add('formula', moves, why, { formula: id, reps });
  }

  // 미션을 끝낸다 (한 일이 없으면 기록하지 않는다)
  end(): void {
    if (this.current?.chunks.length) this.missions.push(this.current);
    this.current = null;
  }
}
