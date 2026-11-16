// 배우며 풀기에서 지금 몇 단계인지와 그 단계의 설명을 보여준다
import { useI18n, type MessageKey } from '../../i18n';

export const STAGE_COUNT = 7;

interface Props {
  /** 현재 단계 번호 (0~6) */
  stage: number;
}

// 단계 진행 점, 단계 이름, 단계 설명과 공식을 그린다
export function StageInfo({ stage }: Props) {
  const { t } = useI18n();
  return (
    <div className="stage-info">
      <div className="stage-dots">
        {Array.from({ length: STAGE_COUNT }, (_, i) => (
          <i key={i} className={i < stage ? 'past' : i === stage ? 'now' : ''} />
        ))}
      </div>
      <b>
        {t('stageLabel', { i: stage + 1, n: STAGE_COUNT })} · {t(`stage${stage + 1}Title` as MessageKey)}
      </b>
      <p>{t(`stage${stage + 1}Desc` as MessageKey)}</p>
    </div>
  );
}
