// 완성 화면: 색종이와 함께 축하하고 다시 시작할 수 있게 한다
import { useI18n } from '../../i18n';
import { Cube3D } from '../../render/Cube3D';
import { Confetti } from '../../widgets/Confetti';

interface Props {
  /** 완성된 큐브 상태 (사용자가 잡고 있는 방향 그대로) */
  state: string;
  moveCount: number;
  onRestart: () => void;
}

// 빙글빙글 도는 완성 큐브와 결과를 보여준다
export function DoneScreen({ state, moveCount, onRestart }: Props) {
  const { t } = useI18n();
  return (
    <main className="screen done">
      <Confetti />
      <h1>{t('doneTitle')} 🎉</h1>
      <Cube3D state={state} spin />
      <p className="tagline">{t('doneText', { n: moveCount })}</p>
      <button className="btn primary big" onClick={onRestart}>{t('doneAgain')}</button>
    </main>
  );
}
