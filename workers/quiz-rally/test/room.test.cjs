const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const {build}=require('esbuild'),{Miniflare}=require('miniflare');
const token=()=>randomBytes(32).toString('base64url');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=5000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw new Error('Timed out');await sleep(10);}}
async function worker(configure){
 const bundle=await build({entryPoints:[path.resolve(__dirname,'../src/index.ts')],bundle:true,format:'esm',platform:'browser',external:['node:crypto'],write:false,target:'es2022'});
 const secret=token(),checkpoints=[];
 const options={modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-07-01',compatibilityFlags:['nodejs_compat'],
  durableObjects:{QUIZ_ROOMS:{className:'QuizRoom',useSQLite:true}},bindings:{QUIZ_REALTIME_SECRET:secret,APP_ORIGIN:'https://game.test'},
  outboundService:async request=>{checkpoints.push(await request.json());return new Response('{"ok":true,"saved":true}',{headers:{'Content-Type':'application/json'}});}};
 const mf=new Miniflare(options);
 const generation=randomUUID(),code='ABC234',base=`https://room.test/rooms/${code}/${generation}`;
 const teacher={role:'teacher',token:token(),playerId:''};
 const record={code,teacher_key_hash:createHash('sha256').update(teacher.token).digest('hex'),expires_at:new Date(Date.now()+86400000).toISOString(),revision:0,savedAt:Date.now(),question_bank:null,state:{title:'30명 모의 경기',durationSeconds:300,extension:false,stealEnabled:true,status:'lobby',endsAt:null,remainingMs:300000,metaRevision:0,requests:[],players:{},arena:{version:2,length:14000,seed:42,combat:true,energy:true,supplies:2},arenaEffects:[],arenaRevision:0,finishers:[],realtime:{version:1,generation,checkpoint:0}}};
 if(configure)configure(record);
 const send=async(action,data)=>mf.dispatchFetch(base+'/'+action,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const init=await send('init',record);assert.equal(init.status,200);
 const rpc=async(identity,body)=>{const response=await send('rpc',{identity,body}),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
 async function connect(identity,playerDeltas=1){
  const response=await mf.dispatchFetch(base+'/socket',{headers:{Upgrade:'websocket',Origin:'https://game.test'}});assert.equal(response.status,101);
  const ws=response.webSocket,events=[];ws.accept();ws.addEventListener('message',event=>events.push(JSON.parse(event.data)));
  ws.send(JSON.stringify({type:'auth',identity,playerDeltas}));await until(()=>events.some(e=>e.type==='snapshot'));
  return {ws,events};
 }
 return {mf,base,secret,teacher,rpc,connect,checkpoints,record,restart:()=>mf.setOptions(options)};
}

test('Worker rejects wrong origins, unauthenticated room access, and leaked answer data',async()=>{
 const h=await worker();try{
  const denied=await h.mf.dispatchFetch(h.base+'/socket',{headers:{Upgrade:'websocket',Origin:'https://evil.test'}});assert.equal(denied.status,403);
  const privateDenied=await h.mf.dispatchFetch(h.base+'/rpc',{method:'POST',body:'{}'});assert.equal(privateDenied.status,403);
  const student={role:'student',token:token(),playerId:randomUUID()},s=await h.rpc(student,{action:'join',nickname:'검증학생'});
  const raw=JSON.stringify(s);for(const key of ['teacher_key_hash','tokenHash','question_bank','"answer"'])assert.equal(raw.includes(key),false,key);
  const bad=await h.mf.dispatchFetch(h.base+'/socket',{headers:{Upgrade:'websocket',Origin:'https://game.test'}}),ws=bad.webSocket;ws.accept();const events=[];ws.addEventListener('message',e=>events.push(JSON.parse(e.data)));
  ws.send(JSON.stringify({type:'auth',identity:{...student,token:token()}}));await until(()=>events.length);assert.equal(events[0].status,403);ws.close();
 }finally{await h.mf.dispose();}
});

test('SQLite state survives a Worker restart and a running race resumes only with teacher approval',async()=>{
 const h=await worker();try{
  const who={role:'student',token:token(),playerId:randomUUID()};
  await h.rpc(who,{action:'join',nickname:'복구학생'});
  const start=await h.rpc(h.teacher,{action:'start',requestId:randomUUID()});
  await h.restart();
  const recovered=await h.rpc(who);assert.equal(recovered.status,'paused');assert.equal(recovered.player.id,who.playerId);assert.equal(recovered.player.runner.dy,0);
  assert.ok(Math.abs(recovered.remainingMs-300000)<1000);assert.ok(recovered.roomRevision>start.roomRevision);
  const resume=await h.rpc(h.teacher,{action:'resume',requestId:randomUUID()});assert.equal(resume.status,'running');
  await h.rpc(h.teacher,{action:'end',requestId:randomUUID()});await h.restart();const ended=await h.rpc(who);assert.equal(ended.status,'ended');
 }finally{await h.mf.dispose();}
});

test('30 real WebSockets share authoritative frames, reconnect, and stop with the teacher',async()=>{
 const h=await worker(),clients=[];let interval;
 try{
  const students=Array.from({length:30},(_,i)=>({role:'student',token:token(),playerId:randomUUID(),nickname:'학생'+i}));
  for(const who of students)await h.rpc(who,{action:'join',nickname:who.nickname});
  clients.push(...await Promise.all(students.map(who=>h.connect(who))));
  const teacher=await h.connect(h.teacher);clients.push(teacher);
  const startId=randomUUID(),startAt=performance.now();teacher.ws.send(JSON.stringify({type:'request',id:startId,body:{action:'start',requestId:randomUUID()}}));
  await until(()=>teacher.events.some(e=>e.type==='response'&&e.id===startId));const actionMs=performance.now()-startAt;
  let seq=0;const sendInputs=()=>{
   seq++;clients.slice(0,30).forEach((client,i)=>{
    const snap=[...client.events].reverse().find(e=>e.type==='snapshot').data;
    client.ws.send(JSON.stringify({type:'input',roomRevision:snap.roomRevision,inputs:[{seq,at:Math.max(0,300000-(snap.endsAt-Date.now())),dx:0,dy:1,dash:i%2===0,jump:seq%4===0}]}));
   });
  };
  sendInputs();interval=setInterval(sendInputs,250);await sleep(5500);clearInterval(interval);interval=null;
  const frameCounts=clients.slice(0,30).map(c=>c.events.filter(e=>e.type==='world').length);
  assert.ok(Math.min(...frameCounts)>=30,JSON.stringify(frameCounts));
  for(const client of clients.slice(0,30)){
   const frame=[...client.events].reverse().find(e=>e.type==='world');assert.equal(frame.players.length,30);assert.ok(frame.self.runner.seq>=15);assert.ok(frame.self.runner.y>0);
   assert.equal(new Set(frame.ranking).size,30);
   const positions=new Map(frame.players.map(p=>[p.id,p.pose[2]]));
   for(let i=1;i<frame.ranking.length;i++)assert.ok(positions.get(frame.ranking[i-1])>=positions.get(frame.ranking[i]),'rank uses common positions');
   assert.deepEqual(frame.ranking,teacher.events.find(e=>e.type==='world'&&e.at===frame.at).ranking,'every participant receives the same order, including subpixel ties');
   assert.equal(client.events.some(e=>e.type==='error'),false);
  }
  const snapshotCount=teacher.events.filter(e=>e.type==='snapshot').length,inputId=randomUUID();
  clients[0].ws.send(JSON.stringify({type:'request',id:inputId,body:{action:'arena-input',requestId:randomUUID(),inputs:[{seq:++seq,at:5500,dx:0,dy:0}]}}));
  await until(()=>clients[0].events.some(e=>e.type==='response'&&e.id===inputId));
  assert.equal(teacher.events.filter(e=>e.type==='snapshot').length,snapshotCount,'movement fallback must not broadcast whole snapshots to the class');
  const writesBefore=h.checkpoints.length;assert.ok(writesBefore<=2,`Only bounded checkpoints, got ${writesBefore}`);
  clients[0].ws.close();await sleep(50);const rejoined=await h.connect(students[0]);clients.push(rejoined);
  const restored=rejoined.events.find(e=>e.type==='snapshot').data;assert.ok(restored.player.runner.seq>=15);
  const pauseId=randomUUID();teacher.ws.send(JSON.stringify({type:'request',id:pauseId,body:{action:'pause',requestId:randomUUID()}}));
  await until(()=>teacher.events.some(e=>e.type==='response'&&e.id===pauseId));
  await until(()=>rejoined.events.some(e=>e.type==='snapshot'&&e.data.status==='paused'));
  const paused=rejoined.events.at(-1).data?.raceClock;await sleep(200);const snap=await h.rpc(students[0]);assert.equal(snap.raceClock,paused);
  await h.rpc(h.teacher,{action:'end',requestId:randomUUID()});
  console.log(JSON.stringify({webSockets:31,simulationSeconds:5.5,minWorldFrames:Math.min(...frameCounts),startAcknowledgmentMs:Math.round(actionMs),neonCheckpointsDuringRace:writesBefore,reconnect:true,pause:true}));
 }finally{clearInterval(interval);for(const c of clients)try{c.ws.close();}catch{}await h.mf.dispose();}
});

// Seed ordinary player state in the local fixture only; production has no test endpoint.
const fs=require('node:fs'),ts=require('typescript'),loaded=new Map();
function load(file){file=path.resolve(__dirname,'../../..',file);if(!path.extname(file))file+='.ts';if(loaded.has(file))return loaded.get(file).exports;const m={exports:{}};loaded.set(file,m);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',source)(n=>n.startsWith('.')?load(path.resolve(path.dirname(file),n)):require(n),m,m.exports);return m.exports;}
const {QuizArenaRoom}=load('lib/quiz-rally-room'),M=load('lib/quiz-rally-arena'),{QUESTION_MAP}=load('lib/quiz-rally-questions');
async function socketRequest(c,body){const id=randomUUID(),start=performance.now();c.ws.send(JSON.stringify({type:'request',id,body}));await until(()=>c.events.some(e=>e.id===id));const e=c.events.find(e=>e.id===id);assert.equal(e.type,'response',JSON.stringify(e));return {data:e.data,ms:performance.now()-start};}
test('30 simultaneous answers and items send deltas, and durable actions survive restart without duplication',async()=>{
 const students=Array.from({length:30},(_,i)=>({role:'student',token:token(),playerId:randomUUID(),nickname:'동시'+i}));let box;
 const h=await worker(record=>{const game=new QuizArenaRoom(record);for(const who of students)game.join(who,{nickname:who.nickname});game.room.status='running';game.room.endsAt=Date.now()+296000;box=M.boxes(game.room.arena,0,700)[0];for(const p of Object.values(game.room.players)){Object.assign(p.runner,{x:box.x,y:box.y,t:4000,energy:40});p.gear=['missile'];}record.state=game.room;record.revision=game.record.revision;});
 const clients=[];try{
  clients.push(...await Promise.all(students.map(w=>h.connect(w))));const teacher=await h.connect(h.teacher);clients.push(teacher);
  const snapshots=clients.map(c=>c.events.filter(e=>e.type==='snapshot').length);
  const opened=await Promise.all(clients.slice(0,30).map(c=>socketRequest(c,{action:'arena-collect',box:box.id,requestId:randomUUID()})));
  const answers=await Promise.all(clients.slice(0,30).map((c,i)=>{const t=opened[i].data.player.turn,q=[...QUESTION_MAP.values()].find(q=>q.prompt===t.prompt);return socketRequest(c,{action:'answer',nonce:t.nonce,choice:t.options.indexOf(q.options[q.answer]),requestId:randomUUID()});}));
  const bodies=answers.map(a=>({action:'arena-use',slot:0,gear:a.data.player.gear.join(','),requestId:randomUUID()}));
  const used=await Promise.all(clients.slice(0,30).map((c,i)=>socketRequest(c,bodies[i])));
  await until(()=>teacher.events.some(e=>e.type==='world'&&e.changes?.some(p=>p.correct===1)));
  clients.forEach((c,i)=>assert.equal(c.events.filter(e=>e.type==='snapshot').length,snapshots[i],'ordinary actions do not rebroadcast full room snapshots'));
  for(const c of clients)for(const frame of c.events.filter(e=>e.type==='world'))for(const change of frame.changes||[])for(const privateKey of ['turn','tokenHash','requests','gear'])assert.equal(privateKey in change,false);
  const before=used.map(x=>x.data.player);
  const legacy=await h.connect({...h.teacher},0);clients.push(legacy); // supersedes only the observer
  await socketRequest(clients[0],{action:'arena-close',requestId:randomUUID()});
  await until(()=>legacy.events.filter(e=>e.type==='snapshot').length>1,2000);
  await h.restart();
  for(let i=0;i<30;i++){
   const restored=await h.rpc(students[i]);assert.equal(restored.status,'paused');assert.equal(restored.player.correct,1);assert.deepEqual(restored.player.gear,before[i].gear);
   const retry=await h.rpc(students[i],bodies[i]);assert.deepEqual(retry.player.gear,before[i].gear,'replayed item is not consumed again');
  }
  const restored=await h.rpc(students[0]);assert.equal(restored.arenaEffects.filter(e=>e.type==='missile').length,30,'all committed missiles survive the delta journal');
  console.log(JSON.stringify({simultaneousStudents:30,answerP95Ms:Math.round(answers.map(x=>x.ms).sort((a,b)=>a-b)[28]),itemP95Ms:Math.round(used.map(x=>x.ms).sort((a,b)=>a-b)[28]),fullRoomBroadcastsFor90Actions:0,recoveredPlayers:30}));
 }finally{for(const c of clients)try{c.ws.close();}catch{}await h.mf.dispose();}
});

test('crossing the finish line is confirmed to student and teacher and survives reconnect',async()=>{
 const student={role:'student',token:token(),playerId:randomUUID()};
 const h=await worker(record=>{const game=new QuizArenaRoom(record);game.join(student,{nickname:'결승검사'});game.room.status='running';game.room.endsAt=Date.now()+296000;Object.assign(game.room.players[student.playerId].runner,{x:M.center(game.room.arena.length),y:game.room.arena.length-20,t:4000});record.state=game.room;record.revision=game.record.revision;});
 const clients=[];try{
 const teacher=await h.connect(h.teacher),c=await h.connect(student);clients.push(teacher,c);const before=c.events.find(e=>e.type==='snapshot').data;assert.equal(before.player.finish,null);
 c.ws.send(JSON.stringify({type:'input',roomRevision:before.roomRevision,inputs:[{seq:1,at:before.raceClock,dx:0,dy:1,jump:false,dash:false}]}));
 await until(()=>c.events.some(e=>e.type==='snapshot'&&e.data.player?.finish?.place===1));
 await until(()=>teacher.events.some(e=>e.type==='snapshot'&&e.data.ranking[0]?.finish?.place===1));
 const finished=c.events.find(e=>e.type==='snapshot'&&e.data.player?.finish);assert.ok(finished.data.player.runner.y>=finished.data.arena.length);assert.ok(Number.isFinite(finished.data.player.runner.finishAt));
 c.ws.close();const again=await h.connect(student);clients.push(again);assert.equal(again.events.find(e=>e.type==='snapshot').data.player.finish.place,1);
 }finally{for(const c of clients)try{c.ws.close();}catch{}await h.mf.dispose();}
});
