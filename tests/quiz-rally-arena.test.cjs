const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const student=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
const question={prompt:'원소의 종류를 결정하는 것은?',options:['양성자 수','중성자 수','질량','크기'],answer:0,topic:'물질의 구성',explanation:'양성자 수로 원소의 종류를 구분합니다.'};
const read=async(h,code)=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;
const patch=async(h,code,id,p)=>h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1`,[code,id,JSON.stringify(p)]);
async function setup(t,opts={}){const h=await harness();t.after(()=>h.close());const game=h.load('lib/quiz-rally.ts'),M=h.load('lib/quiz-rally-arena.ts'),C=h.load('lib/quiz-rally-course.ts');const made=await game.createQuizRoom({questions:[question,{...question,prompt:'다른 문제'}],durationSeconds:300,stealEnabled:true,...opts}),code=made.code,teacher={role:'teacher',token:made.teacherKey,playerId:''},s=student();await game.joinQuizRoom(code,s,{nickname:'레이서'});await game.actQuizRoom(code,teacher,action('start'));return {h,game,M,C,code,teacher,s};}
async function collect(x,id=0){const room=await read(x.h,x.code),p=room.players[x.s.playerId],box=x.M.boxes()[id];await patch(x.h,x.code,p.id,{runner:{...p.runner,x:box.x,y:box.y,t:x.C.gameClock(room),dx:0,dy:0,open:false}});return x.game.actQuizRoom(x.code,x.s,action('arena-collect',{box:id}));}
function clock(t){const real=Date.now;let n=real()+4000;Date.now=()=>n;t.after(()=>Date.now=real);return d=>(n+=d);}

test('manual physics: 40 safe spawn positions, no auto drive, normalized input, expiry, jump, holes and shared parity',async t=>{
 const {M}=await setup(t),a={version:1,length:4700,seed:1,combat:true};for(let i=0;i<40;i++){const r=M.freshRunner(4000,i);assert.ok(M.floorAt(r.x,r.y,4000));assert.equal(M.advanceRunner(r,6000,a).y,r.y);}
 const r={...M.freshRunner(4000),x:0,y:300};const n=M.control(r,1,1,false,false,4000,1);assert.ok(Math.abs(Math.hypot(n.dx,n.dy)-1)<1e-9);const moved=M.advanceRunner(M.control(r,0,1,false,false,4000,1),4500,a);assert.ok(Math.abs(moved.y-372.5)<.1);assert.equal(M.advanceRunner(r,10000,a).y,300);
 const expired=M.advanceRunner(M.control(r,1,0,false,false,4000,1),9000,a);assert.equal(expired.inputUntil,6200);assert.ok(expired.x<400);
 const jump=M.advanceRunner(M.control(r,0,1,true,false,4000,1),4200,a);assert.ok(jump.z>35);assert.equal(M.control(jump,0,1,true,false,4200,2).jumpAt,4000);
 const start={...r,x:M.center(2140),y:2140,checkpoint:2060};const fell=M.advanceRunner(M.control(start,0,1,false,false,4000,1),4800,a);assert.ok(fell.fallUntil);const respawn=M.advanceRunner(fell,5700,a);assert.equal(respawn.y,2060);assert.equal(respawn.falls,1);
 const crossed=M.advanceRunner(M.control(start,0,1,true,false,4000,1),4860,a);assert.ok(crossed.y>2240);assert.equal(crossed.falls,0);
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-model.js','utf8'),ctx);assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.quizArenaModel.advanceRunner(n,4500,a))),M.advanceRunner(n,4500,a));
});

test('race items: slowing field, airborne dodging, shield, single-victim traps, owner immunity and missile motion',async t=>{
 const {M}=await setup(t),a={version:1,length:4700,seed:1,combat:true},r={...M.freshRunner(4000),x:0,y:350},base={id:'trap',owner:'other',x:0,y:350,dx:0,dy:1,born:3000,expires:15000};
 const field={...base,type:'field'},moving=M.control(r,0,1,false,false,4000,1);assert.ok(M.advanceRunner(moving,4500,a,[field],'me').y<M.advanceRunner(moving,4500,a,[],'me').y-35);
 const mine={...base,type:'mine'},hit=M.advanceRunner(r,4020,a,[mine],'me');assert.equal(hit.hits.length,1);assert.ok(hit.stunUntil>4020);assert.equal(M.advanceRunner(hit,4200,a,[mine],'me').hits.length,1);
 assert.equal(M.advanceRunner(r,4020,a,[{...mine,victim:'someone'}],'me').hits.length,0);assert.equal(M.advanceRunner(r,4020,a,[mine],'other').hits.length,0);
 assert.equal(M.advanceRunner({...r,z:60,vz:0},4020,a,[mine],'me').hits.length,0);assert.equal(M.advanceRunner({...r,shieldUntil:5000},4020,a,[mine],'me').stunUntil,0);
 assert.equal(M.effectPosition({...base,type:'missile'},4000).y,810);
 const popup=M.advanceRunner({...moving,open:true},8000,a,[mine,field],'me');assert.equal(popup.y,r.y);assert.equal(popup.hits.length,0);
});

test('question popup proximity, guaranteed gear, no scores, cooldown retry, idempotency and bank cycling',async t=>{
 const x=await setup(t),{game,h,code,s}=x,tick=clock(t);let snap=await game.getQuizSnapshot(code,s);assert.equal(snap.arena.version,1);assert.equal(snap.player.score,undefined);assert.deepEqual(snap.finishPrizes,[]);assert.ok(snap.ranking.every(p=>p.score===undefined));
 await assert.rejects(game.actQuizRoom(code,s,action('arena-collect',{box:15})),/가까운/);await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:0})),/먼저/);
 snap=await collect(x);let p=(await read(h,code)).players[s.playerId],right=p.turn.order.indexOf(0),wrong=p.turn.order.findIndex(v=>v!==0);snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:wrong}));assert.equal(snap.player.turn.canRetry,true);assert.equal(snap.player.gear.length,0);
 await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:right})),/잠깐/);tick(1001);const answer=action('answer',{nonce:snap.player.turn.nonce,choice:right});await Promise.all([game.actQuizRoom(code,s,answer),game.actQuizRoom(code,s,answer)]);snap=await game.getQuizSnapshot(code,s);assert.equal(snap.player.gear.length,1);assert.equal(snap.player.runner.open,false);assert.equal(snap.player.correct,1);assert.equal(snap.player.turn.points,undefined);assert.equal((await read(h,code)).players[s.playerId].score,0);
 await game.actQuizRoom(code,s,action('arena-close'));await assert.rejects(game.actQuizRoom(code,s,action('arena-collect',{box:0})),/가까운/);snap=await collect(x,1);assert.notEqual((await read(h,code)).players[s.playerId].turn.id,p.turn.id);p=(await read(h,code)).players[s.playerId];snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:p.turn.order.indexOf(0)}));assert.equal(snap.player.finish,null);await game.actQuizRoom(code,s,action('arena-close'));await collect(x,2);await game.actQuizRoom(code,s,action('arena-close'));await patch(h,code,s.playerId,{gear:['mine','field','shield']});await assert.rejects(collect(x,3),/가방/);
});

test('server authorizes controls and items, prevents teleport, stale input, duplicated use and cross-room actions',async t=>{
 const x=await setup(t),{game,h,code,s,C}=x,tick=clock(t);let snap=await game.actQuizRoom(code,s,action('arena-input',{dx:0,dy:1,seq:1,x:99999,y:99999}));assert.ok(snap.player.runner.y<200);await assert.rejects(game.actQuizRoom(code,s,action('arena-input',{dx:99,dy:0,seq:2})),/조작/);
 tick(400);snap=await game.actQuizRoom(code,s,action('arena-input',{dx:0,dy:0,seq:2}));const pos=snap.player.runner.y;tick(100);snap=await game.actQuizRoom(code,s,action('arena-input',{dx:0,dy:1,seq:1}));assert.equal(snap.player.runner.y,pos);
 await patch(h,code,s.playerId,{gear:['mine','missile','field']});const use=action('arena-use',{slot:0,x:99999});await Promise.all([game.actQuizRoom(code,s,use),game.actQuizRoom(code,s,use)]);snap=await game.getQuizSnapshot(code,s);assert.equal(snap.player.gear.length,2);assert.equal(snap.arenaEffects.length,1);assert.equal(snap.arenaEffects[0].y,pos-55);assert.ok(snap.arenaRevision>=1);
 const other=await game.createQuizRoom({questions:[question]});await assert.rejects(game.actQuizRoom(other.code,s,action('arena-input',{dx:0,dy:1,seq:3})),/참여|권한/);await assert.rejects(game.actQuizRoom(code,{...s,token:randomBytes(32).toString('base64url')},action('arena-use',{slot:0})),/참여|권한/);
 tick(1000);await patch(h,code,s.playerId,{gear:['shield','boost']});snap=await game.actQuizRoom(code,s,action('arena-use',{slot:0}));assert.ok(snap.player.runner.shieldUntil>C.gameClock(await read(h,code)));tick(1000);snap=await game.actQuizRoom(code,s,action('arena-use',{slot:0}));assert.ok(snap.player.runner.boostUntil>snap.raceClock);
});

test('30 players: independent controls, ordered finish for every player, duplicate settlement and frozen clocks',async t=>{
 const x=await setup(t),{game,h,code,s,teacher,M,C}=x,players=[s,...Array.from({length:29},student)];await Promise.all(players.slice(1).map((p,i)=>game.joinQuizRoom(code,p,{nickname:'친구'+i})));const tick=clock(t);
 await Promise.all(players.map((p,i)=>game.actQuizRoom(code,p,action('arena-input',{dx:i%2?1:-1,dy:0,seq:1}))));let room=await read(h,code);assert.equal(Object.values(room.players).filter(p=>p.runner.seq===1).length,30);
 let snap=await game.actQuizRoom(code,teacher,action('pause'));const paused=snap.raceClock;tick(15000);assert.equal((await game.getQuizSnapshot(code,s)).raceClock,paused);await assert.rejects(game.actQuizRoom(code,s,action('arena-input',{dx:1,dy:0,seq:2})),/멈췄/);await game.actQuizRoom(code,teacher,action('resume'));
 room=await read(h,code);for(let i=0;i<players.length;i++){const r={...M.freshRunner(C.gameClock(room)),x:M.center(room.arena.length),y:room.arena.length-2-i*2,checkpoint:room.arena.length-690};await patch(h,code,players[i].playerId,{runner:M.control(r,0,1,false,false,C.gameClock(room),2)});}
 tick(600);await Promise.all([...players].reverse().map(p=>game.getQuizSnapshot(code,p)));snap=await game.getQuizSnapshot(code,teacher);assert.deepEqual(snap.finishers,players.map(p=>p.playerId));assert.deepEqual(snap.ranking.map(p=>p.finish.place),Array.from({length:30},(_,i)=>i+1));assert.ok(snap.ranking.every(p=>p.finish.bonus===0&&p.score===undefined));assert.equal((await game.getQuizSnapshot(code,teacher)).finishers.length,30);
 snap=await game.actQuizRoom(code,teacher,action('end'));const end=snap.raceClock;tick(10000);assert.equal((await game.getQuizSnapshot(code,s)).raceClock,end);
});

test('a shared trap is consumed by one student under concurrent requests; reveal grants no item',async t=>{
 const x=await setup(t),{game,h,code,s,M,C}=x,a=student(),b=student();await game.joinQuizRoom(code,a,{nickname:'회피1'});await game.joinQuizRoom(code,b,{nickname:'회피2'});const tick=clock(t);let room=await read(h,code),now=C.gameClock(room);
 await patch(h,code,s.playerId,{gear:['mine'],runner:{...M.freshRunner(now),x:0,y:500}});await game.actQuizRoom(code,s,action('arena-use',{slot:0}));room=await read(h,code);const e=room.arenaEffects[0];for(const p of [a,b])await patch(h,code,p.playerId,{runner:{...M.freshRunner(now),x:e.x,y:e.y}});tick(600);
 await Promise.all([a,b].map(p=>game.actQuizRoom(code,p,action('arena-input',{dx:0,dy:0,seq:1}))));room=await read(h,code);assert.ok([a.playerId,b.playerId].includes(room.arenaEffects[0].victim));assert.equal([a,b].filter(p=>room.players[p.playerId].runner.hits.length).length,1);
 let snap=await collect(x),p=(await read(h,code)).players[s.playerId];snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:p.turn.order.findIndex(v=>v!==0)}));snap=await game.actQuizRoom(code,s,action('reveal',{nonce:snap.player.turn.nonce}));assert.equal(snap.player.turn.revealed,true);assert.equal(snap.player.gear.length,0);
});

test('default 15-minute course extends obstacles, boxes and checkpoints through the final stretch',async t=>{
 const {game,M}=await setup(t),made=await game.createQuizRoom({questions:[question]}),s=await game.getQuizSnapshot(made.code,{role:'teacher',token:made.teacherKey,playerId:''});assert.equal(s.durationSeconds,900);assert.equal(s.arena.length,94000);assert.equal(M.boxes(s.arena).length,320);assert.equal(new Set(M.boxes(s.arena).map(b=>b.id)).size,320);
 const base=s.arena.length-M.ROUND_LENGTH;assert.ok(M.gates(4000,s.arena,base,base+4700).length===3);assert.ok(M.spinners(4000,s.arena,base,base+4700).length===2);assert.ok(M.balls(4000,s.arena,base,base+4700).length===3);assert.ok(M.checkpoints(s.arena).includes(base+4010));assert.equal(M.floorAt(M.center(base+2200),base+2200,4000),false);assert.equal(M.stageAt(base+3000).round,19);
 const first=M.advanceRunner(M.control({...M.freshRunner(4000),x:M.center(base+2140),y:base+2140,checkpoint:base+2060},0,1,true,false,4000,1),4860,s.arena);assert.equal(first.falls,0);assert.ok(first.y>base+2240);assert.equal(first.finishAt,undefined);
});

test('input batches preserve press/jump/release order and acknowledge the final event once',async t=>{
 const x=await setup(t),{game,h,code,s,M,C}=x,tick=clock(t),room=await read(h,code),now=C.gameClock(room),start={...M.freshRunner(now),x:0,y:300};await patch(h,code,s.playerId,{runner:start});tick(800);
 const inputs=[{seq:1,at:now+10,dx:0,dy:1,jump:false,dive:false},{seq:2,at:now+150,dx:0,dy:1,jump:true,dive:false},{seq:3,at:now+400,dx:0,dy:0,jump:false,dive:false}],packet=action('arena-input',{inputs});let snap=await game.actQuizRoom(code,s,packet);assert.equal(snap.player.runner.seq,3);assert.equal(snap.player.runner.jumpAt,now+150);assert.equal(snap.player.runner.dy,0);assert.ok(Math.abs(snap.player.runner.y-(300+.39*145))<.1);const y=snap.player.runner.y;tick(500);snap=await game.actQuizRoom(code,s,packet);assert.equal(snap.player.runner.y,y);await assert.rejects(game.actQuizRoom(code,s,action('arena-input',{inputs:[inputs[2],inputs[1]]})),/조작/);
});

test('late snapshots replay unacknowledged inputs and running clock corrections never go backwards',async t=>{
 const {M}=await setup(t),ctx={window:{},performance:{now:()=>0}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-sync.js','utf8'),ctx);const N=ctx.window.quizArenaSync,a={version:1,length:4700,seed:1,combat:true},start={...M.freshRunner(4000),x:0,y:300},press={seq:1,at:4010,dx:0,dy:1,jump:false,dive:false},jump={seq:2,at:4200,dx:0,dy:1,jump:true,dive:false},release={seq:3,at:4400,dx:0,dy:0,jump:false,dive:false};
 const server=M.advanceRunner(M.control(M.advanceRunner(start,press.at,a),press.dx,press.dy,false,false,press.at,press.seq),4100,a),replayed=N.reconcile(M,server,[press,jump,release],4600,a,[],'me');assert.equal(replayed.seq,3);assert.equal(replayed.jumpAt,4200);assert.equal(replayed.dy,0);assert.ok(replayed.z>40);assert.ok(Math.abs(replayed.y-356.55)<.1);
 const timeline=new N.Timeline();timeline.sync(4000,'running',200,1000);const before=timeline.now(1600);timeline.sync(4400,'running',200,1600);assert.ok(timeline.now(1600)>=before);assert.ok(timeline.now(1700)>before);timeline.sync(4700,'paused',200,1750);assert.equal(timeline.now(5000),4700);timeline.sync(4700,'running',200,5050);assert.ok(timeline.now(5100)>=4900);
});
