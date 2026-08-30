import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export async function GET() {
  const [rows] = await db.execute(
    'SELECT * FROM performances ORDER BY start_time, sort_order'
  );
  return NextResponse.json(rows);
}

export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { title, performer, location, start_time, end_time, description } = await request.json();
  if (!title || !start_time) {
    return NextResponse.json({ error: '제목과 시작 시간은 필수입니다.' }, { status: 400 });
  }
  const [result] = await db.execute(
    'INSERT INTO performances (title, performer, location, start_time, end_time, description) VALUES (?, ?, ?, ?, ?, ?)',
    [title, performer ?? '', location ?? '', start_time, end_time ?? '', description ?? '']
  );
  return NextResponse.json({ id: result.insertId });
}
