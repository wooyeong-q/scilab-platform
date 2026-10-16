import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { ensureDatabase, sql } from '@/lib/db';
import { revalidatePrograms } from '@/lib/program-cache';

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });
  let ids: unknown;
  try { ids = (await request.json())?.ids; }
  catch { return NextResponse.json({ error: '프로그램 순서를 확인해 주세요.' }, { status: 400 }); }
  if (!Array.isArray(ids) || ids.length > 1000 ||
      ids.some(id => typeof id !== 'string' || !id.trim() || id.length > 200) ||
      new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: '프로그램 순서를 확인해 주세요.' }, { status: 400 });
  }
  try {
    await ensureDatabase();
    // Lock the current catalog in a stable order; validate and update as one statement.
    // A stale list never recreates a deleted program or partially saves a new order.
    const rows = await sql!`
      WITH current_programs AS MATERIALIZED (
        SELECT id FROM programs WHERE deleted_at IS NULL ORDER BY id FOR UPDATE
      ), requested AS (
        SELECT id, (sort_index-1)::integer AS position
        FROM unnest(${ids}::text[]) WITH ORDINALITY AS item(id, sort_index)
      ), verified AS (
        SELECT (SELECT COUNT(*) FROM current_programs) = (SELECT COUNT(*) FROM requested)
          AND NOT EXISTS (
            SELECT 1 FROM requested r LEFT JOIN current_programs p ON p.id=r.id WHERE p.id IS NULL
          ) AS valid
      ), changed AS (
        UPDATE programs p SET display_order=r.position
        FROM requested r, verified v
        WHERE p.id=r.id AND p.deleted_at IS NULL AND v.valid
        RETURNING p.id
      )
      SELECT v.valid, (SELECT COUNT(*)::integer FROM changed) AS updated FROM verified v
    `;
    if (!rows[0]?.valid || Number(rows[0].updated) !== ids.length) {
      return NextResponse.json({ error: '프로그램 목록이 변경되었습니다. 최신 목록을 불러온 뒤 다시 정렬해 주세요.' }, { status: 409 });
    }
    revalidatePrograms();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '순서를 저장하지 못했습니다. 다시 시도해 주세요.' }, { status: 500 });
  }
}
