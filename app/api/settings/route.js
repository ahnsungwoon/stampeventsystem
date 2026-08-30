import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [rows] = await db.execute('SELECT `key`, value FROM settings');
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return NextResponse.json(settings);
}

export async function PUT(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    await db.execute(
      'REPLACE INTO settings (`key`, value) VALUES (?, ?)',
      [key, value ?? '']
    );
  }
  return NextResponse.json({ ok: true });
}
