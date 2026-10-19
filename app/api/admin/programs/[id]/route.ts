import { revalidatePrograms } from '@/lib/program-cache';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { ensureDatabase, sql } from '@/lib/db';
import { MAX_ASSETS, type ProgramAsset } from '@/lib/program-assets';
import { programLinkError } from '@/lib/program-links';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch { return NextResponse.json({ error: '수정할 내용을 확인해 주세요.' }, { status: 400 }); }
  const title = String(body.title || '').trim();
  const tags = body.tags === undefined ? null : JSON.stringify(Array.isArray(body.tags)
    ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : []);
  const text = (field: string) => body[field] === undefined ? null : String(body[field] ?? '');
  const withDefault = (field: string, fallback: string) => body[field] === undefined ? null : String(body[field] || fallback);

  if (!title) return NextResponse.json({ error: '프로그램 이름을 입력해 주세요.' }, { status: 400 });

  const linkError = programLinkError(body);
  if (linkError) return NextResponse.json({ error: linkError }, { status: 400 });

  await ensureDatabase();
  let usageJson: string | null = null;
  if (body.usageSteps !== undefined) {
    if (!Array.isArray(body.usageSteps) || body.usageSteps.length > 12 || body.usageSteps.some((step: unknown) => typeof step !== 'string' || step.length > 800)) {
      return NextResponse.json({ error: '사용법은 단계당 800자, 최대 12단계까지 입력해 주세요.' }, { status: 400 });
    }
    usageJson = JSON.stringify(body.usageSteps.map((step: string) => step.trim()).filter(Boolean));
  }
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
      title=${title}, url=COALESCE(${text('url')},url), summary=COALESCE(${text('summary')},summary),
      description=COALESCE(${text('description')},description), category=COALESCE(${text('category')},category),
      grade=COALESCE(${text('grade')},grade), tags=COALESCE(${tags}::jsonb,tags),
      icon=COALESCE(${withDefault('icon','🧪')},icon), featured=COALESCE(${body.featured === undefined ? null : Boolean(body.featured)},featured),
      duration=COALESCE(${withDefault('duration','수업에 따라')},duration), format=COALESCE(${withDefault('format','웹 프로그램')},format),
      worksheet_url=COALESCE(${text('worksheetUrl')},worksheet_url), ppt_url=COALESCE(${text('pptUrl')},ppt_url),
      video_url=COALESCE(${text('videoUrl')},video_url), source_url=COALESCE(${text('sourceUrl')},source_url),
      guide_url=COALESCE(${text('guideUrl')},guide_url), assets=COALESCE(${assetJson}::jsonb,assets),
      usage_steps=COALESCE(${usageJson}::jsonb,usage_steps), updated_at=NOW()
    WHERE id=${id} AND deleted_at IS NULL
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
  // Preserve the unique ID as a deletion marker; remove attachment bytes atomically.
  await sql!`
    WITH deleted AS (
      UPDATE programs SET deleted_at=COALESCE(deleted_at,NOW()), is_published=FALSE,
        assets='[]'::jsonb, updated_at=NOW()
      WHERE id=${id}
      RETURNING id
    )
    DELETE FROM program_assets WHERE program_id IN (SELECT id FROM deleted)
  `;
  revalidatePrograms();
  return NextResponse.json({ ok: true });
}
