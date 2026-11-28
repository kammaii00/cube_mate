// 같이 해 보기 문구: 조각마다 목표 문장과 이름표, 묶음마다 이유 문장(음성 파일 이름과 같은 키)과 다시 볼 소개 장면
import type { Face } from '../../core/faces';
import { goalView, type GoalView, type GuideChunk, type GuideWhy } from '../../course/guide';
import type { GuideStep } from '../../course/practice';
import type { MessageKey } from '../../i18n';
import type { SlideId } from './introSlides';

/** 조각을 시작할 때 보여 줄 목표 카드: 그림, 목표 문장, 조각 이름표 글자와 바탕색 */
export interface GoalCard {
  view: GoalView;
  text: MessageKey;
  label: MessageKey;
  color?: Face;
}

// 조각 하나의 목표 카드 (흰 십자는 꽃잎 옆 색 이름을 문장과 이름표에 넣고, 이름표도 그 색으로 칠한다)
export function goalCard(step: GuideStep): GoalCard {
  const view = goalView(step.start, step.piece, step.slot, step.stage);
  const label: MessageKey = view.side ? (`pointPetal${view.side}` as MessageKey) : step.stage === 2 ? 'pointCorner' : 'pointPetal';
  // 자기 자리에 거꾸로 들어가 있으면 "꺼냈다가 다시 넣자"
  if (view.stuck) return { view, text: step.stage === 2 ? 'courseGoalStuck2' : 'courseGoalStuck0', label, color: view.side };
  if (view.side) return { view, text: `courseGoal1${view.side}` as MessageKey, label: `pointPetal${view.side}` as MessageKey, color: view.side };
  return step.stage === 0 ? { view, text: 'courseGoal0', label: 'pointPetal' } : { view, text: 'courseGoal2', label: 'pointCorner' };
}

/** 이유마다 문구 키와, 소개에서 배운 장면 (없으면 다시 보기 버튼을 띄우지 않는다) */
const WHY: Record<GuideWhy, { key: MessageKey; slide?: SlideId }> = {
  petalBusy: { key: 'courseWhyPetalBusy', slide: 'petalBusy' },
  petalMove: { key: 'courseWhyPetalMove', slide: 'petalSide' },
  petalSide: { key: 'courseWhyPetalSide', slide: 'petalSide' },
  petalBottom: { key: 'courseWhyPetalBottom', slide: 'petalBottom' },
  turnColor: { key: 'courseWhyTurnColor' },
  setupPetal: { key: 'courseWhySetupPetal', slide: 'crossMatch' },
  drop: { key: 'courseWhyDrop', slide: 'crossDrop' },
  turnSlot: { key: 'courseWhyTurnSlot', slide: 'cornerBring' },
  setupAbove: { key: 'courseWhySetupAbove', slide: 'cornerBring' },
  cornerRight: { key: 'courseWhyCornerRight', slide: 'cornerDance1' },
  cornerFront: { key: 'courseWhyCornerFront', slide: 'cornerDanceMore' },
  cornerUp: { key: 'courseWhyCornerUp', slide: 'cornerDanceMore' },
  turnStuck: { key: 'courseWhyTurnStuck' },
  cornerStuck: { key: 'courseWhyCornerStuck', slide: 'cornerDance1' },
};

/** 소개 장면의 이름 (화면 연습 레벨 이름과 같다) */
const SLIDE_NAME: Partial<Record<SlideId, MessageKey>> = {
  petalSide: 'coursePuzzle_side', petalBottom: 'coursePuzzle_bottom', petalBusy: 'coursePuzzle_busy',
  crossDrop: 'coursePuzzle_drop', crossMatch: 'coursePuzzle_match',
  cornerDance1: 'coursePuzzle_dance1', cornerDanceMore: 'coursePuzzle_danceMore', cornerBring: 'coursePuzzle_bring',
};

// 묶음 하나의 이유 문구 키
export function whyKey(chunk: GuideChunk): MessageKey {
  return WHY[chunk.why].key;
}

// 묶음 하나에서 다시 볼 소개 장면과 그 이름 (없으면 null)
export function whySlide(chunk: GuideChunk): { slide: SlideId; name: MessageKey } | null {
  const slide = WHY[chunk.why].slide;
  const name = slide && SLIDE_NAME[slide];
  return slide && name ? { slide, name } : null;
}
