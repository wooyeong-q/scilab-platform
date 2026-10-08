import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { QUESTION_MAP, QUIZ_QUESTIONS } from './quiz-rally-questions';
import { validateQuestions, type CustomQuestion } from './quiz-rally-bank';
import { QuizError } from './quiz-rally-errors';
import { robotFor, validateRobot, type RobotParts } from './quiz-rally-robot';
import { advance, capsuleAt, freshRacer, gameClock, CHARGE, type Course, type Racer } from './quiz-rally-course';
import { advanceRunner, control, freshRunner,raceLength, couldFinish, missileDirection, boxes, GEAR_NAMES, type Arena, type Runner, type Gear, type Effect } from './quiz-rally-arena';
export { QuizError } from './quiz-rally-errors';

type Phase = 'lobby' | 'running' | 'paused' | 'ended';
type Item = 'boost' | 'hint' | 'shield' | 'steal';
type Reward = Item | 'bonus40' | 'bonus70' | 'energy' | 'gear';
type Finish = {place:number; bonus:number};
type Turn = { finishBonus?:number; id: string; nonce: string; order: number[]; eliminated: number[]; answered: boolean; selected: number | null; correct: boolean | null; points: number; rewards: Reward[]; reward: {type: Reward; text: string} | null; retries?:number; revealed?:boolean; wrongChoices?:number[] };
type Player = {
  id: string; nickname: string; avatar?: number; robot?:RobotParts; tokenHash: string; version: number; removed: boolean;
  solvedIds?:string[]; finish?:Finish; racer?:Racer; runner?:Runner; gear?:Gear[]; useAt?:number; answerAt?:number;
  score: number; correct: number; attempted: number; inventory: Record<Item,number>;
  boostActive: boolean; shieldActive: boolean; protectedUntil: number;
  deck: string[]; turn: Turn; requests: string[]; stats: Record<string,[number,number]>;
  notice: string; noticeId: string;
};
type Room = {
  title: string; durationSeconds: number; extension: boolean; stealEnabled: boolean;
  status: Phase; endsAt: number | null; remainingMs: number; metaRevision: number;
  requests: string[]; players: Record<string,Player>;
  raceGoal?:number; finishers?:string[]; course?:Course; stoppedClock?:number; arena?:Arena; arenaEffects?:Effect[]; arenaRevision?:number;
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
function deckFor(room:Room,solved:string[]=[]){return shuffled((room.questionIds||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).map(q=>q.id)).filter(id=>room.arena||room.course||!room.raceGoal||!solved.includes(id)));}
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
  feedback:p.turn.answered?{correct:p.turn.correct,selected:p.turn.selected,...(revealed?{correctOption:p.turn.order.indexOf(q.answer),explanation:q.explanation}:{}),points:p.runner?undefined:p.turn.points}:null,
  finishBonus:p.runner?undefined:p.turn.finishBonus||0,needsReward:p.turn.answered&&p.turn.correct&&!p.turn.reward,reward:p.turn.reward,
};}
function publicPlayer(p:Player,q:CustomQuestion,code:string,review:unknown[]=[]){return {review,runner:p.runner||null,gear:p.gear||[],answerAt:p.answerAt||0,racer:p.racer||null,finish:p.finish||null,id:p.id,nickname:p.nickname,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p)),score:p.runner?undefined:p.score,correct:p.correct,attempted:p.attempted,inventory:p.runner?undefined:p.inventory,boostActive:p.boostActive,shieldActive:p.shieldActive,protectedUntil:p.protectedUntil,turn:publicTurn(p,q,code),notice:p.notice,noticeId:p.noticeId};}

