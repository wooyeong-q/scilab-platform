import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { QUESTION_MAP, QUIZ_QUESTIONS } from './quiz-rally-questions';
import { validateQuestions, type CustomQuestion } from './quiz-rally-bank';
import { QuizError } from './quiz-rally-errors';
import { robotFor, validateRobot, type RobotParts } from './quiz-rally-robot';
export { QuizError } from './quiz-rally-errors';

type Phase = 'lobby' | 'running' | 'paused' | 'ended';
type Item = 'boost' | 'hint' | 'shield' | 'steal';
type Reward = Item | 'bonus40' | 'bonus70';
type Turn = { id: string; nonce: string; order: number[]; eliminated: number[]; answered: boolean; selected: number | null; correct: boolean | null; points: number; rewards: Reward[]; reward: {type: Reward; text: string} | null; retries?:number; revealed?:boolean; wrongChoices?:number[] };
type Player = {
  id: string; nickname: string; avatar?: number; robot?:RobotParts; tokenHash: string; version: number; removed: boolean;
  score: number; correct: number; attempted: number; inventory: Record<Item,number>;
  boostActive: boolean; shieldActive: boolean; protectedUntil: number;
  deck: string[]; turn: Turn; requests: string[]; stats: Record<string,[number,number]>;
  notice: string; noticeId: string;
};
type Room = {
  title: string; durationSeconds: number; extension: boolean; stealEnabled: boolean;
  status: Phase; endsAt: number | null; remainingMs: number; metaRevision: number;
  requests: string[]; players: Record<string,Player>;
  questionIds?: string[]; questionSetTitle?: string; cityTarget?:number;
};
type Row = { code: string; teacher_key_hash: string; state: Room; expires_at: string; custom_question?:CustomQuestion };
export type QuizIdentity = { role: 'teacher' | 'student' | 'public'; token: string; playerId: string };
const codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const items: Item[]=['boost','hint','shield','steal'];
const itemNames: Record<Item,string>={boost:'점수 2배',hint:'보기 줄이기',shield:'방어막',steal:'점수 가져오기'};
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
function validToken(token:unknown): token is string { return typeof token==='string' && /^[A-Za-z0-9_-]{32,128}$/.test(token); }
function matches(token:string,expected:string){if(!validToken(token)|| !/^[a-f0-9]{64}$/.test(expected))return false;return timingSafeEqual(Buffer.from(hash(token),'hex'),Buffer.from(expected,'hex'));}
function assert(condition:unknown,message:string,status=400): asserts condition {if(!condition)throw new QuizError(message,status);}
function codeValue(code:string){const value=code.toUpperCase();assert(/^[A-HJ-NP-Z2-9]{6}$/.test(value),'참여 코드 6자리를 확인해 주세요.');return value;}
function textValue(value:unknown,max:number,fallback=''){return (typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' '):fallback).slice(0,max);}
function uuid(value:unknown): value is string {return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);}
function shuffled<T>(list:T[]):T[]{const a=[...list];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function deckFor(room:Room){return shuffled(room.questionIds||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).map(q=>q.id));}
function turnFor(id:string):Turn{return {id,nonce:randomUUID(),order:shuffled([0,1,2,3]),eliminated:[],answered:false,selected:null,correct:null,points:0,rewards:[],reward:null};}
// Older rooms receive a stable character without changing their stored scores or turns.
function avatarFor(p:{id:string;avatar?:number}){const value=p.avatar;return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<6?value:parseInt(hash(p.id).slice(0,8),16)%6;}
function phase(room:Pick<Room,'status'|'endsAt'>,now=Date.now()):Phase{return room.status==='running'&&room.endsAt!==null&&room.endsAt<=now?'ended':room.status;}
async function query(statement:string,params:unknown[]=[]):Promise<Record<string,any>[]>{
  if(!sql)throw new QuizError('게임 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',503);
  return sql.query(statement,params,{fetchOptions:{signal:AbortSignal.timeout(10000),cache:'no-store'}});
}
async function readRoom(code:string,playerIds?:string[]):Promise<Row>{
  const projection=playerIds?`(state-'players') || jsonb_build_object('players',
    (SELECT COALESCE(jsonb_object_agg(key,value),'{}'::jsonb) FROM jsonb_each(state->'players') WHERE key=ANY($2::text[]))) AS state`:'state';
  const custom=playerIds?`,question_bank -> (state #>> ARRAY['players',($2::text[])[1],'turn','id']) AS custom_question`:'';
  const rows=await query(`SELECT code,teacher_key_hash,${projection},expires_at ${custom} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,playerIds?[codeValue(code),playerIds]:[codeValue(code)]);
  assert(rows.length,'게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);return rows[0] as Row;
}
function authenticate(row:Pick<Row,'teacher_key_hash'>,identity:QuizIdentity,player?:Player){
  if(identity.role==='teacher'){assert(matches(identity.token,row.teacher_key_hash),'교사 화면의 접근 정보가 맞지 않습니다.',403);return;}
  assert(identity.role==='student'&&player&&matches(identity.token,player.tokenHash),'참여 정보를 확인할 수 없습니다. 원래 참여한 기기에서 열어 주세요.',403);
  assert(!player.removed,'교사가 참여를 종료했습니다.',403);
}
function publicTurn(p:Player,q:CustomQuestion,code:string){const revealed=p.turn.correct===true||p.turn.revealed===true;return {
  nonce:p.turn.nonce,topic:q.topic,prompt:q.prompt,diagram:q.diagram||null,
  imageUrl:q.imageId?`/api/labs/quiz-rally/sessions/${code}/images/${q.imageId}`:q.imageUrl||null,imageAlt:q.imageAlt||'',
  options:p.turn.order.map(i=>q.options[i]),eliminated:[...new Set([...p.turn.eliminated,...(p.turn.wrongChoices||[])])],
  answered:p.turn.answered,retries:p.turn.retries||0,revealed,canRetry:p.turn.answered&&p.turn.correct===false&&!revealed,
  feedback:p.turn.answered?{correct:p.turn.correct,selected:p.turn.selected,...(revealed?{correctOption:p.turn.order.indexOf(q.answer),explanation:q.explanation}:{}),points:p.turn.points}:null,
  needsReward:p.turn.answered&&p.turn.correct&&!p.turn.reward,reward:p.turn.reward,
};}
function publicPlayer(p:Player,q:CustomQuestion,code:string,review:unknown[]=[]){return {review,id:p.id,nickname:p.nickname,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p)),score:p.score,correct:p.correct,attempted:p.attempted,inventory:p.inventory,boostActive:p.boostActive,shieldActive:p.shieldActive,protectedUntil:p.protectedUntil,turn:publicTurn(p,q,code),notice:p.notice,noticeId:p.noticeId};}

export async function createQuizRoom(body:Record<string,unknown>){
  const duration=Number(body.durationSeconds??480);assert([300,480,600,900].includes(duration),'게임 시간을 다시 선택해 주세요.');
  const title=textValue(body.title,40,'우리 반 퀴즈')||'우리 반 퀴즈';
  const teacherKey=randomBytes(32).toString('base64url');
  const custom=body.questions!==undefined?validateQuestions(body.questions):null;
  const state:Room={title,durationSeconds:duration,extension:body.extension===true,stealEnabled:body.stealEnabled===true,status:'lobby',endsAt:null,remainingMs:duration*1000,metaRevision:0,requests:[],players:{}};
  if(custom){state.questionIds=Object.keys(custom.bank);state.questionSetTitle=textValue(body.questionSetTitle,80,'직접 넣은 문제');state.extension=false;}
  for(let i=0;i<6;i++){
    const code=Array.from({length:6},()=>codeChars[randomInt(codeChars.length)]).join('');
    const rows=await query('INSERT INTO quiz_rally_sessions(code,teacher_key_hash,state,expires_at,question_bank,question_images) VALUES($1,$2,$3::jsonb,NOW()+INTERVAL \'14 days\',$4::jsonb,$5::jsonb) ON CONFLICT(code) DO NOTHING RETURNING code',[code,hash(teacherKey),JSON.stringify(state),custom?JSON.stringify(custom.bank):null,custom?JSON.stringify(custom.images):null]);
    if(rows.length)return {code,teacherKey,title};
  }
  throw new QuizError('게임방을 만들지 못했습니다. 다시 시도해 주세요.',503);
}

export async function joinQuizRoom(code:string,identity:QuizIdentity,body:Record<string,unknown>){
  code=codeValue(code);assert(uuid(identity.playerId)&&validToken(identity.token),'참여 정보를 다시 만들어 주세요.');
  const nickname=textValue(body.nickname,12);assert(nickname.length>0&&/^[\p{L}\p{N} _-]+$/u.test(nickname),'닉네임은 글자와 숫자로 1~12자 입력해 주세요.');
  const row=await readRoom(code,[identity.playerId]),existing=row.state.players[identity.playerId];
  if(existing){authenticate(row,identity,existing);return getQuizSnapshot(code,identity);}
  assert(body.avatar===undefined||(Number.isInteger(body.avatar)&&Number(body.avatar)>=0&&Number(body.avatar)<6),'캐릭터를 다시 선택해 주세요.');
  assert(phase(row.state)!=='ended','이미 끝난 게임입니다. 다음 게임에 참여해 주세요.',409);
  const deck=deckFor(row.state),p:Player={id:identity.playerId,nickname,avatar:body.avatar===undefined?avatarFor({id:identity.playerId}):Number(body.avatar),tokenHash:hash(identity.token),version:0,removed:false,score:0,correct:0,attempted:0,inventory:{boost:0,hint:1,shield:0,steal:0},boostActive:false,shieldActive:false,protectedUntil:0,deck,turn:turnFor(deck.shift()!),requests:[],stats:{},notice:'',noticeId:''};
  p.robot=body.robot===undefined?robotFor(undefined,p.avatar):validateRobot(body.robot);
  const rows=await query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],$3::jsonb,true)
    WHERE code=$1 AND expires_at>NOW() AND state->>'status'<>'ended'
    AND (state->>'status'<>'running' OR (state->>'endsAt')::bigint>(EXTRACT(EPOCH FROM clock_timestamp())*1000)::bigint)
    AND NOT (state->'players' ? $2)
    AND (SELECT COUNT(*) FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean)<40
    AND (SELECT COUNT(*) FROM jsonb_each(state->'players'))<80
    AND NOT EXISTS(SELECT 1 FROM jsonb_each(state->'players') WHERE lower(value->>'nickname')=lower($4) AND NOT (value->>'removed')::boolean)
    RETURNING code`,[code,p.id,JSON.stringify(p),nickname]);
  if(!rows.length){const latest=await readRoom(code);if(latest.state.players[p.id]){authenticate(latest,identity,latest.state.players[p.id]);return getQuizSnapshot(code,identity);}assert(phase(latest.state)!=='ended','이미 끝난 게임입니다.',409);assert(!Object.values(latest.state.players).some(x=>!x.removed&&x.nickname.toLocaleLowerCase()===nickname.toLocaleLowerCase()),'이미 사용 중인 닉네임입니다. 번호를 붙여 주세요.',409);throw new QuizError('참여 인원이 찼습니다. 한 게임에는 최대 40명이 참여할 수 있습니다.',409);}
  return getQuizSnapshot(code,identity);
}

