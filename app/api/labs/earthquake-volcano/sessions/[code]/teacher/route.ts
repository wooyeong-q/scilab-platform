import { NextResponse } from 'next/server';
import { normalizeSessionCode, verifyTeacher } from '@/lib/earthquake-volcano';

type Context = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeSessionCode((await params).code);
    const teacherKey = request.headers.get('x-teacher-key') || '';
    if (!code) return NextResponse.json({ error: '수업 코드 형식을 확인해 주세요.' }, { status: 400 });
    if (!await verifyTeacher(code, teacherKey)) return NextResponse.json({ error: '교사용 키가 올바르지 않습니다.' }, { status: 403 });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to verify earthquake-volcano teacher', error);
    return NextResponse.json({ error: '교사용 키를 확인하지 못했습니다.' }, { status: 500 });
  }
}
