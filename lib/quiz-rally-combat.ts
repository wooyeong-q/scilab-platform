import { sampleRunner,isDashing,type Arena,type Runner,type Effect } from './quiz-rally-arena';
import { gameClock } from './quiz-rally-course';

type Participant={id:string;runner:Runner;removed?:boolean;finish?:unknown};
type Query=(statement:string,params?:unknown[])=>Promise<{rows:Record<string,any>[]} >;
const round=(n:number)=>Math.round(n*100)/100;

// Test all players against the same accepted input history. A speculative
// contact is a probe, never damage. Resolve the earliest contact, then recompute
// that victim's later path because knockback can change subsequent collisions.
export function resolveCombat(players:Participant[],clock:number,arena:Arena,source:Effect[]){
 const effects=source.map(e=>({...e})),pending=new Set(effects.filter(e=>e.shared&&!e.victim&&e.type!=='field'&&e.born<=clock).map(e=>e.id));
 if(!pending.size)return {effects,claims:{} as Record<string,{victim:string;hitAt:number}>};
 const candidates=new Map<string,{id:string;t:number}[]>();
 const probe=(p:Participant)=>sampleRunner(p.runner,clock,arena,effects.map(e=>pending.has(e.id)?{...e,probe:true}:e),p.id).hits.filter(h=>pending.has(h.id));
 for(const p of players)if(!p.removed&&!p.finish)candidates.set(p.id,probe(p));
 const claims:Record<string,{victim:string;hitAt:number}>={};
 while(pending.size){
  let first:{id:string;t:number;victim:string}|undefined;
  for(const [victim,hits]of candidates)for(const hit of hits){if(!pending.has(hit.id))continue;
   if(!first||hit.t<first.t||hit.t===first.t&&(hit.id<first.id||hit.id===first.id&&victim<first.victim))first={...hit,victim};
  }
  if(!first)break;
  const e=effects.find(e=>e.id===first!.id)!;e.victim=first.victim;e.hitAt=first.t;
  claims[e.id]={victim:e.victim,hitAt:e.hitAt};pending.delete(e.id);
  candidates.set(first.victim,probe(players.find(p=>p.id===first!.victim)!));
 }
 return {effects,claims};
}

export function runnerPose(r:Runner,arena:Arena,previous?:Runner){
 const t=r.t,dt=previous?(t-previous.t)/1000:0;
 const velocity=(key:'x'|'y')=>dt>0&&dt<=1?round(Math.max(-800,Math.min(800,(r[key]-previous![key])/dt))):0;
 const flags=(isDashing(r,arena,t)?1:0)|(r.open?2:0)|(r.fallUntil?4:0)|(t<r.stunUntil?8:0)|(t<r.boostUntil?16:0)|(t<r.shieldUntil?32:0)|(r.finishAt!==undefined?64:0);
 return [round(t),round(r.x),round(r.y),round(r.z),velocity('x'),velocity('y'),round(r.vz),round(r.fx),round(r.fy),flags,r.seq,r.falls,round(r.jumpAt)];
}

