// 홈 화면: 큐비 소개와 시작 방법 선택
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { boardsDone, loadRewards } from '../../rewards/store';
import { Mascot } from '../../widgets/Mascot';
import { outfitFor } from '../../widgets/outfits';
import { useSay } from '../../voice/voice';

interface Props {
  onScan: () => void;
  onManual: () => void;
}

// 스캔 또는 직접 칠하기로 시작하는 첫 화면을 그린다
export function HomeScreen({ onScan, onManual }: Props) {
  const { t, lang, setLang } = useI18n();
  const say = useSay();
  /** 큐비를 한 번 누르면 "큐비를 눌러 봐!" 안내를 감춘다 (브라우저는 첫 터치 전엔 소리를 못 낸다) */
  const [greeted, setGreeted] = useState(false);

  // 큐비를 누르면 인사하고 카메라 버튼을 알려준다
  function greet() {
    setGreeted(true);
    say('homeHello');
  }
  return (
    <main className="screen home">
      <button className="lang-toggle" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
        {lang === 'ko' ? 'English' : '한국어'}
      </button>
      <div className="hero">
        <button className="mascot-btn" onClick={greet} aria-label={t('cubiTapHint')}>
          <Mascot size={132} outfit={outfitFor(boardsDone(loadRewards().solves))} />
        </button>
        {!greeted && lang === 'ko' && <p className="tap-hint">👆 {t('cubiTapHint')}</p>}
        <h1>{t('appName')}</h1>
        <p className="tagline">{t('tagline')}</p>
      </div>
      <div className="actions">
        <button className="btn primary big" onClick={onScan}>📷 {t('scanStart')}</button>
        <button className="btn big" onClick={onManual}>🎨 {t('manualStart')}</button>
      </div>
      <ol className="how">
        <li>{t('how1')}</li>
        <li>{t('how2')}</li>
        <li>{t('how3')}</li>
      </ol>
    </main>
  );
}
