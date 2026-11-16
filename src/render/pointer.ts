// 보이지 않는 면이나 조각, 들어갈 자리를 가리키는 "말풍선 화살표"와 자리 표시 상자
import * as THREE from 'three';
import type { Vec3 } from '../core/faces';
import { layer } from './arrow';

/** 화살표 종류: 찾을 조각 / 들어갈 자리 */
export type PointerTone = 'piece' | 'slot';

const TONES: Record<PointerTone, { fill: string; pill: string }> = {
  piece: { fill: '#ffffff', pill: '#1b2440' },
  slot: { fill: '#ff3db8', pill: '#ff3db8' },
};
const ARROW_SCALE = 0.55;
/** 화살표 중심이 면에서 떨어진 거리 */
const GAP = 0.95;
/** 큐브 밖에서 가리킬 때의 화살표 크기 */
const OUTSIDE_SCALE = 0.45;
/** 큐브 밖 화살표가 수평에서 기울 수 있는 정도 (sin 값, 0.6이면 약 37°) */
const MAX_SLANT = 0.6;

// 글자가 든 알약 모양 이름표 그림을 만든다
function labelTexture(text: string, color: string): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = '700 46px "Jua", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 56;
  canvas.width = width;
  canvas.height = 84;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, 76, 38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, 46);
  return { texture: new THREE.CanvasTexture(canvas), aspect: width / 84 };
}

export class Pointer {
  readonly object = new THREE.Group();
  private arrow = new THREE.Group();
  private fill: THREE.Mesh;
  private sprite = new THREE.Sprite();
  private base = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private cache = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>();

  // view는 카메라가 큐브를 바라보는 방향(큐브 중심에서 카메라 쪽)의 단위 벡터
  constructor(private view: THREE.Vector3) {
    this.fill = layer(0, '#ffffff', 13);
    this.arrow.add(layer(0.09, '#1b2440', 12), this.fill);
    this.arrow.scale.setScalar(ARROW_SCALE);
    this.sprite.renderOrder = 14;
    this.object.add(this.arrow, this.sprite);
    this.object.visible = false;
  }

  // 큐브 밖(화면에서 큐브 모습 바깥)에서 target을 가리키는 화살표와 이름표를 보여준다.
  // 뒤쪽·아래쪽처럼 큐브에 가려진 곳을 가리킬 때 쓴다. 큐브 중심에서 target이 보이는 쪽으로 화살표를 뺀다.
  showOutside(target: Vec3, out: Vec3, label: string, tone: PointerTone): void {
    const up = new THREE.Vector3(0, 1, 0);
    up.addScaledVector(this.view, -up.dot(this.view)).normalize();
    const right = new THREE.Vector3().crossVectors(up, this.view);
    const t = new THREE.Vector3(...target);
    const o = new THREE.Vector3(...out);
    let dx = t.dot(right), dy = t.dot(up);
    if (Math.hypot(dx, dy) < 0.4) {
      dx = o.dot(right);
      dy = o.dot(up);
    }
    if (Math.hypot(dx, dy) < 0.05) dy = -1;
    // 화면 위·아래 가장자리에서 잘리지 않도록, 가리키는 방향은 옆쪽(좌우)으로 기울인다
    let ax = dx / Math.hypot(dx, dy), ay = dy / Math.hypot(dx, dy);
    if (Math.abs(ay) > MAX_SLANT) {
      ax = (dx < 0 ? -1 : 1) * Math.sqrt(1 - MAX_SLANT * MAX_SLANT);
      ay = Math.sign(ay) * MAX_SLANT;
    }
    const away = right.clone().multiplyScalar(ax).addScaledVector(up, ay);
    // 큐브 모습이 그 방향으로 얼마나 뻗어 있는지(가장 먼 모서리)를 구해 그 바깥에 놓는다
    let reach = 0;
    for (const sx of [-1.5, 1.5]) for (const sy of [-1.5, 1.5]) for (const sz of [-1.5, 1.5])
      reach = Math.max(reach, new THREE.Vector3(sx, sy, sz).dot(away));
    const scale = OUTSIDE_SCALE;
    this.dir.copy(away).negate();
    const side = new THREE.Vector3().crossVectors(this.view, this.dir);
    this.arrow.scale.setScalar(scale);
    this.arrow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.dir, side, this.view));
    this.base.copy(away).multiplyScalar(reach + 0.3 + 1.25 * scale);
    this.finish(label, tone, up.clone().multiplyScalar(0.8));
  }

  // target(큐브 겉면의 점)을 바깥쪽(out)에서 가리키는 화살표와 이름표를 보여준다
  show(target: Vec3, out: Vec3, label: string, tone: PointerTone): void {
    const outward = new THREE.Vector3(...out).normalize();
    const toward = outward.clone().negate();
    // 화면과 나란한 평면 위에서 "자리 쪽"을 가리키는 방향
    this.dir.copy(toward).addScaledVector(this.view, -toward.dot(this.view));
    if (this.dir.lengthSq() < 1e-4) this.dir.set(0, -1, 0);
    this.dir.normalize();
    const side = new THREE.Vector3().crossVectors(this.view, this.dir);
    this.arrow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.dir, side, this.view));
    this.base.set(...target).addScaledVector(outward, GAP);
    this.arrow.scale.setScalar(ARROW_SCALE);
    const up = new THREE.Vector3(0, 1, 0);
    up.addScaledVector(this.view, -up.dot(this.view)).normalize();
    this.finish(label, tone, up.multiplyScalar(0.8));
  }

  // 화살표 색과 이름표(화살표 중심에서 labelOffset만큼 띄워서)를 정하고 보이게 한다
  private finish(label: string, tone: PointerTone, labelOffset: THREE.Vector3): void {
    (this.fill.material as THREE.MeshBasicMaterial).color.set(TONES[tone].fill);
    this.sprite.visible = label !== '';
    if (label) {
      const key = tone + label;
      if (!this.cache.has(key)) this.cache.set(key, labelTexture(label, TONES[tone].pill));
      const { texture, aspect } = this.cache.get(key)!;
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
      this.sprite.material.dispose();
      this.sprite.material = material;
      this.sprite.scale.set(0.66 * aspect, 0.66, 1);
      this.sprite.position.copy(labelOffset).addScaledVector(this.dir, -0.35).add(this.base);
    }
    this.object.visible = true;
  }

  // 숨긴다
  hide(): void {
    this.object.visible = false;
  }

  // 매 프레임: 화살표가 가리키는 쪽으로 살짝 움직이고, 이름표가 화면 밖으로 나가지 않게 붙잡는다
  animate(now: number, camera: THREE.Camera): void {
    if (!this.object.visible) return;
    this.arrow.position.copy(this.base).addScaledVector(this.dir, 0.12 * Math.sin(now / 230));
    this.object.updateWorldMatrix(true, false);
    const world = this.sprite.position.clone().applyMatrix4(this.object.matrixWorld);
    const ndc = world.clone().project(camera);
    const mx = Math.min(0.9, (this.sprite.scale.x * 0.5) / 2.6 + 0.04);
    ndc.x = Math.max(-1 + mx, Math.min(1 - mx, ndc.x));
    ndc.y = Math.max(-0.88, Math.min(0.88, ndc.y));
    this.sprite.position.copy(ndc.unproject(camera)).applyMatrix4(this.object.matrixWorld.clone().invert());
  }
}
