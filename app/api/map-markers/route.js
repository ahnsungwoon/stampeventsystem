import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export async function GET() {
  const [rows] = await db.execute('SELECT * FROM map_markers');
  return NextResponse.json(rows);
}

export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { label, description, x_pct, y_pct, booth_id, color } = await request.json();
  if (!label || x_pct == null || y_pct == null) {
    return NextResponse.json({ error: '라벨과 좌표는 필수입니다.' }, { status: 400 });
  }
  const [result] = await db.execute(
    'INSERT INTO map_markers (label, description, x_pct, y_pct, booth_id, color) VALUES (?, ?, ?, ?, ?, ?)',
    [label, description ?? '', x_pct, y_pct, booth_id || null, color ?? '#6C3DE8']
  );
  return NextResponse.json({ id: result.insertId });
}
