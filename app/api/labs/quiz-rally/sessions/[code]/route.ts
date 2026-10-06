import { actQuizRoom,getQuizSnapshot,joinQuizRoom } from '@/lib/quiz-rally';
import { quizBody,quizFailure,quizIdentity,quizJson } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{code:string}>};
export async function GET(request:Request,context:Context){try{return quizJson(await getQuizSnapshot((await context.params).code,quizIdentity(request)));}catch(error){return quizFailure(error);}}
export async function POST(request:Request,context:Context){
  const started=performance.now();let action='unknown';
  try{const {code}=await context.params,body=await quizBody(request),identity=quizIdentity(request);action=String(body.action||'unknown');
    const data=await(body.action==='join'?joinQuizRoom(code,identity,body):actQuizRoom(code,identity,body));
    const elapsed=Math.round(performance.now()-started),response=quizJson(data);
    response.headers.set('Server-Timing',`quiz;dur=${elapsed}`);
    if(elapsed>1000)console.info('Quiz action latency',{action:['answer','reward','next','join','reveal','retry-question','item'].includes(action)?action:'control',elapsedMs:elapsed});
    return response;
  }catch(error){return quizFailure(error);}
}
