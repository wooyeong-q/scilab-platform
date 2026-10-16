import { NextResponse } from 'next/server';
import { normalizeGalaxySessionCode } from '@/lib/galaxy-voyage';
import { syncGalaxyClassroom, syncGalaxyTeacher } from '@/lib/galaxy-voyage-sync';

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    const code = normalizeGalaxySessionCode((await context.params).code);
    if (!code) return reply({ error: '수업 코드를 확인해 주세요.' }, 400);
    const raw = await request.text();
    if (raw.length > 16384) return reply({ error: '요청이 너무 큽니다.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: '잘못된 요청입니다.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: '잘못된 요청입니다.' }, 400);
    const teacherKey = request.headers.get('x-teacher-key');
    const id = request.headers.get('x-player-id'), key = request.headers.get('x-player-key');
    if (!teacherKey && (!id || !key)) return reply({ error: '수업 인증이 필요합니다.' }, 401);
    const data = teacherKey ? await syncGalaxyTeacher(code, teacherKey, body) : await syncGalaxyClassroom(code, id!, key!, body);
    return data ? reply(data) : reply({ error: '입장 정보를 확인해 주세요.' }, 401);
  } catch (error) {
    console.error('Galaxy classroom sync failed', error);
    return reply({ error: '연결을 다시 확인하고 있습니다.' }, 500);
  }
}
