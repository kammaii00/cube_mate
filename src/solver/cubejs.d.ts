// cubejs 라이브러리(풀이 엔진)의 타입 선언
declare module 'cubejs' {
  export default class Cube {
    static initSolver(): void;
    static fromString(facelets: string): Cube;
    static random(): Cube;
    asString(): string;
    isSolved(): boolean;
    move(alg: string): Cube;
    solve(maxDepth?: number): string;
  }
}
