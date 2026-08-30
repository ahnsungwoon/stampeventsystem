import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const [
    totalsResult, byBoothResult, byHourResult,
    participationResult, codeStatsResult,
    registrationsByHourResult, stampedUsersResult,
  ] = await Promise.all([
    db.execute('SELECT COUNT(*) AS totalVisits, COUNT(DISTINCT user_id) AS uniqueVisitors FROM booth_visits'),
    db.execute(`
      SELECT b.id, b.name, b.club_name,
        COUNT(v.id) AS visits,
        COUNT(DISTINCT v.user_id) AS uniqueVisitors
      FROM booths b
      LEFT JOIN booth_visits v ON v.booth_id = b.id
      GROUP BY b.id, b.name, b.club_name
      ORDER BY visits DESC, b.id ASC
    `),
    db.execute(`
      SELECT DATE_FORMAT(scanned_at, '%Y-%m-%d %H:00') AS hour,
        COUNT(*) AS visits,
        COUNT(DISTINCT user_id) AS uniqueVisitors
      FROM booth_visits
      GROUP BY hour
      ORDER BY hour ASC
    `),
    db.execute('SELECT COUNT(*) AS participants FROM users'),
    db.execute('SELECT COUNT(*) AS issued, SUM(user_id IS NOT NULL) AS used FROM access_codes'),
    db.execute(`
      SELECT DATE_FORMAT(first_used_at, '%Y-%m-%d %H:00') AS hour,
        COUNT(*) AS registrations
      FROM access_codes
      WHERE first_used_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour ASC
    `),
    db.execute('SELECT COUNT(DISTINCT user_id) AS n FROM stamps'),
  ]);

  const totals      = totalsResult[0][0];
  const codeStats    = codeStatsResult[0][0];
  const participants = participationResult[0][0].participants;
  const stampedUsers  = stampedUsersResult[0][0].n;

  return NextResponse.json({
    totalVisits:    totals.totalVisits,
    uniqueVisitors: totals.uniqueVisitors,
    byBooth:        byBoothResult[0],
    byHour:         byHourResult[0],
    participants,
    codesIssued:    codeStats.issued,
    codesUsed:      codeStats.used || 0,
    registrationsByHour: registrationsByHourResult[0],
    stampedUsers,
    stampedRate:    participants ? Math.round((stampedUsers / participants) * 1000) / 10 : 0,
  });
}

// 방문자(QR 스캔) 통계 초기화 — booth_visits 기록만 삭제. 스탬프/코드/사용자 데이터는 건드리지 않음.
export async function DELETE(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  await db.execute('DELETE FROM booth_visits');
  return NextResponse.json({ ok: true });
}
