import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { label, description, x_pct, y_pct, booth_id, color } = await request.json();
  await db.execute(
    'UPDATE map_markers SET label=?, description=?, x_pct=?, y_pct=?, booth_id=?, color=? WHERE id=?',
    [label, description ?? '', x_pct, y_pct, booth_id || null, color ?? '#6C3DE8', params.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  await db.execute('DELETE FROM map_markers WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
