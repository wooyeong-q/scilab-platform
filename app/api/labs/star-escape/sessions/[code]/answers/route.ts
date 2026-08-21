import { NextResponse } from 'next/server';
import { normalizeEscapeCode, submitStarEscapeAnswer } from '@/lib/star-escape';

type Context = { params: Promise<{ code: string }> };
function noStore(payload: unknown, init?: ResponseInit) { const response = NextResponse.json(payload, init); response.headers.set('Cache-Control', 'no-store'); return response; }

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    const result = await submitStarEscapeAnswer(code, request.headers.get('x-player-id') || '', request.headers.get('x-player-key') || '', body.stage, body.question, body.answer);
    if (result.status === 'unauthorized') return noStore({ error: '입장 정보를 확인해 주세요.' }, { status: 401 });
    if (result.status === 'invalid') return noStore({ error: '현재 문제와 답을 확인하세요.' }, { status: 400 });
    if (result.status === 'missing') return noStore({ error: '모둠 진행 정보를 찾을 수 없습니다.' }, { status: 404 });
    if (result.status === 'waiting') return noStore({ error: '관제 교사가 작전을 시작할 때까지 기다리세요.' }, { status: 409 });
    if (result.status === 'expired') return noStore({ error: '작전 시간이 종료되었습니다.' }, { status: 409 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to submit star-escape answer', error);
    return noStore({ error: '보안번호를 확인하지 못했습니다.' }, { status: 500 });
  }
}
