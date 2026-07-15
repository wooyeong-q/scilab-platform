import { NextResponse } from 'next/server';
import { ensureDatabase, sql } from '@/lib/db';

export async function POST(request:Request){
  try{
    const body:Record<string,unknown>=await request.json();
    const text=(key:string)=>String(body[key]||'').trim();
    const title=text('title'),author=text('author'),url=text('url'),category=text('category'),grade=text('grade'),summary=text('summary');
    const tags=Array.isArray(body.tags)?body.tags.map((value)=>String(value).trim()).filter(Boolean):[];
    if(!title||!author||!url||!category||!grade||!summary)return NextResponse.json({error:'필수 항목을 모두 입력해 주세요.'},{status:400});
    new URL(url);
    const optionalUrls=['thumbnailUrl','worksheetUrl','pptUrl','videoUrl','sourceUrl','guideUrl'];
    for(const key of optionalUrls){const value=text(key);if(value)new URL(value);}
    await ensureDatabase();const id=crypto.randomUUID();
    await sql!`INSERT INTO submissions (id,title,author,url,category,grade,summary,tags,duration,standard,thumbnail_url,worksheet_url,ppt_url,video_url,source_url,guide_url)
      VALUES (${id},${title},${author},${url},${category},${grade},${summary},${JSON.stringify(tags)}::jsonb,${text('duration')},${text('standard')},${text('thumbnailUrl')},${text('worksheetUrl')},${text('pptUrl')},${text('videoUrl')},${text('sourceUrl')},${text('guideUrl')})`;
    return NextResponse.json({ok:true,id},{status:201});
  }catch{return NextResponse.json({error:'주소 형식을 확인하거나 잠시 후 다시 시도해 주세요.'},{status:400});}
}
