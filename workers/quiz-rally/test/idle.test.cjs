const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const {build}=require('esbuild'),{Miniflare}=require('miniflare');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,accept){for(let i=0;i<200;i++){const value=await read();if(accept(value))return value;await sleep(10);}throw new Error('Idle state did not settle');}

// Inspection and forced alarm delivery exist only in this local test bundle.
// Production exports remain unchanged and have no diagnostic/state endpoint.
async function fixture(){
 const source=`
 import entry,{QuizRoom} from './src/index.ts';
 export class ProbeRoom extends QuizRoom {
  async fetch(request){
   const action=new URL(request.url).pathname.split('/').at(-1);
   if(action==='inspect')return this.enqueue(async()=>Response.json({
    status:this.game.room.status,revision:this.game.record.revision,players:this.game.room.players,
    synced:await this.ctx.storage.get('checkpoint-sync'),alarm:await this.ctx.storage.getAlarm(),
    expires:Date.parse(this.game.record.expires_at),timer:!!this.timer,syncing:this.syncing,
    authenticationTimers:this.authenticationTimers.size
   }));
   if(action==='legacy'){await this.ctx.storage.delete('checkpoint-sync');return Response.json({ok:true});}
   if(action==='deliver-alarm'){this.nextSync=0;await this.alarm();return Response.json({ok:true});}
   return super.fetch(request);
  }
 }
 export default {fetch(request,env){
  const match=/^\\/rooms\\/([^/]+)\\/([^/]+)\\/(inspect|legacy|deliver-alarm)$/.exec(new URL(request.url).pathname);
  return match?env.QUIZ_ROOMS.get(env.QUIZ_ROOMS.idFromName(match[1]+':'+match[2])).fetch(request):entry.fetch(request,env);
 }};`;
 const bundle=await build({stdin:{contents:source,resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,format:'esm',platform:'browser',external:['node:crypto'],write:false,target:'es2022'});
 const token=()=>randomBytes(32).toString('base64url'),secret=token(),teacher={role:'teacher',token:token(),playerId:''};
 const checkpoints=[];let available=true;
 const options={modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-07-01',compatibilityFlags:['nodejs_compat'],
  durableObjects:{QUIZ_ROOMS:{className:'ProbeRoom',useSQLite:true}},bindings:{QUIZ_REALTIME_SECRET:secret,APP_ORIGIN:'https://game.test'},
  outboundService:async request=>{checkpoints.push(await request.json());return new Response(available?'{"ok":true,"saved":true}':'{}',{status:available?200:503});}};
 const mf=new Miniflare(options),generation=randomUUID(),base=`https://room.test/rooms/ABC234/${generation}`;
 const record={code:'ABC234',teacher_key_hash:createHash('sha256').update(teacher.token).digest('hex'),expires_at:new Date(Date.now()+86400000).toISOString(),revision:0,savedAt:Date.now(),question_bank:null,state:{title:'Idle regression',durationSeconds:300,extension:false,stealEnabled:true,status:'lobby',endsAt:null,remainingMs:300000,metaRevision:0,requests:[],players:{},arena:{version:2,length:14000,seed:42,combat:true,energy:true,supplies:2},arenaEffects:[],arenaRevision:0,finishers:[],realtime:{version:1,generation,checkpoint:0}}};
 const send=async(action,value)=>{const response=await mf.dispatchFetch(base+'/'+action,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(value||{})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
 await send('init',record);
 const rpc=(identity,body)=>send('rpc',{identity,body}),inspect=()=>send('inspect');
 const settled=()=>until(inspect,s=>!s.syncing&&s.synced.revision>=s.revision);
 const student={role:'student',token:token(),playerId:randomUUID()};
 return {mf,record,teacher,student,checkpoints,rpc,inspect,settled,send,restart:()=>mf.setOptions(options),available:value=>available=value,
  async connect(){const response=await mf.dispatchFetch(base+'/socket',{headers:{Upgrade:'websocket',Origin:'https://game.test'}});assert.equal(response.status,101);const ws=response.webSocket;ws.accept();const events=[];ws.addEventListener('message',event=>events.push(JSON.parse(event.data)));ws.send(JSON.stringify({type:'auth',identity:student}));await until(async()=>events,events=>events.some(e=>e.type==='snapshot'));return {ws,events};}};
}

test('an unused lobby has only its expiry alarm, including after restart',async()=>{
 const h=await fixture();try{
  let state=await h.inspect();assert.equal(state.status,'lobby');assert.equal(state.alarm,state.expires);assert.equal(state.timer,false);
  await h.restart();await h.send('deliver-alarm');state=await h.inspect();
  assert.equal(state.synced.revision,state.revision);assert.equal(state.alarm,state.expires);assert.equal(h.checkpoints.length,0);
 }finally{await h.mf.dispose();}
});

test('ended results acknowledge once and stay asleep across repeated restarts',async()=>{
 const h=await fixture();try{
  await h.rpc(h.student,{action:'join',nickname:'기록보존'});await h.settled();
  await h.rpc(h.teacher,{action:'end',requestId:randomUUID()});const ended=await h.settled(),count=h.checkpoints.length;
  for(let i=0;i<3;i++){await h.restart();await h.send('deliver-alarm');const state=await h.inspect();assert.equal(state.status,'ended');assert.equal(state.revision,ended.revision);assert.equal(state.synced.revision,ended.revision);assert.equal(state.alarm,state.expires);assert.equal(state.players[h.student.playerId].nickname,'기록보존');}
  assert.equal(h.checkpoints.length,count,'hibernation must not forget a successful checkpoint');
 }finally{await h.mf.dispose();}
});

test('existing rooms without a sync marker migrate on their next wake and then sleep',async()=>{
 const h=await fixture();try{
  await h.send('legacy');await h.restart();await h.send('deliver-alarm');
  let state=await h.settled();assert.equal(state.alarm,state.expires);assert.equal(h.checkpoints.length,1);
  await h.restart();await h.send('deliver-alarm');state=await h.inspect();
  assert.equal(state.synced.revision,state.revision);assert.equal(h.checkpoints.length,1);
 }finally{await h.mf.dispose();}
});

test('failed idle checkpoints back off and stop after three retries, preserving the room',async()=>{
 const h=await fixture();try{
  h.available(false);await h.rpc(h.student,{action:'join',nickname:'저장재시도'});
  for(let attempt=1;attempt<=4;attempt++){
   const state=await until(h.inspect,s=>!s.syncing&&s.synced.attempts===attempt);
   assert.equal(h.checkpoints.length,attempt);
   if(attempt<4){const delay=state.alarm-Date.now(),expected=[0,60000,300000,900000][attempt];assert.ok(delay>expected-5000&&delay<=expected+1000,`retry ${attempt}: ${delay}`);}
   else assert.equal(state.alarm,state.expires,'no periodic alarm survives exhausted retries');
   await h.restart();if(attempt<4)await h.send('deliver-alarm');
  }
  await h.send('deliver-alarm');assert.equal(h.checkpoints.length,4);
  assert.equal((await h.rpc(h.student)).player.nickname,'저장재시도','durable local data remains readable');
  h.available(true);await h.rpc(h.teacher,{action:'end',requestId:randomUUID()});const state=await h.settled();
  assert.equal(state.synced.attempts,0);assert.equal(state.alarm,state.expires);assert.equal(state.players[h.student.playerId].nickname,'저장재시도');
 }finally{await h.mf.dispose();}
});

test('the last disconnect parks the race, clears timers and preserves progress on rejoin',async()=>{
 const h=await fixture();let client;try{
  await h.rpc(h.student,{action:'join',nickname:'다시접속'});await h.settled();client=await h.connect();
  assert.equal((await h.inspect()).authenticationTimers,0,'authenticated sockets must not retain the 10-second timer');
  await h.rpc(h.teacher,{action:'start',requestId:randomUUID()});assert.equal((await h.inspect()).timer,true);
  client.ws.close();const parked=await until(h.inspect,s=>s.status==='paused'&&!s.timer&&!s.syncing&&s.synced.revision>=s.revision);
  assert.equal(parked.alarm,parked.expires);await h.restart();
  const restored=await h.rpc(h.student);assert.equal(restored.status,'paused');assert.equal(restored.player.nickname,'다시접속');assert.deepEqual(restored.player.runner,parked.players[h.student.playerId].runner);
  client=await h.connect();await h.rpc(h.teacher,{action:'resume',requestId:randomUUID()});assert.equal((await h.inspect()).timer,true);
  await h.rpc(h.teacher,{action:'end',requestId:randomUUID()});await h.settled();assert.equal((await h.inspect()).timer,false);
 }finally{try{client?.ws.close();}catch{}await h.mf.dispose();}
});
