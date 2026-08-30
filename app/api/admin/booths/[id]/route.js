import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import { FLOOR_VALUES } from '@/lib/floors';
import { PARTNER_CATEGORY } from '@/lib/categories';

export async function PUT(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { name, club_name, description, location, floor, icon, category, image_url } = await request.json();
  const safeFloor    = FLOOR_VALUES.includes(floor) ? floor : '1';
  const safeIcon      = (icon ?? '').trim().slice(0, 8);
  const safeCategory  = category === PARTNER_CATEGORY ? PARTNER_CATEGORY : '';
  await db.execute(
    'UPDATE booths SET name=?, club_name=?, description=?, location=?, floor=?, icon=?, category=?, image_url=? WHERE id=?',
    [name, club_name ?? '', description ?? '', location ?? '', safeFloor, safeIcon, safeCategory, image_url ?? '', params.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  await db.execute('DELETE FROM booths WHERE id=?', [params.id]);
  return NextResponse.json({ ok: true });
}
