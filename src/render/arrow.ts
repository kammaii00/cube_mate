// 풀이 안내에서 "이 줄을 이쪽으로 돌려요"를 알려주는 3D 화살표
import * as THREE from 'three';
import type { Face, Vec3 } from '../core/faces';

/** 화살표 자리: 어느 보이는 면 위에, 어느 줄에, 시계 방향 회전일 때 어느 쪽을 가리키는지 */
export interface ArrowSpot {
  normal: Vec3;
  offset: Vec3;
  dir: Vec3;
}

/** 면별 화살표 자리 */
const ARROW_SPOTS: Record<Face, ArrowSpot> = {
  R: { normal: [0, 0, 1], offset: [1, 0, 0], dir: [0, 1, 0] },
  L: { normal: [0, 0, 1], offset: [-1, 0, 0], dir: [0, -1, 0] },
  U: { normal: [0, 0, 1], offset: [0, 1, 0], dir: [-1, 0, 0] },
  D: { normal: [0, 0, 1], offset: [0, -1, 0], dir: [1, 0, 0] },
  F: { normal: [0, 1, 0], offset: [0, 0, 1], dir: [1, 0, 0] },
  B: { normal: [0, 1, 0], offset: [0, 0, -1], dir: [-1, 0, 0] },
};

// 오른쪽(+X)을 가리키는 화살표 모양을 만든다. pad만큼 바깥으로 두껍게 그릴 수 있다(테두리용).
function arrowShape(pad: number): THREE.Shape {
  const tail = -1.25 - pad;
  const neck = 0.45 - pad;
  const tip = 1.25 + pad * 1.6;
  const shaft = 0.17 + pad;
  const head = 0.46 + pad * 1.5;
  const shape = new THREE.Shape();
  shape.moveTo(tail, -shaft);
  shape.lineTo(neck, -shaft);
  shape.lineTo(neck, -head);
  shape.lineTo(tip, 0);
  shape.lineTo(neck, head);
  shape.lineTo(neck, shaft);
  shape.lineTo(tail, shaft);
  shape.closePath();
  return shape;
}

// 화살표의 한 겹(테두리 또는 속)을 만든다. 큐브 조각에 가려지지 않도록 항상 맨 위에 그린다.
function layer(pad: number, color: string, order: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape(pad)), material);
  mesh.renderOrder = order;
  return mesh;
}

export class MoveArrow {
  readonly object = new THREE.Group();
  private base = new THREE.Vector3();
  private dir = new THREE.Vector3();

  // 흰 속과 남색 테두리로 된 화살표를 만든다 (처음에는 숨김)
  constructor() {
    this.object.add(layer(0.09, '#1b2440', 10), layer(0, '#ffffff', 11));
    this.object.visible = false;
  }

  // 주어진 회전(면, 횟수)에 맞는 위치와 방향으로 화살표를 놓고 보이게 한다
  show(face: Face, turns: number): void {
    this.showAt(ARROW_SPOTS[face], turns);
  }

  // 주어진 자리에 화살표를 놓고 보이게 한다 (turns가 3이면 반대 방향)
  showAt(spot: ArrowSpot, turns: number): void {
    const normal = new THREE.Vector3(...spot.normal);
    this.dir.set(...spot.dir).multiplyScalar(turns === 3 ? -1 : 1);
    const side = new THREE.Vector3().crossVectors(normal, this.dir);
    this.object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.dir, side, normal));
    this.base.copy(normal).multiplyScalar(1.56).add(new THREE.Vector3(...spot.offset));
    this.object.position.copy(this.base);
    this.object.visible = true;
  }

  // 화살표를 숨긴다
  hide(): void {
    this.object.visible = false;
  }

  // 매 프레임: 화살표가 가리키는 방향으로 살짝 움직이게 해 눈에 띄게 한다
  animate(now: number): void {
    if (!this.object.visible) return;
    this.object.position.copy(this.base).addScaledVector(this.dir, 0.13 * Math.sin(now / 230));
  }
}
