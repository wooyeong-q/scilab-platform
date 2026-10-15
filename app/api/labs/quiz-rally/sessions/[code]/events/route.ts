import { quizStream } from '@/lib/quiz-rally-stream';
import { quizFailure,quizIdentity } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request,context:{params:Promise<{code:string}>}){
  try{return await quizStream(request,(await context.params).code,quizIdentity(request));}
  catch(error){return quizFailure(error);}
}
