import { authorizeQuizCheckpoint,saveQuizCheckpoint } from '@/lib/quiz-rally-realtime';
import { quizBody,quizFailure,quizJson } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  try{authorizeQuizCheckpoint(request);return quizJson(await saveQuizCheckpoint(await quizBody(request,4300000)));}
  catch(error){return quizFailure(error);}
}
