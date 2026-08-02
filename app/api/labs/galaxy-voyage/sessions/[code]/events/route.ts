import { NextResponse } from 'next/server';
import {
  applyGalaxyScoreEvent,
  applyRandomUfoEvent,
  normalizeGalaxySessionCode,
} from '@/lib/galaxy-voyage';

type Context = { params: Promise<{ code: string }> };
type RegularEvent = 'observation' | 'classification_correct' | 'classification_wrong';

function noStore(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeGalaxySessionCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const playerId = request.headers.get('x-player-id') || '';
    const playerKey = request.headers.get('x-player-key') || '';
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const kind = String(body.kind || '');
    const result = kind === 'ufo'
      ? await applyRandomUfoEvent(code, playerId, playerKey, body.reference)
      : ['observation', 'classification_correct', 'classification_wrong'].includes(kind)
        ? await applyGalaxyScoreEvent(code, playerId, playerKey, kind as RegularEvent, body.reference)
        : { status: 'invalid' as const };

    if (result.status === 'unauthorized') return noStore({ error: '입장 정보를 확인해 주세요.' }, { status: 401 });
    if (result.status === 'invalid') return noStore({ error: '점수 요청을 확인해 주세요.' }, { status: 400 });
    if (result.status === 'cooldown') return noStore({ error: '레이저 충전 중입니다.' }, { status: 429 });
    if (result.status === 'limit') return noStore({ error: '이번 항해의 UFO 점수 이벤트를 모두 완료했습니다.' }, { status: 409 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to apply galaxy-voyage score event', error);
    return noStore({ error: '점수를 반영하지 못했습니다.' }, { status: 500 });
  }
}
