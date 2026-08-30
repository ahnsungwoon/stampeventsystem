import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getStampGoal } from '@/lib/stampGoal';

export async function POST(request) {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { staffPassword } = await request.json();
  const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

  if (!STAFF_PASSWORD || staffPassword !== STAFF_PASSWORD) {
    return NextResponse.json({ error: '직원 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  // 수령 완료 여부 확인
  const [userRows] = await db.execute(
    'SELECT reward_claimed FROM users WHERE id = ?',
    [user.userId]
  );
  if (!userRows[0]) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (userRows[0].reward_claimed) {
    return NextResponse.json({ error: '이미 상품을 수령했습니다.', already: true }, { status: 409 });
  }

  // 스탬프 완성 확인
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM booths');
  const [[{ collected }]] = await db.execute(
    'SELECT COUNT(*) AS collected FROM stamps WHERE user_id = ?',
    [user.userId]
  );
  const goal = await getStampGoal(total);

  if (collected < goal) {
    return NextResponse.json(
      { error: `스탬프가 아직 완성되지 않았습니다. (${collected}/${goal})` },
      { status: 400 }
    );
  }

  await db.execute(
    'UPDATE users SET reward_claimed = 1, reward_claimed_at = NOW() WHERE id = ?',
    [user.userId]
  );

  return NextResponse.json({ ok: true, message: '상품 수령 완료!' });
}
