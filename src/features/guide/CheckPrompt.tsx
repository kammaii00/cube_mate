// 몇 번 돌릴 때마다 "너의 큐브도 이렇게 생겼어?"라고 묻고 [맞아] [달라]를 고르게 하는 카드
import { useI18n } from '../../i18n';
import { Bubble } from '../../widgets/Bubble';

interface Props {
  onYes: () => void;
  onNo: () => void;
}

// 위 3D 그림과 아이 손의 큐브를 비교하게 하고 두 버튼을 보여준다
export function CheckPrompt({ onYes, onNo }: Props) {
  const { t } = useI18n();
  return (
    <>
      <Bubble>
        <strong className="move-title">{t('checkAsk')}</strong>
      </Bubble>
      <div className="row">
        <button className="btn primary big" onClick={onYes}>{t('checkYes')}</button>
        <button className="btn big" onClick={onNo}>{t('checkNo')}</button>
      </div>
    </>
  );
}
