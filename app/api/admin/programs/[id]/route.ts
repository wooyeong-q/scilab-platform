import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { ensureDatabase, sql } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  await ensureDatabase();
  await sql!`
    UPDATE programs SET
      url=${String(body.url || '')}, summary=${String(body.summary || '')}, description=${String(body.description || body.summary || '')},
      category=${String(body.category || '')}, grade=${String(body.grade || '')}, tags=${JSON.stringify(body.tags || [])}::jsonb,
      icon=${String(body.icon || '🧪')}, featured=${Boolean(body.featured)}, duration=${String(body.duration || '수업에 따라')},
      format=${String(body.format || '웹 프로그램')}, updated_at=NOW()
    WHERE id=${id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  await ensureDatabase();
  await sql!`DELETE FROM programs WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
