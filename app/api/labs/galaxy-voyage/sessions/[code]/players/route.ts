import { NextResponse } from 'next/server';
import { joinGalaxySession, normalizeGalaxySessionCode } from '@/lib/galaxy-voyage';

type Context = { params: Promise<{ code: string }> };

function noStore(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeGalaxySessionCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const result = await joinGalaxySession(code, body.nickname);
    if (result.status === 'invalid') return noStore({ error: '이름을 입력해 주세요.' }, { status: 400 });
    if (result.status === 'missing') return noStore({ error: '수업 코드를 찾을 수 없습니다.' }, { status: 404 });
    if (result.status === 'full') return noStore({ error: '이 수업은 40명이 찼습니다.' }, { status: 409 });
    if (result.status === 'duplicate') return noStore({ error: '이미 사용 중인 이름입니다.' }, { status: 409 });
    return noStore(result, { status: 201 });
  } catch (error) {
    console.error('Failed to join galaxy-voyage session', error);
    return noStore({ error: '수업에 입장하지 못했습니다.' }, { status: 500 });
  }
}