export async function createQuizRoom(body:Record<string,unknown>){
  const duration=Number(body.durationSeconds??900);assert([300,480,600,900].includes(duration),'게임 시간을 다시 선택해 주세요.');
  const title=textValue(body.title,40,'우리 반 퀴즈')||'우리 반 퀴즈';
  const teacherKey=randomBytes(32).toString('base64url');
  const custom=body.questions!==undefined?validateQuestions(body.questions):null;
  const state:Room={title,durationSeconds:duration,extension:body.extension===true,stealEnabled:body.stealEnabled===true,status:'lobby',endsAt:null,remainingMs:duration*1000,metaRevision:0,requests:[],players:{}};
  if(custom){state.questionIds=Object.keys(custom.bank);state.questionSetTitle=textValue(body.questionSetTitle,80,'직접 넣은 문제');state.extension=false;}
  state.raceGoal=state.questionIds?.length||QUIZ_QUESTIONS.filter(q=>state.extension||!q.extension).length;state.finishers=[];state.arena={version:2,length:raceLength(duration),seed:randomInt(100000),combat:body.stealEnabled!==false};state.arenaEffects=[];state.arenaRevision=0;
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
  if(row.state.arena){p.runner=freshRunner(gameClock(row.state),parseInt(hash(p.id).slice(0,4),16)%40);p.gear=[];}
  if(row.state.course)p.racer=freshRacer(gameClock(row.state));
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
  let row=rows[0];authenticate(row as Row,identity,row.player);
  if(row.room.course&&(row.ranking as Array<{racer?:Racer;finish?:Finish}>).some(p=>p.racer&&!p.finish&&advance(p.racer,gameClock(row.room),row.room.course).finishAt!==undefined)){
    await settleCourse(code);row=(await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']))[0];
  }
  if(row.room.arena&&(row.ranking as Array<{runner?:Runner;finish?:Finish;id:string}>).some(p=>p.runner&&!p.finish&&couldFinish(p.runner,gameClock(row.room),row.room.arena)&&advanceRunner(p.runner,gameClock(row.room),row.room.arena,row.room.arenaEffects||[],p.id).finishAt!==undefined)){
    await settleArena(code);row=(await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']))[0];
  }
  return snapshotFromRow(row,identity);
}

// Used by SELECT and UPDATE RETURNING: return the newly committed snapshot in the same round trip.
const snapshotColumns=`code,teacher_key_hash,state-'players' AS room,
  state #> ARRAY['players',$2] AS player,
  question_bank -> (state #>> ARRAY['players',$2,'turn','id']) AS custom_question,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',key,'nickname',value->'nickname','avatar',value->'avatar','robot',value->'robot','finish',value->'finish','racer',value->'racer','runner',value->'runner','score',value->'score','correct',value->'correct','attempted',value->'attempted','shield',value->'shieldActive','protectedUntil',value->'protectedUntil',
    'activity',CASE WHEN value #>> '{turn,correct}'='true' THEN CASE WHEN value #>> '{turn,reward}' IS NULL THEN 'reward' ELSE 'ready' END WHEN value #>> '{turn,revealed}'='true' THEN 'review' ELSE 'solving' END)),'[]'::jsonb)
   FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean) AS ranking`;
async function snapshotFromRow(r:Record<string,any>,identity:QuizIdentity){
  const code=r.code as string,room=r.room as Room,p=r.player as Player|undefined;authenticate(r as Row,identity,p);
  const now=Date.now(),ranking=(r.ranking as Array<{id:string;nickname:string;avatar?:number;robot?:RobotParts;activity:string;racer?:Racer;runner?:Runner;finish?:Finish;score:number;correct:number;attempted:number;shield:boolean;protectedUntil:number}>).map(p=>({...p,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p))})).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.nickname.localeCompare(b.nickname,'ko'));
  if(room.arena){const positions=new Map(ranking.map(p=>[p.id,phase(room,now)==='ended'?advanceRunner(p.runner!,gameClock(room,now),room.arena!,room.arenaEffects||[],p.id).y:p.runner!.y]));ranking.sort((a,b)=>{if(a.finish||b.finish)return(a.finish?.place||999)-(b.finish?.place||999);return positions.get(b.id)!-positions.get(a.id)!||a.nickname.localeCompare(b.nickname,'ko');});}
  const review=[];if(identity.role==='student'&&phase(room,now)==='ended'){
    const ids=Object.entries(p!.stats).filter(([,v])=>v[0]>v[1]).slice(0,6).map(([id])=>id);
    const custom=room.questionIds&&ids.length?await query(`SELECT value AS q FROM quiz_rally_sessions,jsonb_each(question_bank) WHERE code=$1 AND key=ANY($2::text[])`,[code,ids]):[];
    for(const id of ids){const q=QUESTION_MAP.get(id)||custom.find(x=>x.q.id===id)?.q;if(q)review.push({prompt:q.prompt,answer:q.options[q.answer],explanation:q.explanation});}
  }
  return {code,arena:room.arena||null,arenaEffects:room.arenaEffects||[],arenaRevision:room.arenaRevision||0,course:room.course||null,raceClock:gameClock(room,now),raceGoal:room.raceGoal||null,finishers:room.finishers||[],finishPrizes:room.arena?[]:room.raceGoal?(room.course?[20,12,8]:[50,30,15]).map(n=>(room.course?Math.min(room.raceGoal!,Math.ceil(room.course.length/650)):room.raceGoal!)*n):[],title:room.title,status:phase(room,now),durationSeconds:room.durationSeconds,endsAt:room.endsAt,remainingMs:room.remainingMs,serverNow:now,stealEnabled:room.stealEnabled,extension:room.extension,questionCount:room.questionIds?.length||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).length,questionSetTitle:room.questionSetTitle||'중2 과학 · 물질의 구성',cityTarget:room.cityTarget||Math.max(1,ranking.length)*Math.max(3,Math.round(room.durationSeconds/80)),ranking:room.arena?ranking.map(x=>({...x,score:undefined})):ranking,player:identity.role==='student'?publicPlayer(p!,r.custom_question||QUESTION_MAP.get(p!.turn.id)!,code,review):null};
}

