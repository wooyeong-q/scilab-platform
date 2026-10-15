const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),http=require('node:http');
const {randomUUID,randomBytes}=require('node:crypto'),{WebSocket,WebSocketServer}=require('ws'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';process.env.DATABASE_URL_UNPOOLED='postgres://test';
const context={window:{}};for(const f of ['arena-model.js','arena-motion.js','arena-sync.js'])vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/'+f,'utf8'),context);
const {PoseTrack,LocalView}=context.window.quizArenaMotion,M=context.window.quizArenaModel;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const arena={version:1,length:4700,seed:7,combat:true,energy:true};
const r=()=>({...M.freshRunner(4000),x:0,y:300});

test('motion uploads overlap in bounded batches without losing inputs when responses reorder',async()=>{
 const requests=[],env={window:{},URL,location:{href:'https://game.test/'},Date,AbortController,setTimeout,clearTimeout,
  fetch(url,options){return new Promise(resolve=>requests.push({url:String(url),options,resolve}));}};
 vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-live.js','utf8'),env);
 const live=new env.window.quizArenaLive({event(){},status(){},refresh(){}});
 live.url='/api/labs/quiz-rally/sessions/ABCDEF/events';live.key='active';live.who={role:'student',playerId:'p',token:'test'};live.fast=true;
 const revision={roomRevision:1,arenaRevision:0},input={seq:1,at:4000,dx:1,dy:1,jump:false,dash:true};
 live.sendInput(input,revision);await sleep(20);assert.equal(requests.length,1);
 live.sendInput({...input,seq:2,jump:true},revision);live.sendInput({...input,seq:3,dx:0},revision);await sleep(120);
 assert.equal(requests.length,2);assert.equal(live.inputRequests.size,2);
 assert.deepEqual(JSON.parse(requests[1].options.body).inputs.map(e=>e.seq),[1,2,3]);
 requests[1].resolve({ok:true});await sleep(1);assert.equal(live.inputs.length,0);
 requests[0].resolve({ok:true});await sleep(1);assert.equal(live.inputs.length,0);assert.equal(live.inputRequests.size,0);live.stop();
});
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

test('authenticated HTTP motion and independent streams deliver 10 Hz poses without persistent game writes',async()=>{
 const h=await harness(),game=h.load('lib/quiz-rally.ts'),{quizStream}=h.load('lib/quiz-rally-stream.ts'),route=h.load('app/api/labs/quiz-rally/sessions/[code]/motion/route.ts');
 const made=await game.createQuizRoom({title:'스트림 확인'}),teacher={role:'teacher',token:made.teacherKey,playerId:''};
 const students=[0,1].map(i=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID(),nickname:'스트림'+i}));
 for(const s of students)await game.joinQuizRoom(made.code,s,{nickname:s.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});
 await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,'{endsAt}',to_jsonb($2::bigint)) WHERE code=$1",[made.code,Date.now()+900000-4000]);
 const streams=[];async function until(fn){for(let i=0;i<400;i++){if(fn())return;await sleep(20);}assert.fail('stream event timed out');}
 function headers(who){return {'Content-Type':'application/json',Authorization:'Bearer '+who.token,'X-Quiz-Role':who.role,'X-Player-Id':who.playerId};}
 async function publish(who,body){return route.POST(new Request('http://localhost/api/labs/quiz-rally/sessions/'+made.code+'/motion',{method:'POST',headers:headers(who),body:JSON.stringify(body)}),{params:Promise.resolve({code:made.code})});}
 try{
  for(const who of students){const abort=new AbortController(),events=[];const response=await quizStream(new Request('http://localhost/events?motion=1',{signal:abort.signal}),made.code,who),reader=response.body.getReader();
   const stream={abort,events,done:false};streams.push(stream);stream.read=(async()=>{const decoder=new TextDecoder();let buffer='';while(true){const{value,done}=await reader.read();if(done){stream.done=true;break;}buffer+=decoder.decode(value,{stream:true});let i;while((i=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,i);buffer=buffer.slice(i+2);if(block.startsWith('data: '))events.push(JSON.parse(block.slice(6)));}}})();
  }
  await until(()=>streams.every(s=>s.events.some(e=>e.type==='ready'&&e.motion===true)));
  const snapshot=await game.getQuizSnapshot(made.code,students[0]),input={seq:1,at:Math.floor(snapshot.raceClock),dx:1,dy:1,jump:true,dash:true},body={inputs:[input],roomRevision:snapshot.roomRevision,arenaRevision:snapshot.arenaRevision};
  assert.equal((await publish(students[0],body)).status,204);
  await until(()=>streams[1].events.some(e=>e.type==='frame'&&e.id===students[0].playerId&&e.pose[3]>0&&e.pose[10]===1));
  await sleep(350);assert.ok(streams[1].events.filter(e=>e.type==='frame'&&e.pose[10]===1).length>=3);
  assert.equal((await game.getQuizSnapshot(made.code,students[0])).player.runner.seq,0);
  assert.equal((await publish({...students[0],token:students[1].token},body)).status,409);
  assert.equal((await publish(students[0],{...body,roomRevision:body.roomRevision+1})).status,409);
  assert.equal((await publish(students[0],{...body,inputs:[{...input,dx:100}]})).status,400);
  await game.actQuizRoom(made.code,teacher,{action:'remove',playerId:students[0].playerId,requestId:randomUUID()});await until(()=>streams[0].done);
  assert.ok(!JSON.stringify(streams[1].events).includes(students[0].token));
 }finally{for(const stream of streams)stream.abort.abort();await Promise.all(streams.map(s=>s.read));await h.close();}
});

test('presentation adapts to a 300 ms link without periodic braking or inflating on idle heartbeats',()=>{
 const track=new PoseTrack(),steps=[];let next=4000,previous;
 for(let clock=4000;clock<16000;clock+=1000/60){if(clock>=next){track.push([next-100,0,300+(next-4000)*.175,0,0,175,0,0,1,0,1,0,-2000],clock);next+=300;}
  const shown=track.sample(clock,r());if(shown&&previous&&clock>11000)steps.push(shown.y-previous.y);if(shown)previous=shown;
 }
 assert.ok(track.delay>=360&&track.delay<=400);assert.ok(Math.min(...steps)>2.5);assert.ok(Math.max(...steps)<3.4);
 const delay=track.delay;track.push([17000,0,2400,0,0,0,0,0,1,0,2,0,-2000],17100);track.push([18000,0,2400,0,0,0,0,0,1,0,2,0,-2000],18100);assert.equal(track.delay,delay);
});
