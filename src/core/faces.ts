// 큐브의 면·색·칸 위치에 대한 기본 정의 (화면과 무관한 순수 데이터)

export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type Face = (typeof FACES)[number];
/** 칸 하나의 값: 면 글자(=색) 또는 아직 입력 안 됨('?') */
export type Sticker = Face | '?';
export type Vec3 = [number, number, number];

/** 다 맞춰진 큐브 (54칸, U→R→F→D→L→B 순서) */
export const SOLVED = FACES.map((f) => f.repeat(9)).join('');

/** 면별 색상: 흰색 위, 초록 앞 기준의 표준 배색 */
export const FACE_COLORS: Record<Face, string> = {
  U: '#f5f5f5',
  R: '#d7263d',
  F: '#1fa64a',
  D: '#ffd60a',
  L: '#ff7b1c',
  B: '#1c5fd4',
};

/** 면이 바라보는 방향 (x: 오른쪽, y: 위, z: 앞) */
export const FACE_NORMALS: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

export interface FaceletInfo {
  face: Face;
  /** 이 칸이 붙어 있는 조각의 위치 (-1, 0, 1) */
  pos: Vec3;
  /** 이 칸이 바라보는 방향 */
  normal: Vec3;
}

// 칸 번호(0~53)를 3D 위치와 방향으로 바꾼다
export function faceletInfo(index: number): FaceletInfo {
  const face = FACES[Math.floor(index / 9)];
  const r = Math.floor((index % 9) / 3);
  const c = index % 3;
  const posByFace: Record<Face, Vec3> = {
    U: [c - 1, 1, r - 1],
    R: [1, 1 - r, 1 - c],
    F: [c - 1, 1 - r, 1],
    D: [c - 1, -1, 1 - r],
    L: [-1, 1 - r, c - 1],
    B: [1 - c, 1 - r, -1],
  };
  return { face, pos: posByFace[face], normal: FACE_NORMALS[face] };
}

/** 54칸 전체의 위치 정보 (미리 계산) */
export const FACELETS: FaceletInfo[] = Array.from({ length: 54 }, (_, i) => faceletInfo(i));

// 면 글자와 칸 순서(0~8)로 칸 번호를 구한다
export function faceletIndex(face: Face, cell: number): number {
  return FACES.indexOf(face) * 9 + cell;
}

// 가운데 칸만 채워진 빈 큐브 상태를 만든다
export function emptyState(): string {
  return FACES.map((f) => '????' + f + '????').join('');
}
