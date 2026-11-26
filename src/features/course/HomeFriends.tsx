// 홈 화면에 꼬마 코스에서 구한 친구들을 큐비 옆에 작게 보여 준다 (한 명도 없으면 아무것도 안 그린다)
import { islandDone, loadCourse } from '../../course/progress';
import { ISLANDS } from '../../course/skills';
import { Friend } from '../../widgets/Friend';
import './course.css';

// 구한 친구들을 한 줄로 그린다
export function HomeFriends() {
  const data = loadCourse();
  const saved = ISLANDS.filter((i) => islandDone(data, i.id));
  if (!saved.length) return null;
  return (
    <div className="home-friends">
      {saved.map((i) => <Friend key={i.id} shape={i.friend.shape} colors={i.friend.colors} look="free" size={40} />)}
    </div>
  );
}
