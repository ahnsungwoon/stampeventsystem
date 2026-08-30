import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

// 업로드 종류별 설정 키 / 저장 파일명 접두어
const UPLOAD_TYPES = {
  map:    { key: 'map_image',   filename: 'map'    },
  banner: { key: 'home_banner', filename: 'banner' },
  logo:   { key: 'logo_url',    filename: 'logo'   },
};

export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const typeParam = new URL(request.url).searchParams.get('type');
  const { key, filename: prefix } = UPLOAD_TYPES[typeParam] || UPLOAD_TYPES.map;

  const formData = await request.formData();
  const file = formData.get('image');
  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
  }

  const buffer    = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const filename  = `${prefix}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  const imagePath = `/uploads/${filename}`;
  await db.execute(
    'REPLACE INTO settings (`key`, value) VALUES (?, ?)',
    [key, imagePath]
  );

  return NextResponse.json({ path: imagePath });
}
