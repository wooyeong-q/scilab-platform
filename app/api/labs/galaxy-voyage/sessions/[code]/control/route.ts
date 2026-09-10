import { NextResponse } from 'next/server';
import { controlGalaxySession, normalizeGalaxySessionCode } from '@/lib/galaxy-voyage';
type Context = { params: Promise<{ code: string }> };
async function handle(request: Request, context: Context, start: boolean) {
  try {
    const code = normalizeGalaxySessionCode((await context.params).code);
    const key = request.headers.get('x-teacher-key') || '';
    if (!code || !key) return NextResponse.json({ error: '교사 인증이 필요합니다.' }, { status: 401 });
    const result = await controlGalaxySession(code, key, start);
    return NextResponse.json(result || { error: '교사 인증을 확인해 주세요.' }, { status: result ? 200 : 401, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: '수업 상태를 확인하지 못했습니다.' }, { status: 500 }); }
}
export async function GET(request: Request, context: Context) { return handle(request, context, false); }
export async function POST(request: Request, context: Context) { return handle(request, context, true); }

