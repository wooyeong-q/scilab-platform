import { actQuizRoom,getQuizSnapshot,joinQuizRoom } from '@/lib/quiz-rally';
import { quizBody,quizFailure,quizIdentity,quizJson } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{code:string}>};
export async function GET(request:Request,context:Context){try{return quizJson(await getQuizSnapshot((await context.params).code,quizIdentity(request)));}catch(error){return quizFailure(error);}}
export async function POST(request:Request,context:Context){try{const {code}=await context.params,body=await quizBody(request),identity=quizIdentity(request);return quizJson(await(body.action==='join'?joinQuizRoom(code,identity,body):actQuizRoom(code,identity,body)));}catch(error){return quizFailure(error);}}
