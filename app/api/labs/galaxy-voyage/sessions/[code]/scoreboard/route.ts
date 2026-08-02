import { NextResponse } from 'next/server';
import { getGalaxyScoreboard, normalizeGalaxySessionCode } from '@/lib/galaxy-voyage';

type Context = { params: Promise<{ code: string }> };

function noStore(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(request: Request, { params }: Context) {
  try {
    const code = normalizeGalaxySessionCode((await params).code);
    if (!code) return noStore({ error: '수업 코드를 확인해 주세요.' }, { status: 400 });
    const playerId = request.headers.get('x-player-id') || '';
    const playerKey = request.headers.get('x-player-key') || '';
    const since = new URL(request.url).searchParams.get('since');
    const result = await getGalaxyScoreboard(code, playerId, playerKey, since);
    if (!result) return noStore({ error: '입장 정보를 확인해 주세요.' }, { status: 401 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to load galaxy-voyage scoreboard', error);
    return noStore({ error: '점수를 불러오지 못했습니다.' }, { status: 500 });
  }
}
