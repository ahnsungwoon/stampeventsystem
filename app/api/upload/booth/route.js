import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const boothId = searchParams.get('id');
  if (!boothId) return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 });

  const formData = await request.formData();
  const file     = formData.get('image');
  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
  }

  const buffer    = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const filename  = `booth-${boothId}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  const cleanPath = `/uploads/${filename}`;
  await db.execute('UPDATE booths SET image_url=? WHERE id=?', [cleanPath, boothId]);

  return NextResponse.json({ path: `${cleanPath}?t=${Date.now()}` });
}
