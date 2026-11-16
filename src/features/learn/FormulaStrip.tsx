// 공식 한 줄: 공식 이름과, 회전 하나하나를 작은 칸(어느 줄을 어느 쪽으로)으로 보여준다
import { parseMove, type Move } from '../../core/moves';
import { useI18n, type MessageKey } from '../../i18n';
import { FORMULAS, type FormulaId } from '../../solver/beginner/lesson';

/** 면별 화살표 기호: [시계 방향, 두 번, 반시계 방향] */
const SYMBOLS: Record<string, [string, string, string]> = {
  U: ['←', '←←', '→'],
  D: ['→', '→→', '←'],
  R: ['↑', '↑↑', '↓'],
  L: ['↓', '↓↓', '↑'],
  F: ['↻', '↻↻', '↺'],
  B: ['←', '×2', '→'],
};

interface Props {
  formula: FormulaId;
  /** 지금 돌릴 차례인 칸 번호 (없으면 강조 없음) */
  active?: number;
  /** 이름 옆에 붙일 말 (예: "2번째 / 3번") */
  note?: string;
}

// 공식 이름을 현재 언어로 구한다
export function formulaName(id: FormulaId, t: (key: MessageKey) => string): string {
  return t(('formula' + id[0].toUpperCase() + id.slice(1)) as MessageKey);
}

// 회전 하나를 "오른쪽 ↑" 같은 칸으로 그린다
function chip(move: Move, t: (key: MessageKey) => string) {
  const { face, turns } = parseMove(move);
  return (
    <>
      <small>{t(('chip' + face) as MessageKey)}</small>
      <b>{SYMBOLS[face][turns - 1]}</b>
    </>
  );
}

// 공식 이름과 회전 칸들을 그린다. active 칸은 크게 강조하고 이미 지난 칸은 흐리게 한다.
export function FormulaStrip({ formula, active, note }: Props) {
  const { t } = useI18n();
  return (
    <div className="formula">
      <div className="formula-name">
        <b>{formulaName(formula, t)}</b>
        {note && <span>{note}</span>}
      </div>
      <ol>
        {FORMULAS[formula].map((move, i) => (
          <li key={i} className={active === undefined ? '' : i === active ? 'now' : i < active ? 'past' : ''}>
            {chip(move, t)}
          </li>
        ))}
      </ol>
    </div>
  );
}
