// 섬 지도와 바다 위 단계 제목 카드에서만 페이지 배경을 하늘+바다로 바꾼다 (html에 at-sea 클래스, 스타일은 course.css)
import { useLayoutEffect } from 'react';

// on이 참인 동안 바다 배경을 켠다 (그리기 전에 바꿔서 체크무늬가 한 번 깜빡이지 않게 한다)
export function useSeaBackground(on: boolean) {
  useLayoutEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.classList.add('at-sea');
    return () => root.classList.remove('at-sea');
  }, [on]);
}
