import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import { FLOOR_VALUES } from '@/lib/floors';
import { PARTNER_CATEGORY } from '@/lib/categories';

function sanitizeCategory(category) {
  return category === PARTNER_CATEGORY ? PARTNER_CATEGORY : '';
}

// 관리자용 부스 목록 (부스 화면 접근키 포함)
export async function GET(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const [booths] = await db.execute(
    'SELECT id, name, club_name, description, location, floor, icon, category, image_url, display_key FROM booths ORDER BY id'
  );
  return NextResponse.json(booths);
}

// 부스 신규 추가
export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { name, club_name, description, location, floor, icon, category } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: '부스 이름을 입력해 주세요.' }, { status: 400 });
  }
  const safeFloor    = FLOOR_VALUES.includes(floor) ? floor : '1';
  const safeIcon      = (icon ?? '').trim().slice(0, 8);
  const safeCategory  = sanitizeCategory(category);
  const secret        = crypto.randomBytes(32).toString('hex');
  const display_key   = crypto.randomBytes(6).toString('hex');
  const [result] = await db.execute(
    'INSERT INTO booths (name, club_name, description, location, floor, icon, category, secret, display_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name.trim(), club_name ?? '', description ?? '', location ?? '', safeFloor, safeIcon, safeCategory, secret, display_key]
  );
  return NextResponse.json({
    id: result.insertId, name: name.trim(), club_name: club_name ?? '',
    description: description ?? '', location: location ?? '', floor: safeFloor, icon: safeIcon, category: safeCategory, image_url: '', display_key,
  });
}
