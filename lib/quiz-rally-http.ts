import { NextResponse } from 'next/server';
import { QuizError, type QuizIdentity } from './quiz-rally';
export const quizJson=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
export function quizIdentity(request:Request):QuizIdentity {
  const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
  return {role:!token?'public':request.headers.get('x-quiz-role')==='teacher'?'teacher':'student',token,playerId:request.headers.get('x-player-id')||''};
}
export async function quizBody(request:Request):Promise<Record<string,unknown>>{
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new QuizError('같은 사이트에서 참여해 주세요.',403);
  if(Number(request.headers.get('content-length')||0)>4096)throw new QuizError('요청이 너무 큽니다.',413);
  const raw=await request.text();if(raw.length>4096)throw new QuizError('요청이 너무 큽니다.',413);
  let body:unknown;try{body=JSON.parse(raw);}catch{throw new QuizError('요청 형식을 확인해 주세요.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new QuizError('요청 형식을 확인해 주세요.');
  return body as Record<string,unknown>;
}
export function quizFailure(error:unknown){
  if(error instanceof QuizError)return quizJson({error:error.message},error.status);
  console.error('Quiz Rally request failed',error instanceof Error?error.name:'UnknownError');
  return quizJson({error:'서버 연결이 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.'},503);
}