// Polls return a compact scoreboard and the requesting player's data only.
export async function getQuizSnapshot(code:string,identity:QuizIdentity){
  code=codeValue(code);
  if(identity.role==='public'){
    const rows=await query(`SELECT state->>'title' AS title,state->>'status' AS status,state->>'endsAt' AS "endsAt",
      (SELECT COUNT(*)::int FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean) AS count
      FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code]);
    assert(rows.length,'게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);
    const r=rows[0];return {code,title:r.title,status:phase({status:r.status,endsAt:r.endsAt===null?null:Number(r.endsAt)}),count:r.count};
  }
  const rows=await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']);
  assert(rows.length,'게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);
  return snapshotFromRow(rows[0],identity);
}

// Used by SELECT and UPDATE RETURNING: return the newly committed snapshot in the same round trip.
const snapshotColumns=`code,teacher_key_hash,state-'players' AS room,
  state #> ARRAY['players',$2] AS player,
  question_bank -> (state #>> ARRAY['players',$2,'turn','id']) AS custom_question,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',key,'nickname',value->'nickname','avatar',value->'avatar','robot',value->'robot','score',value->'score','correct',value->'correct','attempted',value->'attempted','shield',value->'shieldActive','protectedUntil',value->'protectedUntil',
    'activity',CASE WHEN value #>> '{turn,correct}'='true' THEN CASE WHEN value #>> '{turn,reward}' IS NULL THEN 'reward' ELSE 'ready' END WHEN value #>> '{turn,revealed}'='true' THEN 'review' ELSE 'solving' END)),'[]'::jsonb)
   FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean) AS ranking`;
async function snapshotFromRow(r:Record<string,any>,identity:QuizIdentity){
  const code=r.code as string,room=r.room as Room,p=r.player as Player|undefined;authenticate(r as Row,identity,p);
  const now=Date.now(),ranking=(r.ranking as Array<{id:string;nickname:string;avatar?:number;robot?:RobotParts;activity:string;score:number;correct:number;attempted:number;shield:boolean;protectedUntil:number}>).map(p=>({...p,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p))})).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.nickname.localeCompare(b.nickname,'ko'));
  const review=[];if(identity.role==='student'&&phase(room,now)==='ended'){
    const ids=Object.entries(p!.stats).filter(([,v])=>v[0]>v[1]).slice(0,6).map(([id])=>id);
    const custom=room.questionIds&&ids.length?await query(`SELECT value AS q FROM quiz_rally_sessions,jsonb_each(question_bank) WHERE code=$1 AND key=ANY($2::text[])`,[code,ids]):[];
    for(const id of ids){const q=QUESTION_MAP.get(id)||custom.find(x=>x.q.id===id)?.q;if(q)review.push({prompt:q.prompt,answer:q.options[q.answer],explanation:q.explanation});}
  }
  return {code,title:room.title,status:phase(room,now),durationSeconds:room.durationSeconds,endsAt:room.endsAt,remainingMs:room.remainingMs,serverNow:now,stealEnabled:room.stealEnabled,extension:room.extension,questionCount:room.questionIds?.length||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).length,questionSetTitle:room.questionSetTitle||'중2 과학 · 물질의 구성',cityTarget:room.cityTarget||Math.max(1,ranking.length)*Math.max(3,Math.round(room.durationSeconds/80)),ranking,player:identity.role==='student'?publicPlayer(p!,r.custom_question||QUESTION_MAP.get(p!.turn.id)!,code,review):null};
}

export async function getQuizImage(code:string,id:string){
  assert(/^[A-Za-z0-9_-]{32}$/.test(id),'그림을 찾을 수 없습니다.',404);
  const rows=await query(`SELECT question_images -> $2 AS image FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[codeValue(code),id]);
  assert(rows[0]?.image,'그림을 찾을 수 없습니다.',404);return rows[0].image as {mime:string;data:string};
}

function notice(p:Player,message:string){p.notice=message;p.noticeId=randomUUID();}
function remember(p:Player,requestId:string){p.requests=[...p.requests.slice(-11),requestId];p.version++;}
function modifyPlayer(room:Room,p:Player,body:Record<string,unknown>,q:CustomQuestion,target?:Player){
  const action=body.action;
  if(action==='customize'){p.robot=validateRobot(body.robot);p.avatar=p.robot.headColor;return;}
  if(action==='retry-question'||action==='reveal'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&p.turn.correct===false&&!p.turn.revealed,'다시 풀 수 있는 오답이 없습니다.',409);
    if(action==='reveal'){p.turn.revealed=true;return;}
    p.score-=20;p.turn.retries=(p.turn.retries||0)+1;p.turn.answered=false;p.turn.selected=null;p.turn.correct=null;p.turn.points=0;p.turn.nonce=randomUUID();notice(p,'재도전 −20점 · 같은 문제를 다시 풀어 보세요.');return;
  }
  if(action==='answer'){
    const retry=p.turn.answered&&p.turn.correct===false&&!p.turn.revealed;
    assert(body.nonce===p.turn.nonce&&(!p.turn.answered||retry),'이미 처리한 문제입니다. 화면을 새로 확인해 주세요.',409);
    assert(Number.isInteger(body.choice)&&Number(body.choice)>=0&&Number(body.choice)<4,'보기를 선택해 주세요.');
    assert(!p.turn.eliminated.includes(Number(body.choice))&&!(p.turn.wrongChoices||[]).includes(Number(body.choice)),'남아 있는 보기를 선택해 주세요.');
    if(retry){p.score-=20;p.turn.retries=(p.turn.retries||0)+1;}
    p.turn.answered=true;p.turn.selected=Number(body.choice);p.turn.correct=p.turn.order[p.turn.selected]===q.answer;
    p.attempted++;const s=p.stats[q.id]||[0,0];s[0]++;
    if(p.turn.correct){p.correct++;s[1]++;p.turn.points=p.boostActive?200:100;p.score+=p.turn.points;p.boostActive=false;
      const pool:Reward[]=room.stealEnabled?['bonus40','bonus70','boost','hint','shield','steal']:['bonus40','bonus70','boost','hint'];
      p.turn.rewards=shuffled(pool).slice(0,3);
    }
    else {p.turn.wrongChoices=[...(p.turn.wrongChoices||[]),p.turn.selected];p.turn.nonce=randomUUID();}
    p.stats[q.id]=s;return;
  }
  if(action==='reward'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&p.turn.correct&&!p.turn.reward,'받을 수 있는 보상이 없습니다.',409);
    assert(Number.isInteger(body.chest)&&Number(body.chest)>=0&&Number(body.chest)<3,'상자를 하나 골라 주세요.');
    const type=p.turn.rewards[Number(body.chest)];assert(type,'상자를 다시 확인해 주세요.');let text='';
    if(type==='bonus40'||type==='bonus70'){const points=type==='bonus40'?40:70;p.score+=points;text=`보너스 +${points}점`;}
    else if(p.inventory[type]>=3){p.score+=40;text=`${itemNames[type]} 가방이 가득 차서 +40점`;}
    else{p.inventory[type]++;text=`${itemNames[type]} 아이템 +1`;}
    p.turn.reward={type,text};p.turn.rewards=[];return;
  }
  if(action==='next'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&(!p.turn.correct||p.turn.reward),'해설과 보상을 확인해 주세요.',409);
    if(!p.deck.length){p.deck=deckFor(room);if(p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);}
    p.turn=turnFor(p.deck.shift()!);return;
  }
  assert(action==='item','지원하지 않는 동작입니다.');
  assert(body.nonce===p.turn.nonce,'문제가 바뀌었습니다. 현재 문제에서 다시 사용해 주세요.',409);
  const item=body.item as Item;assert(items.includes(item)&&p.inventory[item]>0,'이 아이템이 없습니다.');
  if(item==='boost'){assert(!p.boostActive,'점수 2배가 이미 준비되어 있습니다.');p.boostActive=true;notice(p,'다음 정답은 200점! 틀려도 효과는 남아 있어요.');}
  if(item==='hint'){const candidates=[0,1,2,3].filter(i=>p.turn.order[i]!==q.answer&&!(p.turn.wrongChoices||[]).includes(i));assert(body.nonce===p.turn.nonce&&!p.turn.answered&&!p.turn.eliminated.length&&candidates.length,'이 문제에는 보기 줄이기를 사용할 수 없습니다.');p.turn.eliminated=shuffled(candidates).slice(0,2);notice(p,`오답 보기 ${p.turn.eliminated.length}개를 지웠어요. 남은 보기에서 골라 보세요.`);}
  if(item==='shield'){assert(room.stealEnabled,'이 게임에서는 점수 가져오기를 사용하지 않습니다.');assert(!p.shieldActive,'방어막이 이미 켜져 있습니다.');p.shieldActive=true;notice(p,'다음 점수 가져오기를 한 번 막아 줍니다.');}
  if(item==='steal'){
    assert(room.stealEnabled,'이 게임에서는 점수 가져오기를 사용하지 않습니다.');
    assert(target&&!target.removed&&target.id!==p.id&&target.score>p.score&&target.score>0,'나보다 점수가 높고 점수가 남아 있는 친구를 골라 주세요.',409);
    assert(target.protectedUntil<=Date.now(),'이 친구는 잠시 보호 중입니다. 다른 친구를 골라 주세요.',409);
    if(target.shieldActive){target.shieldActive=false;notice(target,'방어막이 점수 가져오기를 막았어요!');notice(p,`${target.nickname}의 방어막이 막았어요.`);}
    else{const points=Math.min(30,target.score);target.score-=points;p.score+=points;target.protectedUntil=Date.now()+30000;notice(target,`친구가 ${points}점을 가져갔어요. 30초 동안 보호됩니다.`);notice(p,`${target.nickname}에게서 +${points}점!`);}
    target.version++;
  }
  p.inventory[item]--;
}

