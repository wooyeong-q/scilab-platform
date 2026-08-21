import { NextResponse } from 'next/server';
import { createStarEscapeSession } from '@/lib/star-escape';

function noStore(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: Request) {
  try {
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    return noStore(await createStarEscapeSession(body.title), { status: 201 });
  } catch (error) {
    console.error('Failed to create star-escape session', error);
    return noStore({ error: '수업을 만들지 못했습니다.' }, { status: 500 });
  }
}
