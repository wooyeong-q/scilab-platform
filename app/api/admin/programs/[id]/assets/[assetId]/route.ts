import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { CHUNK_SIZE, matchesSignature } from '@/lib/program-assets';

type Context = { params: Promise<{ id: string; assetId: string }> };
const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function PUT(request: Request, { params }: Context) {
  if (!(await isAdmin())) return error('관리자 로그인이 필요합니다.',401);
  const { id, assetId } = await params;
  const assets = await sql!`SELECT * FROM program_assets WHERE id=${assetId} AND program_id=${id} AND ready=FALSE`;
  if (!assets.length) return error('업로드할 파일을 찾을 수 없습니다.',404);
  const asset = assets[0];
  const indexValue = new URL(request.url).searchParams.get('part');
  const index = indexValue === null ? -1 : Number(indexValue);
  const total = Math.ceil(Number(asset.size) / CHUNK_SIZE);
  if (!Number.isInteger(index) || index < 0 || index >= total) return error('잘못된 업로드 순서입니다.');
  // Read with an explicit cap, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return error('파일 내용이 없습니다.');
  const pieces: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > CHUNK_SIZE) { await reader.cancel(); return error('업로드 조각이 너무 큽니다.',413); }
    pieces.push(value);
  }
  const bytes = Buffer.concat(pieces);
  const expected = index === total - 1 ? Number(asset.size) - index * CHUNK_SIZE : CHUNK_SIZE;
  if (bytes.length !== expected) return error('파일 크기가 일치하지 않습니다. 다시 선택해 주세요.');
  if (index === 0 && !matchesSignature(bytes,String(asset.mime))) return error('파일 확장자와 실제 형식이 일치하지 않습니다.');
  await sql!`INSERT INTO program_asset_chunks (asset_id,chunk_index,data,byte_size)
    SELECT id,${index},${bytes.toString('base64')},${bytes.length} FROM program_assets WHERE id=${assetId} AND ready=FALSE
    ON CONFLICT (asset_id,chunk_index) DO UPDATE SET data=EXCLUDED.data,byte_size=EXCLUDED.byte_size`;
  return NextResponse.json({ ok: true });
}

export async function POST(_request: Request, { params }: Context) {
  if (!(await isAdmin())) return error('관리자 로그인이 필요합니다.',401);
  const { id, assetId } = await params;
  const result = await sql!`UPDATE program_assets a SET ready=TRUE WHERE a.id=${assetId} AND a.program_id=${id}
    AND (SELECT COALESCE(SUM(byte_size),0) FROM program_asset_chunks WHERE asset_id=a.id)=a.size
    AND (SELECT COUNT(*) FROM program_asset_chunks WHERE asset_id=a.id)=CEIL(a.size::numeric/${CHUNK_SIZE})
    RETURNING id,name,size,mime,kind`;
  if (!result.length) return error('파일 전송이 완료되지 않았습니다. 다시 시도해 주세요.');
  return NextResponse.json(result[0]);
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await isAdmin())) return error('관리자 로그인이 필요합니다.',401);
  const { id, assetId } = await params;
  await sql!`DELETE FROM program_assets a WHERE id=${assetId} AND program_id=${id}
    AND NOT EXISTS (SELECT 1 FROM programs p WHERE p.id=a.program_id AND p.assets @> jsonb_build_array(jsonb_build_object('id',a.id)))`;
  return NextResponse.json({ ok: true });
}
