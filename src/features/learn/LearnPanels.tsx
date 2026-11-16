// 수업 장면별 아래쪽 내용: 큐비의 설명과 버튼들
import type { ReactNode } from 'react';
import { FACES, type Face } from '../../core/faces';
import { useI18n, type MessageKey, type Translate } from '../../i18n';
import { FORMULAS, STAGE_FORMULAS } from '../../solver/beginner/lesson';
import { Bubble } from '../../widgets/Bubble';
import { describeMove } from '../guide/moveText';
import { FormulaStrip, formulaName } from './FormulaStrip';
import type { Frame } from './frames';

export interface PanelProps {
  frame: Frame;
  /** 처음 잡는 법 장면에서 보여줄 전체 회전 수 */
  total: number;
  showFormula: boolean;
  onNext: () => void;
  onPrev: () => void;
  onReplay: () => void;
  onJump: (index: number) => void;
  onShowFormula: () => void;
}

// 문구 열쇠를 "머리말 + 이름(첫 글자 대문자)"으로 만든다. 예: why + cornerUp → whyCornerUp
function keyOf(prefix: string, name: string): MessageKey {
  return (prefix + name[0].toUpperCase() + name.slice(1)) as MessageKey;
}

// 색 글자를 색 이름으로 바꾼다
function colorName(t: Translate, letter: string | undefined): string {
  return letter && FACES.includes(letter as Face) ? t(('color' + letter) as MessageKey) : '';
}

// 큰 버튼 하나와 그 아래 작은 버튼 줄을 그린다
function Buttons({ main, onMain, children }: { main: string; onMain: () => void; children?: ReactNode }) {
  return (
    <>
      <button className="btn primary big" onClick={onMain}>{main}</button>
      {children && <div className="row">{children}</div>}
    </>
  );
}

// 단계 소개: 목표, 방법, 새로 배우는 공식
function StageIntro({ frame, onNext, onPrev }: PanelProps) {
  const { t } = useI18n();
  const n = frame.stage + 1;
  return (
    <>
      <div className="lesson-card">
        <h3>{t(`stage${n}Title` as MessageKey)}</h3>
        <p>{t(`stage${n}Goal` as MessageKey)}</p>
        <p className="how">{t(`stage${n}How` as MessageKey)}</p>
        {STAGE_FORMULAS[frame.stage].length > 0 && <b className="label">{t('stageNewFormula')}</b>}
        {STAGE_FORMULAS[frame.stage].map((id) => <FormulaStrip key={id} formula={id} />)}
      </div>
      <Buttons main={t('stageStart')} onMain={onNext}>
        <button className="btn small" onClick={onPrev}>◀ {t('guidePrev')}</button>
      </Buttons>
    </>
  );
}

// 조각 찾기: 이번에 맞출 조각이 무엇이고 어디로 가는지 알려준다
function MissionIntro({ frame, onNext, onPrev }: PanelProps) {
  const { t } = useI18n();
  const letters = frame.mission!.piece.map((i) => frame.state[i]);
  const white = frame.state[31];
  const names = (list: string[]) => list.map((c) => colorName(t, c)).join(' · ');
  const others = letters.filter((c) => c !== white);
  const params = { colors: names(letters), side: names(others), home: names(frame.stage === 2 ? others : letters) };
  const visible = frame.mission!.piece.some((i) => i < 27);
  return (
    <>
      <Bubble>
        <strong className="move-title">{t(`mission${frame.stage + 1}Head` as MessageKey, params)}</strong>
        <span>{t(`mission${frame.stage + 1}Text` as MessageKey, params)}</span>
        <small>{t(visible ? 'missionVisible' : 'missionHidden')}</small>
      </Bubble>
      <Buttons main={t('missionFound')} onMain={onNext}>
        <button className="btn small" onClick={onPrev}>◀ {t('guidePrev')}</button>
      </Buttons>
    </>
  );
}

