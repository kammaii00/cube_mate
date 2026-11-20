// 1/3·2/3 지점에서 "너의 큐브도 이렇게 생겼어?"라고 묻고 초록 동그라미(똑같아) / 빨간 가위표(달라)를 고르게 하는 카드.
// 글을 못 읽는 아이를 위해 안내 음성("똑같으면 동그라미, 다르면 가위표를 눌러 줘!")으로 알려 주고, 머뭇거리면 한 번 더 들려준다.
import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { onVoiceStart, useSay } from '../../voice/voice';
import { Bubble } from '../../widgets/Bubble';

/** 안내 음성이 끝난 뒤 이만큼 아무것도 누르지 않으면 다시 들려준다(ms) */
const IDLE_MS = 5000;
/** 다시 들려주는 최대 횟수 (계속 재촉하지 않도록) */
const MAX_REMIND = 2;

interface Props {
  onYes: () => void;
  onNo: () => void;
}

// 초록 동그라미 그림
function Circle() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="23" fill="none" stroke="#1fa64a" strokeWidth="10" />
    </svg>
  );
}

// 빨간 가위표 그림
function Cross() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <path d="M14 14 L50 50 M50 14 L14 50" stroke="#d7263d" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

// 위 3D 그림과 아이 손의 큐브를 비교하게 하고 두 버튼을 보여준다
export function CheckPrompt({ onYes, onNo }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const reminded = useRef(0);

  // 안내 음성(checkHow)이 끝나고 5초 동안 아무것도 누르지 않으면 안내를 다시 들려준다 (최대 2번)
  useEffect(() => {
    let timer = 0;
    const stop = onVoiceStart((name, audio) => {
      if (name !== 'checkHow') return;
      window.clearTimeout(timer);
      audio.addEventListener('ended', () => {
        if (reminded.current >= MAX_REMIND) return;
        timer = window.setTimeout(() => {
          reminded.current++;
          say('checkHow');
        }, IDLE_MS);
      });
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [say]);

  return (
    <>
      <Bubble>
        <strong className="move-title">{t('checkAsk')}</strong>
        <small>{t('checkHow')}</small>
      </Bubble>
      <div className="row check-row">
        <button className="btn big check-btn" onClick={onYes} aria-label={t('checkYes')}>
          <Circle />
          <small>{t('checkYes')}</small>
        </button>
        <button className="btn big check-btn" onClick={onNo} aria-label={t('checkNo')}>
          <Cross />
          <small>{t('checkNo')}</small>
        </button>
      </div>
    </>
  );
}
