const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-model.js','utf8'),ctx);const M=ctx.window.quizArenaModel;
const arena={version:1,length:4700,seed:7,combat:true,energy:true},runner=(energy=100)=>({...M.freshRunner(4000),x:0,y:300,energy});
const near=(a,b,why)=>assert.ok(Math.abs(a-b)<1e-7,`${why}: ${a} vs ${b}`);

test('held dash trades energy for distance, preserves jump height and ends on release or depletion',()=>{
 const source=runner(),walk=M.advanceRunner(M.control(source,0,1,true,false,4000,1),4750,arena),dash=M.advanceRunner(M.control(source,0,1,true,true,4000,1),4750,arena);
 assert.ok(dash.y-300>(walk.y-300)*1.35);near(dash.z,walk.z,'same jump arc');near(dash.vz,walk.vz,'same vertical velocity');near(walk.energy,97,'ordinary drain');near(dash.energy,92.5,'dash drain');
 const airborne=M.advanceRunner(M.control(source,0,1,true,false,4000,1),4200,arena),started=M.control(airborne,0,1,false,true,4200,2);near(started.vz,airborne.vz,'midair dash does not force a dive');
 let released=M.advanceRunner(M.control(source,0,1,false,true,4000,1),4300,arena);released=M.advanceRunner(M.control(released,0,1,false,false,4300,2),4800,arena);near(released.energy,95,'release restores base drain');assert.equal(M.isDashing(released,arena),false);
 const idle=M.advanceRunner(M.control(source,0,0,false,true,4000,1),4500,arena);near(idle.energy,100,'holding Shift while idle does not drain energy');near(idle.y,300,'dash does not auto-drive');
 const empty=M.advanceRunner(M.control(runner(0),0,1,false,true,4000,1),4500,arena);near(empty.y,330.625,'empty battery still walks');assert.equal(M.isDashing(empty,arena),false);
 const expired=M.advanceRunner(M.control({...source,y:100},0,1,false,true,4000,1),9000,arena);near(expired.energy,78,'disconnect stops energy drain with movement');assert.equal(M.isDashing(expired,arena),false);
});

test('dash distance, energy depletion and input expiry are independent of render cadence',()=>{
 for(const energy of [100,1]){const start=M.control(runner(energy),0,1,true,true,4000,1),expected=M.advanceRunner(start,4750,arena);
  for(const fps of [30,60,120]){let r=start;for(let at=4000+1000/fps;at<4750;at+=1000/fps)r=M.advanceRunner(r,at,arena);r=M.advanceRunner(r,4750,arena);for(const key of ['x','y','z','energy'])near(r[key],expected[key],`${energy} charge ${fps}fps ${key}`);}
 }
});

test('diagonal dash stays on the same side of a barrier at client and server frame rates',()=>{
 const a={version:2,length:27000,seed:7,combat:true,energy:true};
 for(const wall of M.barriers(a).slice(0,6))for(const side of [-1,1])for(const dy of [-1,1]){
  const start={...runner(),x:wall.x+side*(wall.w/2+M.RADIUS-30),y:wall.y-dy*80};
  if(!M.floorAt(start.x,start.y,4000,a))continue;
  const pressed=M.control(start,-side,dy,false,true,4000,1),expected=M.advanceRunner(pressed,4650,a);
  for(const fps of [30,60,120]){let r=pressed;
   for(let at=4000+1000/fps;at<4650;at+=1000/fps)r=M.advanceRunner(r,at,a);
   r=M.advanceRunner(r,4650,a);
   assert.ok(Math.hypot(r.x-expected.x,r.y-expected.y)<1,`${fps}fps diagonal barrier ${wall.y}: prediction must not snap to another face`);
   assert.equal(M.isDashing(r,a),true,'contact does not release held dash');
   assert.ok((wall.y-r.y)*dy>=wall.depth/2+M.RADIUS,'front contact cannot teleport behind the wall');
  }
 }
});

