const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const {harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const publicIdentity={role:'public',token:'',playerId:''};
const student=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
const action=(a,extra={})=>({action:a,requestId:randomUUID(),...extra});
async function setup(t,opts={}){const h=await harness();t.after(()=>h.close());const game=h.load('lib/quiz-rally.ts');const made=await game.createQuizRoom({title:'테스트 반',durationSeconds:300,stealEnabled:true,...opts});const teacher={role:'teacher',token:made.teacherKey,playerId:''};const s=student();await game.joinQuizRoom(made.code,s,{nickname:'첫학생'});return {h,game,code:made.code,teacher,s};}
async function internal(h,code){return (await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;}
async function setPlayer(h,code,id,patch){await h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1`,[code,id,JSON.stringify(patch)]);}
async function correct(h,game,code,s){const state=await internal(h,code),p=state.players[s.playerId],q=h.load('lib/quiz-rally-questions.ts').QUESTION_MAP.get(p.turn.id);return action('answer',{nonce:p.turn.nonce,choice:p.turn.order.indexOf(q.answer)});}

test('24 core questions, four optional questions and one unambiguous key per question',()=>{const ts=require('typescript'),fs=require('fs');const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/quiz-rally-questions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);const qs=mod.exports.QUIZ_QUESTIONS;assert.equal(qs.filter(q=>!q.extension).length,24);assert.equal(qs.filter(q=>q.extension).length,4);assert.equal(new Set(qs.map(q=>q.id)).size,28);for(const q of qs){assert.equal(new Set(q.options).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>20);}});

test('real PostgreSQL: 30 simultaneous joins and answers preserve every score',async t=>{
 const {h,game,code,teacher,s}=await setup(t);const peers=Array.from({length:29},student);
 await Promise.all(peers.map((p,i)=>game.joinQuizRoom(code,p,{nickname:'학생'+(i+2)})));
 let snap=await game.getQuizSnapshot(code,teacher);assert.equal(snap.ranking.length,30);
 await game.actQuizRoom(code,teacher,action('start'));
 const players=[s,...peers],answers=await Promise.all(players.map(p=>correct(h,game,code,p)));
 await Promise.all(players.map((p,i)=>game.actQuizRoom(code,p,answers[i])));
 snap=await game.getQuizSnapshot(code,teacher);assert.equal(snap.ranking.filter(p=>p.score===100&&p.correct===1&&p.attempted===1).length,30);
 assert.equal(h.queries.some(q=>/\b(CREATE|ALTER|DROP)\b/.test(q.query)),false);
});

test('auth, cross-room isolation, public privacy and nickname uniqueness',async t=>{
 const {h,game,code,teacher,s}=await setup(t);const other=await game.createQuizRoom({durationSeconds:300});
 await assert.rejects(game.getQuizSnapshot(code,{...teacher,token:other.teacherKey}),/접근/);
 await assert.rejects(game.getQuizSnapshot(other.code,s),/참여 정보/);
 await assert.rejects(game.actQuizRoom(code,s,action('start')),/진행 중/);
 await assert.rejects(game.joinQuizRoom(code,student(),{nickname:'첫학생'}),/닉네임/);
 await assert.rejects(game.joinQuizRoom(code,{...s,token:randomBytes(32).toString('base64url')},{nickname:'다른이름'}),/참여 정보/);
 const pub=await game.getQuizSnapshot(code,publicIdentity);assert.equal(pub.ranking,undefined);assert.equal(pub.teacherKey,undefined);
 const mine=JSON.stringify(await game.getQuizSnapshot(code,s));for(const secret of ['tokenHash','rewards','deck','teacher_key_hash','correctOption'])assert.equal(mine.includes('"'+secret+'"'),false,secret);
 assert.equal((await game.getQuizSnapshot(other.code,{role:'teacher',token:other.teacherKey,playerId:''})).ranking.length,0);
});

test('answers and rewards are idempotent under double clicks and retries',async t=>{
 const {h,game,code,teacher,s}=await setup(t);await game.actQuizRoom(code,teacher,action('start'));
 const answer=await correct(h,game,code,s);await Promise.all([game.actQuizRoom(code,s,answer),game.actQuizRoom(code,s,answer)]);
 let snap=await game.getQuizSnapshot(code,s);assert.equal(snap.player.score,100);assert.equal(snap.player.attempted,1);assert.equal(snap.player.turn.needsReward,true);
 await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:answer.nonce,choice:answer.choice})),/이미/);
 await assert.rejects(game.actQuizRoom(code,s,action('next',{nonce:answer.nonce})),/보상/);
 const loot=action('reward',{nonce:answer.nonce,chest:0});await Promise.all([game.actQuizRoom(code,s,loot),game.actQuizRoom(code,s,loot)]);
 const before=await game.getQuizSnapshot(code,s);await game.actQuizRoom(code,s,loot);assert.deepEqual((await game.getQuizSnapshot(code,s)).player,before.player);
 await game.actQuizRoom(code,s,action('next',{nonce:answer.nonce}));await assert.rejects(game.actQuizRoom(code,s,action('reward',{nonce:answer.nonce,chest:1})),/보상/);
});

test('hint removes only wrong choices, boost survives wrong answer, stale nonce fails',async t=>{
 const {h,game,code,teacher,s}=await setup(t);await game.actQuizRoom(code,teacher,action('start'));let state=await internal(h,code),p=state.players[s.playerId];
 await setPlayer(h,code,s.playerId,{inventory:{boost:1,hint:1,shield:0,steal:0}});
 let snap=await game.actQuizRoom(code,s,action('item',{item:'hint',nonce:p.turn.nonce}));let right=await correct(h,game,code,s);
 assert.equal(snap.player.turn.eliminated.length,2);assert.equal(snap.player.turn.eliminated.includes(right.choice),false);
 await game.actQuizRoom(code,s,action('item',{item:'boost',nonce:p.turn.nonce}));
 const wrong=[0,1,2,3].find(i=>i!==right.choice&&!snap.player.turn.eliminated.includes(i));
 snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:wrong}));assert.equal(snap.player.score,0);assert.equal(snap.player.boostActive,true);assert.equal(snap.player.turn.needsReward,false);
 snap=await game.actQuizRoom(code,s,action('next',{nonce:snap.player.turn.nonce}));
 snap=await game.actQuizRoom(code,s,await correct(h,game,code,s));assert.equal(snap.player.score,200);assert.equal(snap.player.boostActive,false);
});

test('steal atomically transfers 30, shields block once and cross-room targets fail',async t=>{
 const {h,game,code,teacher,s}=await setup(t);const target=student();await game.joinQuizRoom(code,target,{nickname:'친구'});await game.actQuizRoom(code,teacher,action('start'));
 await setPlayer(h,code,s.playerId,{inventory:{boost:0,hint:1,shield:0,steal:3}});await setPlayer(h,code,target.playerId,{score:200,shieldActive:true});
 let snap=await game.getQuizSnapshot(code,s);const attack=()=>action('item',{item:'steal',targetId:target.playerId,nonce:snap.player.turn.nonce});
 await game.actQuizRoom(code,s,attack());assert.equal((await game.getQuizSnapshot(code,target)).player.score,200);assert.equal((await game.getQuizSnapshot(code,target)).player.shieldActive,false);
 const req=attack();await Promise.all([game.actQuizRoom(code,s,req),game.actQuizRoom(code,s,req)]);
 const a=(await game.getQuizSnapshot(code,s)).player,b=(await game.getQuizSnapshot(code,target)).player;assert.equal(a.score,30);assert.equal(b.score,170);assert.equal(a.score+b.score,200);assert.equal(a.inventory.steal,1);
 await assert.rejects(game.actQuizRoom(code,s,attack()),/보호 중/);
 await assert.rejects(game.actQuizRoom(code,s,action('item',{item:'steal',targetId:randomUUID(),nonce:snap.player.turn.nonce})),/친구/);
});

test('pause, resume, end, removal and expiration are enforced on the server',async t=>{
 const {h,game,code,teacher,s}=await setup(t);await game.actQuizRoom(code,teacher,action('start'));const answer=await correct(h,game,code,s);
 await game.actQuizRoom(code,teacher,action('pause'));await assert.rejects(game.actQuizRoom(code,s,answer),/멈췄/);
 const paused=await game.getQuizSnapshot(code,teacher);assert.equal(paused.status,'paused');assert.equal(paused.endsAt,null);
 await game.actQuizRoom(code,teacher,action('resume'));await game.actQuizRoom(code,s,answer);
 await h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,'{endsAt}',to_jsonb($2::bigint)) WHERE code=$1`,[code,Date.now()-1000]);
 assert.equal((await game.getQuizSnapshot(code,s)).status,'ended');await assert.rejects(game.actQuizRoom(code,s,action('reward',{nonce:answer.nonce,chest:0})),/진행 중/);
 await assert.rejects(game.joinQuizRoom(code,student(),{nickname:'늦은친구'}),/끝난/);
 await game.actQuizRoom(code,teacher,action('remove',{playerId:s.playerId}));await assert.rejects(game.getQuizSnapshot(code,s),/종료/);
 await h.pg.query(`UPDATE quiz_rally_sessions SET expires_at=NOW()-INTERVAL '1 day' WHERE code=$1`,[code]);await assert.rejects(game.getQuizSnapshot(code,teacher),/이용 기간/);
});

