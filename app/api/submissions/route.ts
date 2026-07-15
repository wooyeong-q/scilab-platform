import { NextResponse } from 'next/server';
import { ensureDatabase, sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const author = String(body.author || '').trim();
    const url = String(body.url || '').trim();
    const category = String(body.category || '').trim();
    const grade = String(body.grade || '').trim();
    const summary = String(body.summary || '').trim();
    const tags = Array.isArray(body.tags) ? body.tags.map(String).map((x) => x.trim()).filter(Boolean) : [];
    if (!title || !author || !url || !category || !grade || !summary) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해 주세요.' }, { status: 400 });
    }
    new URL(url);
    await ensureDatabase();
    const id = crypto.randomUUID();
    await sql!`INSERT INTO submissions (id,title,author,url,category,grade,summary,tags) VALUES (${id},${title},${author},${url},${category},${grade},${summary},${JSON.stringify(tags)}::jsonb)`;
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '제안을 저장하지 못했습니다.' }, { status: 500 });
  }
}
