import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { ensureDatabase, sql } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const { action } = await request.json();
  await ensureDatabase();
  if (action === 'approve') {
    const rows = await sql!`SELECT * FROM submissions WHERE id=${id} LIMIT 1`;
    const item = rows[0];
    if (!item) return NextResponse.json({ error: '제안을 찾을 수 없습니다.' }, { status: 404 });
    const programId = `community-${id}`;
    await sql!`
      INSERT INTO programs (id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format)
      VALUES (${programId},${String(item.title)},${String(item.summary)},${String(item.summary)},${String(item.category)},${String(item.grade)},${JSON.stringify(item.tags || [])}::jsonb,'🧪',${String(item.url)},${String(item.author)},FALSE,'수업에 따라','웹 프로그램')
      ON CONFLICT (id) DO NOTHING
    `;
    await sql!`UPDATE submissions SET status='approved', reviewed_at=NOW() WHERE id=${id}`;
  } else if (action === 'reject') {
    await sql!`UPDATE submissions SET status='rejected', reviewed_at=NOW() WHERE id=${id}`;
  } else {
    return NextResponse.json({ error: '올바르지 않은 작업입니다.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  await ensureDatabase();
  await sql!`DELETE FROM submissions WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
