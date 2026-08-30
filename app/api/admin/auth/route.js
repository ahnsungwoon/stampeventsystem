import { NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';

export async function POST(request) {
  const { password } = await request.json();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD가 설정되지 않았습니다.' }, { status: 500 });
  }
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  return NextResponse.json({ token: signAdminToken() });
}
