import { NextResponse } from 'next/server';
import { controlStarEscapeSession, getStarEscapeTeacherState, normalizeEscapeCode } from '@/lib/star-escape';

type Context = { params: Promise<{ code: string }> };
function noStore(payload: unknown, init?: ResponseInit) { const response = NextResponse.json(payload, init); response.headers.set('Cache-Control', 'no-store'); return response; }

export async function GET(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    const result = code ? await getStarEscapeTeacherState(code, request.headers.get('x-teacher-key') || '') : null;
    if (!result) return noStore({ error: '교사용 정보를 확인해 주세요.' }, { status: 403 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to load star-escape teacher state', error);
    return noStore({ error: '교사용 현황을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    const result = await controlStarEscapeSession(code, request.headers.get('x-teacher-key') || '', body);
    if (result.status === 'unauthorized') return noStore({ error: '교사용 정보를 확인해 주세요.' }, { status: 403 });
    if (result.status === 'invalid') return noStore({ error: '관제 명령을 확인해 주세요.' }, { status: 400 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to control star-escape session', error);
    return noStore({ error: '관제 명령을 보내지 못했습니다.' }, { status: 500 });
  }
}
