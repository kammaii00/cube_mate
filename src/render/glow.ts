// 강조할 칸 둘레에 반짝이는 노란 테두리를 그려, 흐린 칸들 사이에서 바로 눈에 띄게 한다.
// 테두리는 스티커 바깥의 검은 틈에만 그려서 스티커 색과 섞이지 않는다.
import * as THREE from 'three';

const GLOW_COLOR = new THREE.Color('#ffd400');
const FLASH_COLOR = new THREE.Color('#fffbe0');
/** 반짝임 한 번(어두움→밝음→어두움)에 걸리는 시간(ms)과 밝아지는 정도(0~1) */
const PULSE_MS = 2000;
const PULSE_STRENGTH = 0.35;

// 반짝임 색을 계산해 target에 넣는다. steady면 반짝이지 않고 노란색 그대로
export function glowColor(target: THREE.Color, now: number, steady = false): void {
  const wave = steady ? 0 : 0.5 - 0.5 * Math.cos((now / PULSE_MS) * Math.PI * 2);
  target.copy(GLOW_COLOR).lerp(FLASH_COLOR, wave * PULSE_STRENGTH);
}

// 가운데가 뚫린 둥근 사각형 고리 모양을 만든다 (outer: 바깥 크기, inner: 구멍 크기)
function ringGeometry(outer: number, inner: number): THREE.ShapeGeometry {
  const rounded = (path: THREE.Path, size: number, r: number) => {
    const h = size / 2;
    path.moveTo(-h + r, -h);
    path.lineTo(h - r, -h);
    path.quadraticCurveTo(h, -h, h, -h + r);
    path.lineTo(h, h - r);
    path.quadraticCurveTo(h, h, h - r, h);
    path.lineTo(-h + r, h);
    path.quadraticCurveTo(-h, h, -h, h - r);
    path.lineTo(-h, -h + r);
    path.quadraticCurveTo(-h, -h, -h + r, -h);
  };
  const shape = new THREE.Shape();
  rounded(shape, outer, outer * 0.22);
  const hole = new THREE.Path();
  rounded(hole, inner, inner * 0.19);
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}

export class StickerGlow {
  /** 스티커(0.84)보다 조금 큰 구멍과 조각 경계까지만 덮는 고리: 스티커 색 위에는 절대 겹치지 않는다 */
  private geometry = ringGeometry(1.0, 0.88);
  private material = new THREE.MeshBasicMaterial({ color: GLOW_COLOR.clone() });
  private rings: THREE.Mesh[] = [];

  // 주어진 스티커들에 빛나는 테두리를 붙인다 (스티커의 자식으로 붙여 함께 움직인다)
  show(stickers: THREE.Object3D[]): void {
    this.hide();
    for (const sticker of stickers) {
      const ring = new THREE.Mesh(this.geometry, this.material);
      ring.position.z = 0.004;
      sticker.add(ring);
      this.rings.push(ring);
    }
  }

  // 붙어 있는 테두리를 모두 뗀다
  hide(): void {
    for (const ring of this.rings) ring.removeFromParent();
    this.rings = [];
  }

  // 매 프레임: 테두리 색을 천천히 노랑과 옅은 흰빛 사이로 오가게 한다
  animate(now: number): void {
    if (!this.rings.length) return;
    glowColor(this.material.color, now);
  }
}
