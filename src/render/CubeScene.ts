// Three.js로 3D 큐브를 그리고 회전 애니메이션을 재생한다 (React와 무관한 순수 클래스)
// 시점은 항상 고정(위·앞·오른쪽이 보임)이라, 아이들이 손에 든 큐브와 그대로 비교할 수 있다.
import * as THREE from 'three';
import { FACELETS, FACE_COLORS, FACE_NORMALS, type Face } from '../core/faces';
import { applyMove, parseMove, type Move } from '../core/moves';
import { MoveArrow } from './arrow';

const UNSET_COLOR = '#b9c4d6';
/** 돌리지 않는 조각을 흐리게 만들 때 섞는 색 */
const FADE_COLOR = new THREE.Color('#dfe9f5');
const VIEW_POSITION = new THREE.Vector3(0.62, 0.55, 0.9).normalize().multiplyScalar(8.6);
/** 화살표만 먼저 보여주고 회전을 시작하기까지 기다리는 시간(ms) */
const LEAD_TIME = 800;

interface Animation {
  cubies: THREE.Group[];
  axis: THREE.Vector3;
  angle: number;
  start: number;
  duration: number;
  endState: string;
  resolve: () => void;
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
  private arrow = new MoveArrow();
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
    this.root.add(this.arrow.object);
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
    this.arrow.hide();
    anim?.resolve();
  }

  // 스티커 색을 칠하고 조각을 제자리에 둔다. focus가 있으면 그 면의 줄만 선명하게, 나머지는 흐리게 칠한다.
  private paint(state: string, focus?: Face): void {
    for (const [cubie, home] of this.homes) {
      cubie.position.copy(home);
      cubie.quaternion.identity();
    }
    const axis = focus ? FACE_NORMALS[focus] : null;
    this.stickers.forEach((mesh, i) => {
      const ch = state[i];
      mesh.material.color.set(ch in FACE_COLORS ? FACE_COLORS[ch as Face] : UNSET_COLOR);
      const pos = FACELETS[i].pos;
      if (axis && pos[0] * axis[0] + pos[1] * axis[1] + pos[2] * axis[2] < 0.5) {
        mesh.material.color.lerp(FADE_COLOR, 0.62);
      }
    });
  }

  // 큐브를 주어진 상태(54칸 문자열)의 색으로 즉시 표시한다
  setState(state: string): void {
    this.cancelAnimation();
    this.paint(state);
  }

  // 회전 하나를 보여준다: 돌릴 줄을 강조하고 화살표를 띄운 뒤, 천천히 돌린다.
  // 끝나면 회전이 적용된 상태가 된다.
  playMove(state: string, move: Move, duration: number): Promise<void> {
    this.cancelAnimation();
    const { face, turns } = parseMove(move);
    this.paint(state, face);
    this.arrow.show(face, turns);
    const axis = new THREE.Vector3(...FACE_NORMALS[face]);
    const cubies = [...this.homes].filter(([, home]) => home.dot(axis) > 0.5).map(([cubie]) => cubie);
    const angle = turns === 1 ? -Math.PI / 2 : turns === 3 ? Math.PI / 2 : -Math.PI;
    return new Promise((resolve) => {
      this.animation = {
        cubies,
        axis,
        angle,
        start: performance.now() + LEAD_TIME,
        duration: turns === 2 ? duration * 1.6 : duration,
        endState: applyMove(state, move),
        resolve,
      };
    });
  }

  // 매 프레임: 화살표와 회전 애니메이션을 진행하고 화면을 그린다
  private tick(now: number): void {
    this.frameId = requestAnimationFrame(this.tick);
    if (this.spin) this.root.rotation.y = now / 1400;
    this.arrow.animate(now);
    const anim = this.animation;
    if (anim) {
      const t = Math.min(1, Math.max(0, (now - anim.start) / anim.duration));
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      for (const cubie of anim.cubies) {
        cubie.position.copy(this.homes.get(cubie)!).applyAxisAngle(anim.axis, anim.angle * eased);
        cubie.quaternion.setFromAxisAngle(anim.axis, anim.angle * eased);
      }
      if (t >= 1) {
        this.animation = null;
        this.arrow.hide();
        this.paint(anim.endState);
        anim.resolve();
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // 화면을 정리하고 자원을 해제한다
  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.cancelAnimation();
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