async function settleCourse(code:string){
  for(let attempt=0;attempt<8;attempt++){
    const row=await readRoom(code),room=row.state;if(!room.course)return;
    const clock=gameClock(room),arrivals=Object.values(room.players).filter(p=>!p.removed&&!p.finish&&p.racer).map(p=>({p,r:advance(p.racer!,clock,room.course!)})).filter(x=>x.r.finishAt!==undefined).sort((a,b)=>a.r.finishAt!-b.r.finishAt!||a.p.id.localeCompare(b.p.id));
    if(!arrivals.length)return;
    const winners=[...(room.finishers||[])],patch:Record<string,Player>={},params:unknown[]=[code,room.metaRevision,JSON.stringify(winners)];let guards='';
    for(const {p,r} of arrivals){const place=winners.length<3?winners.length+1:0,bonus=place?Math.min(room.raceGoal||0,Math.ceil(room.course.length/650))*[20,12,8][place-1]:0;
      params.push(p.id,p.version);guards+=` AND (state #>> ARRAY['players',$${params.length-1},'version'])::int=$${params.length}`;
      p.racer={...r,open:false};p.finish={place,bonus};p.score+=bonus;p.version++;if(place)winners.push(p.id);notice(p,place?`최종 결승 ${place}등! +${bonus}점`:'결승선 통과! 친구들을 응원해 주세요.');patch[p.id]=p;
    }
    params.push(JSON.stringify(patch),JSON.stringify(winners));
    const result=await query(`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,'{players}',(state->'players') || $${params.length-1}::jsonb),'{finishers}',$${params.length}::jsonb) || jsonb_build_object('metaRevision',(state->>'metaRevision')::int+1)
      WHERE code=$1 AND expires_at>NOW() AND (state->>'metaRevision')::int=$2 AND COALESCE(state->'finishers','[]'::jsonb)=$3::jsonb ${guards} RETURNING code`,params);
    if(result.length)return;
  }
  throw new QuizError('결승 순위를 확인 중입니다. 잠시 후 다시 연결합니다.',409);
}

