import { NextResponse } from 'next/server';
import { normalizeGalaxySessionCode, syncGalaxyFlight, attackGalaxyPlayer } from '@/lib/galaxy-voyage';
export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const code=normalizeGalaxySessionCode((await context.params).code), id=request.headers.get('x-player-id')||'', key=request.headers.get('x-player-key')||'';
    if(!code||!id||!key) return NextResponse.json({error:'수업 인증이 필요합니다.'},{status:401});
    const body=await request.json();
    const result=body.action==='attack' ? await attackGalaxyPlayer(code,id,key,body.targetId,body.shotId) : await syncGalaxyFlight(code,id,key,body.position);
    return NextResponse.json(result||{error:'지금은 사용할 수 없습니다. 거리·보호막·대기시간을 확인해 주세요.'},{status:result?200:409,headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'통신이 지연되었습니다. 잠시 후 다시 시도해 주세요.'},{status:500}); }
}
