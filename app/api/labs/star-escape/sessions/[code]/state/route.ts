import { NextResponse } from 'next/server';
import { getStarEscapeState, normalizeEscapeCode, updateStarEscapeSceneState } from '@/lib/star-escape';

type Context = { params: Promise<{ code: string }> };
function noStore(payload: unknown, init?: ResponseInit) { const response = NextResponse.json(payload, init); response.headers.set('Cache-Control', 'no-store'); return response; }

export async function GET(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const result = await getStarEscapeState(code, request.headers.get('x-player-id') || '', request.headers.get('x-player-key') || '');
    if (!result) return noStore({ error: '입장 정보를 확인해 주세요.' }, { status: 401 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to load star-escape state', error);
    return noStore({ error: '작전 상태를 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const code = normalizeEscapeCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const body = await request.json();
    const result = await updateStarEscapeSceneState(
      code,
      request.headers.get('x-player-id') || '',
      request.headers.get('x-player-key') || '',
      body.stage,
      body.question,
      body.sceneState,
    );
    if (result.status === 'unauthorized') return noStore({ error: '입장 정보를 확인해 주세요.' }, { status: 401 });
    if (result.status === 'invalid') return noStore({ error: '장면 상태를 확인해 주세요.' }, { status: 400 });
    if (result.status === 'stale') return noStore({ error: '이미 다음 단계로 진행했습니다.' }, { status: 409 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to update star-escape scene state', error);
    return noStore({ error: '장면 상태를 저장하지 못했습니다.' }, { status: 500 });
  }
}