export async function actQuizRoom(code:string,identity:QuizIdentity,body:Record<string,unknown>){
  code=codeValue(code);const requestId=body.requestId;assert(uuid(requestId),'요청 정보를 다시 만들어 주세요.');
  if(identity.role==='teacher')return controlRoom(code,identity,body,requestId);
  assert(uuid(identity.playerId),'참여 정보를 확인해 주세요.',403);
  for(let attempt=0;attempt<8;attempt++){
    const row=await readRoom(code,[identity.playerId,...(uuid(body.targetId)?[body.targetId]:[])]),room=row.state,p=room.players[identity.playerId];authenticate(row,identity,p);
    if(p.requests.includes(requestId))return getQuizSnapshot(code,identity);
    const customizing=body.action==='customize';
    if(customizing)assert(phase(room)!=='ended','끝난 게임에서는 로봇을 바꿀 수 없습니다.',409);
    else assert(phase(room)==='running',phase(room)==='paused'?'선생님이 게임을 잠시 멈췄습니다.':'진행 중인 게임에서 사용할 수 있습니다.',409);
    const oldVersion=p.version,target=body.action==='item'&&body.item==='steal'?room.players[String(body.targetId)]:undefined,targetVersion=target?.version;
    modifyPlayer(room,p,body,row.custom_question||QUESTION_MAP.get(p.turn.id)!,target);remember(p,requestId);
    const params:unknown[]=[code,p.id,JSON.stringify(p),oldVersion,room.metaRevision];
    let statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],$3::jsonb)`;
    if(target){params.push(target.id,JSON.stringify(target),targetVersion);statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,ARRAY['players',$2],$3::jsonb),ARRAY['players',$6],$7::jsonb)`;}
    statement+=` WHERE code=$1 AND expires_at>NOW() AND (state #>> ARRAY['players',$2,'version'])::int=$4
      AND (state->>'metaRevision')::int=$5
      AND ${customizing?"state->>'status' IN ('lobby','running','paused') AND (state->>'status'<>'running' OR (state->>'endsAt')::bigint>(EXTRACT(EPOCH FROM clock_timestamp())*1000)::bigint)":"state->>'status'='running' AND (state->>'endsAt')::bigint>(EXTRACT(EPOCH FROM clock_timestamp())*1000)::bigint"}`;
    if(target)statement+=` AND (state #>> ARRAY['players',$6,'version'])::int=$8`;
    const result=await query(statement+' RETURNING '+snapshotColumns,params);
    if(result.length)return snapshotFromRow(result[0],identity);
  }
  throw new QuizError('동시에 요청이 많습니다. 같은 동작을 다시 시도해 주세요.',409);
}

