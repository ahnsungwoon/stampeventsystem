import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [rows] = await db.execute(
    "SELECT `key`, value FROM settings WHERE `key` IN ('announcement', 'announcement_active')"
  );
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return NextResponse.json({
    content: map.announcement       || '',
    active:  map.announcement_active === '1',
  });
}
