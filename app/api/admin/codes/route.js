import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getAdminUser } from '@/lib/auth';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}

export async function GET(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const [codes] = await db.execute(
    'SELECT ac.*, u.phone FROM access_codes ac LEFT JOIN users u ON ac.user_id = u.id ORDER BY ac.created_at DESC'
  );
  return NextResponse.json(codes);
}

export async function POST(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { count = 1 } = await request.json();
  const n = Math.min(Math.max(parseInt(count), 1), 500);

  // 후보 코드를 로컬에서 먼저 넉넉히 만든 뒤, 기존 코드와의 중복을 한 번의 쿼리로 걸러낸다.
  const candidates = new Set();
  while (candidates.size < n * 2) candidates.add(generateCode());

  const candidateList = [...candidates];
  const [existingRows] = await db.query(
    'SELECT code FROM access_codes WHERE code IN (?)',
    [candidateList]
  );
  const existing = new Set(existingRows.map(r => r.code));

  const generated = candidateList.filter(c => !existing.has(c)).slice(0, n);

  if (generated.length) {
    await db.query(
      'INSERT IGNORE INTO access_codes (code) VALUES ?',
      [generated.map(c => [c])]
    );
  }

  return NextResponse.json({ generated, count: generated.length });
}

export async function DELETE(request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { deleteAll, id } = await request.json().catch(() => ({}));
  if (deleteAll) {
    await db.execute('DELETE FROM access_codes WHERE user_id IS NULL');
  } else if (id) {
    await db.execute('DELETE FROM access_codes WHERE id = ?', [id]);
  }
  return NextResponse.json({ ok: true });
}
