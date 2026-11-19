// 큐비가 말하는 말풍선: 안내 문장을 캐릭터의 말로 보여준다
import type { ReactNode } from 'react';
import { replayVoice } from '../voice/voice';
import { Mascot } from './Mascot';

interface Props {
  children: ReactNode;
  /** 말풍선 색 분위기: 보통 / 좋음(초록) / 주의(주황) */
  tone?: 'normal' | 'good' | 'warn';
}

// 왼쪽에 큐비, 오른쪽에 말풍선을 그린다. 큐비를 누르면 마지막으로 한 말을 다시 들려준다
export function Bubble({ children, tone = 'normal' }: Props) {
  return (
    <div className={`bubble-row ${tone}`}>
      <button className="mascot-btn" onClick={replayVoice} aria-label="replay">
        <Mascot size={52} />
      </button>
      <div className="bubble" role="status">{children}</div>
    </div>
  );
}
