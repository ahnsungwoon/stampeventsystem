import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [booths] = await db.execute(
    'SELECT id, name, club_name, description, location, floor, icon, category, image_url FROM booths ORDER BY id'
  );
  return NextResponse.json(booths);
}
