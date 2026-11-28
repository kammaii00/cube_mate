// 홈 화면 "의견 보내기": 누르면 바로 글 상자가 열리고, 쓰고 나이를 골라 보내면 시트에 한 줄로 쌓인다
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { AGES, FEEDBACK_URL, MAX_FEEDBACK, sendFeedback, tooSoon } from './feedback';

type Status = 'idle' | 'sending' | 'sent' | 'fail' | 'wait';

// 의견 보내기 버튼과 의견 쓰는 창을 그린다
export function FeedbackButton() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  if (!FEEDBACK_URL) return null;

  // 의견을 보낸다 (방금 보냈으면 잠깐 기다리라고 한다)
  async function submit() {
    if (tooSoon()) return setStatus('wait');
    setStatus('sending');
    const ok = await sendFeedback(text, age, lang);
    setStatus(ok ? 'sent' : 'fail');
    if (ok) setText('');
  }

  // 창을 닫는다 (보낸 뒤면 처음 상태로)
  function close() {
    setOpen(false);
    if (status !== 'sending') setStatus('idle');
  }

  return (
    <>
      <button className="feedback-btn" onClick={() => setOpen(true)}>{t('feedback')}</button>
      {open && (
        <div className="gate-overlay" role="dialog" aria-modal="true" aria-label={t('feedbackTitle')}>
          <div className="gate-card feedback-card">
            {status === 'sent' ? (
              <>
                <strong>{t('feedbackThanks')}</strong>
                <p>{t('feedbackThanksNote')}</p>
                <button className="btn primary" onClick={close}>{t('feedbackClose')}</button>
              </>
            ) : (
              <>
                <strong>{t('feedbackTitle')}</strong>
                <textarea
                  value={text}
                  maxLength={MAX_FEEDBACK}
                  rows={5}
                  placeholder={t('feedbackPlaceholder')}
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="feedback-ask">{t('feedbackAge')}</p>
                <div className="age-choices">
                  {AGES.map((a, i) => (
                    <button key={a} className={`chip${age === a ? ' on' : ''}`} onClick={() => setAge(age === a ? '' : a)}>
                      {t(`feedbackAge${i}` as 'feedbackAge0')}
                    </button>
                  ))}
                </div>
                {status === 'fail' && <p className="gate-wrong">{t('feedbackFail')}</p>}
                {status === 'wait' && <p className="gate-wrong">{t('feedbackWait')}</p>}
                <button className="btn primary" disabled={!text.trim() || status === 'sending'} onClick={submit}>
                  {status === 'sending' ? t('feedbackSending') : t('feedbackSend')}
                </button>
                <button className="link" onClick={close}>{t('feedbackClose')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
