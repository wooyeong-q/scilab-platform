import { newQuizRealtimeRoute, initializeQuizRealtime, routeQuizRealtime, requireLegacyRoom } from './quiz-rally-realtime';
import { Phase, Item, Reward, Finish, Turn, Player, Room, Row, QuizIdentity, codeChars, items, itemNames, hash, validToken, matches, assert, codeValue, textValue, uuid, shuffled, deckFor, turnFor, avatarFor, phase, authenticate, publicTurn, publicPlayer, advanceArenaPlayer, closeArenaQuestion, modifyArena, notice, remember, modifyPlayer } from './quiz-rally-rules';
export type { QuizIdentity } from './quiz-rally-rules';
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { QUESTION_MAP, QUIZ_QUESTIONS } from './quiz-rally-questions';
import { validateQuestions, type CustomQuestion } from './quiz-rally-bank';
import { QuizError } from './quiz-rally-errors';
import { QuizWorldFeed, resolveCombat } from './quiz-rally-combat';
import { robotFor, validateRobot, type RobotParts } from './quiz-rally-robot';
import { advance, capsuleAt, freshRacer, gameClock, CHARGE, type Course, type Racer } from './quiz-rally-course';
import { advanceRunner, control, freshRunner,raceLength, missileDirection, boxes, boxWait, BOX_RESPAWN, GEAR_NAMES, ENERGY_CHARGE, energyValue,withHistory,acceptedRunner,sampleRunner,runnerState,recordRunnerPatch,trimRunnerHistory, type Arena, type Runner, type Gear, type Effect,type ArenaInput } from './quiz-rally-arena';
export { QuizError } from './quiz-rally-errors';