// Exactly one authenticated stream holds the session advisory lock. Its lease
// ends with the DB connection, including stream rotation and worker failure.
// This replaces one independent physics publisher per student with one room
// publisher and an atomic effects + common-time pose notification.
export class QuizWorldFeed{
 leader=false;nextElection=0;previous=new Map<string,Runner>();lastFrame=-1;revision=-1;effectRevision=-1;
 constructor(readonly code:string,readonly query:Query){}
 async tick(){
  if(!this.leader){if(Date.now()<this.nextElection)return;this.nextElection=Date.now()+1000+Math.random()*500;
   this.leader=!!(await this.query('SELECT pg_try_advisory_lock(70591,hashtext($1)) AS leader',[this.code])).rows[0]?.leader;
   if(!this.leader)return;
  }
  return this.publish();
 }
 async publish(){
  const row=(await this.query(`SELECT state-'players' AS room,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',key,'runner',value->'runner','removed',value->'removed','finish',value->'finish')),'[]'::jsonb) FROM jsonb_each(state->'players')) AS players
    FROM quiz_rally_sessions WHERE code=$1 AND expires_at>NOW()`,[this.code])).rows[0];
  if(!row||row.room.status!=='running'||!row.room.arena)return;
  const room=row.room,arena=room.arena as Arena,now=gameClock(room),players=(row.players as Participant[]).filter(p=>p.runner&&!p.removed),active=players.filter(p=>!p.finish);
  if(!active.length)return;
  // Every normal input advertises an ordered watermark, including idle input.
  // A disconnected player cannot stall the class indefinitely. Its old input
  // expires after 2.2 s; reconnects beyond 6 s already reset local prediction.
  const at=Math.max(room.arenaCombatAt||0,Math.min(now,...active.map(p=>Math.max(p.runner.t,now-(p.runner.open||p.runner.finishAt!==undefined?1500:6000)))));
  if(this.revision!==room.metaRevision){this.revision=room.metaRevision;this.previous.clear();this.lastFrame=-1;}
  if(at<=this.lastFrame)return;
  const {effects,claims}=resolveCombat(players,at,arena,room.arenaEffects||[]),changed=Object.keys(claims).length>0;
  const arenaRevision=(room.arenaRevision||0)+(changed?1:0),messages:unknown[]=[];
  if(changed)messages.push({type:'effects',code:this.code,roomRevision:room.metaRevision,arenaRevision,status:room.status,delta:{added:[],claims,cutoff:-1}});
  // Supply short, timestamped segments even when input uploads arrive in a
  // batch. All characters and all missiles therefore share the same timeline.
  const first=this.lastFrame<0?at:Math.max(this.lastFrame+100,at-3000),times:number[]=[];
  for(let t=first;t<at;t+=100)times.push(t);times.push(at);
  // Item/trap changes can revise a previously projected path. Reconstruct
  // from accepted history before reusing incremental samples for this batch.
  const previous=new Map(this.effectRevision===(room.arenaRevision||0)?this.previous:[]);
  for(const t of times){
   const poses=players.map(p=>{const prior=previous.get(p.id),r=sampleRunner(p.runner,t,arena,effects,p.id,prior),pose=runnerPose(r,arena,prior);previous.set(p.id,r);return {id:p.id,pose};});
   for(let i=0;i<poses.length;i+=20)messages.push({type:'world',code:this.code,roomRevision:room.metaRevision,arenaRevision,at:t,through:at,players:poses.slice(i,i+20)});
  }
  const payloads=messages.map(message=>JSON.stringify(message)).map(message=>Buffer.byteLength(message)<7900?message:JSON.stringify({type:'refresh'}));
  const saved=await this.query(`WITH committed AS (
    UPDATE quiz_rally_sessions SET state=state || jsonb_build_object('arenaCombatAt',$4::double precision,'arenaFrameWall',$8::double precision,'arenaFrameVersion',$9::int+1)
      || CASE WHEN $5::boolean THEN jsonb_build_object('arenaEffects',$6::jsonb,'arenaRevision',$3::int+1) ELSE '{}'::jsonb END
    WHERE code=$1 AND expires_at>NOW() AND state->>'status'='running'
      AND (state->>'metaRevision')::int=$2 AND COALESCE((state->>'arenaRevision')::int,0)=$3
      AND COALESCE((state->>'arenaCombatAt')::double precision,0)<=$4
      AND COALESCE((state->>'arenaFrameVersion')::int,0)=$9
    RETURNING code)
    SELECT pg_notify('quiz_rally_'||lower(code),payload) FROM committed CROSS JOIN jsonb_array_elements_text($7::jsonb) AS message(payload)`,
    [this.code,room.metaRevision,room.arenaRevision||0,at,changed,JSON.stringify(effects),JSON.stringify(payloads),Date.now(),room.arenaFrameVersion||0]);
  if(saved.rows.length){this.lastFrame=at;this.previous=previous;this.effectRevision=arenaRevision;}
 }
}