test('API rejects malformed/oversized/cross-origin input without leaking internals',async t=>{
 const {h,game,code,teacher,s}=await setup(t);const api=h.load('app/api/labs/quiz-rally/sessions/[code]/route.ts'),context={params:Promise.resolve({code})};
 const req=(body,extra={})=>new Request('https://example.com/api/labs/quiz-rally/sessions/'+code,{method:'POST',headers:{authorization:'Bearer '+s.token,'x-player-id':s.playerId,...extra},body});
 assert.equal((await api.POST(req('{broken'),context)).status,400);
 assert.equal((await api.POST(req('x'.repeat(5000)),context)).status,413);
 assert.equal((await api.POST(req('{}',{origin:'https://evil.example'}),context)).status,403);
 h.outage(true);const r=await api.GET(new Request('https://example.com/?x=1'),context);assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store, max-age=0');assert.equal(JSON.stringify(await r.json()).includes('postgres'),false);
});

test('catalog registration adds this game once and preserves administrator edits',async t=>{
 const h=await harness();t.after(()=>h.close());const {registerQuizRally}=await import('../scripts/register-quiz-rally.mjs');const p=require('../public/labs/quiz-rally/program.json');
 await registerQuizRally(h.sql,p);assert.equal((await h.pg.query('SELECT url FROM programs WHERE id=$1',[p.id])).rows[0].url,'/labs/quiz-rally/index.html');
 await h.pg.query('UPDATE programs SET title=$2 WHERE id=$1',[p.id,'관리자가 바꾼 제목']);await registerQuizRally(h.sql,p);
 assert.equal((await h.pg.query('SELECT title FROM programs WHERE id=$1',[p.id])).rows[0].title,'관리자가 바꾼 제목');
});

