// 홈 화면: 큐비 소개와 두 가지 길(빨리 맞추기 / 배우며 맞추기). 빨리 맞추기를 누르면 같은 자리에 카메라·칠하기가 나온다
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { boardsDone, loadRewards } from '../../rewards/store';
import { Mascot } from '../../widgets/Mascot';
import { outfitFor } from '../../widgets/outfits';
import { useSay } from '../../voice/voice';
import { HomeFriends } from '../course/HomeFriends';
import { FeedbackButton } from './FeedbackButton';
import './home.css';

interface Props {
  onScan: () => void;
  onManual: () => void;
  /** 꼬마 코스(큐브 배우기 섬)로 간다 */
  onCourse: () => void;
}

// 스캔 또는 직접 칠하기로 시작하는 첫 화면을 그린다
export function HomeScreen({ onScan, onManual, onCourse }: Props) {
  const { t, lang, setLang } = useI18n();
  const say = useSay();
  /** 큐비를 한 번 누르면 "큐비를 눌러 봐!" 안내를 감춘다 (브라우저는 첫 터치 전엔 소리를 못 낸다) */
  const [greeted, setGreeted] = useState(false);
  /** 빨리 맞추기를 눌러 카메라·칠하기 고르기를 보는 중이면 true */
  const [fast, setFast] = useState(false);

  // 큐비를 누르면 인사하고 카메라 버튼을 알려준다
  function greet() {
    setGreeted(true);
    say('homeHello');
  }
  return (
    <main className="screen home">
      <FeedbackButton />
      <button className="lang-toggle" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
        {lang === 'ko' ? 'English' : '한국어'}
      </button>
      <div className="hero">
        <button className="mascot-btn" onClick={greet} aria-label={t('cubiTapHint')}>
          <Mascot size={132} outfit={outfitFor(boardsDone(loadRewards().solves))} />
        </button>
        {!greeted && <p className="tap-hint">👆 {t('cubiTapHint')}</p>}
        <h1>{t('appName')}</h1>
        <HomeFriends />
        <p className="tagline">{t('tagline')}</p>
      </div>
      {fast ? (
        <>
          <div className="actions">
            <button className="link fast-back" onClick={() => setFast(false)}>‹ {t('back')}</button>
            <button className="btn primary big" onClick={onScan}>📷 {t('scanStart')}</button>
            <button className="btn big" onClick={onManual}>🎨 {t('manualStart')}</button>
          </div>
          <ol className="how">
            <li>{t('how1')}</li>
            <li>{t('how2')}</li>
            <li>{t('how3')}</li>
          </ol>
        </>
      ) : (
        <div className="actions">
          <button className="btn primary big" onClick={() => setFast(true)}>
            <span className="course-title">
              {t('homeFast')}
              <span className="age-badge">{t('homeFastAge')}</span>
            </span>
            <small className="btn-sub">{t('homeFastFor')}</small>
          </button>
          <button className="btn sky big" onClick={onCourse}>
            <span className="course-title">
              {t('homeCourse')}
              <span className="age-badge">{t('homeCourseAge')}</span>
            </span>
            <small className="btn-sub">{t('homeCourseFor')}</small>
          </button>
        </div>
      )}
    </main>
  );
}
