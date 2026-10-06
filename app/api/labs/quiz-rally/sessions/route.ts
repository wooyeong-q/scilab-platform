import { createQuizRoom } from '@/lib/quiz-rally';
import { quizBody,quizFailure,quizJson } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return quizJson(await createQuizRoom(await quizBody(request,4300000)),201);}catch(error){return quizFailure(error);}}