async function controlRoom(code:string,identity:QuizIdentity,body:Record<string,unknown>,requestId:string){
  for(let attempt=0;attempt<8;attempt++){
    const row=await readRoom(code),room=row.state;authenticate(row,identity);
    if(room.requests.includes(requestId))return getQuizSnapshot(code,identity);
    const current=phase(room),now=Date.now(),patch:Partial<Room>={metaRevision:room.metaRevision+1,requests:[...room.requests.slice(-11),requestId]};
    let player:Player|undefined,version:number|undefined;
    switch(body.action){
      case 'start':assert(current==='lobby','이미 시작한 게임입니다.',409);assert(Object.values(room.players).some(p=>!p.removed),'학생이 참여하면 시작할 수 있습니다.');Object.assign(patch,{status:'running',endsAt:now+room.durationSeconds*1000,cityTarget:Object.values(room.players).filter(p=>!p.removed).length*Math.max(3,Math.round(room.durationSeconds/80))});break;
      case 'pause':assert(current==='running','진행 중인 게임을 멈출 수 있습니다.',409);Object.assign(patch,{status:'paused',remainingMs:Math.max(0,room.endsAt!-now),endsAt:null});break;
      case 'resume':assert(current==='paused','멈춘 게임을 다시 시작할 수 있습니다.',409);Object.assign(patch,{status:'running',endsAt:now+room.remainingMs});break;
      case 'end':Object.assign(patch,{status:'ended',remainingMs:0,endsAt:now});break;
      case 'remove':assert(uuid(body.playerId),'참여자를 확인해 주세요.');player=room.players[body.playerId];assert(player&&!player.removed,'참여자를 찾을 수 없습니다.',404);version=player.version;player.removed=true;player.version++;break;
      default:throw new QuizError('지원하지 않는 교사 동작입니다.');
    }
    const params:unknown[]=[code,JSON.stringify(patch),room.metaRevision];
    let statement=`UPDATE quiz_rally_sessions SET state=state || $2::jsonb WHERE code=$1 AND expires_at>NOW() AND (state->>'metaRevision')::int=$3`;
    if(player){params.push(player.id,JSON.stringify(player),version);statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(state || $2::jsonb,ARRAY['players',$4],$5::jsonb) WHERE code=$1 AND expires_at>NOW() AND (state->>'metaRevision')::int=$3 AND (state #>> ARRAY['players',$4,'version'])::int=$6`;}
    if((await query(statement+' RETURNING code',params)).length)return getQuizSnapshot(code,identity);
  }
  throw new QuizError('다른 요청을 처리 중입니다. 다시 시도해 주세요.',409);
}
