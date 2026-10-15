const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),http=require('node:http');
const {randomUUID,randomBytes}=require('node:crypto'),{WebSocket,WebSocketServer}=require('ws'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';process.env.DATABASE_URL_UNPOOLED='postgres://test';
const context={window:{}};for(const f of ['arena-model.js','arena-motion.js','arena-sync.js'])vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/'+f,'utf8'),context);
const {PoseTrack,LocalView}=context.window.quizArenaMotion,M=context.window.quizArenaModel;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const arena={version:1,length:4700,seed:7,combat:true,energy:true};
const r=()=>({...M.freshRunner(4000),x:0,y:300});

test('local jump height and landing match the physics on every frame; only reconciliation corrections ease out',()=>{
 const view=new LocalView(),start=M.control(r(),1,1,true,true,4000,1);
 for(const fps of [30,60,120])for(let t=4000;t<5100;t+=1000/fps){const physical=M.advanceRunner(start,t,arena),shown=view.sample(physical,1000/fps);assert.equal(shown.z,physical.z);assert.equal(shown.x,physical.x);assert.equal(shown.y,physical.y);}
 view.correct({...r(),x:20},r());assert.ok(view.sample(r(),16).x>0);for(let i=0;i<40;i++)view.sample(r(),16);assert.ok(Math.abs(view.sample(r(),16).x)<.01);
 view.correct({...r(),falls:1},r());assert.equal(view.sample(r(),16).x,0);
});
test('10 Hz poses stay continuous through jitter, duplicate/reordered messages and a short loss; stale streams stop',()=>{
 const track=new PoseTrack(),packets=[];
 for(let t=4000;t<10000;t+=100){const n=(t-4000)/100;packets.push({arrival:t+[80,130,100,160,90][n%5],pose:[t,0,300+(t-4000)*.175,0,0,175,0,0,1,0,n+1,0,-2000]});}
 packets.sort((a,b)=>a.arrival-b.arrival);let index=0,previous,movingFrames=0,stalledFrames=0,maxStep=0;
 for(let t=4000;t<10000;t+=1000/60){while(packets[index]?.arrival<=t){const q=packets[index++];track.push(q.pose,t);track.push(q.pose,t);}
  const shown=track.sample(t,r());if(!shown)continue;if(previous&&t>4700){const step=shown.y-previous.y;maxStep=Math.max(maxStep,Math.abs(step));movingFrames++;if(step<.5)stalledFrames++;assert.ok(step>=0,'no backwards correction during forward motion');}previous=shown;
 }
 assert.ok(movingFrames>300);assert.equal(stalledFrames,0);assert.ok(maxStep<5.59);assert.ok(track.samples.length<=24);
 assert.equal(track.sample(12000,r()),null);
});
test('remote jump keeps its analytic arc and pauses with the race clock',()=>{
 const track=new PoseTrack();for(let t=4000;t<=5000;t+=100){const s=(t-4000)/1000;track.push([t,0,300,Math.max(0,300*s-340*s*s),0,0,s<600/680?300-680*s:0,0,1,0,1,0,4000],t+100);}
 const shown=track.sample(5100,r()),frozen=track.sample(5100,r());assert.equal(frozen.z,shown.z);assert.equal(frozen.y,shown.y);
 track.clear();assert.equal(track.sample(5200,r()),null);
});
test('entering and leaving fast pose mode cannot teleport a previously visible classmate',()=>{
 const track=new context.window.quizArenaSync.RemoteTrack();track.setLive(true);track.push(r(),4100);
 const before=track.sample(M,4200,arena,[],'peer');
 track.pushPose([4200,40,330,0,0,175,0,0,1,0,1,0,-2000],4216);
 const fast=track.sample(M,4216,arena,[],'peer');assert.ok(Math.hypot(fast.x-before.x,fast.y-before.y)<=335*.016+.001);
 track.setLive(false);const fallback=track.sample(M,4232,arena,[],'peer');assert.ok(Math.hypot(fallback.x-fast.x,fallback.y-fast.y)<=335*.016+.001);
});
test('fast server projection preserves buffered dash jumps through delayed durable acknowledgements',async()=>{
 const h=await harness(),{MotionProjection}=h.load('lib/quiz-rally-motion.ts'),realNow=Date.now;let now=100000;Date.now=()=>now;
 try{
  const access={code:'ABCDEF',status:'running',roomRevision:1,arenaRevision:0,arena,effects:[],raceClock:4000,serverNow:now,duration:900000,runner:r(),version:0};
  const live=new MotionProjection(access,'p'),jump={seq:1,at:4000,dx:1,dy:1,jump:true,dash:true};live.inputs([jump]);
  now+=800;const frame=live.frame();assert.ok(frame.pose[3]>0);assert.equal(frame.pose[10],1);
  const repeat={...jump,seq:2,at:4800};live.inputs([repeat]);
  live.ack(M.control(r(),1,1,true,true,4000,1),1);now+=300;
  const buffered=live.frame();assert.ok(buffered.pose[3]>40);assert.ok(Math.abs(buffered.pose[12]-(4000+600/680*1000))<.01);
  assert.equal(live.pending.length,1);assert.ok(JSON.stringify(buffered).length<400);
  assert.throws(()=>live.inputs([{...jump,seq:3,dx:Infinity}]));assert.throws(()=>live.inputs([{...jump,seq:3},{...jump,seq:2}]));
  live.reset({...access,status:'paused',roomRevision:2,runner:{...live.anchor,jumpQueuedUntil:0},version:2});assert.equal(live.frame(),null);assert.equal(live.pending.length,0);
 }finally{Date.now=realNow;await h.close();}
});
test('independent authenticated WebSocket sessions relay fast inputs before an HTTP save; removal and close revoke access',async()=>{
 const h=await harness(),game=h.load('lib/quiz-rally.ts'),{serveQuizSocket}=h.load('lib/quiz-rally-socket.ts');
 const made=await game.createQuizRoom({title:'소켓 검사'}),teacher={role:'teacher',token:made.teacherKey,playerId:''};
 const students=Array.from({length:30},(_,i)=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID(),nickname:'학생'+i}));
 for(const s of students)await game.joinQuizRoom(made.code,s,{nickname:s.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});
 // Start beyond countdown without a real-time sleep.
 await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,'{endsAt}',to_jsonb($2::bigint)) WHERE code=$1",[made.code,Date.now()+900000-4000]);
 const server=http.createServer(),wss=new WebSocketServer({server,maxPayload:4096});wss.on('connection',ws=>serveQuizSocket(ws,made.code));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const clients=[];
 async function open(who){const ws=new WebSocket('ws://127.0.0.1:'+server.address().port);clients.push(ws);ws.playerId=who.playerId;ws.events=[];ws.on('message',data=>ws.events.push(JSON.parse(data)));await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'auth',...who}));return ws;}
 async function until(fn){for(let i=0;i<400;i++){if(fn())return;await sleep(20);}assert.fail('socket event timed out');}
 try{
  const a=await open(students[0]),b=await open(students[1]),bad=await open({...students[2],token:'bad'});
  await until(()=>a.events.some(e=>e.type==='ready')&&b.events.some(e=>e.type==='ready')&&bad.readyState===3);
  a.send(JSON.stringify({type:'input',inputs:[{seq:1,at:4100,dx:1,dy:1,jump:true,dash:true}]}));
  await until(()=>b.events.some(e=>e.type==='frame'&&e.id===students[0].playerId&&e.pose[3]>0));
  const peer=b.events.find(e=>e.type==='frame'&&e.id===students[0].playerId&&e.pose[3]>0);assert.ok(peer.pose[9]&1);
  const classmates=[];for(const student of students.slice(2))classmates.push(await open(student));await until(()=>classmates.every(c=>c.events.some(e=>e.type==='ready')));
  const clock=(await game.getQuizSnapshot(made.code,students[0])).raceClock;for(const c of classmates)c.send(JSON.stringify({type:'input',inputs:[{seq:1,at:Math.floor(clock),dx:0,dy:1,jump:false,dash:true}]}));
  await until(()=>classmates.every(c=>b.events.some(e=>e.type==='frame'&&e.id===c.playerId&&e.pose[10]===1)));
  const snapshot=await game.getQuizSnapshot(made.code,students[0]);assert.equal(snapshot.player.runner.seq,0,'visual projection never changes persistent game state');
  await game.actQuizRoom(made.code,teacher,{action:'remove',playerId:students[0].playerId,requestId:randomUUID()});await until(()=>a.readyState===3);
  assert.ok(!JSON.stringify(b.events).includes(students[0].token));
 }finally{for(const ws of clients)ws.close();for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));await h.close();}
});
