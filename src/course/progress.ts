// 꼬마 코스 기록: 레벨마다 성공한 횟수를 이 기기(localStorage)에만 저장한다
import { ISLANDS, WINS_PER_LEVEL } from './skills';

const STORAGE_KEY = 'cube-mate-course2';

export interface CourseData {
  /** wins[섬][레벨] = 성공 횟수 (WINS_PER_LEVEL이면 별) */
  wins: number[][];
  /** 소개를 본 레벨들 (섬 × 10 + 레벨, 레벨에 처음 들어갈 때 한 번 보여 준다) */
  intro: number[];
}

// 처음 기록 (성공 0번)
function fresh(): CourseData {
  return { wins: ISLANDS.map((i) => i.levels.map(() => 0)), intro: [] };
}

// 저장된 기록을 읽는다 (없거나 깨져 있으면 처음 기록)
export function loadCourse(): CourseData {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const base = fresh();
    // 섬에 레벨이 앞쪽에 새로 생기면(예: 흰 꽃 섬 화면 연습) 옛 기록은 뒤쪽 레벨에 맞춘다
    if (Array.isArray(raw.wins))
      base.wins = base.wins.map((row, i) => {
        const old: unknown[] = Array.isArray(raw.wins[i]) ? raw.wins[i] : [];
        const shift = row.length - old.length;
        return row.map((_, k) => Math.min(WINS_PER_LEVEL, Math.max(0, Number(old[k - shift]) || 0)));
      });
    if (Array.isArray(raw.intro)) base.intro = raw.intro.filter((n: unknown) => typeof n === 'number');
    return base;
  } catch {
    return fresh();
  }
}

// 기록을 저장한다 (저장할 수 없는 환경이면 조용히 넘어간다)
export function saveCourse(data: CourseData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 개인 정보 보호 모드 등에서는 저장이 안 될 수 있다
  }
}

// 섬에서 별을 받은 레벨 수
export function starsOf(data: CourseData, island: number): number {
  return data.wins[island].filter((w) => w >= WINS_PER_LEVEL).length;
}

// 섬을 다 깼는지 (= 친구를 구했는지)
export function islandDone(data: CourseData, island: number): boolean {
  return starsOf(data, island) === ISLANDS[island].levels.length;
}

// 섬이 열렸는지 (첫 섬이거나 앞 섬을 다 깼으면)
export function islandOpen(data: CourseData, island: number): boolean {
  return island === 0 || islandDone(data, island - 1);
}

// 섬에서 지금 할 레벨 (다 깼으면 마지막 레벨을 다시 연습)
export function currentLevel(data: CourseData, island: number): number {
  const k = data.wins[island].findIndex((w) => w < WINS_PER_LEVEL);
  return k < 0 ? ISLANDS[island].levels.length - 1 : k;
}

/** 성공을 기록한 결과: 이번에 별을 받았는지, 섬을 다 깼는지 */
export interface WinResult {
  data: CourseData;
  star: boolean;
  rescued: boolean;
}

// 문제 하나를 성공했다고 기록한다 (counted가 false면 = 도움을 받았으면 횟수는 그대로)
export function recordWin(data: CourseData, island: number, level: number, counted: boolean): WinResult {
  const wasDone = islandDone(data, island);
  const before = data.wins[island][level];
  const wins = data.wins.map((row) => [...row]);
  if (counted) wins[island][level] = Math.min(WINS_PER_LEVEL, before + 1);
  const next = { ...data, wins };
  saveCourse(next);
  return {
    data: next,
    star: before < WINS_PER_LEVEL && wins[island][level] >= WINS_PER_LEVEL,
    rescued: !wasDone && islandDone(next, island),
  };
}

// 소개를 봤다고 기록한다 (번호 = 섬 × 10 + 레벨)
export function markIntro(data: CourseData, id: number): CourseData {
  const next = { ...data, intro: [...new Set([...data.intro, id])] };
  saveCourse(next);
  return next;
}
