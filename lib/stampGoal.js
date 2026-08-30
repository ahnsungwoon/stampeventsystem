import db from './db';

export const DEFAULT_STAMP_GOAL = 6;

// 상품 수령에 필요한 스탬프 개수. 전체 부스 수를 넘지 않도록 clamp.
export async function getStampGoal(totalBooths) {
  const [rows] = await db.execute("SELECT value FROM settings WHERE `key` = 'stamp_goal'");
  const raw = parseInt(rows[0]?.value, 10) || DEFAULT_STAMP_GOAL;
  return Math.min(raw, totalBooths || DEFAULT_STAMP_GOAL);
}