test('every wind checkpoint has a stable refill and an empty runner can steer against peak crosswind',()=>{
 for(const duration of [300,480,600,900])for(const seed of [1,42]){const a={version:2,length:M.raceLength(duration),seed,combat:true,energy:true,supplies:2};
  for(const fan of M.fans(a)){const cp=M.checkpoints(a).filter(y=>y<fan.start).at(-1),box=M.boxes(a).find(b=>Math.hypot(b.x-M.trackAt(cp,a).center,b.y-cp)<100);assert.ok(box,'refill reachable from checkpoint');assert.ok(M.floorAt(box.x,box.y,4000,a));
   const y=fan.start+50,source={...runner(0),x:M.trackAt(y,a).center,y},sign=-Math.sign(fan.force);
   for(const at of [4000,5100,6200]){const r=M.advanceRunner(M.control({...source,t:at},sign,0,false,false,at,1),at+400,a);assert.ok((r.x-source.x)*sign>0,'wind must not exceed depleted lateral control');assert.equal(r.falls,0);}
  }
 }
});

test('all three wind crossings remain traversable with zero energy and no items',()=>{
 for(const duration of [300,900]){const a={version:2,length:M.raceLength(duration),seed:42,combat:true,energy:true,supplies:2};
  for(const fan of M.fans(a)){let at=4000,seq=0,y=fan.start-20,r={...runner(0),x:M.trackAt(y,a).center,y,checkpoint:M.checkpoints(a).filter(cp=>cp<fan.start).at(-1)};
   while(r.y<fan.end+35&&at<44000&&!r.falls){const gap=M.gaps(a,r.y-20,r.y+25)[0],jump=!!gap&&r.y>=gap.start-12&&r.y<gap.start&&r.z===0;
    const air=r.z>0||jump,nearGap=air&&M.gaps(a,r.y-15,r.y+35).some(g=>r.y>=g.start-35&&r.y<=g.end+15),drive=nearGap ? .78 : .35;
    const wind=M.fans(a,r.y,r.y).reduce((sum,w)=>sum+w.force*(.7+.3*Math.sin(at/700+w.phase))*(air ? .65 : 1)*.35,0),target=air?r.x:M.trackAt(r.y+20,a).center,dx=Math.max(-1,Math.min(1,(target-r.x)*.03-wind/(175*drive)));
    r=M.control(r,dx,1,jump,false,at,++seq);at+=40;r=M.advanceRunner(r,at,a);
   }
   assert.equal(r.falls,0,`${duration}s wind ${fan.start}: no fall at y=${r.y}`);assert.ok(r.y>fan.end,`${duration}s wind ${fan.start}: crosses without energy or items`);
  }
 }
});

