import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getStampGoal } from '@/lib/stampGoal';

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const [[allBooths], [myStamps], [userRows]] = await Promise.all([
    db.execute('SELECT id, name, description, location, icon FROM booths ORDER BY id'),
    db.execute('SELECT booth_id, collected_at FROM stamps WHERE user_id = ?', [user.userId]),
    db.execute('SELECT reward_claimed, reward_claimed_at FROM users WHERE id = ?', [user.userId]),
  ]);
  const userInfo = userRows[0] ?? {};

  const goal = await getStampGoal(allBooths.length);

  const stampMap = new Map(myStamps.map(s => [s.booth_id, s.collected_at]));

  const booths = allBooths.map(b => ({
    ...b,
    stamped:      stampMap.has(b.id),
    collectedAt:  stampMap.get(b.id) ?? null,
  }));

  return NextResponse.json({
    total:            allBooths.length,
    goal,
    collected:        myStamps.length,
    booths,
    reward_claimed:   userInfo.reward_claimed   || 0,
    reward_claimed_at: userInfo.reward_claimed_at || null,
  });
}
