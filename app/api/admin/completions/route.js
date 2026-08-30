import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import { getStampGoal } from '@/lib/stampGoal';

export async function GET(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const [[{ n: totalBooths }]] = await db.execute('SELECT COUNT(*) AS n FROM booths');
  const goal = await getStampGoal(totalBooths);

  const [completers] = await db.execute(`
    SELECT
      u.id AS user_id,
      u.reward_claimed,
      u.reward_claimed_at,
      ac.code,
      COUNT(s.id) AS stamp_count,
      MAX(s.collected_at) AS last_stamp_at,
      ac.first_used_at
    FROM users u
    JOIN access_codes ac ON ac.user_id = u.id
    JOIN stamps s ON s.user_id = u.id
    GROUP BY u.id, u.reward_claimed, u.reward_claimed_at, ac.code, ac.first_used_at
    HAVING COUNT(s.id) >= ?
    ORDER BY last_stamp_at DESC
  `, [goal]);

  return NextResponse.json({ completers, totalBooths, goal });
}

export async function POST(request) {
  const { code } = await request.json();
  const upper = (code ?? '').toUpperCase();

  const [[{ n: totalBooths }]] = await db.execute('SELECT COUNT(*) AS n FROM booths');
  const goal = await getStampGoal(totalBooths);

  const [codeRows] = await db.execute('SELECT * FROM access_codes WHERE code = ?', [upper]);
  const codeRecord = codeRows[0];

  if (!codeRecord) {
    return NextResponse.json({ valid: false, error: '존재하지 않는 코드입니다.' });
  }
  if (!codeRecord.user_id) {
    return NextResponse.json({ valid: true, code: upper, used: false, stampCount: 0, totalBooths, goal, completed: false });
  }

  const [[{ n: stampCount }]] = await db.execute(
    'SELECT COUNT(*) AS n FROM stamps WHERE user_id = ?',
    [codeRecord.user_id]
  );

  const [stamps] = await db.execute(`
    SELECT s.booth_id, b.name, s.collected_at
    FROM stamps s JOIN booths b ON b.id = s.booth_id
    WHERE s.user_id = ?
    ORDER BY s.collected_at
  `, [codeRecord.user_id]);

  const [userRows] = await db.execute(
    'SELECT reward_claimed, reward_claimed_at FROM users WHERE id = ?',
    [codeRecord.user_id]
  );

  return NextResponse.json({
    valid: true,
    code: upper,
    used: true,
    stampCount,
    totalBooths,
    goal,
    completed: stampCount >= goal,
    stamps,
    firstUsedAt:      codeRecord.first_used_at,
    reward_claimed:   userRows[0]?.reward_claimed || 0,
    reward_claimed_at: userRows[0]?.reward_claimed_at || null,
  });
}
