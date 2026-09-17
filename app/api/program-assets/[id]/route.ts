import { isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql!`SELECT a.*, (p.is_published AND p.assets @> jsonb_build_array(jsonb_build_object('id',a.id))) AS visible
    FROM program_assets a JOIN programs p ON p.id=a.program_id WHERE a.id=${id} AND a.ready=TRUE`;
  const asset = rows[0];
  if (!asset || (!asset.visible && !(await isAdmin()))) return new Response('파일을 찾을 수 없습니다.',{ status:404 });
  let index = 0;
  // Fetch one small part at a time: file bytes never enter the catalog cache or page HTML.
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunks = await sql!`SELECT data FROM program_asset_chunks WHERE asset_id=${id} AND chunk_index=${index}`;
        if (!chunks.length) { controller.close(); return; }
        controller.enqueue(Buffer.from(String(chunks[0].data),'base64')); index++;
      } catch (error) { controller.error(error); }
    },
  });
  const inline = asset.kind === 'image' && !new URL(request.url).searchParams.has('download');
  const encodedName = encodeURIComponent(String(asset.name)).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(body, { headers: {
    'Content-Type': String(asset.mime),
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="download"; filename*=UTF-8''${encodedName}`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, no-store',
  } });
}
