// Three.js로 3D 큐브를 그리고 회전 애니메이션을 재생한다 (React와 무관한 순수 클래스)
// 시점은 항상 고정(위·앞·오른쪽이 보임)이라, 아이들이 손에 든 큐브와 그대로 비교할 수 있다.
import * as THREE from 'three';
import { FACELETS, FACE_COLORS, FACE_NORMALS, type Face, type Vec3 } from '../core/faces';
import { applyMove, parseMove, wholeTurns, type Move } from '../core/moves';
import { MoveArrow } from './arrow';
import { Pointer } from './pointer';
import { StickerGlow } from './glow';
import { LayerOutline } from './outline';

const UNSET_COLOR = '#b9c4d6';
/** 돌리지 않는 조각을 흐리게 만들 때 섞는 색 */
const FADE_COLOR = new THREE.Color('#dfe9f5');
/** 특정 칸만 보여줄 때 나머지 칸에 섞는 색 (흰색 칸과도 구분되도록 어둡게) */
/** 들어갈 자리 칸을 칠하는 분홍색 */
const SLOT_COLOR = new THREE.Color('#ff3db8');
const DIM_COLOR = new THREE.Color('#8a94ad');
const VIEW_DIRECTION = new THREE.Vector3(0.62, 0.55, 0.9).normalize();
const VIEW_POSITION = VIEW_DIRECTION.clone().multiplyScalar(9.8);
/** 화살표만 먼저 보여주고 회전을 시작하기까지 기다리는 시간(ms) */
const LEAD_TIME = 800;
/** 반짝임 먼저 보여주기: 돌릴 줄 테두리만 반짝이는 시간(ms), 그 뒤 화살표가 나오고 조금 있다 돈다 */
const GLOW_TIME = 1800;
const GLOW_ARROW_LEAD = 400;

/** 화면에 따로 표시할 칸들: 찾을 조각과 그 조각이 들어갈 자리 */
export interface Marks {
  piece?: number[];
  slot?: number[];
}

/** 화살표 이름표 글자 (조각, 자리). 안 보이는 쪽을 가리키는 화살표에는 이름표를 붙이지 않는다 */
export type PointerLabels = Partial<Record<'piece' | 'slot', string>>;

interface Animation {
  cubies: THREE.Group[];
  axis: THREE.Vector3;
  angle: number;
  start: number;
  duration: number;
  endState: string;
  resolve: () => void;
  /** 회전이 끝난 뒤 짚는 칸 테두리를 옮겨 붙일 칸 번호 */
  watchTo?: number;
  /** 반짝임 먼저 모드에서 아직 띄우지 않은 화살표와 띄울 시각 */
  pendingArrow?: { face: Face; turns: number; at: number } | null;
}

// 모서리가 둥근 사각형 스티커 모양을 만든다
function stickerGeometry(size: number, radius: number): THREE.ShapeGeometry {
  const h = size / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-h + radius, -h);
  shape.lineTo(h - radius, -h);
  shape.quadraticCurveTo(h, -h, h, -h + radius);
  shape.lineTo(h, h - radius);
  shape.quadraticCurveTo(h, h, h - radius, h);
  shape.lineTo(-h + radius, h);
  shape.quadraticCurveTo(-h, h, -h, h - radius);
  shape.lineTo(-h, -h + radius);
  shape.quadraticCurveTo(-h, -h, -h + radius, -h);
  return new THREE.ShapeGeometry(shape);
}

