const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const student=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
const question={prompt:'원소의 종류를 결정하는 것은?',options:['양성자 수','중성자 수','질량','크기'],answer:0,topic:'물질의 구성',explanation:'양성자 수로 원소의 종류를 구분합니다.'};
async function setup(t){const h=await harness();t.after(()=>h.close());const game=h.load('lib/quiz-rally.ts'),M=h.load('lib/quiz-rally-course.ts');const made=await game.createQuizRoom({questions:[question,{...question,prompt:'양성자의 전하는?',options:['양전하','음전하','중성','없음']}],durationSeconds:300,stealEnabled:true});await energyFixture(h,made.code,1300);const code=made.code,teacher={role:'teacher',token:made.teacherKey,playerId:''},s=student();await game.joinQuizRoom(code,s,{nickname:'충전로봇'});await game.actQuizRoom(code,teacher,action('start'));return {h,game,M,code,teacher,s};}
async function energyFixture(h,code,length){await h.pg.query("UPDATE quiz_rally_sessions SET state=(state-'arena'-'arenaEffects'-'arenaRevision') || $2::jsonb WHERE code=$1",[code,JSON.stringify({course:{version:1,length:Math.max(2400,length),seed:3}})]);}
const read=async(h,code)=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;
const patch=async(h,code,id,p)=>h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1`,[code,id,JSON.stringify(p)]);
async function collect(x,index=0){const room=await read(x.h,x.code),p=room.players[x.s.playerId],cap=x.M.capsuleAt(index,room.course);await patch(x.h,x.code,p.id,{racer:{...p.racer,d:cap.d,lane:cap.lane,e:10,t:x.M.gameClock(room),open:false}});return x.game.actQuizRoom(x.code,x.s,action('race-collect',{capsule:index}));}

test('shared physics: smooth decay, positive minimum, collision once, partition invariance and generated parity',async t=>{
 const h=await harness();t.after(()=>h.close());const M=h.load('lib/quiz-rally-course.ts'),c={version:1,length:18000,seed:3},r=M.freshRacer();
 assert.equal(M.speed(0),18);assert.equal(M.speed(100),72);const a=M.advance(r,120000,c);assert.equal(a.e,0);assert.ok(a.d>0&&a.d<c.length);const b=M.advance(a,121000,c);assert.ok(Math.abs(b.d-a.d-18)<1e-6);
 const split=M.advance(M.advance(r,4700,c),13000,c),whole=M.advance(r,13000,c);assert.ok(Math.abs(split.d-whole.d)<1e-6);assert.ok(Math.abs(split.e-whole.e)<1e-6);assert.equal(split.hits,whole.hits);
 const o=M.obstacleAt(0,c),hit=M.advance({...r,d:o.d-1,lane:o.lane,e:100},100,c);assert.equal(hit.hits,1);assert.equal(M.advance(hit,101,c).hits,1);
 const context={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/course-model.js','utf8'),context);assert.deepEqual(JSON.parse(JSON.stringify(context.window.quizCourse.advance(r,13000,c))),whole);
});

test('capsule validation, correct energy, automatic rewards, immediate retries, replay safety and question cycling',async t=>{
 const x=await setup(t),{h,game,code,s}=x;let snap=await game.getQuizSnapshot(code,s);assert.equal(snap.course.version,1);assert.deepEqual(snap.finishPrizes,[40,24,16]);
 await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:0})),/캡슐/);
 await assert.rejects(game.actQuizRoom(code,s,action('race-collect',{capsule:20})),/가까운/);
 snap=await collect(x);const p=(await read(h,code)).players[s.playerId],right=p.turn.order.indexOf(0),wrong=p.turn.order.findIndex(i=>i!==0);const oldEnergy=snap.player.racer.e;
 snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:wrong}));assert.equal(snap.player.score,0);assert.equal(snap.player.turn.canRetry,true);
 const answer=action('answer',{nonce:snap.player.turn.nonce,choice:right});const before=h.queries.length;await Promise.all([game.actQuizRoom(code,s,answer),game.actQuizRoom(code,s,answer)]);snap=await game.getQuizSnapshot(code,s);assert.ok(h.queries.length-before<12);assert.equal(snap.player.correct,1);assert.equal(snap.player.score,80);assert.equal(snap.player.turn.needsReward,false);assert.ok(snap.player.turn.reward);assert.ok(snap.player.racer.e>oldEnergy+40);assert.equal(snap.player.finish,null);
 const id=p.turn.id;await game.actQuizRoom(code,s,action('race-close'));snap=await collect(x,1);assert.notEqual((await read(h,code)).players[s.playerId].turn.id,id);assert.equal(snap.player.turn.answered,false);
 await assert.rejects(game.actQuizRoom(code,s,action('race-collect',{capsule:1})),/먼저/);
 // Finishing the question bank does not finish the distance race; the bank may cycle.
 const p2=(await read(h,code)).players[s.playerId];snap=await game.actQuizRoom(code,s,action('answer',{nonce:p2.turn.nonce,choice:p2.turn.order.indexOf(0)}));assert.equal(snap.player.finish,null);await game.actQuizRoom(code,s,action('race-close'));snap=await collect(x,2);assert.equal(snap.player.turn.answered,false);assert.equal(snap.questionCount,2);
});

test('pause and early end freeze race clock; late joins do not receive a distance head start',async t=>{
 const x=await setup(t),{game,code,teacher,M}=x;const real=Date.now;let now=real()+10000;Date.now=()=>now;t.after(()=>Date.now=real);
 let snap=await game.actQuizRoom(code,teacher,action('pause'));const clock=snap.raceClock;now+=30000;assert.equal((await game.getQuizSnapshot(code,teacher)).raceClock,clock);
 snap=await game.actQuizRoom(code,teacher,action('resume'));assert.equal(snap.raceClock,clock);const late=student();snap=await game.joinQuizRoom(code,late,{nickname:'늦은입장'});assert.equal(snap.player.racer.d,0);assert.equal(snap.player.racer.t,snap.raceClock);
 now+=1000;snap=await game.actQuizRoom(code,teacher,action('end'));const end=snap.raceClock;now+=20000;assert.equal((await game.getQuizSnapshot(code,teacher)).raceClock,end);assert.ok(end<300000);
 assert.equal(M.gameClock({status:'lobby',durationSeconds:300,endsAt:null,remainingMs:300000}),0);
});

test('30 simultaneous players: independent lane updates and atomic, time-ordered finish awards',async t=>{
 const x=await setup(t),{game,h,code,teacher,s,M}=x,peers=Array.from({length:29},student),players=[s,...peers];await Promise.all(peers.map((p,i)=>game.joinQuizRoom(code,p,{nickname:'로봇'+(i+2)})));
 await Promise.all(players.map((p,i)=>game.actQuizRoom(code,p,action('race-lane',{lane:i%5}))));let room=await read(h,code);assert.equal(players.filter((p,i)=>room.players[p.playerId].racer.lane===i%5).length,30);
 const clock=M.gameClock(room);for(let i=0;i<players.length;i++)await patch(h,code,players[i].playerId,{racer:{...room.players[players[i].playerId].racer,d:room.course.length-10-i*2,e:100,t:clock}});
 const real=Date.now;Date.now=()=>real()+10000;t.after(()=>Date.now=real);
 // Request order is reversed; physical crossing time still decides places.
 await Promise.all([...players].reverse().map(p=>game.getQuizSnapshot(code,p)));
 const snap=await game.getQuizSnapshot(code,teacher);assert.equal(snap.ranking.filter(p=>p.finish).length,30);assert.deepEqual(snap.finishers,players.slice(0,3).map(p=>p.playerId));assert.equal(snap.ranking.reduce((a,p)=>a+p.score,0),80);
 const again=await game.getQuizSnapshot(code,teacher);assert.equal(again.ranking.reduce((a,p)=>a+p.score,0),80);const p=await game.getQuizSnapshot(code,s);assert.equal(p.player.finish.place,1);assert.equal(p.player.racer.d,room.course.length);assert.equal(p.player.racer.open,false);
});

 test('large imported banks keep finish bonuses proportional to the timed course',async t=>{
 const {game,h}=await setup(t);const made=await game.createQuizRoom({questions:Array.from({length:500},()=>question),durationSeconds:300});await energyFixture(h,made.code,11400);const snap=await game.getQuizSnapshot(made.code,{role:'teacher',token:made.teacherKey,playerId:''});assert.equal(snap.questionCount,500);assert.equal(snap.course.length,11400);assert.deepEqual(snap.finishPrizes,[360,216,144]);
});
