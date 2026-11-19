// 큐비 변신 창: 스티커판을 다 채운 순간, 새 옷을 입은 큐비를 크게 보여준다
import { useEffect } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { playTransform } from '../../rewards/praise';
import { Mascot } from '../../widgets/Mascot';
import type { Outfit } from '../../widgets/outfits';

const NAME_KEY: Record<Outfit, MessageKey> = {
  crown: 'transformCrown',
  wizard: 'transformWizard',
  shades: 'transformShades',
  party: 'transformParty',
};

interface Props {
  outfit: Outfit;
  onClose: () => void;
}

// 반짝이는 배경 위에 변신한 큐비와 이름을 띄운다
export function TransformPopup({ outfit, onClose }: Props) {
  const { t, lang } = useI18n();
  // 창이 열리면 변신 음성을 들려준다 (파일이 없으면 조용히 넘어감)
  useEffect(() => playTransform(lang), [lang]);
  return (
    <div className="reward-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="reward-card transform" onClick={(e) => e.stopPropagation()}>
        <h2>{t('transformTitle')}</h2>
        <div className="transform-cubie">
          <Mascot size={150} outfit={outfit} />
        </div>
        <p className="transform-name">{t(NAME_KEY[outfit])}</p>
        <p className="hint">{t('transformNext')}</p>
        <button className="btn primary big" onClick={onClose}>{t('transformOk')}</button>
      </div>
    </div>
  );
}