// 회전 하나: 무엇을 돌리는지, 왜 돌리는지, 공식의 몇 번째인지
function MoveStep({ frame, onNext, onPrev, onReplay }: PanelProps) {
  const { t } = useI18n();
  const chunk = frame.chunk!;
  const size = chunk.formula ? FORMULAS[chunk.formula].length : 1;
  const rep = Math.floor(frame.moveNo! / size) + 1;
  return (
    <>
      {chunk.formula && (
        <FormulaStrip
          formula={chunk.formula}
          active={frame.moveNo! % size}
          note={(chunk.reps ?? 1) > 1 ? t('formulaRep', { i: rep, n: chunk.reps! }) : undefined}
        />
      )}
      <Bubble>
        <strong className="move-title">{describeMove(frame.move!, t).title}</strong>
        <small>{t(keyOf('why', chunk.why), { color: colorName(t, chunk.color) })}</small>
      </Bubble>
      <Buttons main={`${t('guideNext')} ▶`} onMain={onNext}>
        <button className="btn small" onClick={onPrev}>◀ {t('guidePrev')}</button>
        <button className="btn small" onClick={onReplay}>↻ {t('guideReplay')}</button>
      </Buttons>
    </>
  );
}

// 혼자 해보기: 이미 두 번 같이 해 본 공식을 스스로 해 보게 한다
function TryIt({ frame, showFormula, onNext, onJump, onShowFormula }: PanelProps) {
  const { t } = useI18n();
  const chunk = frame.chunk!;
  return (
    <>
      <Bubble tone="good">
        <strong className="move-title">{t('tryHead')}</strong>
        <span>{t('tryText', { formula: formulaName(chunk.formula!, t), n: chunk.reps ?? 1 })}</span>
        <small>{t(keyOf('why', chunk.why), { color: colorName(t, chunk.color) })}</small>
      </Bubble>
      {showFormula && <FormulaStrip formula={chunk.formula!} />}
      <Buttons main={t('tryDone')} onMain={() => onJump(frame.jumpTo!)}>
        <button className="btn small" onClick={onNext}>{t('tryTogether')}</button>
        <button className="btn small" disabled={showFormula} onClick={onShowFormula}>{t('tryShow')}</button>
      </Buttons>
      <p className="hint">{t('tryNote')}</p>
    </>
  );
}

// 장면 종류에 맞는 내용을 그린다
export function LearnPanel(props: PanelProps) {
  const { t } = useI18n();
  const { frame, total, onNext, onPrev, onJump } = props;
  switch (frame.type) {
    case 'hold':
      return (
        <>
          <Bubble>
            <strong className="move-title">{t('learnHoldHead')}</strong>
            <span>{t('learnHoldText')}</span>
            <small>{t('learnHoldCount', { n: Math.round(total / 10) * 10 })}</small>
          </Bubble>
          <Buttons main={t('guideStart')} onMain={onNext} />
        </>
      );
    case 'stageIntro':
      return <StageIntro {...props} />;
    case 'mission':
      return <MissionIntro {...props} />;
    case 'try':
      return <TryIt {...props} />;
    case 'tryCheck':
      return (
        <>
          <Bubble tone="good">
            <strong className="move-title">{t('checkHead')}</strong>
            <span>{t('checkText')}</span>
            <small>{t('stageDoneHelp')}</small>
          </Bubble>
          <Buttons main={t('checkOk')} onMain={onNext}>
            <button className="btn small" onClick={() => onJump(frame.jumpTo!)}>↻ {t('checkSlow')}</button>
          </Buttons>
        </>
      );
    case 'stageDone':
      return (
        <>
          <Bubble tone="good">
            <strong className="move-title">{t('stageDoneHead', { i: frame.stage + 1 })}</strong>
            <span>{t('stageDoneText')}</span>
            <small>{t('stageDoneHelp')}</small>
          </Bubble>
          <Buttons main={t('stageDoneNext')} onMain={onNext}>
            <button className="btn small" onClick={onPrev}>◀ {t('guidePrev')}</button>
          </Buttons>
        </>
      );
    default:
      return <MoveStep {...props} />;
  }
}