const action=(action,extra={})=>({action,requestId:randomUUID(),...extra}),student=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
async function setup(t){const h=await harness();t.after(()=>h.close());const game=h.load('lib/quiz-rally.ts'),serverM=h.load('lib/quiz-rally-arena.ts'),C=h.load('lib/quiz-rally-course.ts');const made=await game.createQuizRoom({questions:[{prompt:'양성자의 전하는?',options:['양전하','음전하','중성','없음'],answer:0,topic:'물질의 구성',explanation:'양성자는 양전하입니다.'}]}),code=made.code,teacher={role:'teacher',token:made.teacherKey,playerId:''},a=student(),b=student();await Promise.all([a,b].map((s,i)=>game.joinQuizRoom(code,s,{nickname:'충전'+i})));await game.actQuizRoom(code,teacher,action('start'));const real=Date.now;let now=real()+4000;Date.now=()=>now;t.after(()=>Date.now=real);
 const read=async()=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;
 const patch=async(s,p)=>h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1`,[code,s.playerId,JSON.stringify(p)]);
 return{h,game,M:serverM,C,code,teacher,a,b,read,patch,tick:ms=>now+=ms};}

test('box respawn is per player, starts on question exit, survives refresh and freezes with the game',async t=>{
 const {game,M,C,code,teacher,a,b,read,patch,tick}=await setup(t);let room=await read();const box=M.boxes(room.arena)[0],gear=['banana','mine','shield'];
 for(const s of [a,b])await patch(s,{runner:{...M.freshRunner(C.gameClock(room)),x:box.x,y:box.y,energy:10},gear});
 await Promise.all([a,b].map(s=>game.actQuizRoom(code,s,action('arena-collect',{box:box.id}))));tick(12000);
 let snap=await game.getQuizSnapshot(code,a);assert.equal(snap.player.runner.energy,10);assert.equal(M.boxWait(snap.player.runner,box.id,snap.raceClock),8000);
 const answer=action('answer',{nonce:snap.player.turn.nonce,choice:snap.player.turn.options.indexOf('양전하')});[snap]=await Promise.all([game.actQuizRoom(code,a,answer),game.actQuizRoom(code,a,answer)]);assert.equal(snap.player.correct,1);assert.equal(snap.player.runner.energy,55);assert.deepEqual(snap.player.gear,gear);
 near(M.boxWait(snap.player.runner,box.id,snap.raceClock),8000,'cooldown begins after answer');tick(4000);await game.actQuizRoom(code,teacher,action('pause'));tick(20000);snap=await game.getQuizSnapshot(code,a);near(M.boxWait(snap.player.runner,box.id,snap.raceClock),4000,'pause freezes respawn');await game.actQuizRoom(code,teacher,action('resume'));
 await assert.rejects(game.actQuizRoom(code,a,action('arena-collect',{box:box.id,at:999999999})),/8초/);tick(3999);await assert.rejects(game.actQuizRoom(code,a,action('arena-collect',{box:box.id})),/8초/);tick(1);
 snap=await game.getQuizSnapshot(code,a);assert.equal(M.boxWait(snap.player.runner,box.id,snap.raceClock),0);const collect=action('arena-collect',{box:box.id});const both=await Promise.all([game.actQuizRoom(code,a,collect),game.actQuizRoom(code,a,collect)]);assert.equal(both[0].player.turn.nonce,both[1].player.turn.nonce);assert.equal(both[0].player.runner.open,true);assert.equal((await read()).players[a.playerId].runner.boxes.length,1);
 assert.equal((await game.getQuizSnapshot(code,b)).player.runner.open,true,'other player keeps their own open question');await game.actQuizRoom(code,a,action('arena-close'));snap=await game.getQuizSnapshot(code,a);near(M.boxWait(snap.player.runner,box.id,snap.raceClock),8000,'skipping also starts a fresh cooldown');
});

test('legacy collected boxes return and timed dash batches preserve server/client prediction',async t=>{
 const {game,M,C,code,a,read,patch,tick}=await setup(t);let room=await read(),now=C.gameClock(room),box=M.boxes(room.arena)[0],legacy={...M.freshRunner(now),x:box.x,y:box.y,boxes:[box.id]};delete legacy.boxReadyAt;
 await patch(a,{runner:{...legacy,open:true}});const closed=await game.actQuizRoom(code,a,action('arena-close'));assert.equal(M.boxWait(closed.player.runner,box.id,closed.raceClock),8000,'an already-open legacy question gets a cooldown on exit');
 await patch(a,{runner:legacy});const snap=await game.actQuizRoom(code,a,action('arena-collect',{box:box.id}));assert.equal(snap.player.runner.open,true);
 const source={...M.freshRunner(now),x:0,y:300},events=[{seq:1,at:now+10,dx:0,dy:1,jump:true,dash:true},{seq:2,at:now+300,dx:0,dy:1,jump:false,dash:false},{seq:3,at:now+600,dx:0,dy:0,jump:false,dash:false}];await patch(a,{runner:source});tick(800);
 const result=await game.actQuizRoom(code,a,action('arena-input',{inputs:events}));let expected=source;for(const e of events)expected=M.control(M.advanceRunner(expected,e.at,room.arena),e.dx,e.dy,e.jump,e.dash,e.at,e.seq);
 for(const key of ['x','y','z','vz','energy'])near(result.player.runner[key],expected[key],`server dash input ${key}`);assert.equal(result.player.runner.dash,false);assert.equal(result.player.runner.seq,3);
});
