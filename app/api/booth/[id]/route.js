import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const [rows] = await db.execute(
    'SELECT id, name, club_name, description, location, floor, icon, category, image_url FROM booths WHERE id = ?',
    [params.id]
  );
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