test('competing transfers cannot overwrite a simultaneous answer or go below zero',async t=>{
 const {h,game,code,teacher,s}=await setup(t),b=student(),target=student();await game.joinQuizRoom(code,b,{nickname:'다른도전자'});await game.joinQuizRoom(code,target,{nickname:'선두'});await game.actQuizRoom(code,teacher,action('start'));
 for(const x of [s,b])await setPlayer(h,code,x.playerId,{inventory:{boost:0,hint:0,shield:0,steal:1}});
 await setPlayer(h,code,target.playerId,{score:300});const state=await internal(h,code),answer=await correct(h,game,code,target);
 const attempts=await Promise.allSettled([s,b].map(x=>game.actQuizRoom(code,x,action('item',{item:'steal',targetId:target.playerId,nonce:state.players[x.playerId].turn.nonce}))).concat(game.actQuizRoom(code,target,answer)));
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,2);const all=(await game.getQuizSnapshot(code,teacher)).ranking;
 assert.equal(all.reduce((sum,p)=>sum+p.score,0),400);assert.equal(all.find(p=>p.id===target.playerId).score,370);assert.ok(all.every(p=>p.score>=0));
});

test('crew characters persist across reconnects, reject invalid choices, and support old rooms',async t=>{
 const {h,game,code,teacher,s}=await setup(t);
 for(const avatar of [-1,6,1.5,'2','<svg>'])await assert.rejects(game.joinQuizRoom(code,student(),{nickname:'잘못된선택',avatar}),/캐릭터/);
 const peers=Array.from({length:6},student);
 for(let avatar=0;avatar<6;avatar++){
   const p=peers[avatar],joined=await game.joinQuizRoom(code,p,{nickname:'로봇'+avatar,avatar});
   assert.equal(joined.player.avatar,avatar);
   // A repeated join must not reset progress or replace the chosen robot.
   assert.equal((await game.joinQuizRoom(code,p,{nickname:'새이름',avatar:(avatar+1)%6})).player.avatar,avatar);
 }
 await h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2])-'avatar') WHERE code=$1`,[code,s.playerId]);
 const before=await game.getQuizSnapshot(code,s),again=await game.getQuizSnapshot(code,s),teacherView=await game.getQuizSnapshot(code,teacher);
 assert.equal(before.player.avatar,again.player.avatar);assert.ok(before.player.avatar>=0&&before.player.avatar<6);
 assert.equal(teacherView.ranking.find(p=>p.id===s.playerId).avatar,before.player.avatar);
 assert.deepEqual(teacherView.ranking.filter(p=>p.id!==s.playerId).map(p=>p.avatar).sort(),[0,1,2,3,4,5]);
});

test('classmates see progress and coarse activity without answers or credentials',async t=>{
 const {h,game,code,teacher,s}=await setup(t),peer=student();await game.joinQuizRoom(code,peer,{nickname:'관찰자',avatar:3});
 await game.actQuizRoom(code,teacher,action('start'));
 const read=async()=>{const snap=await game.getQuizSnapshot(code,peer);const other=snap.ranking.find(p=>p.id===s.playerId);for(const key of ['turn','nonce','selected','wrongChoices','answer','tokenHash','inventory'])assert.equal(key in other,false);return other;};
 let right=await correct(h,game,code,s);assert.equal((await read()).activity,'solving');
 const wrong=await game.actQuizRoom(code,s,action('answer',{nonce:right.nonce,choice:(right.choice+1)%4}));
 assert.equal((await read()).activity,'solving');assert.equal((await read()).correct,0);
 right={...right,nonce:wrong.player.turn.nonce};const count=h.queries.length;
 const solved=await game.actQuizRoom(code,s,right);assert.equal(h.queries.length-count,2,'no extra database round trip for avatars');
 assert.equal((await read()).activity,'reward');assert.equal((await read()).correct,1);assert.equal((await read()).score,80);
 await game.actQuizRoom(code,s,action('reward',{nonce:solved.player.turn.nonce,chest:0}));assert.equal((await read()).activity,'ready');
 await game.actQuizRoom(code,s,action('next',{nonce:solved.player.turn.nonce}));assert.equal((await read()).activity,'solving');
 const pub=await game.getQuizSnapshot(code,publicIdentity);assert.equal(pub.ranking,undefined);
 await game.actQuizRoom(code,teacher,action('remove',{playerId:s.playerId}));assert.equal((await game.getQuizSnapshot(code,peer)).ranking.some(p=>p.id===s.playerId),false);
});

const customRobot={head:4,chest:3,belly:1,back:2,headColor:2,chestColor:0,bellyColor:3,backColor:5};
test('robot parts are validated, saved at join, and shared identically on reconnect',async t=>{
 const {h,game,code,teacher,s}=await setup(t),peer=student();
 for(const robot of [null,[],{},'robot',{...customRobot,head:6},{...customRobot,belly:-1},{...customRobot,back:4},{...customRobot,chestColor:'2'},{...customRobot,headColor:1.2},{...customRobot,url:'https://example.com'}])await assert.rejects(game.joinQuizRoom(code,student(),{nickname:'부품검사',robot}),/부품/);
 const joined=await game.joinQuizRoom(code,peer,{nickname:'조합로봇',robot:customRobot});assert.deepEqual(joined.player.robot,customRobot);
 assert.deepEqual((await game.getQuizSnapshot(code,peer)).player.robot,customRobot);
 assert.deepEqual((await game.getQuizSnapshot(code,s)).ranking.find(p=>p.id===peer.playerId).robot,customRobot);
 await h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2])-'robot') WHERE code=$1`,[code,s.playerId]);
 const legacy=(await game.getQuizSnapshot(code,s)).player;assert.equal(legacy.robot.head,legacy.avatar);assert.equal(legacy.robot.headColor,legacy.avatar);assert.equal(legacy.robot.back,0);
 const pub=await game.getQuizSnapshot(code,publicIdentity);assert.equal(pub.ranking,undefined);
});