// A recent authenticated question can answer without another database read
// on a warm worker. The guarded UPDATE still checks the player and room;
// stale snapshots fall back to a fresh read before any result is returned.
const answerSnapshots=new Map<string,{at:number;row:Row}>();
async function query(statement:string,params:unknown[]=[]):Promise<Record<string,any>[]>{
  if(!sql)throw new QuizError('게임 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',503);
  return sql.query(statement,params,{fetchOptions:{signal:AbortSignal.timeout(10000),cache:'no-store'}});
}
async function readRoom(code:string,playerIds?:string[]):Promise<Row>{
  const projection=playerIds?`(state-'players') || jsonb_build_object('players',
    (SELECT COALESCE(jsonb_object_agg(key,value),'{}'::jsonb) FROM jsonb_each(state->'players') WHERE key=ANY($2::text[]))) AS state`:'state';
  const custom=playerIds?`,question_bank -> (state #>> ARRAY['players',($2::text[])[1],'turn','id']) AS custom_question,
    (SELECT inputs FROM quiz_rally_motion_inputs q WHERE q.code=quiz_rally_sessions.code AND q.player_id=($2::text[])[1]) AS motion_inputs`:'';
  const rows=await query(`SELECT code,teacher_key_hash,${projection},expires_at ${custom} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,playerIds?[codeValue(code),playerIds]:[codeValue(code)]);
  assert(rows.length,'게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);requireLegacyRoom(rows[0].state);return rows[0] as Row;
}
// Streaming clients use the same room credentials as normal game requests.
export async function authorizeQuizStream(code:string,identity:QuizIdentity){
  code=codeValue(code);
  const rows=await query(`SELECT teacher_key_hash,state->>'status' AS status,state->'realtime' AS realtime,
    state #> ARRAY['players',$2] AS player FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']);
  assert(rows.length,'게임방을 찾을 수 없습니다.',404);
  requireLegacyRoom(rows[0]);authenticate(rows[0] as Row,identity,rows[0].player);
  return {code,status:rows[0].status as Phase};
}
export async function getQuizMotionAccess(code:string,identity:QuizIdentity){
  const row=await readRoom(code,identity.role==='student'?[identity.playerId]:[]),room=row.state;
  const player=room.players[identity.playerId];authenticate(row,identity,player);
  const now=Date.now();return {code:row.code,status:phase(room,now),roomRevision:room.metaRevision||0,
    arenaRevision:room.arenaRevision||0,arena:room.arena,effects:room.arenaEffects||[],
    raceClock:gameClock(room,now),serverNow:now,duration:room.durationSeconds*1000,
    runner:player?.runner,version:player?.version||0};
}
// Fast inputs are authenticated and journaled in small per-player rows. They
// do not wait for a full-room save or mutate answers, scores or item inventory.
export async function publishQuizMotion(code:string,identity:QuizIdentity,inputs:unknown[],roomRevision:number,arenaRevision:number){
  assert(identity.role==='student'&&validToken(identity.token)&&uuid(identity.playerId),'참여 정보를 확인해 주세요.',403);
  assert(Number.isSafeInteger(roomRevision)&&roomRevision>=0&&Number.isSafeInteger(arenaRevision)&&arenaRevision>=0,'경기 정보를 확인해 주세요.');
  code=codeValue(code);
  const payload=JSON.stringify({type:'input',code,id:identity.playerId,inputs,roomRevision,arenaRevision});
  const clock=`GREATEST(0,LEAST((state->>'durationSeconds')::double precision*1000,(state->>'durationSeconds')::double precision*1000-GREATEST(0,(state->>'endsAt')::double precision-$8::double precision)))`;
  const rows=await query(`WITH accepted AS (
    INSERT INTO quiz_rally_motion_inputs(code,player_id,inputs,updated_at)
    SELECT code,$2,(SELECT jsonb_agg(event || jsonb_build_object('at',
      GREATEST(COALESCE((state #>> ARRAY['players',$2,'runner','t'])::double precision,0),LEAST(${clock},GREATEST(${clock}-6000,(event->>'at')::double precision)))) ORDER BY ordinal)
      FROM jsonb_array_elements($7::jsonb) WITH ORDINALITY AS incoming(event,ordinal)),NOW()
    FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW() AND NOT (state ? 'realtime') AND state->>'status'='running' AND (state->>'endsAt')::double precision>$8
    AND COALESCE((state->>'metaRevision')::int,0)=$5 AND COALESCE((state->>'arenaRevision')::int,0)>=$6
    AND state #>> ARRAY['players',$2,'tokenHash']=$3 AND state #>> ARRAY['players',$2,'removed']='false'
    ON CONFLICT(code,player_id) DO UPDATE SET inputs=(
      SELECT jsonb_agg(event ORDER BY seq) FROM (
        SELECT * FROM (
          SELECT DISTINCT ON ((event->>'seq')::bigint) event,(event->>'seq')::bigint AS seq
          FROM jsonb_array_elements(quiz_rally_motion_inputs.inputs || EXCLUDED.inputs) WITH ORDINALITY AS combined(event,ordinal)
          ORDER BY (event->>'seq')::bigint,ordinal
        ) AS unique_inputs ORDER BY seq DESC LIMIT 96
      ) AS bounded_inputs),updated_at=NOW() RETURNING code)
    SELECT pg_notify('quiz_rally_'||lower(code),$4) FROM accepted`,
    [code,identity.playerId,hash(identity.token),payload,roomRevision,arenaRevision,JSON.stringify(inputs),Date.now()]);
  assert(rows.length,'경기 상태가 바뀌었습니다. 다시 연결해 주세요.',409);
}
// NOTIFY is committed with the guarded write: no extra database round trip,
// no missed publish after a successful save, and no process-local room bus.
function arenaNotice(motion=false,delta=''){
  const payload=`jsonb_build_object('type','${delta?'effects':motion?'motion':'refresh'}','code',code,
    'roomRevision',COALESCE((state->>'metaRevision')::int,0),'arenaRevision',COALESCE((state->>'arenaRevision')::int,0),
    'status',state->>'status'${motion||delta?`, 'id',$2::text,'version',(state #>> ARRAY['players',$2,'version'])::int,
    'runner',(state #> ARRAY['players',$2,'runner']) - ARRAY['boxes','boxReadyAt','questionBox','history']::text[]`:''}${delta?`, 'delta',${delta}`:''})::text`;
  return `CASE WHEN state ? 'arena' THEN pg_notify('quiz_rally_' || lower(code),
    CASE WHEN octet_length(${payload})<7900 THEN ${payload} ELSE '{"type":"refresh"}' END) END AS realtime_notice`;
}
export async function createQuizRoom(body:Record<string,unknown>){
  const duration=Number(body.durationSeconds??900);assert([300,480,600,900].includes(duration),'게임 시간을 다시 선택해 주세요.');
  const title=textValue(body.title,40,'우리 반 퀴즈')||'우리 반 퀴즈';
  const teacherKey=randomBytes(32).toString('base64url');
  const custom=body.questions!==undefined?validateQuestions(body.questions):null;
  const state:Room={title,durationSeconds:duration,extension:body.extension===true,stealEnabled:body.stealEnabled===true,status:'lobby',endsAt:null,remainingMs:duration*1000,metaRevision:0,requests:[],players:{}};
  if(custom){state.questionIds=Object.keys(custom.bank);state.questionSetTitle=textValue(body.questionSetTitle,80,'직접 넣은 문제');state.extension=false;}
  state.raceGoal=state.questionIds?.length||QUIZ_QUESTIONS.filter(q=>state.extension||!q.extension).length;state.finishers=[];state.arena={version:2,length:raceLength(duration),seed:randomInt(100000),combat:body.stealEnabled!==false,energy:true,supplies:2,course:4};state.arenaEffects=[];state.arenaRevision=0;
  state.realtime=newQuizRealtimeRoute();
  for(let i=0;i<6;i++){
    const code=Array.from({length:6},()=>codeChars[randomInt(codeChars.length)]).join('');
    const rows=await query('INSERT INTO quiz_rally_sessions(code,teacher_key_hash,state,expires_at,question_bank,question_images) VALUES($1,$2,$3::jsonb,NOW()+INTERVAL \'14 days\',$4::jsonb,$5::jsonb) ON CONFLICT(code) DO NOTHING RETURNING code,expires_at',[code,hash(teacherKey),JSON.stringify(state),custom?JSON.stringify(custom.bank):null,custom?JSON.stringify(custom.images):null]);
    if(rows.length){
      if(state.realtime)await initializeQuizRealtime({code,teacher_key_hash:hash(teacherKey),state,expires_at:String(rows[0].expires_at),question_bank:custom?.bank||null,revision:0,savedAt:Date.now()});
      return {code,teacherKey,title};
    }
  }
  throw new QuizError('게임방을 만들지 못했습니다. 다시 시도해 주세요.',503);
}

export async function joinQuizRoom(code:string,identity:QuizIdentity,body:Record<string,unknown>){
  const routed=await routeQuizRealtime(code,identity,{...body,action:'join'});if(routed.handled)return routed.data;
  code=codeValue(code);assert(uuid(identity.playerId)&&validToken(identity.token),'참여 정보를 다시 만들어 주세요.');
  const nickname=textValue(body.nickname,12);assert(nickname.length>0&&/^[\p{L}\p{N} _-]+$/u.test(nickname),'닉네임은 글자와 숫자로 1~12자 입력해 주세요.');
  const row=await readRoom(code,[identity.playerId]),existing=row.state.players[identity.playerId];
  if(existing){authenticate(row,identity,existing);return getQuizSnapshot(code,identity);}
  assert(body.avatar===undefined||(Number.isInteger(body.avatar)&&Number(body.avatar)>=0&&Number(body.avatar)<6),'캐릭터를 다시 선택해 주세요.');
  assert(phase(row.state)!=='ended','이미 끝난 게임입니다. 다음 게임에 참여해 주세요.',409);
  const deck=deckFor(row.state),p:Player={id:identity.playerId,nickname,avatar:body.avatar===undefined?avatarFor({id:identity.playerId}):Number(body.avatar),tokenHash:hash(identity.token),version:0,removed:false,score:0,correct:0,attempted:0,inventory:{boost:0,hint:1,shield:0,steal:0},boostActive:false,shieldActive:false,protectedUntil:0,deck,turn:turnFor(deck.shift()!),requests:[],stats:{},notice:'',noticeId:''};
  if(row.state.arena){p.runner=withHistory(freshRunner(gameClock(row.state),parseInt(hash(p.id).slice(0,4),16)%40));p.gear=[];}
  if(row.state.course)p.racer=freshRacer(gameClock(row.state));
  p.robot=body.robot===undefined?robotFor(undefined,p.avatar):validateRobot(body.robot);
  const rows=await query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],$3::jsonb,true)
    WHERE code=$1 AND expires_at>NOW() AND state->>'status'<>'ended'
    AND (state->>'status'<>'running' OR (state->>'endsAt')::bigint>(EXTRACT(EPOCH FROM clock_timestamp())*1000)::bigint)
    AND NOT (state->'players' ? $2)
    AND (SELECT COUNT(*) FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean)<40
    AND (SELECT COUNT(*) FROM jsonb_each(state->'players'))<80
    AND NOT EXISTS(SELECT 1 FROM jsonb_each(state->'players') WHERE lower(value->>'nickname')=lower($4) AND NOT (value->>'removed')::boolean)
    RETURNING code,${arenaNotice()}`,[code,p.id,JSON.stringify(p),nickname]);
  if(!rows.length){const latest=await readRoom(code);if(latest.state.players[p.id]){authenticate(latest,identity,latest.state.players[p.id]);return getQuizSnapshot(code,identity);}assert(phase(latest.state)!=='ended','이미 끝난 게임입니다.',409);assert(!Object.values(latest.state.players).some(x=>!x.removed&&x.nickname.toLocaleLowerCase()===nickname.toLocaleLowerCase()),'이미 사용 중인 닉네임입니다. 번호를 붙여 주세요.',409);throw new QuizError('참여 인원이 찼습니다. 한 게임에는 최대 40명이 참여할 수 있습니다.',409);}
  return getQuizSnapshot(code,identity);
}

// Polls return a compact scoreboard and the requesting player's data only.
export async function getQuizSnapshot(code:string,identity:QuizIdentity){
  const routed=await routeQuizRealtime(code,identity);if(routed.handled)return routed.data;
  code=codeValue(code);
  if(identity.role==='public'){
    const rows=await query(`SELECT state->>'title' AS title,state->>'status' AS status,state->>'endsAt' AS "endsAt",state->'realtime' AS realtime,
      (SELECT COUNT(*)::int FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean) AS count
      FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code]);
    assert(rows.length,'게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);
    const r=rows[0];requireLegacyRoom(r);return {code,title:r.title,status:phase({status:r.status,endsAt:r.endsAt===null?null:Number(r.endsAt)}),count:r.count};
  }
  const rows=await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']);
  assert(rows.length,'게임방을 찾을 수 없거나 이용 기간이 끝났습니다.',404);
  let row=rows[0];requireLegacyRoom(row.room);authenticate(row as Row,identity,row.player);
  // HTTP-only clients still settle combat after a lost stream. This uses the
  // same guarded commit; competing readers cannot choose a second victim.
  if(row.room.arena&&Date.now()-(row.room.arenaFrameWall||0)>2000&&(row.room.arenaEffects||[]).some((e:Effect)=>e.shared&&!e.victim&&e.born+2500<gameClock(row.room))){
    await new QuizWorldFeed(code,async(statement,params)=>({rows:await query(statement,params)})).publish();
    row=(await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']))[0];
  }
  if(row.room.course&&(row.ranking as Array<{racer?:Racer;finish?:Finish}>).some(p=>p.racer&&!p.finish&&advance(p.racer,gameClock(row.room),row.room.course).finishAt!==undefined)){
    await settleCourse(code);row=(await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']))[0];
  }
  if(row.room.arena&&!row.room.arenaFinalized&&(row.ranking as Array<{runner?:Runner;finish?:Finish;id:string}>).some(p=>p.runner&&!p.finish&&(p.runner.finishAt!==undefined||phase(row.room)==='ended'))){
    await settleArena(code);row=(await query(`SELECT ${snapshotColumns} FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[code,identity.playerId||'']))[0];
  }
  return snapshotFromRow(row,identity);
}

// Used by SELECT and UPDATE RETURNING: return the newly committed snapshot in the same round trip.
const snapshotColumns=`code,teacher_key_hash,state-'players' AS room,
  state #> ARRAY['players',$2] AS player,
  question_bank -> (state #>> ARRAY['players',$2,'turn','id']) AS custom_question,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',key,'version',value->'version','nickname',value->'nickname','avatar',value->'avatar','robot',value->'robot','finish',value->'finish','racer',value->'racer','runner',(value->'runner')-'history','score',value->'score','correct',value->'correct','attempted',value->'attempted','shield',value->'shieldActive','protectedUntil',value->'protectedUntil',
    'activity',CASE WHEN value #>> '{turn,correct}'='true' THEN CASE WHEN value #>> '{turn,reward}' IS NULL THEN 'reward' ELSE 'ready' END WHEN value #>> '{turn,revealed}'='true' THEN 'review' ELSE 'solving' END)),'[]'::jsonb)
   FROM jsonb_each(state->'players') WHERE NOT (value->>'removed')::boolean) AS ranking`;
async function snapshotFromRow(r:Record<string,any>,identity:QuizIdentity){
  const code=r.code as string,room=r.room as Room,p=r.player as Player|undefined;authenticate(r as Row,identity,p);
  if(identity.role==='student'){
    const key=code+':'+identity.playerId;answerSnapshots.delete(key);
    if(room.arena&&p?.runner?.open&&phase(room)==='running'){
      answerSnapshots.set(key,{at:Date.now(),row:structuredClone({code,teacher_key_hash:r.teacher_key_hash,expires_at:r.expires_at,state:{...room,players:{[p.id]:p}},custom_question:r.custom_question})});
      if(answerSnapshots.size>256)answerSnapshots.delete(answerSnapshots.keys().next().value!);
    }
  }
  const now=Date.now(),ranking=(r.ranking as Array<{id:string;nickname:string;avatar?:number;robot?:RobotParts;activity:string;racer?:Racer;runner?:Runner;finish?:Finish;score:number;correct:number;attempted:number;shield:boolean;protectedUntil:number}>).map(p=>({...p,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p))})).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.nickname.localeCompare(b.nickname,'ko'));
  if(room.arena){const positions=new Map(ranking.map(p=>[p.id,phase(room,now)==='ended'?p.runner!.y:advanceRunner(p.runner!,gameClock(room,now),room.arena!,room.arenaEffects||[],p.id).y]));ranking.sort((a,b)=>{if(a.finish||b.finish)return(a.finish?.place||999)-(b.finish?.place||999);return positions.get(b.id)!-positions.get(a.id)!||a.id.localeCompare(b.id);});}
  const review=[];if(identity.role==='student'&&phase(room,now)==='ended'){
    const ids=Object.entries(p!.stats).filter(([,v])=>v[0]>v[1]).slice(0,6).map(([id])=>id);
    const custom=room.questionIds&&ids.length?await query(`SELECT value AS q FROM quiz_rally_sessions,jsonb_each(question_bank) WHERE code=$1 AND key=ANY($2::text[])`,[code,ids]):[];
    for(const id of ids){const q=QUESTION_MAP.get(id)||custom.find(x=>x.q.id===id)?.q;if(q)review.push({prompt:q.prompt,answer:q.options[q.answer],explanation:q.explanation});}
  }
  return {code,roomRevision:room.metaRevision||0,arena:room.arena||null,arenaEffects:room.arenaEffects||[],arenaRevision:room.arenaRevision||0,course:room.course||null,raceClock:gameClock(room,now),raceGoal:room.raceGoal||null,finishers:room.finishers||[],finishPrizes:room.arena?[]:room.raceGoal?(room.course?[20,12,8]:[50,30,15]).map(n=>(room.course?Math.min(room.raceGoal!,Math.ceil(room.course.length/650)):room.raceGoal!)*n):[],title:room.title,status:phase(room,now),durationSeconds:room.durationSeconds,endsAt:room.endsAt,remainingMs:room.remainingMs,serverNow:now,stealEnabled:room.stealEnabled,extension:room.extension,questionCount:room.questionIds?.length||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).length,questionSetTitle:room.questionSetTitle||'중2 과학 · 물질의 구성',cityTarget:room.cityTarget||Math.max(1,ranking.length)*Math.max(3,Math.round(room.durationSeconds/80)),ranking:room.arena?ranking.map(x=>({...x,score:undefined})):ranking,player:identity.role==='student'?publicPlayer(p!,r.custom_question||QUESTION_MAP.get(p!.turn.id)!,code,review):null};
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
      WHERE code=$1 AND expires_at>NOW() AND (state->>'metaRevision')::int=$2 AND COALESCE(state->'finishers','[]'::jsonb)=$3::jsonb ${guards} RETURNING code,${arenaNotice()}`,params);
    if(result.length)return;
  }
  throw new QuizError('결승 순위를 확인 중입니다. 잠시 후 다시 연결합니다.',409);
}

async function settleArena(code:string){
  for(let attempt=0;attempt<8;attempt++){
    const row=await readRoom(code),room=row.state;if(!room.arena||room.arenaFinalized)return;
    const ended=phase(room)==='ended',now=gameClock(room);
    let effects=room.arenaEffects||[];
    const waiting=!ended&&effects.some(e=>e.shared&&!e.victim&&e.expires>(room.arenaCombatAt||0)&&e.born<=now),clock=waiting?Math.min(now,room.arenaCombatAt||0):now;
    const journals=await query('SELECT player_id,inputs FROM quiz_rally_motion_inputs WHERE code=$1',[code]);
    for(const journal of journals){const p=room.players[journal.player_id];if(p?.runner&&!p.removed&&!p.finish)p.runner=acceptedRunner(p.runner,journal.inputs,now,room.arena,effects,p.id);}
    if(ended)effects=resolveCombat(Object.values(room.players).filter(p=>p.runner) as (Player&{runner:Runner})[],now,room.arena,effects).effects;
    // Never award a finish from extrapolated held input: an unseen release may
    // still be in flight. Only replay through the latest accepted control.
    const project=(p:Player)=>sampleRunner(p.runner!,Math.min(clock,p.runner!.t),room.arena!,effects,p.id);
    const projected=Object.values(room.players).filter(p=>!p.removed&&!p.finish&&p.runner).map(p=>({p,r:project(p)}));
    // Resolve a trap to one victim before deriving the final arrival order.
    const hits=projected.flatMap(({p,r})=>r.hits.filter(h=>!p.runner!.usedEffects.includes(h.id)).map(h=>({...h,id:h.id,playerId:p.id}))).sort((a,b)=>a.t-b.t||a.playerId.localeCompare(b.playerId));
    for(const hit of hits){const e=effects.find(e=>e.id===hit.id);if(e&&!e.victim){e.victim=hit.playerId;e.hitAt=hit.t;}}
    const arrivals=projected.map(({p})=>({p,r:project(p)})).filter(x=>x.r.finishAt!==undefined).sort((a,b)=>a.r.finishAt!-b.r.finishAt!||a.p.id.localeCompare(b.p.id));
    if(!arrivals.length&&!ended)return;
    // A later upload can contain an earlier crossing. Sort confirmed arrivals
    // together with existing finishers, not by HTTP response order.
    const ordered=[...Object.values(room.players).filter(p=>p.finish&&p.runner?.finishAt!==undefined).map(p=>({p,r:p.runner!})),...arrivals]
      .sort((a,b)=>a.r.finishAt!-b.r.finishAt!||a.p.id.localeCompare(b.p.id));
    const winners=ordered.map(({p})=>p.id),patch:Record<string,Player>={},params:unknown[]=[code,room.metaRevision,room.arenaRevision||0];let guards='';
    for(let i=0;i<ordered.length;i++){const {p,r}=ordered[i],place=i+1;if(p.finish?.place===place)continue;
      params.push(p.id,p.version);guards+=` AND (state #>> ARRAY['players',$${params.length-1},'version'])::int=$${params.length}`;
      p.runner={...r,open:false};p.finish={place,bonus:0};p.version++;notice(p,`결승선 ${place}등 통과!`);patch[p.id]=p;
    }
    // End results use the accepted journal, including a final release that
    // arrived before the teacher's stop. Never project an unconfirmed finish.
    if(ended)for(const {p} of projected){if(p.finish)continue;const r=runnerState(project(p));
      Object.assign(r,{dx:0,dy:0,dash:false,jumpQueuedUntil:0,inputUntil:r.t,open:false});
      params.push(p.id,p.version);guards+=` AND (state #>> ARRAY['players',$${params.length-1},'version'])::int=$${params.length}`;
      p.runner=r;p.version++;patch[p.id]=p;
    }
    params.push(JSON.stringify(patch),JSON.stringify(winners),JSON.stringify(effects));
    const rows=await query(`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(jsonb_set(state,'{players}',(state->'players') || $${params.length-2}::jsonb),'{finishers}',$${params.length-1}::jsonb),'{arenaEffects}',$${params.length}::jsonb) || jsonb_build_object('metaRevision',(state->>'metaRevision')::int+1,'arenaRevision',COALESCE((state->>'arenaRevision')::int,0)+1,'arenaFinalized',${ended?'true':'false'})
      WHERE code=$1 AND expires_at>NOW() AND (state->>'metaRevision')::int=$2 AND COALESCE((state->>'arenaRevision')::int,0)=$3 ${guards} RETURNING code,${arenaNotice()}`,params);if(rows.length)return;
  }
  throw new QuizError('도착 순서를 확인 중입니다. 잠시 뒤 다시 연결합니다.',409);
}

export async function getQuizImage(code:string,id:string){
  assert(/^[A-Za-z0-9_-]{32}$/.test(id),'그림을 찾을 수 없습니다.',404);
  const rows=await query(`SELECT question_images -> $2 AS image FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[codeValue(code),id]);
  assert(rows[0]?.image,'그림을 찾을 수 없습니다.',404);return rows[0].image as {mime:string;data:string};
}

export async function actQuizRoom(code:string,identity:QuizIdentity,body:Record<string,unknown>){
  const routed=await routeQuizRealtime(code,identity,body);if(routed.handled)return routed.data;
  code=codeValue(code);const requestId=body.requestId;assert(uuid(requestId),'요청 정보를 다시 만들어 주세요.');
  if(identity.role==='teacher')return controlRoom(code,identity,body,requestId);
  assert(uuid(identity.playerId),'참여 정보를 확인해 주세요.',403);
  for(let attempt=0;attempt<8;attempt++){
    const cached=attempt===0&&body.action==='answer'?answerSnapshots.get(code+':'+identity.playerId):undefined;
    const canUseCache=cached&&Date.now()-cached.at<90000&&cached.row.state.players[identity.playerId]?.turn.nonce===body.nonce;
    const row=canUseCache?structuredClone(cached.row):await readRoom(code,[identity.playerId,...(uuid(body.targetId)?[body.targetId]:[])]),room=row.state,p=room.players[identity.playerId];authenticate(row,identity,p);
    if(p.requests.includes(requestId))return getQuizSnapshot(code,identity);
    const customizing=body.action==='customize';
    if(customizing)assert(phase(room)!=='ended','끝난 게임에서는 로봇을 바꿀 수 없습니다.',409);
    else assert(phase(room)==='running',phase(room)==='paused'?'선생님이 게임을 잠시 멈췄습니다.':'진행 중인 게임에서 사용할 수 있습니다.',409);
    if(room.course&&p.racer&&!p.finish){p.racer=advance(p.racer,gameClock(room),room.course);if(p.racer.finishAt!==undefined){await settleCourse(code);return getQuizSnapshot(code,identity);}}
    if(room.arena&&p.runner&&!p.finish&&row.motion_inputs?.length)p.runner=acceptedRunner(p.runner,row.motion_inputs,gameClock(room),room.arena,room.arenaEffects||[],p.id);
    if(room.arena&&p.runner){if(p.finish&&body.action==='arena-input')return getQuizSnapshot(code,identity);if(!p.finish&&p.runner.finishAt!==undefined){await settleArena(code);return getQuizSnapshot(code,identity);}}
    const priorArenaEffects=JSON.stringify(room.arenaEffects||[]);
    const oldVersion=p.version,target=body.action==='item'&&body.item==='steal'?room.players[String(body.targetId)]:undefined,targetVersion=target?.version;
    if(room.course&&target?.racer&&!target.finish&&advance(target.racer,gameClock(room),room.course).finishAt!==undefined){await settleCourse(code);continue;}
    const wasFinished=!!p.finish,priorFinishers=room.finishers||[];
    modifyPlayer(room,p,body,row.custom_question||QUESTION_MAP.get(p.turn.id)!,target);
    if(room.arena&&p.runner)p.runner=trimRunnerHistory(p.runner,room.arena,room.arenaEffects||[],p.id);
    remember(p,requestId);
    const params:unknown[]=[code,p.id,JSON.stringify(p),oldVersion,room.metaRevision];
    let statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],$3::jsonb)`;
    if(target){params.push(target.id,JSON.stringify(target),targetVersion);statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,ARRAY['players',$2],$3::jsonb),ARRAY['players',$6],$7::jsonb)`;}
    const finishClaim=!wasFinished&&p.finish&&p.finish.place>0;
    if(finishClaim){params.push(JSON.stringify(room.finishers),JSON.stringify(priorFinishers));statement=`UPDATE quiz_rally_sessions SET state=jsonb_set(jsonb_set(state,ARRAY['players',$2],$3::jsonb),'{finishers}',$6::jsonb)`;}
    const arenaChanged=!!room.arena&&JSON.stringify(room.arenaEffects||[])!==priorArenaEffects;
    let arenaGuards='',effectDelta='';
    if(arenaChanged){
      // Merge only this action's additions and claims into the current row.
      // Replacing the entire effects snapshot forces unrelated students to
      // compete for a room-wide version and exhaust retries during item bursts.
      const previous=new Map((JSON.parse(priorArenaEffects) as Effect[]).map(e=>[e.id,e]));
      const added=(room.arenaEffects||[]).filter(e=>!previous.has(e.id));
      const claims=Object.fromEntries((room.arenaEffects||[])
        .filter(e=>previous.has(e.id)&&e.victim&&!previous.get(e.id)!.victim)
        .map(e=>[e.id,{victim:e.victim,hitAt:e.hitAt}]));
      params.push(JSON.stringify(added),JSON.stringify(claims),added.length?Math.min(gameClock(room)-5000,(room.arenaCombatAt??gameClock(room))-3000):-1);
      const additions=`$${params.length-2}::jsonb`,claimed=`$${params.length-1}::jsonb`,cutoff=`$${params.length}::double precision`;
      effectDelta=`jsonb_build_object('added',${additions},'claims',${claimed},'cutoff',${cutoff})`;
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
    // A newer accepted fast input can advance the room watermark while this
    // older prefix is saved. The durable queue preserves that suffix for replay.
    if(room.arena&&p.runner&&p.runner.finishAt===undefined&&!customizing&&!row.motion_inputs?.length)statement+=` AND COALESCE((state->>'arenaCombatAt')::double precision,0)<=($3::jsonb #>> '{runner,t}')::double precision`;
    const result=await query(statement+' RETURNING '+snapshotColumns+','+arenaNotice(!arenaChanged&&!finishClaim&&!customizing,!finishClaim&&!customizing?effectDelta:''),params);
    if(result.length){if(room.arena&&p.runner?.finishAt!==undefined&&!p.finish){await settleArena(code);return getQuizSnapshot(code,identity);}return snapshotFromRow(result[0],identity);}
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
    if((await query(statement+' RETURNING code,'+arenaNotice(),params)).length)return getQuizSnapshot(code,identity);
  }
  throw new QuizError('다른 요청을 처리 중입니다. 다시 시도해 주세요.',409);
}
