// 같이 해 보기의 단계 카드들: 앞 섬에서 배운 단계는 먼저 혼자 해 보게 하고(어려우면 같이), 단계가 끝날 때마다 다음 단계를 알려 준다
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { Bubble } from '../../widgets/Bubble';

/** 단계 목표 그림 (흰 꽃은 꽃 모양, 십자·1층은 뒤집어 아래쪽을 본 모습) */
export interface StagePicture {
  state: string;
  highlight: number[];
  flipped: boolean;
}

// 목표 그림 큐브와 설명 글자
function Picture({ picture }: { picture: StagePicture }) {
  const { t } = useI18n();
  return (
    <div className="cube-stage">
      <Cube3D state={picture.state} highlight={picture.highlight} glow />
      <div className="cube-caption">{t(picture.flipped ? 'stageFlipped' : 'stageGoalPic')}</div>
    </div>
  );
}

interface BeforeProps {
  /** 이번 섬 단계 (1 흰 십자, 2 1층): 그 앞 단계까지 혼자 만들어 보게 한다 */
  stage: number;
  picture: StagePicture;
  onMade: () => void;
  onHelp: () => void;
}

// "먼저 혼자 흰 꽃(흰 십자까지)을 만들어 봐!": 다 만들었으면 보여 주고, 어려우면 같이 만든다
export function BeforeCard({ stage, picture, onMade, onHelp }: BeforeProps) {
  const { t } = useI18n();
  return (
    <>
      <Picture picture={picture} />
      <Bubble>
        <strong className="move-title">{t(`practiceBefore${stage}` as MessageKey)}</strong>
        <small className="course-tip">{t('practiceBeforeNote')}</small>
      </Bubble>
      <button className="btn primary big" onClick={onMade}>{t('practiceBeforeDone')}</button>
      <button className="btn big" onClick={onHelp}>{t('practiceBeforeHelp')}</button>
    </>
  );
}

interface NotYetProps {
  stage: number;
  picture: StagePicture;
  onRetry: () => void;
  onHelp: () => void;
}

// 보여 준 큐브가 아직 앞 단계까지 안 됐을 때: 다시 혼자 해 보거나 같이 만든다
export function NotYetCard({ stage, picture, onRetry, onHelp }: NotYetProps) {
  const { t } = useI18n();
  return (
    <>
      <Picture picture={picture} />
      <Bubble tone="warn"><strong className="move-title">{t(`practiceNotYet${stage}` as MessageKey)}</strong></Bubble>
      <button className="btn primary big" onClick={onRetry}>{t('practiceTryAgain')}</button>
      <button className="btn big" onClick={onHelp}>{t('practiceBeforeHelp')}</button>
    </>
  );
}

interface DoneProps {
  /** 방금 끝난 단계 (0 흰 꽃, 1 흰 십자) */
  done: number;
  picture: StagePicture;
  onNext: () => void;
}

// 한 단계가 끝났을 때: "흰 꽃 완성! 이제 …" 하고 다음 단계로 넘어간다
export function StageDoneCard({ done, picture, onNext }: DoneProps) {
  const { t } = useI18n();
  return (
    <>
      <Picture picture={picture} />
      <Bubble tone="good"><strong className="move-title">{t(`practiceStageDone${done}` as MessageKey)}</strong></Bubble>
      <button className="btn primary big" onClick={onNext}>{t('courseOk')} ▶</button>
    </>
  );
}
