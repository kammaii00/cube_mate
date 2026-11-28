// 오른손 춤 4칸 줄: 같이 해 보기에서 지금 춤의 몇 번째 동작인지 화면 연습 버튼과 같은 그림으로 보여 준다
import type { Face } from '../../core/faces';
import { DANCE } from '../../course/puzzle';
import { useI18n } from '../../i18n';
import { MoveIcon } from '../../widgets/MoveIcon';

interface Props {
  /** 지금 동작 번호 (0~3) */
  at: number;
  /** 몇 번째 춤인지와 모두 몇 번 추는지 */
  round: number;
  rounds: number;
  /** 지금 큐브의 위·앞·오른쪽 가운데 색 */
  colors: { U: Face; F: Face; R: Face };
}

// 춤 동작 4칸을 번호와 함께 그리고, 지금 칸만 반짝인다
export function DanceStrip({ at, round, rounds, colors }: Props) {
  const { t } = useI18n();
  return (
    <div className="dance-strip">
      {DANCE.map((m, i) => (
        <span key={m} className={`dance-step${i === at ? ' now' : i < at ? ' done' : ''}`}>
          <MoveIcon move={m} colors={colors} size={34} />
          <small>{i + 1}</small>
        </span>
      ))}
      {rounds > 1 && <small className="dance-round">{t('courseWhyDanceNow', { r: round, n: rounds })}</small>}
    </div>
  );
}