function advanceArenaPlayer(room:Room,p:Player,clock:number){
  const previous=new Set(p.runner!.usedEffects),r=advanceRunner(p.runner!,clock,room.arena!,room.arenaEffects||[],p.id);
  for(const hit of r.hits)if(!previous.has(hit.id)){const e=room.arenaEffects?.find(e=>e.id===hit.id);if(e&&!e.victim){e.victim=p.id;e.hitAt=hit.t;}}
  p.runner=r;return r;
}
function modifyArena(room:Room,p:Player,body:Record<string,unknown>,q:CustomQuestion){
  assert(p.runner&&!p.finish,'이미 완주했어요. 친구들의 경주를 지켜봐 주세요.',409);
  const now=gameClock(room),action=body.action;
  if(action==='arena-input'||((action==='arena-collect'||action==='arena-use')&&Array.isArray(body.inputs))){
    const batch=Array.isArray(body.inputs)?body.inputs:[body];assert((batch.length>0||action!=='arena-input')&&batch.length<=24,'조작 값을 확인해 주세요.');
    let last=-1;
    for(const value of batch){assert(value&&typeof value==='object'&&!Array.isArray(value),'조작 값을 확인해 주세요.');const input=value as Record<string,unknown>;
      const dx=Number(input.dx),dy=Number(input.dy),seq=Number(input.seq);assert(Number.isFinite(dx)&&Number.isFinite(dy)&&Math.abs(dx)<=1&&Math.abs(dy)<=1&&Number.isSafeInteger(seq)&&seq>=0&&seq>last,'조작 값을 확인해 주세요.');last=seq;
      if(seq<=p.runner.seq)continue;
      const at=Number(input.at),clock=Number.isFinite(at)?Math.max(p.runner.t,Math.min(now,Math.max(now-6000,at))):now;
      const r=advanceArenaPlayer(room,p,clock);p.runner=control(r,dx,dy,input.jump===true,input.dive===true,clock,seq);
    }
    // Persist the last acknowledged input, not its extrapolation to request time.
    // New inputs may already have happened while this response is in flight.
    // Advancing this anchor to `now` would push those inputs (including jumps)
    // into the future on the next request and repeatedly rewind the client.
    // Snapshots and arrival settlement still project the runner to current time.
    if(action==='arena-input')return;
  }
  // Item/popup actions share the input timeline, including when they waited
  // behind another request. Keep validation/cooldown time authoritative.
  const at=Number(body.at),actionClock=Number.isFinite(at)?Math.max(p.runner.t,Math.min(now,Math.max(now-6000,at))):now;
  const r=advanceArenaPlayer(room,p,actionClock);
  if(action==='arena-close'){r.open=false;r.dx=0;r.dy=0;r.inputUntil=now;return;}
  if(action==='arena-collect'){
    assert(!r.open&&!r.fallUntil&&r.z<25,'지금은 문제 상자를 열 수 없어요.',409);assert((p.gear||[]).length<3,'아이템을 먼저 사용해 가방을 비워 주세요.');
    const b=boxes(room.arena, r.y-100,r.y+100).find(b=>b.id===body.box);assert(b&&!r.boxes.includes(b.id)&&Math.hypot(b.x-r.x,b.y-r.y)<100,'가까운 문제 상자를 찾아 주세요.',409);
    if(p.turn.correct||p.turn.revealed){if(!p.deck.length)p.deck=deckFor(room);if(p.deck.length>1&&p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);p.turn=turnFor(p.deck.shift()!);}
    r.boxes.push(b.id);r.open=true;r.dx=0;r.dy=0;r.z=0;r.vz=0;r.knockX=0;r.knockY=0;r.inputUntil=now;return;
  }
  if(action==='answer'){
    assert(r.open,'문제 상자를 먼저 획득해 주세요.',409);const retry=p.turn.answered&&p.turn.correct===false&&!p.turn.revealed;
    assert(body.nonce===p.turn.nonce&&(!p.turn.answered||retry),'이미 처리한 문제입니다.',409);assert(now>=(p.answerAt||0),'잠깐 생각한 뒤 다시 골라 주세요.',409);
    const choice=Number(body.choice);assert(Number.isInteger(choice)&&choice>=0&&choice<4&&!p.turn.wrongChoices?.includes(choice),'남아 있는 보기를 골라 주세요.');
    p.turn.answered=true;p.turn.selected=choice;p.turn.correct=p.turn.order[choice]===q.answer;p.turn.points=0;p.attempted++;if(retry)p.turn.retries=(p.turn.retries||0)+1;
    const stat=p.stats[q.id]||[0,0];stat[0]++;
    if(p.turn.correct){p.correct++;stat[1]++;const pool:Gear[]=room.arena!.combat?['mine','missile','banana','field','shield','boost']:['shield','boost'];const gear=pool[randomInt(pool.length)];p.gear=[...(p.gear||[]),gear];p.turn.reward={type:'gear',text:GEAR_NAMES[gear]+' 획득!'};r.open=false;r.dx=0;r.dy=0;r.inputUntil=now;notice(p,'정답! '+GEAR_NAMES[gear]+' 획득');}
    else{p.turn.wrongChoices=[...(p.turn.wrongChoices||[]),choice];p.turn.nonce=randomUUID();p.answerAt=now+1000;}
    p.stats[q.id]=stat;return;
  }
  if(action==='reveal'){assert(r.open&&body.nonce===p.turn.nonce&&p.turn.answered&&!p.turn.correct,'해설을 볼 문제를 확인해 주세요.',409);p.turn.revealed=true;return;}
  if(action==='arena-use'){
    assert(!r.open&&!r.fallUntil,'코스에서 아이템을 사용해 주세요.',409);assert(now-(p.useAt??-5000)>=900,'잠시 뒤 다음 아이템을 사용해 주세요.',409);
    const slot=Number(body.slot);assert(Number.isInteger(slot)&&slot>=0&&slot<(p.gear||[]).length,'아이템을 선택해 주세요.');const gear=p.gear![slot];
    if(gear==='shield')r.shieldUntil=actionClock+4000;
    else if(gear==='boost')r.boostUntil=actionClock+3000;
    else {const effects=(room.arenaEffects||[]).filter(e=>e.expires>now-5000);assert(effects.length<200,'경기의 아이템이 많아요. 잠깐 뒤 사용해 주세요.');const behind=gear==='mine'||gear==='banana',offset=behind?-55:gear==='missile'?45:0,direction=gear==='missile'?missileDirection():{dx:r.fx,dy:r.fy};
      effects.push({id:randomUUID(),type:gear,owner:p.id,x:r.x+direction.dx*offset,y:r.y+direction.dy*offset,dx:direction.dx,dy:direction.dy,born:actionClock,expires:actionClock+(gear==='missile'?2200:gear==='field'?5000:14000)});room.arenaEffects=effects;
    }
    p.gear!.splice(slot,1);p.useAt=now;notice(p,GEAR_NAMES[gear]+' 사용!');return;
  }
  throw new QuizError('이 경주에서는 사용할 수 없는 동작입니다.');
}
async function settleArena(code:string){
  for(let attempt=0;attempt<8;attempt++){
    const row=await readRoom(code),room=row.state;if(!room.arena)return;
    const clock=gameClock(room),effects=room.arenaEffects||[],projected=Object.values(room.players).filter(p=>!p.removed&&!p.finish&&p.runner).map(p=>({p,r:advanceRunner(p.runner!,clock,room.arena!,effects,p.id)}));
    // Resolve a trap to one victim before deriving the final arrival order.
    const hits=projected.flatMap(({p,r})=>r.hits.filter(h=>!p.runner!.usedEffects.includes(h.id)).map(h=>({...h,id:h.id,playerId:p.id}))).sort((a,b)=>a.t-b.t||a.playerId.localeCompare(b.playerId));
    for(const hit of hits){const e=effects.find(e=>e.id===hit.id);if(e&&!e.victim){e.victim=hit.playerId;e.hitAt=hit.t;}}
    const arrivals=projected.map(({p})=>({p,r:advanceRunner(p.runner!,clock,room.arena!,effects,p.id)})).filter(x=>x.r.finishAt!==undefined).sort((a,b)=>a.r.finishAt!-b.r.finishAt!||a.p.id.localeCompare(b.p.id));if(!arrivals.length)return;
    const winners=[...(room.finishers||[])],patch:Record<string,Player>={},params:unknown[]=[code,room.metaRevision,room.arenaRevision||0];let guards='';
    for(const {p,r} of arrivals){params.push(p.id,p.version);guards+=` AND (state #>> ARRAY['players',$${params.length-1},'version'])::int=$${params.length}`;winners.push(p.id);p.runner={...r,open:false};p.finish={place:winners.length,bonus:0};p.version++;notice(p,`결승선 ${winners.length}등 통과!`);patch[p.id]=p;}
    params.push(JSON.stringify(patch),JSON.stringify(winners),JSON.stringify(effects));
    const rows=await query(`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(jsonb_set(state,'{players}',(state->'players') || $${params.length-2}::jsonb),'{finishers}',$${params.length-1}::jsonb),'{arenaEffects}',$${params.length}::jsonb) || jsonb_build_object('metaRevision',(state->>'metaRevision')::int+1,'arenaRevision',COALESCE((state->>'arenaRevision')::int,0)+1)
      WHERE code=$1 AND expires_at>NOW() AND (state->>'metaRevision')::int=$2 AND COALESCE((state->>'arenaRevision')::int,0)=$3 ${guards} RETURNING code`,params);if(rows.length)return;
  }
  throw new QuizError('도착 순서를 확인 중입니다. 잠시 뒤 다시 연결합니다.',409);
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
  if(room.arena){modifyArena(room,p,body,q);return;}
  assert(!p.finish||action==='reward','이미 완주했어요. 친구들의 도전을 지켜봐 주세요.',409);
  if(room.course&&p.racer){
    const r=p.racer;
    if(action==='race-lane'){assert(Number.isInteger(body.lane)&&Number(body.lane)>=0&&Number(body.lane)<5,'이동할 차선을 확인해 주세요.');r.lane=Number(body.lane);return;}
    if(action==='race-close'){r.open=false;return;}
    if(action==='race-collect'){
      assert(!r.open,'지금 열린 문제를 먼저 확인해 주세요.',409);
      const index=Number(body.capsule);assert(Number.isInteger(index)&&index>=0&&index>r.capsule,'이미 지난 캡슐입니다.',409);
      const cap=capsuleAt(index,room.course);assert(cap.d<room.course.length&&Math.abs(r.d-cap.d)<=120&&r.lane===cap.lane,'같은 차선의 가까운 문제 캡슐을 획득할 수 있어요.',409);
      if(p.turn.correct||p.turn.revealed){if(!p.deck.length)p.deck=deckFor(room);if(p.deck.length>1&&p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);p.turn=turnFor(p.deck.shift()!);}
      r.capsule=index;r.open=true;return;
    }
    if(action==='next'){assert(p.turn.answered,'먼저 문제를 확인해 주세요.');r.open=false;return;}
    if(action==='answer'||action==='reveal'||action==='retry-question')assert(r.open,'코스의 문제 캡슐을 먼저 획득해 주세요.',409);
    if(action==='item'&&body.item==='hint')assert(r.open,'문제 캡슐을 연 다음 사용해 주세요.');
  }
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
      if(room.course&&p.racer){
        p.racer.e=Math.min(100,p.racer.e+CHARGE);p.turn.rewards=[];
        let text='에너지 +45 충전 (최대 100)';let type:Reward='energy';
        if(randomInt(100)<30){const available:Item[]=room.stealEnabled?items:['boost','hint'];type=available[randomInt(available.length)];if(p.inventory[type]<3){p.inventory[type]++;text+=` · ${itemNames[type]} 획득!`;}else{p.score+=40;text+=' · 가방이 가득 차서 +40점!';}}
        p.turn.reward={type,text};notice(p,text);
      }
      if(room.raceGoal&&!room.course){p.solvedIds=[...new Set([...(p.solvedIds||[]),q.id])];if(p.solvedIds.length>=room.raceGoal){const winners=room.finishers||[],place=winners.length<3?winners.length+1:0,bonus=place?room.raceGoal*[50,30,15][place-1]:0;p.finish={place,bonus};p.turn.finishBonus=bonus;p.score+=bonus;if(place)room.finishers=[...winners,p.id];notice(p,place?`최종 결승 ${place}등! 추가 +${bonus}점!`:'모든 문제 해결! 최종 결승선에 도착했어요.');}}

    }
    else {p.turn.wrongChoices=[...(p.turn.wrongChoices||[]),p.turn.selected];p.turn.nonce=randomUUID();}
    p.stats[q.id]=s;return;
  }
  if(action==='reward'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&p.turn.correct&&!p.turn.reward,'받을 수 있는 보상이 없습니다.',409);
    assert(Number.isInteger(body.chest)&&Number(body.chest)>=0&&Number(body.chest)<3,'상자를 하나 골라 주세요.');
    const type=p.turn.rewards[Number(body.chest)];assert(type,'상자를 다시 확인해 주세요.');let text='';
    if(type==='bonus40'||type==='bonus70'){const points=type==='bonus40'?40:70;p.score+=points;text=`보너스 +${points}점`;}
    else if(type==='energy'||type==='gear'){text='에너지 충전';}
    else if(p.inventory[type]>=3){p.score+=40;text=`${itemNames[type]} 가방이 가득 차서 +40점`;}
    else{p.inventory[type]++;text=`${itemNames[type]} 아이템 +1`;}
    p.turn.reward={type,text};p.turn.rewards=[];return;
  }
  if(action==='next'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&(!p.turn.correct||p.turn.reward),'해설과 보상을 확인해 주세요.',409);
    if(!p.deck.length){p.deck=deckFor(room,p.solvedIds);if(p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);}
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
    assert(target&&!target.removed&&target.id!==p.id&&target.score>p.score&&target.score>0&&!target.finish,'나보다 점수가 높고 점수가 남아 있는 친구를 골라 주세요.',409);
    assert(target.protectedUntil<=Date.now(),'이 친구는 잠시 보호 중입니다. 다른 친구를 골라 주세요.',409);
    if(target.shieldActive){target.shieldActive=false;notice(target,'방어막이 점수 가져오기를 막았어요!');notice(p,`${target.nickname}의 방어막이 막았어요.`);}
    else{const points=Math.min(randomInt(5,16)*10,target.score);target.score-=points;p.score+=points;target.protectedUntil=Date.now()+30000;notice(target,`친구가 ${points}점을 가져갔어요. 30초 동안 보호됩니다.`);notice(p,`${target.nickname}에게서 +${points}점!`);}
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
    if(room.course&&p.racer&&!p.finish){p.racer=advance(p.racer,gameClock(room),room.course);if(p.racer.finishAt!==undefined){await settleCourse(code);return getQuizSnapshot(code,identity);}}
    if(room.arena&&p.runner){if(p.finish&&body.action==='arena-input')return getQuizSnapshot(code,identity);if(!p.finish&&couldFinish(p.runner,gameClock(room),room.arena)&&advanceRunner(p.runner,gameClock(room),room.arena,room.arenaEffects||[],p.id).finishAt!==undefined){await settleArena(code);return getQuizSnapshot(code,identity);}}
    const priorArenaEffects=JSON.stringify(room.arenaEffects||[]);
    const oldVersion=p.version,target=body.action==='item'&&body.item==='steal'?room.players[String(body.targetId)]:undefined,targetVersion=target?.version;
    if(room.course&&target?.racer&&!target.finish&&advance(target.racer,gameClock(room),room.course).finishAt!==undefined){await settleCourse(code);continue;}
    const wasFinished=!!p.finish,priorFinishers=room.finishers||[];
    modifyPlayer(room,p,body,row.custom_question||QUESTION_MAP.get(p.turn.id)!,target);remember(p,requestId);
    const params:unknown[]=[code,p.id,JSON.stringify(p),oldVersion,room.metaRevision];
    let statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],$3::jsonb)`;
    if(target){params.push(target.id,JSON.stringify(target),targetVersion);statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,ARRAY['players',$2],$3::jsonb),ARRAY['players',$6],$7::jsonb)`;}
    const finishClaim=!wasFinished&&p.finish&&p.finish.place>0;
    if(finishClaim){params.push(JSON.stringify(room.finishers),JSON.stringify(priorFinishers));statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,ARRAY['players',$2],$3::jsonb),'{finishers}',$6::jsonb)`;}
    const arenaChanged=!!room.arena&&JSON.stringify(room.arenaEffects||[])!==priorArenaEffects;
    let arenaGuards='';
    if(arenaChanged){
      // Merge only this action's additions and claims into the current row.
      // Replacing the entire effects snapshot forces unrelated students to
      // compete for a room-wide version and exhaust retries during item bursts.
      const previous=new Map((JSON.parse(priorArenaEffects) as Effect[]).map(e=>[e.id,e]));
      const added=(room.arenaEffects||[]).filter(e=>!previous.has(e.id));
      const claims=Object.fromEntries((room.arenaEffects||[])
        .filter(e=>previous.has(e.id)&&e.victim&&!previous.get(e.id)!.victim)
        .map(e=>[e.id,{victim:e.victim,hitAt:e.hitAt}]));
      params.push(JSON.stringify(added),JSON.stringify(claims),added.length?gameClock(room)-5000:-1);
      const additions=`$${params.length-2}::jsonb`,claimed=`$${params.length-1}::jsonb`,cutoff=`$${params.length}::double precision`;
      const saved=`jsonb_array_elements(COALESCE(state->'arenaEffects','[]'::jsonb))`;
      const merged=`COALESCE((SELECT jsonb_agg(effect || COALESCE(${claimed}->(effect->>'id'),'{}'::jsonb) ORDER BY ordinal)
        FROM ${saved} WITH ORDINALITY AS current_effects(effect,ordinal)
        WHERE (effect->>'expires')::double precision>${cutoff}),'[]'::jsonb) || ${additions}`;
      statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,ARRAY['players',$2],$3::jsonb),'{arenaEffects}',(${merged}))
        || jsonb_build_object('arenaRevision',COALESCE((state->>'arenaRevision')::int,0)+1)`;
      // A trap can still be claimed by exactly one student. A losing claim
      // retries from current state before saving either its damage or inventory.
      if(Object.keys(claims).length)arenaGuards+=` AND NOT EXISTS (
        SELECT 1 FROM jsonb_each(${claimed}) AS claim WHERE NOT EXISTS (
          SELECT 1 FROM ${saved} AS existing(effect)
          WHERE effect->>'id'=claim.key AND effect->>'victim' IS NULL))`;
      if(added.length)arenaGuards+=` AND (SELECT COUNT(*) FROM ${saved} AS existing(effect)
        WHERE (effect->>'expires')::double precision>${cutoff})+jsonb_array_length(${additions})<=200`;
    }
    statement+=` WHERE code=$1 AND expires_at>NOW() AND (state #>> ARRAY['players',$2,'version'])::int=$4
      AND (state->>'metaRevision')::int=$5
      AND ${customizing?"state->>'status' IN ('lobby','running','paused') AND (state->>'status'<>'running' OR (state->>'endsAt')::bigint>(EXTRACT(EPOCH FROM clock_timestamp())*1000)::bigint)":"state->>'status'='running' AND (state->>'endsAt')::bigint>(EXTRACT(EPOCH FROM clock_timestamp())*1000)::bigint"}`;
    if(target)statement+=` AND (state #>> ARRAY['players',$6,'version'])::int=$8`;
    if(finishClaim)statement+=` AND COALESCE(state->'finishers','[]'::jsonb)=$7::jsonb`;
    statement+=arenaGuards;
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
      case 'end':Object.assign(patch,{status:'ended',remainingMs:0,endsAt:now,stoppedClock:gameClock(room,now)});break;
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
