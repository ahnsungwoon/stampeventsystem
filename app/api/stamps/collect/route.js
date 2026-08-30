import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { verifyToken } from '@/lib/token';

export async function POST(request) {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { boothId, token } = await request.json();
  if (!boothId || !token) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const [boothRows] = await db.execute('SELECT * FROM booths WHERE id = ?', [boothId]);
  const booth = boothRows[0];
  if (!booth) {
    return NextResponse.json({ error: '존재하지 않는 부스입니다.' }, { status: 404 });
  }

  if (!verifyToken(booth.id, booth.secret, token)) {
    return NextResponse.json(
      { error: 'QR 코드가 만료되었습니다. 새로고침된 QR을 다시 스캔해 주세요.' },
      { status: 401 }
    );
  }

  // 유효한 QR 스캔은 (중복 수집이더라도) 방문 기록으로 남긴다
  await db.execute(
    'INSERT INTO booth_visits (user_id, booth_id) VALUES (?, ?)',
    [user.userId, booth.id]
  );

  try {
    await db.execute(
      'INSERT INTO stamps (user_id, booth_id) VALUES (?, ?)',
      [user.userId, booth.id]
    );
    return NextResponse.json({
      success:   true,
      message:   `🎉 [${booth.name}] 스탬프 적립 완료!`,
      boothName: booth.name,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: `이미 [${booth.name}] 스탬프를 받았습니다.` },
        { status: 409 }
      );
    }
    throw err;
  }
}
