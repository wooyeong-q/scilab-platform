import { NextResponse } from 'next/server';
import { joinStarEscapeSession, normalizeEscapeCode } from '@/lib/star-escape';

type Context = { params: Promise<{ code: string }> };
function noStore(payload: unknown, init?: ResponseInit) { const response = NextResponse.json(payload, init); response.headers.set('Cache-Control', 'no-store'); return response; }

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    const result = await joinStarEscapeSession(code, body.nickname, body.team, body.role);
    if (result.status === 'invalid') return noStore({ error: '이름·모둠·역할을 모두 선택하세요.' }, { status: 400 });
    if (result.status === 'missing') return noStore({ error: '수업 코드를 찾을 수 없습니다.' }, { status: 404 });
    if (result.status === 'full') return noStore({ error: '이 수업은 45명이 찼습니다.' }, { status: 409 });
    if (result.status === 'duplicate') return noStore({ error: '이미 사용 중인 이름입니다.' }, { status: 409 });
    if (result.status === 'role_taken') return noStore({ error: '그 모둠에서 이미 선택한 역할입니다. 다른 역할을 선택하세요.' }, { status: 409 });
    return noStore(result, { status: 201 });
  } catch (error) {
    console.error('Failed to join star-escape session', error);
    return noStore({ error: '수업에 입장하지 못했습니다.' }, { status: 500 });
  }
}
