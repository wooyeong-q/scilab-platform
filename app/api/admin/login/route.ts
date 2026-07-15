import { NextResponse } from 'next/server';
import { setAdminSession, verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: '관리자 환경변수가 설정되지 않았습니다.' }, { status: 503 });
  }
  if (!verifyPassword(String(password || ''))) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
