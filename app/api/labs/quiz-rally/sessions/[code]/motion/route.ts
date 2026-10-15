import { publishQuizMotion,QuizError } from '@/lib/quiz-rally';
import { motionInputs } from '@/lib/quiz-rally-motion';
import { quizBody,quizFailure,quizIdentity } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{code:string}>}){
  try{
    const body=await quizBody(request);let inputs;
    try{inputs=motionInputs(body.inputs);}catch{throw new QuizError('이동 입력을 확인해 주세요.');}
    await publishQuizMotion((await context.params).code,quizIdentity(request),inputs,body.roomRevision as number,body.arenaRevision as number);
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }catch(error){return quizFailure(error);}
}
