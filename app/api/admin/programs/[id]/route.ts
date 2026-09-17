import { revalidatePrograms } from '@/lib/program-cache';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { ensureDatabase, sql } from '@/lib/db';
import { MAX_ASSETS, type ProgramAsset } from '@/lib/program-assets';

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
  let assetJson: string | null = null;
  if (body.assets !== undefined) {
    if (!Array.isArray(body.assets) || body.assets.length > MAX_ASSETS) return NextResponse.json({ error: `이미지와 첨부파일은 합쳐서 ${MAX_ASSETS}개까지 등록할 수 있습니다.` }, { status: 400 });
    const ids = body.assets.map((asset: ProgramAsset) => asset?.id);
    if (ids.some((id: unknown) => typeof id !== 'string') || new Set(ids).size !== ids.length) return NextResponse.json({ error: '첨부파일 목록을 확인해 주세요.' }, { status: 400 });
    const rows = ids.length ? await sql!`SELECT id,name,size,mime,kind FROM program_assets WHERE program_id=${id} AND ready=TRUE AND id=ANY(${ids}::text[])` : [];
    if (rows.length !== ids.length) return NextResponse.json({ error: '업로드되지 않았거나 다른 프로그램의 파일이 포함되어 있습니다.' }, { status: 400 });
    assetJson = JSON.stringify(ids.map((assetId: string) => rows.find((row) => row.id === assetId)));
  }
  const updated = await sql!`
    UPDATE programs SET
      title=${title}, url=${String(body.url || '')}, summary=${String(body.summary || '')},
      description=${String(body.description || body.summary || '')}, category=${String(body.category || '')},
      grade=${String(body.grade || '')}, tags=${JSON.stringify(tags)}::jsonb,
      icon=${String(body.icon || '🧪')}, featured=${Boolean(body.featured)},
      duration=${String(body.duration || '수업에 따라')}, format=${String(body.format || '웹 프로그램')},
      worksheet_url=${String(body.worksheetUrl || '')}, ppt_url=${String(body.pptUrl || '')},
      video_url=${String(body.videoUrl || '')}, source_url=${String(body.sourceUrl || '')},
      guide_url=${String(body.guideUrl || '')}, assets=COALESCE(${assetJson}::jsonb,assets), updated_at=NOW()
    WHERE id=${id}
    RETURNING id
  `;
  if (!updated.length) return NextResponse.json({ error: '프로그램을 찾을 수 없습니다.' }, { status: 404 });
  revalidatePrograms();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  await ensureDatabase();
  await sql!`DELETE FROM programs WHERE id=${id}`;
  revalidatePrograms();
  return NextResponse.json({ ok: true });
}
