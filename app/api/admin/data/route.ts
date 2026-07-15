import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getAdminData } from '@/lib/db';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  try {
    return NextResponse.json(await getAdminData());
  } catch {
    return NextResponse.json({ error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}
