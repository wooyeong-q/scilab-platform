import { randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { QuizError } from './quiz-rally-errors';
import { codeValue, type QuizIdentity, type Room } from './quiz-rally-rules';
import type { RoomRecord } from './quiz-rally-room';

type Route = NonNullable<Room['realtime']>;
const routes=new Map<string,{route:Route|null;until:number}>();
function configuration(){
  const origin=process.env.QUIZ_REALTIME_URL?.replace(/\/$/,''),secret=process.env.QUIZ_REALTIME_SECRET;
  if(!origin)return null;
  const url=new URL(origin);
  if((url.protocol!=='https:'&&!(process.env.NODE_ENV==='test'&&url.hostname==='localhost'))||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!secret||secret.length<32)throw new QuizError('실시간 서버 연결 설정을 확인해 주세요.',503);
  return {origin,secret};
}
export function newQuizRealtimeRoute():Route|undefined {
  return process.env.QUIZ_REALTIME_NEW_ROOMS==='1'&&configuration()?{version:1,generation:randomUUID(),checkpoint:0}:undefined;
}
async function remote(code:string,route:Route,action:'rpc'|'init',payload:unknown){
  const config=configuration();if(!config)throw new QuizError('실시간 서버 연결이 중단됐습니다. 잠시 후 다시 연결해 주세요.',503);
  try{
    const response=await fetch(`${config.origin}/rooms/${code}/${route.generation}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.secret},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(8000)});
    const result=await response.json();
    if(!response.ok)throw new QuizError(typeof result.error==='string'?result.error:'실시간 서버에 다시 연결해 주세요.',response.status);
    return result;
  }catch(error){if(error instanceof QuizError)throw error;throw new QuizError('실시간 서버에 다시 연결해 주세요. 기존 경기 기록은 유지됩니다.',503);}
}
export async function initializeQuizRealtime(record:RoomRecord){
  const route=record.state.realtime!;
  await remote(record.code,route,'init',record);
  routes.set(record.code,{route,until:Date.now()+300000});
}
export async function routeQuizRealtime(code:string,identity:QuizIdentity,body?:Record<string,unknown>):Promise<{handled:false}|{handled:true;data:any}>{
  if(!configuration())return {handled:false};
  code=codeValue(code);
  let cached=routes.get(code);
  if(!cached||cached.until<Date.now()){
    if(!sql)throw new QuizError('게임 서버에 연결할 수 없습니다.',503);
    const rows=await sql.query("SELECT state->'realtime' AS realtime FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()",[code],{fetchOptions:{signal:AbortSignal.timeout(8000),cache:'no-store'}});
    if(!rows.length)throw new QuizError('게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);
    cached={route:rows[0].realtime||null,until:Date.now()+300000};routes.set(code,cached);
    if(routes.size>1024)routes.delete(routes.keys().next().value!);
  }
  if(!cached.route)return {handled:false};
  return {handled:true,data:await remote(code,cached.route,'rpc',{identity,body})};
}
export function requireLegacyRoom(room:{realtime?:unknown}){
  if(room.realtime)throw new QuizError('이 경기는 실시간 서버에서 진행 중입니다. 게임방에 다시 연결해 주세요.',503);
}
export function authorizeQuizCheckpoint(request:Request){
  const secret=process.env.QUIZ_REALTIME_SECRET,actual=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);
  if(!secret||secret.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new QuizError('접근 정보를 확인해 주세요.',403);
}
export async function saveQuizCheckpoint(body:Record<string,unknown>){
  const code=codeValue(String(body.code)),generation=body.generation,revision=body.revision,state=body.state as Room;
  if(typeof generation!=='string'||!Number.isSafeInteger(revision)||Number(revision)<0||!state||state.realtime?.generation!==generation||state.realtime?.checkpoint!==revision||state.realtime.version!==1)throw new QuizError('경기 기록을 확인해 주세요.');
  if(!sql)throw new QuizError('기록 서버에 연결할 수 없습니다.',503);
  const rows=await sql.query(`UPDATE quiz_rally_sessions SET state=$4::jsonb
    WHERE code=$1 AND expires_at>NOW() AND state #>> '{realtime,generation}'=$2
    AND COALESCE((state #>> '{realtime,checkpoint}')::bigint,-1)<$3
    RETURNING code`,[code,generation,revision,JSON.stringify(state)],{fetchOptions:{signal:AbortSignal.timeout(8000),cache:'no-store'}});
  return {ok:true,saved:rows.length>0};
}
