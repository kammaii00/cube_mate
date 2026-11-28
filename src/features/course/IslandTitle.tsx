// 섬 안 화면의 제목: 섬 이름 옆에 지도와 같은 주제 팻말 그림을 작게 붙여 어느 섬에 있는지 보여 준다
import { useI18n, type MessageKey } from '../../i18n';
import { ISLAND_TOPICS, SignIcon } from './IslandArt';

// 팻말 그림 + 섬 이름 제목
export function IslandTitle({ island }: { island: number }) {
  const { t } = useI18n();
  return (
    <h2 className="island-title">
      <SignIcon topic={ISLAND_TOPICS[island]} size={30} />
      <span>{t(`island${island}Name` as MessageKey)}</span>
    </h2>
  );
}
