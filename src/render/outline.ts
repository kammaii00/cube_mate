// 돌릴 줄(조각 9개 덩어리)의 바깥 둘레에만 가는 노란 선을 그린다.
// 선은 큐브 겉면보다 살짝 바깥에 그려서 스티커 색과 섞이지 않는다.
import * as THREE from 'three';
import { glowColor } from './glow';

/** 선 굵기와 큐브 겉면에서 띄우는 거리 */
const LINE = 0.06;
const MARGIN = 0.03;

export class LayerOutline {
  readonly object = new THREE.Group();
  private material = new THREE.MeshBasicMaterial({ color: '#ffd400' });

  constructor() {
    this.object.visible = false;
  }

  // 축 방향 줄의 둘레(상자 모서리 12개)를 만들어 보여준다
  show(axis: THREE.Vector3): void {
    this.hide();
    const half = new THREE.Vector3(1.5 + MARGIN, 1.5 + MARGIN, 1.5 + MARGIN);
    const center = new THREE.Vector3();
    (['x', 'y', 'z'] as const).forEach((k) => {
      if (Math.abs(axis[k]) > 0.5) {
        half[k] = 0.5 + MARGIN;
        center[k] = Math.sign(axis[k]);
      }
    });
    for (const along of ['x', 'y', 'z'] as const) {
      const [a, b] = (['x', 'y', 'z'] as const).filter((k) => k !== along);
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          const size = new THREE.Vector3(LINE, LINE, LINE);
          size[along] = half[along] * 2 + LINE;
          const edge = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), this.material);
          edge.position.copy(center);
          edge.position[a] += sa * half[a];
          edge.position[b] += sb * half[b];
          this.object.add(edge);
        }
      }
    }
    this.object.quaternion.identity();
    this.object.visible = true;
  }

  // 선을 모두 지운다
  hide(): void {
    for (const edge of [...this.object.children]) {
      (edge as THREE.Mesh).geometry.dispose();
      edge.removeFromParent();
    }
    this.object.visible = false;
  }

  // 회전하는 줄을 따라 선도 함께 돌린다
  setRotation(axis: THREE.Vector3, angle: number): void {
    this.object.quaternion.setFromAxisAngle(axis, angle);
  }

  // 매 프레임: steady가 아니면 천천히 숨쉬듯 밝아졌다 어두워지고, steady면 노란색 그대로 둔다
  animate(now: number, steady: boolean): void {
    if (this.object.visible) glowColor(this.material.color, now, steady);
  }
}
