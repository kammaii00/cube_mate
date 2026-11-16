// 화면 문구의 언어(한국어/영어)를 관리한다
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { ko, type Messages } from './ko';

export type Lang = 'ko' | 'en';
export type MessageKey = keyof Messages;
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const DICTS: Record<Lang, Messages> = { ko, en };
const STORAGE_KEY = 'cube-mate-lang';

// 저장된 언어 또는 브라우저 언어로 처음 언어를 정한다 (기본은 영어)
function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 저장소를 쓸 수 없는 환경이면 브라우저 언어로 판단한다
  }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Translate } | null>(null);

// 앱 전체에 언어 설정과 번역 함수를 제공한다
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장 실패는 무시한다 (다음 방문 때 다시 고르면 됨)
    }
  }, []);

  const value = useMemo(() => {
    // 문구 키를 현재 언어의 문장으로 바꾸고 {이름} 자리를 값으로 채운다
    const t: Translate = (key, params) =>
      DICTS[lang][key].replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? ''));
    return { lang, setLang, t };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// 화면에서 번역 함수와 언어 설정을 꺼내 쓴다
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('I18nProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
