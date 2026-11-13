import {HEROES,RECIPIENTS,DEFAULT_ACTORS,normalizeCasting} from '../../public/labs/first-love/characters.mjs';
import {ESCAPE_SCHEMA,lessonStages} from '../../public/labs/first-love/escape-content.mjs';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {ContentError,validateLesson,STAGES} from '../../public/labs/first-love/content.mjs';
import {fresh,transition,publicState,playerContent,hintsFor,canonical} from '../../public/labs/first-love/engine.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex'),secret=()=>randomBytes(32).toString('hex');
const fail=(m,status=400)=>{throw new ContentError(m,status);},parse=v=>typeof v==='string'?JSON.parse(v):v;
const validToken=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),validCode=v=>typeof v==='string'&&/^[A-HJ-NP-Z2-9]{8}$/.test(v);
export const allowedRoles=(me,members)=>[1,2,3,4].filter(r=>r===me.role||!members.some(m=>m.role===r));
export function createService(query,{now=()=>Date.now()}={}){
 const q=(s,p=[])=>query(s,p);
 async function identify(code,token){
  if(!validCode(code)||!validToken(token))fail('입장 정보를 확인해 주세요.',401);
  const [r]=await q(`SELECT p.id,p.nickname AS name,p.role,p.team_no,p.session_id,s.code,s.title,s.status,s.revision AS session_revision,s.expires_at,t.state,t.revision FROM first_love_players p JOIN first_love_sessions s ON s.id=p.session_id JOIN first_love_teams t ON t.session_id=p.session_id AND t.team_no=p.team_no WHERE s.code=$1 AND p.token_hash=$2`,[code,hash(token)]);
  if(!r)fail('접속 정보가 없거나 선생님이 자리를 정리했습니다.',401);if(Number(r.expires_at)<=now())fail('접속 기간이 끝난 수업입니다.',410);
  r.state=parse(r.state);r.version=Number(r.session_revision)*100000000+Number(r.revision);return r;
 }
 async function assignCasting(sessionId,team,role,characterId,recipientId,playerId,membershipChanged=false){
  for(let retry=0;retry<8;retry++){
   const [row]=await q('SELECT state,revision FROM first_love_teams WHERE session_id=$1 AND team_no=$2',[sessionId,team]);
   if(!row)fail('모둠 정보를 확인해 주세요.',409);
   const state=parse(row.state),casting=normalizeCasting(state.casting),previous=JSON.stringify(casting);
   casting.actors[role-1]=characterId;
   // A shared romance recipient belongs to the story, never to a playable seat.
   // Role 1 chooses it before puzzle progress; later arrivals keep that same story.
   if(role===1&&state.stage===0&&recipientId)casting.recipient=recipientId;
   if(!membershipChanged&&state.casting&&JSON.stringify(casting)===previous)return;
   const rows=await q(`UPDATE first_love_teams SET state=$1::jsonb,revision=revision+1 WHERE session_id=$2 AND team_no=$3 AND revision=$4 AND EXISTS(SELECT 1 FROM first_love_players WHERE id=$5 AND session_id=$2 AND team_no=$3) RETURNING revision`,[JSON.stringify({...state,casting}),sessionId,team,row.revision,playerId]);
   if(rows.length)return;
  }
  fail('친구의 인물 선택을 반영 중입니다. 다시 입장해 주세요.',409);
 }
 async function lessonFor(id){const [r]=await q('SELECT lesson FROM first_love_sessions WHERE id=$1',[id]);return parse(r.lesson);}
 const membersFor=r=>q('SELECT id,nickname AS name,role FROM first_love_players WHERE session_id=$1 AND team_no=$2 ORDER BY role',[r.session_id,r.team_no]);
 async function snapshot(r,l,priorKey){
  const members=(await membersFor(r)).map(m=>({...m,characterId:normalizeCasting(r.state.casting).actors[m.role-1]})),roles=allowedRoles(r,members),lesson=l||await lessonFor(r.session_id);
  const contentKey=`v6:${r.session_id}:${r.state.stage}:${roles.join('')}:${r.state.cabinetSeen?1:0}:${(r.state.discoveries||[]).join(',')}`;
  return {group:{code:r.code,name:`${r.title} · ${r.team_no}모둠`,status:r.status,revision:r.version},me:{id:r.id,name:r.name,role:r.role,characterId:normalizeCasting(r.state.casting).actors[r.role-1]},members,allowedRoles:roles,state:publicState(r.state),hints:hintsFor(lesson,r.state),contentKey,...(priorKey===contentKey?{}:{content:playerContent(lesson,roles,r.state)})};
 }
 async function teacher(code,key){if(!validCode(code)||!validToken(key))fail('교사 접속 정보가 필요합니다.',403);const [s]=await q('SELECT * FROM first_love_sessions WHERE code=$1 AND teacher_hash=$2 AND expires_at>$3',[code,hash(key),now()]);if(!s)fail('이 수업의 교사 접속 정보를 확인해 주세요.',403);s.lesson=parse(s.lesson);return s;}
 async function teacherView(s,compact=false){const teams=await q(`SELECT t.team_no AS number,t.state,COALESCE((SELECT json_agg(json_build_object('id',p.id,'name',p.nickname,'role',p.role) ORDER BY p.role) FROM first_love_players p WHERE p.session_id=t.session_id AND p.team_no=t.team_no),'[]'::json) AS members FROM first_love_teams t WHERE t.session_id=$1 ORDER BY t.team_no`,[s.id]);return {code:s.code,title:s.title,status:s.status,...(compact?{}:{lesson:s.lesson}),teams:teams.map(t=>{const v=parse(t.state);return {number:t.number,members:parse(t.members),stage:v.stage,wrong:v.wrong,ending:v.ending,finished:v.finished,goal:(s.lesson.schema===ESCAPE_SCHEMA?lessonStages(s.lesson):STAGES)[v.stage]?.title||'벤치에서 마음을 전하기'};})};}
 return {
  async create(input){const lesson=validateLesson(input.lesson),key=secret(),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let n=0;n<5;n++){const code=Array.from(randomBytes(8),b=>alphabet[b%alphabet.length]).join('');const rows=await q('INSERT INTO first_love_sessions(id,code,title,teacher_hash,lesson,expires_at) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(code) DO NOTHING RETURNING id',[randomUUID(),code,lesson.meta.title,hash(key),JSON.stringify(lesson),now()+7*86400000]);if(rows.length)return {code,teacherKey:key};}fail('수업 코드를 만들지 못했습니다.',503);},
  async join(code,token,input){
   if(!validCode(code)||!validToken(token))fail('입장 정보를 확인해 주세요.',401);
   const team=Number(input.team),role=Number(input.role),name=String(input.name||'').trim();if(!Number.isInteger(team)||team<1||team>12||![1,2,3,4].includes(role)||!name||name.length>20)fail('1~12모둠, 자리 1~4, 이름 1~20자를 입력하세요.');
   const characterId=input.characterId??DEFAULT_ACTORS[role-1];
   if(!HEROES.some(h=>h.id===characterId&&h.roleNo===role))fail('선택한 인물과 퍼즐 역할을 확인해 주세요. 고백 상대는 퍼즐에 참여하지 않습니다.');
   if(input.recipientId!==undefined&&!RECIPIENTS.some(c=>c.id===input.recipientId))fail('고백 상대를 다시 선택해 주세요.');
   const preference=normalizeCasting(input.casting);preference.actors[role-1]=characterId;
   if(input.recipientId)preference.recipient=input.recipientId;
   const [s]=await q('SELECT id FROM first_love_sessions WHERE code=$1 AND status<>$2 AND expires_at>$3',[code,'ended',now()]);if(!s)fail('수업 코드를 확인하세요. 종료된 수업에는 새로 입장할 수 없습니다.',404);
   const prior=await q('SELECT id,session_id,team_no,role FROM first_love_players WHERE token_hash=$1',[hash(token)]);if(prior.length){if(prior[0].session_id!==s.id)fail('먼저 기존 수업에서 나와 주세요.',409);if(prior[0].team_no===team&&prior[0].role===role)await assignCasting(s.id,team,role,characterId,input.recipientId,prior[0].id);return snapshot(await identify(code,token));}
   await q('INSERT INTO first_love_teams(session_id,team_no,state) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[s.id,team,JSON.stringify({...fresh(),casting:preference})]);
   const rows=await q(`INSERT INTO first_love_players(id,session_id,team_no,role,nickname,token_hash) SELECT $1,$2,$3,$4,$5,$6 WHERE EXISTS(SELECT 1 FROM first_love_sessions s JOIN first_love_teams t ON t.session_id=s.id WHERE s.id=$2 AND t.team_no=$3 AND s.status<>'ended' AND s.expires_at>$7 AND (t.state->>'finished')::boolean=FALSE) ON CONFLICT DO NOTHING RETURNING id`,[randomUUID(),s.id,team,role,name,hash(token),now()]);
   if(!rows.length)fail('자리가 찼거나 활동이 끝났어요. 다른 자리를 선택하세요.',409);await assignCasting(s.id,team,role,characterId,input.recipientId,rows[0].id,true);return snapshot(await identify(code,token));
  },
  async state(code,token,revision,contentKey){const r=await identify(code,token);return String(r.version)===String(revision)?null:snapshot(r,null,contentKey);},
  async event(code,token,input){
   if(!input||typeof input!=='object'||Array.isArray(input))fail('동작 정보를 확인해 주세요.');
   for(let retry=0;retry<8;retry++){
    const r=await identify(code,token);if(r.status!=='playing')fail(r.status==='ended'?'수업이 종료되었습니다.':'선생님이 시작하면 진행할 수 있어요.',409);
    const l=await lessonFor(r.session_id),members=await membersFor(r),roles=allowedRoles(r,members);
    // A lost response can be replayed even after the team has moved on.
    const receipt=input.type==='submit'&&r.state.receipts.find(v=>v.id===input.attemptId);
    if(receipt)return {outcome:receipt.outcome,duplicate:true,...await snapshot(r,l,input.contentKey)};
    const next=transition(r.state,input,l,roles);
    if(canonical(next.state)===canonical(r.state))return {outcome:next.outcome,message:next.message,duplicate:!!next.duplicate,...await snapshot(r,l,input.contentKey)};
    const rows=await q(`UPDATE first_love_teams SET state=$1::jsonb,revision=revision+1 WHERE session_id=$2 AND team_no=$3 AND revision=$4 AND EXISTS(SELECT 1 FROM first_love_players WHERE id=$5 AND session_id=$2 AND team_no=$3) AND EXISTS(SELECT 1 FROM first_love_sessions WHERE id=$2 AND status='playing' AND expires_at>$6) RETURNING revision`,[JSON.stringify(next.state),r.session_id,r.team_no,r.revision,r.id,now()]);
    if(rows.length)return {outcome:next.outcome,message:next.message,duplicate:!!next.duplicate,...await snapshot(await identify(code,token),l,input.contentKey)};
   }fail('모둠원의 답안을 반영 중입니다. 잠시 뒤 다시 시도하세요.',409);
  },
  async leave(code,token){const r=await identify(code,token);await q('DELETE FROM first_love_players WHERE id=$1',[r.id]);await q('UPDATE first_love_teams SET revision=revision+1 WHERE session_id=$1 AND team_no=$2',[r.session_id,r.team_no]);return {left:true};},
  async getTeacher(code,key,compact=false){return teacherView(await teacher(code,key),compact);},
  async teacherAction(code,key,input){const s=await teacher(code,key);if(input.action==='start'){if(s.status==='ended')fail('새 수업을 만들어 주세요.',409);await q("UPDATE first_love_sessions SET status='playing',revision=revision+1 WHERE id=$1 AND status='waiting'",[s.id]);}else if(input.action==='end')await q("UPDATE first_love_sessions SET status='ended',revision=revision+1 WHERE id=$1 AND status<>'ended'",[s.id]);else if(input.action==='remove'){const rows=await q('DELETE FROM first_love_players WHERE session_id=$1 AND id=$2 RETURNING team_no',[s.id,String(input.playerId||'')]);if(rows.length)await q('UPDATE first_love_teams SET revision=revision+1 WHERE session_id=$1 AND team_no=$2',[s.id,rows[0].team_no]);}else fail('교사 명령을 확인해 주세요.');return teacherView(await teacher(code,key));},
 };
}
