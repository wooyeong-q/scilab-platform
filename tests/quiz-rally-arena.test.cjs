const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const student=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
const question={prompt:'원소의 종류를 결정하는 것은?',options:['양성자 수','중성자 수','질량','크기'],answer:0,topic:'물질의 구성',explanation:'양성자 수로 원소의 종류를 구분합니다.'};
const read=async(h,code)=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;
const patch=async(h,code,id,p)=>h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1`,[code,id,JSON.stringify(p)]);
async function setup(t,opts={}){const h=await harness();t.after(()=>h.close());const game=h.load('lib/quiz-rally.ts'),M=h.load('lib/quiz-rally-arena.ts'),C=h.load('lib/quiz-rally-course.ts');const made=await game.createQuizRoom({questions:[question,{...question,prompt:'다른 문제'}],durationSeconds:300,stealEnabled:true,...opts}),code=made.code,teacher={role:'teacher',token:made.teacherKey,playerId:''},s=student();await game.joinQuizRoom(code,s,{nickname:'레이서'});await game.actQuizRoom(code,teacher,action('start'));return {h,game,M,C,code,teacher,s};}
async function collect(x,id=0){const room=await read(x.h,x.code),p=room.players[x.s.playerId],box=x.M.boxes(room.arena)[id];await patch(x.h,x.code,p.id,{runner:{...p.runner,x:box.x,y:box.y,t:x.C.gameClock(room),dx:0,dy:0,open:false}});return x.game.actQuizRoom(x.code,x.s,action('arena-collect',{box:id}));}
function clock(t){const real=Date.now;let n=real()+4000;Date.now=()=>n;t.after(()=>Date.now=real);return d=>(n+=d);}

test('manual physics: 40 safe spawn positions, no auto drive, normalized input, expiry, jump, holes and shared parity',async t=>{
 const {M}=await setup(t),a={version:1,length:4700,seed:1,combat:true};for(let i=0;i<40;i++){const r=M.freshRunner(4000,i);assert.ok(M.floorAt(r.x,r.y,4000));assert.equal(M.advanceRunner(r,6000,a).y,r.y);}
 const r={...M.freshRunner(4000),x:0,y:300};const n=M.control(r,1,1,false,false,4000,1);assert.ok(Math.abs(Math.hypot(n.dx,n.dy)-1)<1e-9);const moved=M.advanceRunner(M.control(r,0,1,false,false,4000,1),4500,a);assert.ok(Math.abs(moved.y-387.5)<.1);assert.equal(M.advanceRunner(r,10000,a).y,300);
 const expired=M.advanceRunner(M.control(r,1,0,false,false,4000,1),9000,a);assert.equal(expired.inputUntil,6200);assert.ok(expired.x<400);
 const jump=M.advanceRunner(M.control(r,0,1,true,false,4000,1),4200,a);assert.ok(jump.z>35);assert.equal(M.control(jump,0,1,true,false,4200,2).jumpAt,4000);
 const start={...r,x:M.center(2140),y:2140,checkpoint:2060};const fell=M.advanceRunner(M.control(start,0,1,false,false,4000,1),4800,a);assert.ok(fell.fallUntil);const respawn=M.advanceRunner(fell,5700,a);assert.equal(respawn.y,2060);assert.equal(respawn.falls,1);
 const crossed=M.advanceRunner(M.control(start,0,1,true,false,4000,1),4860,a);assert.ok(crossed.y>2240);assert.equal(crossed.falls,0);
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-model.js','utf8'),ctx);assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.quizArenaModel.advanceRunner(n,4500,a))),M.advanceRunner(n,4500,a));
});

test('race items: slowing field, airborne dodging, shield, single-victim traps, owner immunity and missile motion',async t=>{
 const {M}=await setup(t),a={version:1,length:4700,seed:1,combat:true},r={...M.freshRunner(4000),x:0,y:350},base={id:'trap',owner:'other',x:0,y:350,dx:0,dy:1,born:3000,expires:15000};
 const field={...base,type:'field'},moving=M.control(r,0,1,false,false,4000,1);assert.ok(M.advanceRunner(moving,4500,a,[field],'me').y<M.advanceRunner(moving,4500,a,[],'me').y-35);
 const boosted=M.advanceRunner({...moving,boostUntil:7000},4500,a);assert.ok(Math.abs(boosted.y-525)<1e-7);assert.ok(Math.abs((boosted.y-r.y)/(M.advanceRunner(moving,4500,a).y-r.y)-2)<1e-7);
 const mine={...base,type:'mine'},hit=M.advanceRunner(r,4020,a,[mine],'me');assert.equal(hit.hits.length,1);assert.ok(hit.stunUntil>4020);assert.equal(M.advanceRunner(hit,4200,a,[mine],'me').hits.length,1);
 assert.equal(M.advanceRunner(r,4020,a,[{...mine,victim:'someone'}],'me').hits.length,0);assert.equal(M.advanceRunner(r,4020,a,[mine],'other').hits.length,0);
 assert.equal(M.advanceRunner({...r,z:60,vz:0},4020,a,[mine],'me').hits.length,0);assert.equal(M.advanceRunner({...r,shieldUntil:5000},4020,a,[mine],'me').stunUntil,0);
 assert.equal(M.effectPosition({...base,type:'missile'},4000).y,810);
 const popup=M.advanceRunner({...moving,open:true},8000,a,[mine,field],'me');assert.equal(popup.y,r.y);assert.equal(popup.hits.length,0);
});

test('question popup proximity, guaranteed gear, no scores, cooldown retry, idempotency and bank cycling',async t=>{
 const x=await setup(t),{game,h,code,s}=x,tick=clock(t);let snap=await game.getQuizSnapshot(code,s);assert.equal(snap.arena.version,2);assert.equal(snap.player.score,undefined);assert.deepEqual(snap.finishPrizes,[]);assert.ok(snap.ranking.every(p=>p.score===undefined));
 await assert.rejects(game.actQuizRoom(code,s,action('arena-collect',{box:15})),/가까운/);await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:0})),/먼저/);
 snap=await collect(x);let p=(await read(h,code)).players[s.playerId],right=p.turn.order.indexOf(0),wrong=p.turn.order.findIndex(v=>v!==0);snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:wrong}));assert.equal(snap.player.turn.canRetry,true);assert.equal(snap.player.gear.length,0);
 await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:right})),/잠깐/);tick(1001);const answer=action('answer',{nonce:snap.player.turn.nonce,choice:right});await Promise.all([game.actQuizRoom(code,s,answer),game.actQuizRoom(code,s,answer)]);snap=await game.getQuizSnapshot(code,s);assert.equal(snap.player.gear.length,1);assert.equal(snap.player.runner.open,false);assert.equal(snap.player.correct,1);assert.equal(snap.player.turn.points,undefined);assert.equal((await read(h,code)).players[s.playerId].score,0);
 await game.actQuizRoom(code,s,action('arena-close'));await assert.rejects(game.actQuizRoom(code,s,action('arena-collect',{box:0})),/가까운/);snap=await collect(x,1);assert.notEqual((await read(h,code)).players[s.playerId].turn.id,p.turn.id);p=(await read(h,code)).players[s.playerId];snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:p.turn.order.indexOf(0)}));assert.equal(snap.player.finish,null);await game.actQuizRoom(code,s,action('arena-close'));await collect(x,2);await game.actQuizRoom(code,s,action('arena-close'));await patch(h,code,s.playerId,{gear:['mine','field','shield']});snap=await collect(x,3);assert.equal(snap.player.runner.open,true);assert.equal(snap.player.gear.length,3);
});

test('server authorizes controls and items, prevents teleport, stale input, duplicated use and cross-room actions',async t=>{
 const x=await setup(t),{game,h,code,s,C}=x,tick=clock(t);let snap=await game.actQuizRoom(code,s,action('arena-input',{dx:0,dy:1,seq:1,x:99999,y:99999}));assert.ok(snap.player.runner.y<200);await assert.rejects(game.actQuizRoom(code,s,action('arena-input',{dx:99,dy:0,seq:2})),/조작/);
 tick(400);snap=await game.actQuizRoom(code,s,action('arena-input',{dx:0,dy:0,seq:2}));const pos=snap.player.runner.y;tick(100);snap=await game.actQuizRoom(code,s,action('arena-input',{dx:0,dy:1,seq:1}));assert.equal(snap.player.runner.y,pos);
 await patch(h,code,s.playerId,{gear:['mine','missile','field']});const use=action('arena-use',{slot:0,x:99999});await Promise.all([game.actQuizRoom(code,s,use),game.actQuizRoom(code,s,use)]);snap=await game.getQuizSnapshot(code,s);assert.equal(snap.player.gear.length,2);assert.equal(snap.arenaEffects.length,1);assert.equal(snap.arenaEffects[0].y,pos-55);assert.ok(snap.arenaRevision>=1);
 const other=await game.createQuizRoom({questions:[question]});await assert.rejects(game.actQuizRoom(other.code,s,action('arena-input',{dx:0,dy:1,seq:3})),/참여|권한/);await assert.rejects(game.actQuizRoom(code,{...s,token:randomBytes(32).toString('base64url')},action('arena-use',{slot:0})),/참여|권한/);
 tick(1000);await patch(h,code,s.playerId,{gear:['shield','boost']});snap=await game.actQuizRoom(code,s,action('arena-use',{slot:0,inputs:[]}));assert.ok(snap.player.runner.shieldUntil>C.gameClock(await read(h,code)));tick(1000);snap=await game.actQuizRoom(code,s,action('arena-use',{slot:0}));assert.ok(snap.player.runner.boostUntil>snap.raceClock);
 await assert.rejects(game.actQuizRoom(code,s,action('arena-input',{inputs:[]})),/조작 값/);
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
 await patch(h,code,s.playerId,{gear:['mine'],runner:{...M.freshRunner(now),x:0,y:350}});await game.actQuizRoom(code,s,action('arena-use',{slot:0}));room=await read(h,code);const e=room.arenaEffects[0];for(const p of [a,b])await patch(h,code,p.playerId,{runner:{...M.freshRunner(now),x:e.x,y:e.y}});tick(600);
 await Promise.all([a,b].map(p=>game.actQuizRoom(code,p,action('arena-input',{dx:0,dy:0,seq:1}))));room=await read(h,code);assert.ok([a.playerId,b.playerId].includes(room.arenaEffects[0].victim));assert.equal([a,b].filter(p=>room.players[p.playerId].runner.hits.length).length,1);
 let snap=await collect(x),p=(await read(h,code)).players[s.playerId];snap=await game.actQuizRoom(code,s,action('answer',{nonce:p.turn.nonce,choice:p.turn.order.findIndex(v=>v!==0)}));snap=await game.actQuizRoom(code,s,action('reveal',{nonce:snap.player.turn.nonce}));assert.equal(snap.player.turn.revealed,true);assert.equal(snap.player.gear.length,0);
});

test('one continuous city has unique districts, scattered safe supplies and jumpable gaps',async t=>{
 const {game,M}=await setup(t),made=await game.createQuizRoom({questions:[question]}),s=await game.getQuizSnapshot(made.code,{role:'teacher',token:made.teacherKey,playerId:''}),a=s.arena;assert.equal(s.durationSeconds,900);assert.equal(a.version,2);assert.equal(a.length,27000);assert.ok(a.length<94000/2);assert.equal(M.stageAt(a.length-1,a).name,'시티 코어');assert.equal(M.stageAt(5300,a).name,'풍력 지붕');
 const boxes=M.boxes(a);assert.ok(boxes.length>=28);assert.equal(new Set(boxes.map(b=>b.id)).size,boxes.length);assert.equal(new Set(boxes.map(b=>b.y)).size,boxes.length);assert.ok(new Set(boxes.map(b=>Math.round(b.x-M.center(b.y)))).size>20);
 for(const b of boxes)for(const at of [4000,5500,7000,8500])assert.ok(M.floorAt(b.x,b.y,at,a),'Question caches must stay on stable floor');
 assert.ok(M.barriers(a).some(b=>b.height>60));assert.ok(M.spinners(4000,a).some(b=>b.arms===2));assert.ok(M.pistons(4000,a).length>=6);assert.ok(M.fans(a).length>=3);assert.ok(M.trackAt(7000,a).width<240);
 for(const gap of M.gaps(a)){assert.ok(gap.end-gap.start<=104);const y=gap.start-11,start={...M.freshRunner(4000),x:M.trackAt(y,a).center,y,checkpoint:100},r=M.advanceRunner(M.control(start,0,1,true,false,4000,1),4900,a);assert.equal(r.falls,0,'Every full-width gap must be clearable by one ordinary jump');assert.ok(r.y>gap.end);}
 const gates=M.gates(4000,a);assert.ok(Math.min(...gates.map(g=>g.width))<145);assert.ok(M.couldFinish(M.freshRunner(4000),5000,a)===false);
});

test('input batches preserve press/jump/release order and acknowledge the final event once',async t=>{
 const x=await setup(t),{game,h,code,s,M,C}=x,tick=clock(t),room=await read(h,code),now=C.gameClock(room),start={...M.freshRunner(now),x:0,y:300};await patch(h,code,s.playerId,{runner:start});tick(800);
 const inputs=[{seq:1,at:now+10,dx:0,dy:1,jump:false,dive:false},{seq:2,at:now+150,dx:0,dy:1,jump:true,dive:false},{seq:3,at:now+400,dx:0,dy:0,jump:false,dive:false}],packet=action('arena-input',{inputs});let snap=await game.actQuizRoom(code,s,packet);assert.equal(snap.player.runner.seq,3);assert.equal(snap.player.runner.jumpAt,now+150);assert.equal(snap.player.runner.dy,0);assert.ok(Math.abs(snap.player.runner.y-(300+.39*175-175*.65/100*4*(.4**2-.01**2)/2))<1e-7);const y=snap.player.runner.y;tick(500);snap=await game.actQuizRoom(code,s,packet);assert.equal(snap.player.runner.y,y);await assert.rejects(game.actQuizRoom(code,s,action('arena-input',{inputs:[inputs[2],inputs[1]]})),/조작/);
});

test('late snapshots replay unacknowledged inputs and running clock corrections never go backwards',async t=>{
 const {M}=await setup(t),ctx={window:{},performance:{now:()=>0}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-sync.js','utf8'),ctx);const N=ctx.window.quizArenaSync,a={version:1,length:4700,seed:1,combat:true},start={...M.freshRunner(4000),x:0,y:300},press={seq:1,at:4010,dx:0,dy:1,jump:false,dive:false},jump={seq:2,at:4200,dx:0,dy:1,jump:true,dive:false},release={seq:3,at:4400,dx:0,dy:0,jump:false,dive:false};
 const server=M.advanceRunner(M.control(M.advanceRunner(start,press.at,a),press.dx,press.dy,false,false,press.at,press.seq),4100,a),replayed=N.reconcile(M,server,[press,jump,release],4600,a,[],'me');assert.equal(replayed.seq,3);assert.equal(replayed.jumpAt,4200);assert.equal(replayed.dy,0);assert.ok(replayed.z>40);assert.ok(Math.abs(replayed.y-368.25)<.1);
 const timeline=new N.Timeline();timeline.sync(4000,'running',200,1000);const before=timeline.now(1600);timeline.sync(4400,'running',200,1600);assert.equal(timeline.now(1600),before);assert.ok(timeline.now(1700)>before);timeline.sync(4700,'paused',200,1750);assert.equal(timeline.now(5000),4700);timeline.sync(4700,'running',200,5050);assert.equal(timeline.now(5100),4750);
});

test('in-flight direction changes and jumps keep their original time across separate server requests',async t=>{
 const {game,h,code,s,M,C}=await setup(t),tick=clock(t),room=await read(h,code),now=C.gameClock(room),a=room.arena,start={...M.freshRunner(now),x:0,y:300};await patch(h,code,s.playerId,{runner:start});
 const inputs=[{seq:1,at:now+10,dx:0,dy:1,jump:false,dive:false},{seq:2,at:now+120,dx:1,dy:1,jump:true,dive:false},{seq:3,at:now+360,dx:0,dy:0,jump:false,dive:false}];
 tick(350);let snap=await game.actQuizRoom(code,s,action('arena-input',{inputs:inputs.slice(0,1)}));assert.equal(snap.player.runner.t,inputs[0].at,'The persisted anchor must not run ahead of unreceived controls');
 tick(500);snap=await game.actQuizRoom(code,s,action('arena-input',{inputs:inputs.slice(1)}));assert.equal(snap.player.runner.jumpAt,inputs[1].at);assert.equal(snap.player.runner.t,inputs[2].at);
 let expected=start;for(const e of inputs)expected=M.control(M.advanceRunner(expected,e.at,a),e.dx,e.dy,e.jump,e.dive,e.at,e.seq);expected=M.advanceRunner(expected,now+850,a);const actual=M.advanceRunner(snap.player.runner,now+850,a);
 for(const k of ['x','y','z','vz'])assert.ok(Math.abs(actual[k]-expected[k])<1e-7,`${k}: late packets must follow the same trajectory`);
 tick(2600);snap=await game.actQuizRoom(code,s,action('arena-input',{inputs:[{seq:4,at:now+1100,dx:0,dy:0,jump:true,dive:false}]}));assert.equal(snap.player.runner.jumpAt,now+1100,'A slow classroom connection must not retime a queued jump');
});

test('asymmetric latency never skips simulation time; jump height is independent of render frame rate',async t=>{
 const {M}=await setup(t),ctx={window:{},performance:{now:()=>0}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-sync.js','utf8'),ctx);const N=ctx.window.quizArenaSync,timeline=new N.Timeline();
 assert.equal(timeline.sync(4000,'running',750,1000),4000,'Half RTT must not put inputs in the future');
 for(const [at,server,rtt] of [[1700,5400,450],[2500,5600,900],[4000,7700,50],[5200,7200,800]]){const before=timeline.now(at);assert.equal(timeline.sync(server,'running',rtt,at),before);const elapsed=timeline.now(at+100)-before;assert.ok(elapsed>=98&&elapsed<=102);}
 const a={version:1,length:4700,seed:1,combat:true},start=M.control({...M.freshRunner(4000),x:0,y:300},0,1,true,false,4000,1),expected=M.advanceRunner(start,4750,a);
 for(const fps of [30,60,120]){let r=start;for(let at=4000+1000/fps;at<4750;at+=1000/fps)r=M.advanceRunner(r,at,a);r=M.advanceRunner(r,4750,a);for(const k of ['x','y','z','vz'])assert.ok(Math.abs(r[k]-expected[k])<1e-7,`${fps} fps: ${k}`);}
});

test('an item used while running does not move the anchor past a jump queued during its response',async t=>{
 const {game,h,code,s,M,C}=await setup(t),tick=clock(t),room=await read(h,code),now=C.gameClock(room),a=room.arena,start={...M.freshRunner(now),x:0,y:300};await patch(h,code,s.playerId,{runner:start,gear:['mine','shield']});
 tick(300);await game.actQuizRoom(code,s,action('arena-input',{inputs:[{seq:1,at:now+10,dx:0,dy:1}]}));tick(600);
 let snap=await game.actQuizRoom(code,s,action('arena-use',{at:now+150,slot:0}));assert.equal(snap.player.runner.t,now+150);assert.equal(snap.arenaEffects[0].born,now+150);assert.ok(Math.abs(snap.player.runner.y-(324.5-175*.65/100*4*(.15**2-.01**2)/2))<1e-7);
 tick(500);snap=await game.actQuizRoom(code,s,action('arena-input',{inputs:[{seq:2,at:now+350,dx:0,dy:1,jump:true},{seq:3,at:now+650,dx:0,dy:0}]}));assert.equal(snap.player.runner.jumpAt,now+350);assert.equal(snap.player.runner.t,now+650);
 let expected=M.control(M.advanceRunner(start,now+10,a),0,1,false,false,now+10,1);expected=M.control(M.advanceRunner(expected,now+350,a),0,1,true,false,now+350,2);expected=M.control(M.advanceRunner(expected,now+650,a),0,0,false,false,now+650,3);
 for(const k of ['x','y','z','vz'])assert.ok(Math.abs(snap.player.runner[k]-expected[k])<1e-7,k);
 await assert.rejects(game.actQuizRoom(code,s,action('arena-use',{at:now+5000,slot:0})),/잠시 뒤/,'Client timestamps must not bypass the server item cooldown');
});

test('missiles always launch up the course after sideways or backwards movement',async t=>{
 const {game,h,code,s,M,C}=await setup(t),tick=clock(t);for(const [fx,fy] of [[1,0],[-1,0],[0,-1]]){tick(1100);const room=await read(h,code),now=C.gameClock(room);await patch(h,code,s.playerId,{runner:{...M.freshRunner(now),x:0,y:300,fx,fy},gear:['missile']});const snap=await game.actQuizRoom(code,s,action('arena-use',{slot:0,at:now})),e=snap.arenaEffects.at(-1);assert.equal(e.dx,0);assert.equal(e.dy,1);assert.equal(e.x,0);assert.equal(e.y,345);const p=M.effectPosition(e,e.born+500);assert.equal(p.x,0);assert.equal(p.y,575);}
});

test('all timed city variants have safe checkpoints, scattered supply positions and stable shared geometry',async t=>{
 const {M}=await setup(t);for(const duration of [300,480,600,900])for(const seed of [1,42,98765]){const a={version:2,length:M.raceLength(duration),seed,combat:true};for(const cp of M.checkpoints(a))for(let at=4000;at<7600;at+=400)assert.ok(M.floorAt(M.trackAt(cp,a).center,cp,at,a),`Unsafe ${duration}s checkpoint: ${cp}`);for(const b of M.boxes(a))assert.ok(M.floorAt(b.x,b.y,6000,a));assert.ok(M.boxes(a).length>=9);assert.equal(M.stageAt(a.length-1,a).index,6);}
 const a={version:2,length:27000,seed:7,combat:true},r={...M.freshRunner(4000),x:M.center(800),y:800};const blocked=M.advanceRunner(M.control(r,0,1,false,false,4000,1),4700,a),jumped=M.advanceRunner(M.control(r,0,1,true,false,4000,1),4700,a);assert.ok(blocked.y<850);assert.ok(jumped.y>885,'The low barrier is visibly jumpable');
 const press=M.pistons(4000,a)[0];let warn=false,hit=false;for(let at=4000;at<7000;at+=100){const p=M.pistons(at,a).find(p=>p.y===press.y);warn||=p.state===1;hit||=p.state===2;}assert.ok(warn&&hit,'Presses must warn before becoming dangerous');
});
