import { NextResponse } from 'next/server';
import { createMapSession } from '@/lib/earthquake-volcano';

export async function POST(request: Request) {
  try {
    const parsed: unknown = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    const result = await createMapSession(body.title);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create earthquake-volcano session', error);
    return NextResponse.json({ error: '수업을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
