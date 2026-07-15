import { NextResponse } from 'next/server';
import { ensureDatabase, sql } from '@/lib/db';

const allowedActions = new Set(['view','launch','like']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '');
  if (!allowedActions.has(action)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  await ensureDatabase();
  if (action === 'view') await sql!`UPDATE programs SET view_count=view_count+1 WHERE id=${id}`;
  if (action === 'launch') await sql!`UPDATE programs SET launch_count=launch_count+1 WHERE id=${id}`;
  if (action === 'like') await sql!`UPDATE programs SET like_count=like_count+1 WHERE id=${id}`;

  const rows = await sql!`SELECT view_count, launch_count, like_count FROM programs WHERE id=${id} LIMIT 1`;
  if (!rows[0]) return NextResponse.json({ error: '프로그램을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({
    viewCount: Number(rows[0].view_count || 0),
    launchCount: Number(rows[0].launch_count || 0),
    likeCount: Number(rows[0].like_count || 0),
  });
}