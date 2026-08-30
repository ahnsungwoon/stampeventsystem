import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { title, performer, location, start_time, end_time, description } = await request.json();
  await db.execute(
    'UPDATE performances SET title=?, performer=?, location=?, start_time=?, end_time=?, description=? WHERE id=?',
    [title, performer ?? '', location ?? '', start_time, end_time ?? '', description ?? '', params.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  await db.execute('DELETE FROM performances WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