test('cosmetic changes work in lobby and pause without altering turns, scores or another player',async t=>{
 const {h,game,code,teacher,s}=await setup(t),peer=student();await game.joinQuizRoom(code,peer,{nickname:'다른학생'});const before=(await game.getQuizSnapshot(code,s)).player,other=(await game.getQuizSnapshot(code,peer)).player;
 const request=action('customize',{robot:customRobot,playerId:peer.playerId});let snap=await game.actQuizRoom(code,s,request);assert.deepEqual(snap.player.robot,customRobot);assert.deepEqual(snap.player.turn,before.turn);assert.equal(snap.player.score,before.score);assert.deepEqual(snap.player.inventory,before.inventory);assert.deepEqual((await game.getQuizSnapshot(code,peer)).player,other);
 await game.actQuizRoom(code,s,request);assert.deepEqual((await game.getQuizSnapshot(code,s)).player,snap.player);
 await game.actQuizRoom(code,teacher,action('start'));await game.actQuizRoom(code,teacher,action('pause'));snap=await game.actQuizRoom(code,s,action('customize',{robot:{...customRobot,back:3}}));assert.equal(snap.player.robot.back,3);assert.equal(snap.status,'paused');
 await game.actQuizRoom(code,teacher,action('end'));await assert.rejects(game.actQuizRoom(code,s,action('customize',{robot:customRobot})),/끝난/);
 await assert.rejects(game.actQuizRoom(code,{...s,token:peer.token},action('customize',{robot:customRobot})),/참여 정보/);
});

test('concurrent answer and robot save both survive without extra score or DB reads',async t=>{
 const {h,game,code,teacher,s}=await setup(t);await game.actQuizRoom(code,teacher,action('start'));
 const answer=await correct(h,game,code,s);await Promise.all([game.actQuizRoom(code,s,answer),game.actQuizRoom(code,s,action('customize',{robot:customRobot}))]);
 let snap=await game.getQuizSnapshot(code,s);assert.equal(snap.player.score,100);assert.equal(snap.player.correct,1);assert.equal(snap.player.turn.needsReward,true);assert.deepEqual(snap.player.robot,customRobot);
 const count=h.queries.length;snap=await game.actQuizRoom(code,s,action('customize',{robot:{...customRobot,head:5}}));assert.equal(h.queries.length-count,2);assert.equal(snap.player.robot.head,5);assert.equal(snap.player.score,100);
});
