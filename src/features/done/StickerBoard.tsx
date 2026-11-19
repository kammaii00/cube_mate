// 스티커판: 완성할 때마다 스티커가 한 장씩 붙고, 10장을 채우면 큐비가 변신한다
import { useI18n } from '../../i18n';
import { BOARD_SIZE } from '../../rewards/store';

/** 칸마다 정해진 스티커 그림 (1번 칸은 늘 ⭐, 10번 칸은 늘 👑) */
const STICKERS = ['⭐', '🌈', '🍓', '🦄', '🚀', '🌸', '🐣', '🍀', '🎈', '👑'];

interface Props {
  /** 지금 판에 붙은 스티커 수 (1~10) */
  onBoard: number;
}

// 10칸 스티커판을 그린다. 방금 받은 스티커는 톡 튀어나오며 붙는다
export function StickerBoard({ onBoard }: Props) {
  const { t } = useI18n();
  const left = BOARD_SIZE - onBoard;
  return (
    <section className="sticker-board" aria-label={t('boardTitle')}>
      <b>{t('boardTitle')}</b>
      <div className="sticker-grid">
        {STICKERS.map((emoji, i) => {
          const state = i < onBoard - 1 ? 'got' : i === onBoard - 1 ? 'got new' : 'empty';
          return (
            <span key={i} className={`sticker ${state}`} aria-hidden="true">
              {i < onBoard ? emoji : i + 1}
            </span>
          );
        })}
      </div>
      <small>{left > 0 ? t('boardLeft', { n: left }) : t('boardFull')}</small>
    </section>
  );
}
