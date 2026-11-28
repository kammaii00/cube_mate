// 단계 제목 화면: 새 단계를 시작하기 전에 화면 가운데에 제목을 크게 띄웠다가 사라진다 (톡 누르면 바로 넘어감)
import { useEffect, useRef, useState } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { isSpeaking, stopVoice, useSay } from '../../voice/voice';
import { levelKey } from './LevelPicker';
import { LevelPicture } from './LevelPicture';

interface Props {
  island: number;
  level: number;
  /** 결과 카드의 "다음"으로 왔을 때: 제목 앞에 "다음은!"을 말한다 */
  nextUp: boolean;
  /** 처음 가는 섬일 때: "새 섬!" 표시를 붙인다 */
  newIsland: boolean;
  onDone: () => void;
}

/** 최소로 보여 주는 시간 */
const SHOW_MS = 2000;
/** 음성이 길어도 이 시간이 지나면 넘어간다 ("다음은!" + 가장 긴 제목 ≈ 2.9초 + 불러오는 시간) */
const MAX_MS = 3500;
/** 흐려지며 사라지는 시간 */
const FADE_MS = 350;

// 섬 이름·레벨 번호(작게), 레벨 그림, 레벨 이름(크게)을 보여 주고 소리로 읽어 준다
export function LevelTitle({ island, level, nextUp, newIsland, onDone }: Props) {
  const { t } = useI18n();
  const say = useSay();
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  const key = levelKey(island, level);

  // 제목을 읽고, 2초가 지나고 음성도 끝나면(최대 3.5초) 흐려지며 다음으로 넘어간다
  useEffect(() => {
    say(nextUp ? ['courseNextUp', key] : [key]);
    const started = Date.now();
    let fade: ReturnType<typeof setTimeout> | undefined;
    const tick = setInterval(() => {
      const passed = Date.now() - started;
      if (passed < SHOW_MS || (isSpeaking() && passed < MAX_MS)) return;
      clearInterval(tick);
      setLeaving(true);
      fade = setTimeout(() => done.current(), FADE_MS);
    }, 100);
    return () => {
      clearInterval(tick);
      if (fade) clearTimeout(fade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 톡 누르면 말을 멈추고 바로 넘어간다
  function skip() {
    stopVoice();
    done.current();
  }

  return (
    <button className={`level-title${leaving ? ' leaving' : ''}`} onClick={skip} aria-label={t(key)}>
      <span className="level-title-card">
        {newIsland && <span className="level-title-badge">{t('courseNewIsland')}</span>}
        <small>{t(`island${island}Name` as MessageKey)} · {t('courseLevel', { i: level + 1 })}</small>
        <LevelPicture island={island} level={level} scale={1.3} />
        <strong>{t(key)}</strong>
      </span>
    </button>
  );
}
