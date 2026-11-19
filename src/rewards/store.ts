// 완료 보상 기록: 몇 번 완성했는지와 아이 이름을 이 기기(localStorage)에만 저장한다
// (로그인·서버 없음. 기록은 이 브라우저 안에만 남는다)

const STORAGE_KEY = 'cube-mate-rewards';
/** 스티커판 한 장의 칸 수. 다 채우면 큐비가 변신한다 */
export const BOARD_SIZE = 10;

export interface RewardData {
  /** 지금까지 큐브를 완성한 횟수 (= 받은 스티커 수) */
  solves: number;
  /** 상장에 들어갈 아이 이름 */
  name: string;
}

/** 이번 완성으로 바뀐 보상 상태 (완성 화면이 그리는 데 쓴다) */
export interface SolveReward {
  /** 몇 번째 완성인지 */
  solves: number;
  /** 현재 스티커판에 붙은 스티커 수 (1~10) */
  onBoard: number;
  /** 이번 완성으로 스티커판을 다 채웠는지 (= 큐비 변신) */
  transformed: boolean;
}

// 저장된 보상 기록을 읽는다 (없거나 깨져 있으면 처음 상태)
export function loadRewards(): RewardData {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      solves: Number.isFinite(raw.solves) && raw.solves > 0 ? Math.floor(raw.solves) : 0,
      name: typeof raw.name === 'string' ? raw.name : '',
    };
  } catch {
    return { solves: 0, name: '' };
  }
}

// 보상 기록을 저장한다 (저장할 수 없는 환경이면 조용히 넘어간다)
function saveRewards(data: RewardData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 개인 정보 보호 모드 등에서는 저장이 안 될 수 있다
  }
}

// 완성 횟수로 스티커판 상태를 계산한다 (10번째에 판이 꽉 차고, 11번째부터 새 판)
export function rewardFor(solves: number): SolveReward {
  const onBoard = solves === 0 ? 0 : ((solves - 1) % BOARD_SIZE) + 1;
  return { solves, onBoard, transformed: solves > 0 && onBoard === BOARD_SIZE };
}

// 큐브를 한 번 완성했다고 기록하고 스티커 한 장을 붙인다
export function recordSolve(): SolveReward {
  const data = loadRewards();
  const next = { ...data, solves: data.solves + 1 };
  saveRewards(next);
  return rewardFor(next.solves);
}

// 지금까지 다 채운 스티커판 수 (= 큐비가 변신한 횟수)
export function boardsDone(solves: number): number {
  return Math.floor(solves / BOARD_SIZE);
}

// 상장에 쓸 아이 이름을 저장한다
export function saveName(name: string) {
  saveRewards({ ...loadRewards(), name: name.trim().slice(0, 12) });
}
