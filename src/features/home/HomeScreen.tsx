// 홈 화면: 큐비 소개와 시작 방법 선택
import { useI18n } from '../../i18n';
import { Mascot } from '../../widgets/Mascot';

interface Props {
  onScan: () => void;
  onManual: () => void;
}

// 스캔 또는 직접 칠하기로 시작하는 첫 화면을 그린다
export function HomeScreen({ onScan, onManual }: Props) {
  const { t, lang, setLang } = useI18n();
  return (
    <main className="screen home">
      <button className="lang-toggle" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
        {lang === 'ko' ? 'English' : '한국어'}
      </button>
      <div className="hero">
        <Mascot size={132} />
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
