import { createHash } from 'node:crypto';
import { isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { CHUNK_SIZE } from '@/lib/program-assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

function byteRange(value: string | null, size: number) {
  // Multiple ranges can safely fall back to the complete representation.
  if (!value || value.includes(',')) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return 'unsatisfiable';
  const start = first ?? Math.max(0, size - last!);
  const end = first === null ? size - 1 : Math.min(last ?? size - 1, size - 1);
  return start >= size || start > end ? 'unsatisfiable' : { start, end };
}

async function respond(request: Request, { params }: Context, head = false) {
  const { id } = await params;
  const rows = await sql!`SELECT a.id,a.name,a.mime,a.kind,a.size,a.created_at,
    (p.is_published AND p.assets @> jsonb_build_array(jsonb_build_object('id',a.id))) AS visible
    FROM program_assets a JOIN programs p ON p.id=a.program_id
    WHERE a.id=${id} AND a.ready=TRUE AND p.deleted_at IS NULL`;
  const asset = rows[0];
  // Recheck publication and access before returning even a cached-file validator.
  if (!asset || (!asset.visible && !(await isAdmin()))) return new Response(head ? null : '파일을 찾을 수 없습니다.', {
    status: 404, headers: { 'Cache-Control': 'private, no-store', 'Vercel-CDN-Cache-Control': 'no-store' },
  });
  const size = Number(asset.size);
  const modified = new Date(String(asset.created_at));
  // Completed uploads are immutable; replacement files receive a new asset ID.
  // This validator survives an unrelated program edit or a Vercel redeployment.
  const etag = '"' + createHash('sha256').update(JSON.stringify([asset.id, size, asset.mime, asset.name, modified.toISOString()])).digest('hex') + '"';
  const inline = asset.kind === 'image' && !new URL(request.url).searchParams.has('download');
  const encodedName = encodeURIComponent(String(asset.name)).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  const headers = new Headers({
    'Content-Type': String(asset.mime),
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="download"; filename*=UTF-8''${encodedName}`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, no-cache, must-revalidate',
    'Vercel-CDN-Cache-Control': 'no-store',
    'Vary': 'Cookie',
    'ETag': etag,
    'Last-Modified': modified.toUTCString(),
    'Accept-Ranges': 'bytes',
  });
  const modifiedSeconds = Math.floor(modified.getTime() / 1000) * 1000;
  const unchangedSince = (value: string | null) => value !== null && Date.parse(value) >= modifiedSeconds;
  const noneMatch = request.headers.get('if-none-match');
  const unchanged = noneMatch !== null
    ? noneMatch.split(',').some(value => value.trim() === '*' || value.trim().replace(/^W\//, '') === etag)
    : unchangedSince(request.headers.get('if-modified-since'));
  if (unchanged) return new Response(null, { status: 304, headers });

  const ifRange = request.headers.get('if-range');
  const useRange = !head && (ifRange === null || ifRange === etag || Date.parse(ifRange) === modifiedSeconds);
  const range = useRange ? byteRange(request.headers.get('range'), size) : null;
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    return new Response(null, { status: 416, headers });
  }
  const start = range?.start ?? 0, end = range?.end ?? size - 1;
  headers.set('Content-Length', String(end - start + 1));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  if (head) return new Response(null, { headers });

  let index = Math.floor(start / CHUNK_SIZE), position = start, cancelled = false;
  // Validators/HEAD read no chunks. PDF ranges fetch only the parts they need.
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (cancelled) return;
        const chunks = await sql!`SELECT data FROM program_asset_chunks WHERE asset_id=${id} AND chunk_index=${index}`;
        if (cancelled) return;
        if (!chunks.length) throw new Error('첨부파일의 일부를 읽지 못했습니다.');
        const bytes = Buffer.from(String(chunks[0].data), 'base64');
        const offset = position - index * CHUNK_SIZE;
        const length = Math.min(end - position + 1, CHUNK_SIZE - offset);
        if (bytes.length < offset + length) throw new Error('첨부파일 크기가 일치하지 않습니다.');
        controller.enqueue(bytes.subarray(offset, offset + length));
        position += length; index++;
        if (position > end) controller.close();
      } catch (error) { controller.error(error); }
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { status: range ? 206 : 200, headers });
}

export async function GET(request: Request, context: Context) {
  return respond(request, context);
}

export async function HEAD(request: Request, context: Context) {
  return respond(request, context, true);
}
