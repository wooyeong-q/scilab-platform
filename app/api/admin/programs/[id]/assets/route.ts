import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { assetMetadata, MAX_ASSETS } from '@/lib/program-assets';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  let metadata;
  try { const body = await request.json(); metadata = assetMetadata(body.name, body.size, body.kind); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '파일 정보를 확인해 주세요.' }, { status: 400 }); }
  const programs = await sql!`SELECT id FROM programs WHERE id=${id}`;
  if (!programs.length) return NextResponse.json({ error: '프로그램을 찾을 수 없습니다.' }, { status: 404 });
  // Remove abandoned drafts only. Published references always survive cleanup.
  await sql!`DELETE FROM program_assets a WHERE a.program_id=${id} AND a.created_at < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (SELECT 1 FROM programs p WHERE p.id=a.program_id AND p.assets @> jsonb_build_array(jsonb_build_object('id',a.id)))`;
  const counts = await sql!`SELECT COUNT(*)::integer AS total FROM program_assets WHERE program_id=${id}`;
  if (Number(counts[0].total) >= MAX_ASSETS * 2) return NextResponse.json({ error: '첨부파일이 너무 많습니다. 불필요한 파일을 삭제한 뒤 다시 시도해 주세요.' }, { status: 400 });
  const asset = { id: randomUUID(), ...metadata };
  await sql!`INSERT INTO program_assets (id,program_id,name,mime,kind,size) VALUES (${asset.id},${id},${asset.name},${asset.mime},${asset.kind},${asset.size})`;
  return NextResponse.json(asset, { status: 201 });
}
