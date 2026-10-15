import { upgradeWebSocket,waitUntil } from '@vercel/functions';
import { serveQuizSocket } from '@/lib/quiz-rally-socket';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request,context:{params:Promise<{code:string}>}){
  const code=(await context.params).code.toUpperCase(),origin=request.headers.get('origin');
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)||origin&&origin!==new URL(request.url).origin)return new Response(null,{status:403});
  if(request.headers.get('upgrade')?.toLowerCase()!=='websocket')return new Response(null,{status:426});
  return upgradeWebSocket(ws=>{
    // Authentication, database notifications and timers outlive the upgrade
    // response. Keep their invocation alive until this bounded socket closes.
    waitUntil(new Promise<void>(resolve=>ws.once('close',()=>resolve())));
    serveQuizSocket(ws,code);
  },{maxPayload:4096});
}
