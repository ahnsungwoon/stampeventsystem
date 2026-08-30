import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const CODE_REGEX  = /^[A-Za-z0-9]{4,12}$/;

export async function POST(request) {
  const body = await request.json();
  const raw  = (body.code ?? '').trim().toUpperCase();

  if (!CODE_REGEX.test(raw)) {
    return NextResponse.json({ error: '올바른 접속 코드를 입력해 주세요.' }, { status: 400 });
  }

  const [codeRows] = await db.execute('SELECT * FROM access_codes WHERE code = ?', [raw]);
  const codeRecord = codeRows[0];

  if (!codeRecord) {
    return NextResponse.json(
      { error: '유효하지 않은 접속 코드입니다. 발급받은 코드를 확인해 주세요.' },
      { status: 400 }
    );
  }

  let userId = codeRecord.user_id;

  if (!userId) {
    const [result] = await db.execute('INSERT INTO users (phone) VALUES (?)', [raw]);
    userId = result.insertId;
    await db.execute(
      'UPDATE access_codes SET user_id = ?, first_used_at = NOW() WHERE code = ?',
      [userId, raw]
    );
  }

  const token = jwt.sign({ userId, code: raw }, JWT_SECRET, { expiresIn: '24h' });
  return NextResponse.json({ token, userId, code: raw });
}
