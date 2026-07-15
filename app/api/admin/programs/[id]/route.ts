import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { ensureDatabase, sql } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const title = String(body.title || '').trim();
  const tags = Array.isArray(body.tags)
    ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
    : [];

  if (!title) return NextResponse.json({ error: '프로그램 이름을 입력해 주세요.' }, { status: 400 });

  await ensureDatabase();
  await sql!`
    UPDATE programs SET
      title=${title}, url=${String(body.url || '')}, summary=${String(body.summary || '')},
      description=${String(body.description || body.summary || '')}, category=${String(body.category || '')},
      grade=${String(body.grade || '')}, tags=${JSON.stringify(tags)}::jsonb,
      icon=${String(body.icon || '🧪')}, featured=${Boolean(body.featured)},
      duration=${String(body.duration || '수업에 따라')}, format=${String(body.format || '웹 프로그램')},
      worksheet_url=${String(body.worksheetUrl || '')}, ppt_url=${String(body.pptUrl || '')},
      video_url=${String(body.videoUrl || '')}, source_url=${String(body.sourceUrl || '')},
      guide_url=${String(body.guideUrl || '')}, updated_at=NOW()
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