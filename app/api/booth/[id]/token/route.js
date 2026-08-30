import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateToken, remainingMs } from '@/lib/token';

export async function GET(request, { params }) {
  const { id } = params;
  const key = new URL(request.url).searchParams.get('key');

  const [rows] = await db.execute('SELECT * FROM booths WHERE id = ?', [id]);
  const booth = rows[0];
  if (!booth) {
    return NextResponse.json({ error: '존재하지 않는 부스입니다.' }, { status: 404 });
  }
  if (booth.display_key !== key) {
    return NextResponse.json({ error: '접근 키가 올바르지 않습니다.' }, { status: 403 });
  }

  const token = generateToken(booth.id, booth.secret);

  return NextResponse.json({
    boothId:     booth.id,
    boothName:   booth.name,
    location:    booth.location,
    token,
    remainingMs: remainingMs(),
    qrData:      JSON.stringify({ b: booth.id, t: token }),
  });
}
