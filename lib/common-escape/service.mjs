import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {ContentError,validateLesson,playerContent,unlockedPuzzles,exitCode} from '../../public/labs/common-escape/content.mjs';
import {fresh,restore,act,CARDS,PHOTOS,LIBRARY_BOOKS,ROOM_FOR,goal,progress,forcePuzzle} from '../../public/labs/common-escape/engine.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex'),secret=()=>randomBytes(32).toString('hex');
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',DAY=86400000;
const fail=(m,s=400)=>{throw new ContentError(m,s);};
export const allowedRoles=(me,members)=>[1,2,3,4].filter(r=>r===me.role||!members.some(m=>m.role===r));
const name=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>20)fail('이름은 1~20자로 입력해 주세요.');return v.trim();};
const parse=v=>typeof v==='string'?JSON.parse(v):v;
function evidence(lesson,s,role){
 const card=CARDS[role-1],photo=PHOTOS[role-1],d=lesson.devices,e={role,card,cardFound:s.cards.includes(card)};
 if(s.flags.includes('power')){if(photo)e.photo={id:photo,found:s.photos.includes(photo),digit:s.photos.includes(photo)?d.photoDigits[photo]:null};if(role===4)e.photoOrder=d.photoOrder;}
 if(role===1&&s.flags.includes('locker-open'))e.key=d.key;
 if(role===2&&s.flags.includes('script'))e.grid=d.grid.map((symbol,i)=>({symbol,start:i===d.start,skip:i===d.skip}));
 if(role===3&&s.flags.includes('order'))e.route={exitSide:'bottom',steps:d.route};
 if(role===4&&s.flags.includes('order'))e.rule='시작 칸은 적지 않는다. 화살표마다 한 칸씩 이동한다. 도착한 칸만 순서대로 기록하고, 줄이 그어진 칸은 지나가되 적지 않는다.';
 return e;
}
export function createService(query,{now=()=>Date.now()}={}){
 const q=(sql,params=[])=>query(sql,params);
 async function identify(code,token){
   if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)||! /^[a-f0-9]{64}$/.test(token))fail('입장 정보를 확인해 주세요.',401);
   const [r]=await q(`SELECT p.id,p.nickname AS name,p.role,p.team_no,p.session_id,s.code,s.title,s.status,s.revision AS session_revision,s.expires_at,t.state,t.revision FROM school_escape_players p JOIN school_escape_sessions s ON s.id=p.session_id JOIN school_escape_teams t ON t.session_id=p.session_id AND t.team_no=p.team_no WHERE s.code=$1 AND p.token_hash=$2`,[code,hash(token)]);
   if(!r)fail('접속 정보가 없거나 선생님이 자리를 정리했습니다.',401);
   if(Number(r.expires_at)<=now())fail('접속 기간이 끝난 수업입니다.',410);
   r.state=restore(parse(r.state));r.version=Number(r.session_revision)*100000000+Number(r.revision);return r;
 }
 async function lessonFor(id){const [r]=await q('SELECT lesson FROM school_escape_sessions WHERE id=$1',[id]);return validateLesson(parse(r.lesson));}
 async function membersFor(r){return q('SELECT id,nickname AS name,role FROM school_escape_players WHERE session_id=$1 AND team_no=$2 ORDER BY role',[r.session_id,r.team_no]);}
 async function snapshot(r,lesson){
   const members=await membersFor(r),roles=allowedRoles(r,members),s={...r.state,started:r.status!=='waiting'};
   const l=lesson||await lessonFor(r.session_id);
   return {group:{id:r.session_id+':'+r.team_no,code:r.code,name:`${r.title} · ${r.team_no}모둠`,status:r.status==='ended'?'ended':s.finished?'finished':r.status,revision:r.version},me:{id:r.id,name:r.name,role:r.role},members,allowedRoles:roles,state:s,content:playerContent(l,roles,s),evidence:roles.map(role=>evidence(l,s,role))};
 }
 async function teacher(code,key){if(!/^[a-f0-9]{64}$/.test(key))fail('교사 접속 정보가 필요합니다.',403);const [s]=await q('SELECT * FROM school_escape_sessions WHERE code=$1 AND teacher_hash=$2 AND expires_at>$3',[code,hash(key),now()]);if(!s)fail('이 수업의 교사 접속 정보를 확인해 주세요.',403);s.lesson=validateLesson(parse(s.lesson));return s;}
 async function teacherView(s,compact=false){const teams=await q(`SELECT t.team_no AS number,t.state,t.revision,COALESCE((SELECT json_agg(json_build_object('id',p.id,'name',p.nickname,'role',p.role) ORDER BY p.role) FROM school_escape_players p WHERE p.session_id=t.session_id AND p.team_no=t.team_no),'[]'::json) AS members FROM school_escape_teams t WHERE t.session_id=$1 ORDER BY t.team_no`,[s.id]);return {code:s.code,title:s.title,status:s.status,...(compact?{}:{lesson:s.lesson}),teams:teams.map(t=>({...t,state:restore(parse(t.state)),progress:progress(restore(parse(t.state))),goal:goal(restore(parse(t.state)))}))};}
 return {
  async create(input){const lesson=validateLesson(input.lesson),key=secret();for(let attempt=0;attempt<5;attempt++){
    const code=Array.from(randomBytes(8),b=>alphabet[b%alphabet.length]).join('');
    const rows=await q('INSERT INTO school_escape_sessions(id,code,title,teacher_hash,lesson,expires_at) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(code) DO NOTHING RETURNING id',[randomUUID(),code,lesson.meta.title,hash(key),JSON.stringify(lesson),now()+7*DAY]);
    if(rows.length)return {code,teacherKey:key};
   }fail('수업 코드를 만들지 못했습니다. 다시 시도해 주세요.',503);},
  async join(code,token,input){
   if(!/^[a-f0-9]{64}$/.test(token))fail('입장 정보를 확인해 주세요.',401);
   const team=Number(input.team),role=Number(input.role),nickname=name(input.name);
   if(!Number.isInteger(team)||team<1||team>12||![1,2,3,4].includes(role))fail('1~12모둠과 1~4번 자리를 선택해 주세요.');
   const [s]=await q('SELECT id FROM school_escape_sessions WHERE code=$1 AND status<>$2 AND expires_at>$3',[code,'ended',now()]);if(!s)fail('수업 코드를 확인해 주세요. 종료된 수업에는 입장할 수 없습니다.',404);
   const prior=await q('SELECT id,session_id FROM school_escape_players WHERE token_hash=$1',[hash(token)]);
   if(prior.length){if(prior[0].session_id!==s.id)fail('기존 수업에서 나온 뒤 입장해 주세요.',409);return snapshot(await identify(code,token));}
   await q('INSERT INTO school_escape_teams(session_id,team_no,state) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[s.id,team,JSON.stringify(fresh())]);
   const rows=await q(`INSERT INTO school_escape_players(id,session_id,team_no,role,nickname,token_hash) SELECT $1,$2,$3,$4,$5,$6 WHERE EXISTS(SELECT 1 FROM school_escape_sessions s JOIN school_escape_teams t ON t.session_id=s.id WHERE s.id=$2 AND t.team_no=$3 AND s.status<>'ended' AND s.expires_at>$7 AND (t.state->>'finished')::boolean=FALSE) ON CONFLICT DO NOTHING RETURNING id`,[randomUUID(),s.id,team,role,nickname,hash(token),now()]);
   if(!rows.length)fail('선택한 자리가 찼거나 모둠 활동이 끝났어요. 모둠과 자리를 확인해 주세요.',409);
   await q('UPDATE school_escape_teams SET revision=revision+1 WHERE session_id=$1 AND team_no=$2',[s.id,team]);
   return snapshot(await identify(code,token));
  },
  async state(code,token,revision){const r=await identify(code,token);return String(r.version)===String(revision)?null:snapshot(r);},
  async event(code,token,input){
   const type=input?.type;if(![...Object.keys(ROOM_FOR),'photo','hint'].includes(type))fail('지원하지 않는 동작입니다.');
   for(let retry=0;retry<6;retry++){
     const r=await identify(code,token);if(r.status!=='playing')fail(r.status==='ended'?'수업이 종료되었습니다.':'선생님이 수업을 시작하면 진행할 수 있어요.',409);
     const lesson=await lessonFor(r.session_id),members=await membersFor(r),roles=allowedRoles(r,members);
     const owner=type==='collect'?CARDS.indexOf(input.id)+1:type==='photo'?PHOTOS.indexOf(input.id)+1:0;
     if(owner&&!roles.includes(owner))fail('담당 모둠원이 확인하는 단서입니다.',403);
     const room=type==='photo'?({chair:'classroom',book:'library',notice:'entrance'})[input.id]:type==='hint'?input.room:ROOM_FOR[type];
     if(!room||input.room!==room)fail('해당 장소에서 기록을 확인해 주세요.');
     if(type==='hint'&&!unlockedPuzzles(r.state).includes(input.id))fail('아직 찾지 못한 기록입니다.',409);
     const already=type==='collect'?r.state.cards.includes(input.id):type==='library-book'?r.state.libraryBooks.includes(input.id):type==='photo'?r.state.photos.includes(input.id):type==='exit'?r.state.finished:r.state.flags.includes(({compare:'compared',unlock:'unlocked'})[type]||type);
     if(already)return {accepted:true,...await snapshot(r,lesson)};
     if(r.state.finished)fail('탈출을 완료한 모둠입니다.',409);
     const result=act({...r.state,room},{type,id:input.id,code:input.code,answer:input.answer},lesson);
     if(!result.accepted)return {accepted:false,...await snapshot(r,lesson)};
     result.state.room='classroom';if(type!=='hint')result.state.lastProgressAt=now();
     if(type!=='hint')result.state.journal.push({id:type+':'+(input.id||''),title:goal(result.state).title,text:r.name+' · '+({collect:'수업 기록을 챙겼다.',locker:'사물함의 잠금을 풀었다.','locker-open':'사물함을 열어 안에 있던 봉투를 확인했다.','locker-records':'사물함의 봉투에서 반납 확인표와 기호표를 챙겼다.','library-book':`${LIBRARY_BOOKS[input.id]?.where||'도서관'}에서 반납 도서를 챙겼다.`,photo:'사진과 달라진 흔적을 찾았다.',transcript:'녹음 내용을 확인했다.',exit:'모두 학교 밖으로 나왔다.'}[type]||'기록을 해석해 장치를 해결했다.')});
     const rows=await q(`UPDATE school_escape_teams SET state=$1::jsonb,revision=revision+1 WHERE session_id=$2 AND team_no=$3 AND revision=$4 AND EXISTS(SELECT 1 FROM school_escape_players WHERE id=$5 AND session_id=$2 AND team_no=$3) AND EXISTS(SELECT 1 FROM school_escape_sessions WHERE id=$2 AND status='playing' AND expires_at>$6) RETURNING revision`,[JSON.stringify(result.state),r.session_id,r.team_no,r.revision,r.id,now()]);
     if(rows.length)return {accepted:true,...await snapshot(await identify(code,token),lesson)};
   }fail('모둠원의 진행을 반영 중입니다. 한 번 더 눌러 주세요.',409);
  },
  async leave(code,token){const r=await identify(code,token);await q('DELETE FROM school_escape_players WHERE id=$1',[r.id]);await q('UPDATE school_escape_teams SET revision=revision+1 WHERE session_id=$1 AND team_no=$2',[r.session_id,r.team_no]);return {left:true};},
  async getTeacher(code,key,compact=false){return teacherView(await teacher(code,key),compact);},
  async progress(code,token){const r=await identify(code,token);const teams=await q('SELECT team_no,state FROM school_escape_teams WHERE session_id=$1 ORDER BY team_no',[r.session_id]);return {status:r.status,teams:teams.map(t=>{const s=restore(parse(t.state));return {number:t.team_no,...progress(s),goal:goal(s)};})};},
  async teacherAction(code,key,input){
   const s=await teacher(code,key);
   if(input.action==='force'){
     if(s.status!=='playing')fail('진행 중인 수업에서만 통과시킬 수 있습니다.',409);
     const team=Number(input.team);
     if(!Number.isInteger(team)||team<1||team>12)fail('모둠을 확인해 주세요.');
     const [t]=await q('SELECT state,revision FROM school_escape_teams WHERE session_id=$1 AND team_no=$2',[s.id,team]);
     if(!t)fail('해당 모둠이 없습니다.',404);
     if(Number(input.revision)!==Number(t.revision))fail('모둠 진행이 바뀌었습니다. 현황을 확인하고 다시 시도해 주세요.',409);
     let next;try{next=forcePuzzle(restore(parse(t.state)),input.puzzle);}catch(e){fail(e.message,409);}
     next.lastProgressAt=now();next.journal.push({id:'teacher-force:'+input.puzzle,title:'교사 도움 · '+input.puzzle,text:'진행 오류로 선생님이 이 퍼즐을 통과 처리했습니다.'});
     const rows=await q("UPDATE school_escape_teams SET state=$1::jsonb,revision=revision+1 WHERE session_id=$2 AND team_no=$3 AND revision=$4 AND EXISTS(SELECT 1 FROM school_escape_sessions WHERE id=$2 AND status='playing' AND expires_at>$5) RETURNING revision",[JSON.stringify(next),s.id,team,t.revision,now()]);
     if(!rows.length)fail('모둠 진행이 바뀌었습니다. 다시 확인해 주세요.',409);
   }
   else if(input.action==='start'){if(s.status==='ended')fail('종료된 수업입니다. 새 수업을 만들어 주세요.',409);await q("UPDATE school_escape_sessions SET status='playing',revision=revision+1 WHERE id=$1 AND status='waiting'",[s.id]);}
   else if(input.action==='end')await q("UPDATE school_escape_sessions SET status='ended',revision=revision+1 WHERE id=$1 AND status<>'ended'",[s.id]);
   else if(input.action==='remove'){
     const rows=await q('DELETE FROM school_escape_players WHERE session_id=$1 AND id=$2 RETURNING team_no',[s.id,String(input.playerId||'')]);
     if(rows.length)await q('UPDATE school_escape_teams SET revision=revision+1 WHERE session_id=$1 AND team_no=$2',[s.id,rows[0].team_no]);
   }else fail('교사 명령을 확인해 주세요.');
   return teacherView(await teacher(code,key));
  },
 };
}
