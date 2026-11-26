// 문제를 풀었을 때의 결과: 칭찬, 이번 레벨의 별 진행, 별을 받았거나 친구를 구했으면 큰 축하 창(스티커판·큐비 변신)
import { useEffect, useState } from 'react';
import { WINS_PER_LEVEL, ISLANDS } from '../../course/skills';
import type { WinResult } from '../../course/progress';
import { useI18n, type MessageKey } from '../../i18n';
import type { SolveReward } from '../../rewards/store';
import { boardsDone } from '../../rewards/store';
import { useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';
import { Confetti } from '../../widgets/Confetti';
import { Friend } from '../../widgets/Friend';
import { StarIcon } from '../../widgets/StarIcon';
import { outfitFor } from '../../widgets/outfits';
import { StickerBoard } from '../done/StickerBoard';
import { TransformPopup } from '../done/TransformPopup';
import { levelName } from './LevelPicker';

interface Props {
  island: number;
  level: number;
  /** 큐비의 도움(보여 주고 같이 하기)을 받았거나 퀴즈를 한 번에 못 맞혔는지 */
  helped: boolean;
  result: WinResult;
  /** 친구를 구해서 받은 스티커 (구하지 않았으면 null) */
  sticker: SolveReward | null;
  /** 별을 받은 레벨 복습 한 판(3문제)을 끝냈으면 true */
  review?: boolean;
  onNext: () => void;
  onMap: () => void;
  /** 레벨 고르기로 (복습 끝났을 때만 보인다) */
  onLevels?: () => void;
}

// 칭찬 문구를 고른다 (복습 끝이면 복습 칭찬, 도움을 받았으면 다음엔 혼자 해 보자고)
function praiseKey(helped: boolean, review: boolean): MessageKey {
  if (review) return 'courseReviewDone';
  if (helped) return 'courseGoodHint';
  return (['courseGood1', 'courseGood2', 'courseGood3'] as const)[Math.floor(Math.random() * 3)];
}

// 결과 카드와 (필요하면) 친구 구출 창을 그린다
export function ResultCard({ island, level, helped, result, sticker, review = false, onNext, onMap, onLevels }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [praise] = useState(() => praiseKey(helped, review));
  const [popup, setPopup] = useState(result.rescued);
  const [transform, setTransform] = useState(false);
  const info = ISLANDS[island];
  /** 섬의 레벨(단계)마다 별을 받았는지, 이번 레벨 성공 횟수와 별까지 남은 횟수 */
  const stars = result.data.wins[island].map((w) => w >= WINS_PER_LEVEL);
  const wins = Math.min(WINS_PER_LEVEL, result.data.wins[island][level]);
  const left = WINS_PER_LEVEL - wins;
  /** 별 소식: 방금 받았으면 "별 받았다!", 아직이면 "한 번만 더 하면 별!" 같은 남은 횟수 (복습은 없음) */
  const starNews: MessageKey | null = result.star ? 'courseStar' : review || !left ? null : (`courseLeft${left}` as MessageKey);
  const nextLevel = result.star && !result.rescued && level + 1 < info.levels.length;
  const last = island === ISLANDS.length - 1;

  // 카드가 열리면 칭찬 → (별) → (구출) 순으로 말해 준다
  useEffect(() => {
    say([praise, ...(starNews ? [starNews] : []), ...(result.rescued ? [`courseRescued${island}`] : [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 구출 창을 닫을 때: 스티커판을 다 채웠으면 큐비 변신 창을 이어서 띄운다
  function closePopup() {
    setPopup(false);
    if (sticker?.transformed) setTransform(true);
  }
  const outfit = sticker ? outfitFor(boardsDone(sticker.solves)) : null;

  return (
    <>
      {(result.star || result.rescued) && <Confetti />}
      <Bubble tone="good">
        <strong className="move-title">{t(praise)}</strong>
      </Bubble>
      <div className="level-progress" aria-label={`${wins}/${WINS_PER_LEVEL}`}>
        <small>{levelName(island, level, t)}</small>
        <span>
          {Array.from({ length: WINS_PER_LEVEL }, (_, k) => <i key={k} className={k < wins ? 'on' : ''} />)}
          {result.star && <StarIcon filled size={40} />}
        </span>
        {starNews && <strong>{t(starNews)}</strong>}
      </div>
      {result.star && (
        <div className="level-wins small" aria-label={`${stars.filter(Boolean).length}/${stars.length}`}>
          {stars.map((on, k) => <i key={k} className={`${on ? 'on' : ''}${k === level ? ' new' : ''}`}>{on ? '★' : k + 1}</i>)}
        </div>
      )}
      <button className="btn primary big" onClick={onNext}>{t(nextLevel ? 'courseNextLevel' : 'courseNext')}</button>
      {review && onLevels && <button className="btn big" onClick={onLevels}>{t('courseOtherLevel')}</button>}
      <button className="btn big" onClick={onMap}>{t('courseMap')}</button>
      {popup && (
        <div className="reward-overlay" role="dialog" aria-modal="true" onClick={closePopup}>
          <div className="reward-card" onClick={(e) => e.stopPropagation()}>
            <h2>{t(`courseRescued${island}` as MessageKey)}</h2>
            <div className="rescue-friend"><Friend shape={info.friend.shape} colors={info.friend.colors} look="free" size={120} /></div>
            <p className="hint">{t(last ? 'courseGraduate' : 'courseRescuedText')}</p>
            {sticker && <StickerBoard onBoard={sticker.onBoard} />}
            <button className="btn primary big" onClick={closePopup}>{t('courseOk')}</button>
          </div>
        </div>
      )}
      {transform && outfit && <TransformPopup outfit={outfit} onClose={() => setTransform(false)} />}
    </>
  );
}