export class CubeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private root = new THREE.Group();
  private homes = new Map<THREE.Group, THREE.Vector3>();
  private stickers: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[] = [];
  /** 화살표 3개: 보통은 첫 번째만 쓰고, 큐브를 통째로 돌릴 때는 세 줄 모두에 띄운다 */
  private arrows = [new MoveArrow(), new MoveArrow(), new MoveArrow()];
  /** 보이지 않는 곳을 가리키는 화살표 2개와 들어갈 자리 상자 */
  private pointers = [new Pointer(VIEW_DIRECTION), new Pointer(VIEW_DIRECTION)];
  /** 들어갈 자리 칸들을 분홍색으로 깜빡이게 하기 위한 원래 색 */
  private pulse: { cells: number[]; colors: THREE.Color[] } | null = null;
  private labels: PointerLabels = {};
  /** 강조 칸 둘레의 반짝이는 테두리 */
  private glow = new StickerGlow();
  /** 회전 때 "이 칸이 어디로 가는지 봐!"로 짚는 칸의 분홍 테두리 (조금 두껍게) */
  private watchGlow = new StickerGlow(SLOT_COLOR, 1.1);
  /** 돌릴 줄 바깥 둘레의 노란 선 */
  private outline = new LayerOutline();
  /** 손가락으로 큐브를 돌려 본 정도(좌우, 상하). 손을 떼면 0으로 돌아간다 */
  private drag = { yaw: 0, pitch: 0, active: false, x: 0, y: 0 };
  /** true면 끌어서 돌린 방향을 손을 떼도 그대로 둔다 (퀴즈에서 뒤쪽 조각을 누를 수 있게) */
  private sticky = false;
  /** 버튼으로 돌려 보기할 때 부드럽게 따라갈 목표 방향 (sticky일 때만) */
  private viewGoal = { yaw: 0, pitch: 0 };
  /** 잠깐 깜빡이는 칸 테두리를 끌 타이머 */
  private flashTimer = 0;
  /** 누른 곳과 움직인 거리 (조금만 움직이고 떼면 "칸 누르기"로 본다) */
  private press = { x: 0, y: 0, moved: 0 };
  /** 칸을 눌렀을 때 알려 받을 함수 (꼬마 코스 조각 찾기 퀴즈) */
  private pickListener: ((cell: number) => void) | null = null;
  /** 보이지 않는 곳을 가리키는 화살표들을 담는 층 (큐브를 돌려 보는 동안은 숨긴다) */
  private pointerLayer = new THREE.Group();
  private animation: Animation | null = null;
  private frameId = 0;
  private resizeObserver: ResizeObserver;

  // 주어진 영역 안에 3D 큐브 화면을 만든다. spin이 true면 큐브가 천천히 제자리에서 돈다(완성 화면용).
  constructor(private container: HTMLElement, private spin = false) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.camera.position.copy(VIEW_POSITION);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.root);
    for (const arrow of this.arrows) this.root.add(arrow.object);
    this.pointerLayer.add(...this.pointers.map((p) => p.object));
    this.root.add(this.pointerLayer);
    this.root.add(this.outline.object);
    if (!spin) this.listenDrag();
    this.buildCube();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.tick = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.tick);
  }

  // 27개 조각과 54개 스티커를 만든다
  private buildCube(): void {
    const body = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: '#1b2440' });
    const sticker = stickerGeometry(0.84, 0.16);
    const front = new THREE.Vector3(0, 0, 1);
    const cubies = new Map<string, THREE.Group>();
    for (const info of FACELETS) {
      const key = info.pos.join(',');
      let cubie = cubies.get(key);
      if (!cubie) {
        cubie = new THREE.Group();
        cubie.add(new THREE.Mesh(body, bodyMaterial));
        const home = new THREE.Vector3(...info.pos);
        cubie.position.copy(home);
        cubies.set(key, cubie);
        this.homes.set(cubie, home);
        this.root.add(cubie);
      }
      const normal = new THREE.Vector3(...info.normal);
      const mesh = new THREE.Mesh(sticker, new THREE.MeshBasicMaterial({ color: UNSET_COLOR }));
      mesh.position.copy(normal).multiplyScalar(0.492);
      mesh.quaternion.setFromUnitVectors(front, normal);
      cubie.add(mesh);
      this.stickers.push(mesh);
    }
  }

  // 큐브를 손가락(마우스)으로 끌어 돌려 볼 수 있게 한다. 손을 떼면 처음 위치로 돌아온다.
  private listenDrag(): void {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
  }

  private onDown = (e: PointerEvent): void => {
    this.press = { x: e.clientX, y: e.clientY, moved: 0 };
    this.drag.active = true;
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.drag.active) return;
    this.press.moved += Math.abs(e.clientX - this.drag.x) + Math.abs(e.clientY - this.drag.y);
    this.drag.yaw += (e.clientX - this.drag.x) * 0.012;
    const pitch = this.drag.pitch + (e.clientY - this.drag.y) * 0.012;
    this.drag.pitch = this.sticky ? pitch : Math.max(-1.4, Math.min(1.4, pitch));
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
  };

  private onUp = (e: PointerEvent): void => {
    const tapped = this.drag.active && this.press.moved < 8;
    this.drag.active = false;
    this.viewGoal = { yaw: this.drag.yaw, pitch: this.drag.pitch };
    if (tapped && this.pickListener && e.type === 'pointerup') {
      const cell = this.pickAt(e.clientX, e.clientY);
      if (cell !== null) this.pickListener(cell);
    }
  };

  // 끌어서 돌린 방향을 그대로 둘지 정한다 (끄면 처음 방향으로 돌아간다)
  setSticky(on: boolean): void {
    this.sticky = on;
    if (!on) this.viewGoal = { yaw: 0, pitch: 0 };
  }

  // 버튼으로 큐브 보는 방향을 바꾼다: 옆으로 90°, 위아래 뒤집기, 처음 방향
  turnView(kind: 'side' | 'flip' | 'reset'): void {
    const goal = this.viewGoal;
    if (kind === 'reset') this.viewGoal = { yaw: 0, pitch: 0 };
    else if (kind === 'side') this.viewGoal = { ...goal, yaw: goal.yaw + Math.PI / 2 };
    else this.viewGoal = { ...goal, pitch: Math.abs(goal.pitch) > 1 ? 0 : Math.PI };
  }

  // 칸들 둘레에 분홍 테두리를 ms 동안 깜빡인다 (다른 칸은 어둡게 하지 않는다)
  flash(cells: number[], ms = 1300): void {
    window.clearTimeout(this.flashTimer);
    this.watchGlow.show(cells.map((i) => this.stickers[i]));
    this.flashTimer = window.setTimeout(() => this.watchGlow.hide(), ms);
  }

  // 칸을 누르면 알려 받을 함수를 정한다 (null이면 누르기를 받지 않는다)
  setPickListener(listener: ((cell: number) => void) | null): void {
    this.pickListener = listener;
  }

  // 화면의 한 점(clientX, clientY)에 보이는 스티커 칸 번호를 찾는다 (없으면 null)
  private pickAt(x: number, y: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.stickers, false)[0];
    return hit ? this.stickers.indexOf(hit.object as (typeof this.stickers)[number]) : null;
  }

  // 매 프레임: 돌려 본 만큼 큐브를 기울이고, 손을 떼면 부드럽게 처음 위치로 되돌린다
  private applyDrag(): void {
    const d = this.drag;
    if (!d.active && this.sticky) {
      d.yaw += (this.viewGoal.yaw - d.yaw) * 0.18;
      d.pitch += (this.viewGoal.pitch - d.pitch) * 0.18;
    } else if (!d.active) {
      // 가장 가까운 정면(한 바퀴 돌았으면 그만큼 덜 돌려서)으로 돌아간다
      d.yaw -= Math.round(d.yaw / (Math.PI * 2)) * Math.PI * 2;
      d.yaw *= 0.86;
      d.pitch *= 0.86;
      if (Math.abs(d.yaw) < 0.002 && Math.abs(d.pitch) < 0.002) d.yaw = d.pitch = 0;
    }
    this.root.rotation.set(d.pitch, d.yaw, 0, 'YXZ');
    this.pointerLayer.visible = Math.abs(d.yaw) + Math.abs(d.pitch) < 0.06;
  }

  // 영역 크기에 맞춰 화면 크기를 다시 맞춘다
  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // 진행 중인 애니메이션을 즉시 끝낸다
  private cancelAnimation(): void {
    const anim = this.animation;
    this.animation = null;
    this.hideArrows();
    anim?.resolve();
  }

  // 화살표를 모두 숨긴다
  private hideArrows(): void {
    for (const arrow of this.arrows) arrow.hide();
    for (const pointer of this.pointers) pointer.hide();
  }

  // 매 프레임: 들어갈 자리 칸들을 원래 색과 분홍색 사이로 깜빡이게 한다
  private animatePulse(now: number): void {
    if (!this.pulse) return;
    const mix = 0.7 + 0.25 * Math.sin(now / 260);
    this.pulse.cells.forEach((cell, k) => this.stickers[cell].material.color.copy(this.pulse!.colors[k]).lerp(SLOT_COLOR, mix));
  }

  // 화살표 이름표 글자를 정한다
  setLabels(labels: PointerLabels): void {
    this.labels = labels;
  }

  // 조각(칸 묶음)이 눈에 보이는 면을 향하는지에 따라, 가리킬 겉면의 점과 바깥쪽 방향을 구한다
  private surfaceOf(cells: number[]): { target: Vec3; out: Vec3 } {
    const normals = cells.map((i) => FACELETS[i].normal);
    const seen = normals.filter((n) => VIEW_DIRECTION.dot(new THREE.Vector3(...n)) > 0);
    const out = (seen.length ? seen : normals).reduce<Vec3>((sum, n) => [sum[0] + n[0], sum[1] + n[1], sum[2] + n[2]], [0, 0, 0]);
    const len = Math.hypot(...out);
    const pos = FACELETS[cells[0]].pos;
    return { target: [pos[0] + (out[0] / len) * 0.5, pos[1] + (out[1] / len) * 0.5, pos[2] + (out[2] / len) * 0.5], out };
  }

  // 칸 묶음을 가리키는 화살표를 하나 띄운다
  private pointAt(index: number, cells: number[], tone: 'piece' | 'slot'): void {
    const base = this.labels[tone];
    if (!base) return;
    // 눈에 보이는 칸이 하나도 없으면 큐브 밖에서 화살표만 보여준다 (큐브를 돌려서 찾아볼 수 있으므로)
    const hidden = cells.every((i) => VIEW_DIRECTION.dot(new THREE.Vector3(...FACELETS[i].normal)) <= 0);
    const { target, out } = this.surfaceOf(cells);
    // 눈에 보이는 칸이 없으면 큐브 밖에서, 보이면 그 칸 바로 앞에서 가리킨다
    if (hidden) this.pointers[index].showOutside(target, out, '', tone);
    else this.pointers[index].show(target, out, base, tone);
  }

  // 찾을 조각과 들어갈 자리를 표시한다 (둘 다 화살표와 이름표, 자리는 칸 색이 분홍색으로 깜빡임)
  private showMarks(marks: Marks | null | undefined): void {
    if (marks?.piece?.length) this.pointAt(0, marks.piece, 'piece');
    if (marks?.slot?.length) {
      this.pulse = { cells: marks.slot, colors: marks.slot.map((i) => this.stickers[i].material.color.clone()) };
      this.pointAt(1, marks.slot, 'slot');
    }
  }

  // 스티커 색을 칠하고 조각을 제자리에 둔다. focus가 있으면 그 면의 줄만, highlight가 있으면 그 칸들만
  // 선명하게 칠하고 나머지는 흐리게 칠한다 (dim이 false면 흐리게 하지 않는다).
  private paint(state: string, focus?: Face | null, highlight?: number[] | null, dim = true): void {
    this.pulse = null;
    this.glow.hide();
    this.watchGlow.hide();
    this.outline.hide();
    for (const [cubie, home] of this.homes) {
      cubie.position.copy(home);
      cubie.quaternion.identity();
    }
    const axis = focus ? FACE_NORMALS[focus] : null;
    this.stickers.forEach((mesh, i) => {
      const ch = state[i];
      mesh.material.color.set(ch in FACE_COLORS ? FACE_COLORS[ch as Face] : UNSET_COLOR);
      const pos = FACELETS[i].pos;
      const faded = axis
        ? pos[0] * axis[0] + pos[1] * axis[1] + pos[2] * axis[2] < 0.5
        : highlight && dim ? !highlight.includes(i) : false;
      if (faded) mesh.material.color.lerp(axis ? FADE_COLOR : DIM_COLOR, axis ? 0.62 : 0.8);
    });
  }

  // 큐브를 주어진 상태(54칸 문자열)의 색으로 즉시 표시한다. highlight를 주면 그 칸들만 선명하게 보이고,
  // glow가 true면 그 칸들 둘레에 반짝이는 테두리도 그린다.
  setState(state: string, highlight?: number[] | null, marks?: Marks | null, glow = false, dim = true): void {
    this.cancelAnimation();
    this.paint(state, null, highlight, dim);
    if (glow && highlight) this.glow.show(highlight.map((i) => this.stickers[i]));
    this.showMarks(marks);
  }

  // 회전 하나를 보여준다: 돌릴 줄을 강조하고 화살표를 띄운 뒤, 천천히 돌린다.
  // glowFirst면 돌릴 줄 테두리를 먼저 충분히 반짝인 뒤 화살표와 함께 돌린다. 끝나면 회전이 적용된 상태가 된다.
  // watch가 있으면 그 칸(from)에 분홍 테두리를 붙여 함께 돌리고, 끝난 뒤에도 도착한 칸(to)에서 계속 깜빡인다.
  // keep을 주면 돌릴 줄 대신 그 칸들만 선명하게 둔 채 돌린다 (조각 소개에서 반짝이는 조각이 따라 움직이게)
  playMove(state: string, move: Move, duration: number, glowFirst = false, watch?: { from: number; to: number } | null, keep?: number[] | null): Promise<void> {
    this.cancelAnimation();
    const whole = wholeTurns(move);
    const face = whole ? 'U' : parseMove(move).face;
    const turns = whole || parseMove(move).turns;
    const axis = new THREE.Vector3(...FACE_NORMALS[face]);
    let cubies = [...this.homes.keys()];
    if (whole) {
      // 큐브를 통째로 돌릴 때: 흐리게 하지 않고 앞면 세 줄 모두에 화살표를 띄운다
      this.paint(state);
      this.arrows.forEach((arrow, row) => arrow.showAt({ normal: [0, 0, 1], offset: [0, 1 - row, 0], dir: [-1, 0, 0] }, turns));
    } else {
      this.paint(state, keep ? null : face, keep);
      cubies = cubies.filter((cubie) => this.homes.get(cubie)!.dot(axis) > 0.5);
      if (glowFirst) this.outline.show(axis);
      else this.arrows[0].show(face, turns);
    }
    if (watch) this.watchGlow.show([this.stickers[watch.from]]);
    const waitGlow = glowFirst && !whole;
    const now = performance.now();
    const angle = turns === 1 ? -Math.PI / 2 : turns === 3 ? Math.PI / 2 : -Math.PI;
    return new Promise((resolve) => {
      this.animation = {
        cubies,
        axis,
        angle,
        start: now + (waitGlow ? GLOW_TIME + GLOW_ARROW_LEAD : LEAD_TIME),
        pendingArrow: waitGlow ? { face, turns, at: now + GLOW_TIME } : null,
        duration: turns === 2 ? duration * 1.6 : duration,
        endState: applyMove(state, move),
        watchTo: watch?.to,
        resolve,
      };
    });
  }

  // 매 프레임: 화살표와 회전 애니메이션을 진행하고 화면을 그린다
  private tick(now: number): void {
    this.frameId = requestAnimationFrame(this.tick);
    if (this.spin) this.root.rotation.y = now / 1400;
    else this.applyDrag();
    for (const arrow of this.arrows) arrow.animate(now);
    for (const pointer of this.pointers) pointer.animate(now, this.camera);
    this.animatePulse(now);
    this.glow.animate(now);
    this.watchGlow.animate(now);
    // 화살표가 나와 돌기 시작하면 반짝임을 멈추고 노란 선만 남긴다
    this.outline.animate(now, !this.animation?.pendingArrow);
    const anim = this.animation;
    if (anim?.pendingArrow && now >= anim.pendingArrow.at) {
      this.arrows[0].show(anim.pendingArrow.face, anim.pendingArrow.turns);
      anim.pendingArrow = null;
    }
    if (anim) {
      const t = Math.min(1, Math.max(0, (now - anim.start) / anim.duration));
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      for (const cubie of anim.cubies) {
        cubie.position.copy(this.homes.get(cubie)!).applyAxisAngle(anim.axis, anim.angle * eased);
        cubie.quaternion.setFromAxisAngle(anim.axis, anim.angle * eased);
      }
      this.outline.setRotation(anim.axis, anim.angle * eased);
      if (t >= 1) {
        this.animation = null;
        this.hideArrows();
        this.paint(anim.endState);
        if (anim.watchTo !== undefined) this.watchGlow.show([this.stickers[anim.watchTo]]);
        anim.resolve();
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // 화면을 정리하고 자원을 해제한다
  dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.flashTimer);
    this.cancelAnimation();
    this.resizeObserver.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointerup', this.onUp);
    canvas.removeEventListener('pointercancel', this.onUp);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
