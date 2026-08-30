import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const [boothResult, totalsResult, byHourResult] = await Promise.all([
    db.execute('SELECT id, name, club_name FROM booths WHERE id = ?', [params.id]),
    db.execute(
      'SELECT COUNT(*) AS totalVisits, COUNT(DISTINCT user_id) AS uniqueVisitors FROM booth_visits WHERE booth_id = ?',
      [params.id]
    ),
    db.execute(`
      SELECT DATE_FORMAT(scanned_at, '%Y-%m-%d %H:00') AS hour,
        COUNT(*) AS visits,
        COUNT(DISTINCT user_id) AS uniqueVisitors
      FROM booth_visits
      WHERE booth_id = ?
      GROUP BY hour
      ORDER BY hour ASC
    `, [params.id]),
  ]);

  const booth = boothResult[0][0];
  if (!booth) {
    return NextResponse.json({ error: '존재하지 않는 부스입니다.' }, { status: 404 });
  }
  const totals = totalsResult[0][0];

  return NextResponse.json({
    booth,
    totalVisits:    totals.totalVisits,
    uniqueVisitors: totals.uniqueVisitors,
    byHour:         byHourResult[0],
  });
}
