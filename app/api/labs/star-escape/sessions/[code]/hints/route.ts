import { NextResponse } from 'next/server';
import { normalizeEscapeCode, requestStarEscapeHint } from '@/lib/star-escape';

type Context = { params: Promise<{ code: string }> };
function noStore(payload: unknown, init?: ResponseInit) { const response = NextResponse.json(payload, init); response.headers.set('Cache-Control', 'no-store'); return response; }

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    const result = await requestStarEscapeHint(code, request.headers.get('x-player-id') || '', request.headers.get('x-player-key') || '', body.stage, body.question);
    if (result.status === 'unauthorized') return noStore({ error: '입장 정보를 확인해 주세요.' }, { status: 401 });
    if (result.status === 'invalid') return noStore({ error: '현재 단계를 확인해 주세요.' }, { status: 400 });
    if (result.status === 'stale') return noStore({ error: '다른 대원이 이미 다음 단계로 이동했습니다.' }, { status: 409 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to request star-escape hint', error);
    return noStore({ error: '힌트를 요청하지 못했습니다.' }, { status: 500 });
  }
}
