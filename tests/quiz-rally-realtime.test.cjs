const test=require('node:test'),assert=require('node:assert/strict'),{randomBytes,randomUUID}=require('node:crypto');
const fs=require('node:fs'),vm=require('node:vm'),{harness}=require('./helpers.cjs');
const who=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function next(reader){const result=await Promise.race([reader.read(),sleep(3000).then(()=>{throw new Error('No stream event');})]);return result.done?null:JSON.parse(new TextDecoder().decode(result.value).slice(6));}
async function setup(){
 process.env.DATABASE_URL='postgres://test';process.env.DATABASE_URL_UNPOOLED='postgres://test';const h=await harness(),game=h.load('lib/quiz-rally.ts'),route=h.load('app/api/labs/quiz-rally/sessions/[code]/events/route.ts');
 const room=await game.createQuizRoom({title:'실시간 검증'}),teacher={role:'teacher',token:room.teacherKey,playerId:''};
 const student=who();await game.joinQuizRoom(room.code,student,{nickname:'검증1'});
 const open=async(identity=student,code=room.code,origin)=>{
  const abort=new AbortController(),req=new Request('http://localhost/api/'+code+'/events',{signal:abort.signal,headers:{Authorization:'Bearer '+identity.token,'X-Quiz-Role':identity.role,'X-Player-Id':identity.playerId,...(origin?{Origin:origin}:{})}});
  const response=await route.GET(req,{params:Promise.resolve({code})});return {response,abort,reader:response.body?.getReader()};
 };
 return {h,game,room,teacher,student,open};
}
test('authenticated streams publish committed movement without polling; ordered versions and no private fields',async()=>{
 const {h,game,room,teacher,student,open}=await setup();let stream;
 try{
  await game.actQuizRoom(room.code,teacher,{action:'start',requestId:randomUUID()});
  stream=await open();assert.equal(stream.response.status,200);assert.equal((await next(stream.reader)).type,'ready');
  const before=h.queries.length;
  const data=await game.actQuizRoom(room.code,student,{action:'arena-input',requestId:randomUUID(),inputs:[{seq:1,at:0,dx:1,dy:1,jump:true,dash:true}]});
  const event=await next(stream.reader);assert.equal(event.type,'motion');assert.equal(event.id,student.playerId);assert.equal(event.runner.seq,1);assert.equal(event.runner.dash,true);
  assert.equal(event.version,data.ranking.find(p=>p.id===student.playerId).version);assert.equal(event.roomRevision,data.roomRevision);
  for(const secret of [student.token,room.teacherKey,'tokenHash','nonce','inventory','boxReadyAt','questionBox'])assert.ok(!JSON.stringify(event).includes(secret),secret);
  assert.ok(Buffer.byteLength(JSON.stringify(event))<7900);assert.ok(!h.queries.slice(before).some(q=>q.query.startsWith('SELECT pg_notify')),'publication needs no extra query');
  await game.actQuizRoom(room.code,student,{action:'arena-input',requestId:randomUUID(),inputs:[{seq:2,at:1,dx:0,dy:0,jump:false,dash:true}]});
  const stop=await next(stream.reader);assert.ok(stop.version>event.version);assert.equal(stop.runner.dx,0);assert.equal(stop.runner.dy,0);
 }finally{stream?.abort.abort();await h.close();}
});
test('stream authorization, room isolation, teacher removal and abort release listeners',async()=>{
 const {h,game,room,teacher,student,open}=await setup();let a,b;
 try{
  assert.equal((await open({...student,token:'wrong'})).response.status,403);
  assert.equal((await open(student,room.code,'https://foreign.example')).response.status,403);
  const other=await game.createQuizRoom({title:'별도 방'}),outsider=who();await game.joinQuizRoom(other.code,outsider,{nickname:'별도'});
  assert.equal((await open(outsider)).response.status,403);assert.equal(h.liveClients.size,0);
  a=await open();b=await open(outsider,other.code);await next(a.reader);await next(b.reader);assert.equal(h.liveClients.size,2);
  await game.actQuizRoom(room.code,teacher,{action:'remove',playerId:student.playerId,requestId:randomUUID()});
  assert.equal(await next(a.reader),null,'removed student receives no further room data');await sleep(10);assert.equal(h.liveClients.size,1);
  const teacherOther={role:'teacher',token:other.teacherKey,playerId:''};await game.actQuizRoom(other.code,teacherOther,{action:'start',requestId:randomUUID()});
  const event=await next(b.reader);assert.equal(event.code,other.code);assert.equal(event.type,'refresh');
  b.abort.abort();await sleep(10);assert.equal(h.liveClients.size,0);
 }finally{a?.abort.abort();b?.abort.abort();await h.close();}
});
test('30 subscribed students receive one committed update each and disconnect cleanly',async()=>{
 const {h,game,room,teacher,student,open}=await setup();const streams=[];
 try{
  const identities=[student,...Array.from({length:29},who)];for(let i=1;i<identities.length;i++)await game.joinQuizRoom(room.code,identities[i],{nickname:'검증'+(i+1)});
  await game.actQuizRoom(room.code,teacher,{action:'start',requestId:randomUUID()});
  for(const identity of identities){const s=await open(identity);streams.push(s);await next(s.reader);}
  assert.equal(h.liveClients.size,30);
  await game.actQuizRoom(room.code,student,{action:'arena-input',requestId:randomUUID(),inputs:[{seq:1,at:0,dx:1,dy:1,jump:true,dash:true}]});
  const events=await Promise.all(streams.map(s=>next(s.reader)));assert.equal(events.length,30);assert.ok(events.every(e=>e.id===student.playerId&&e.runner.seq===1));
 }finally{for(const s of streams)s.abort.abort();await h.close();assert.equal(h.liveClients.size,0);}
});
test('live remote prediction crosses heartbeat gaps without pauses; stale versions cannot rewind physics',()=>{
 const ctx={window:{}};for(const file of ['arena-model.js','arena-sync.js'])vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/'+file,'utf8'),ctx);
 const M=ctx.window.quizArenaModel,N=ctx.window.quizArenaSync,arena={version:1,length:4700,seed:7,energy:true,combat:true},track=new N.RemoteTrack();track.setLive(true);
 const a=M.control({...M.freshRunner(4000),x:0,y:300},0,1,true,true,4000,1);track.push(a,4100);
 const points=[];for(let at=4100;at<=4750;at+=1000/60)points.push(track.sample(M,at,arena,[],'peer'));
 assert.ok(points.at(-1).y-points.at(-2).y>1,'prediction continues until next 650 ms heartbeat');
 track.push({...a,t:3999,x:900},4800);assert.equal(track.samples.at(-1).t,4000);
 let last=points.at(-1);track.push(M.control(M.advanceRunner(a,4650,arena),0,-1,false,true,4650,2),4800);
 for(let at=4800;at<5400;at+=1000/60){const shown=track.sample(M,at,arena,[],'peer');assert.ok(Math.hypot(shown.x-last.x,shown.y-last.y)<=335*.08+.001);last=shown;}
 track.setLive(false);assert.equal(track.live,false);
});
test('fragmented streams reconnect, resync and never put credentials in URLs',async()=>{
 let requests=0,events=0,resyncs=0,states=[],current;const timers=new Set();
 const ctx={window:{},AbortController,TextDecoder,setTimeout:(fn,ms)=>{const id=setTimeout(fn,ms);timers.add(id);return id;},clearTimeout,fetch:async(url,options)=>{
  requests++;assert.equal(url,'/events');assert.equal(options.headers.Authorization,'Bearer private-token');
  const body=new ReadableStream({start(c){current=c;options.signal.addEventListener('abort',()=>{try{c.close();}catch{}});c.enqueue(new TextEncoder().encode('data: {"type":"rea'));c.enqueue(new TextEncoder().encode('dy"}\n\ndata: {"type":"motion"}\n\n'));}});
  return new Response(body,{headers:{'content-type':'text/event-stream'}});
 }};
 vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-live.js','utf8'),ctx);
 const live=new ctx.window.quizArenaLive({event:()=>events++,status:s=>states.push(s),refresh:()=>resyncs++});
 try{live.configure('/events',{role:'student',token:'private-token',playerId:'id'},true);await sleep(20);assert.equal(live.ready,true);assert.equal(events,1);current.close();await sleep(900);assert.ok(requests>=2);assert.equal(resyncs,requests);assert.deepEqual(states.slice(0,3),[true,false,true]);live.stop();await sleep(10);assert.equal(live.ready,false);}
 finally{live.stop();for(const id of timers)clearTimeout(id);}
});
