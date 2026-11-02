const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function browser(){
 let now=0,id=0;
 const timers=new Map(),events=new Map(),saved=new Map(),notices=[];
 const listen=(name,fn)=>{const callbacks=events.get(name)||[];callbacks.push(fn);events.set(name,callbacks);};
 const document={hidden:false,addEventListener:listen,body:{appendChild:n=>notices.push(n)},createElement:()=>({style:{},setAttribute(){},remove(){notices.pop();}})};
 class Clock extends Date {static now(){return now;}}
 const box={document,navigator:{onLine:true},Date:Clock,Set,Math,URLSearchParams,AbortSignal,structuredClone,console,
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
  setTimeout(fn,delay){const key=++id;timers.set(key,{fn,at:now+delay});return key;},clearTimeout:key=>timers.delete(key)};
 box.window=box;box.addEventListener=listen;vm.createContext(box);
 vm.runInContext(fs.readFileSync('public/labs/classroom-connection.js','utf8'),box);
 async function flush(){for(let n=0;n<20;n++)await Promise.resolve();}
 async function advance(ms){const end=now+ms;let turns=0;for(;;){const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;assert.ok(++turns<10000,'timer loop must remain bounded');now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=end;await flush();}
 function event(name,extra={}){for(const fn of events.get(name)||[])fn({type:name,isTrusted:true,...extra});}
 function load(file){const mod={exports:{}};box.module=mod;box.exports=mod.exports;box.require=()=>({SAMPLE:{},ESCAPE_SAMPLE:{},DEMO_LESSONS:{}});const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInContext(code,box);return mod.exports;}
 return{box,timers,notices,advance,event,load,flush};
}

test('automatic reads and visibility changes cannot renew an abandoned connection; trusted input resumes once',async()=>{
 const h=browser(),gate=h.box.SciLabClassroom;let resumed=0;gate.onResume(()=>resumed++);
 for(let n=0;n<20;n++){assert.equal(gate.canPoll(),true);await h.advance(60000);}
 assert.equal(gate.canPoll(),false);assert.equal(h.notices.length,1);
 h.event('visibilitychange');h.event('online');assert.equal(resumed,0);
 h.event('pointerdown',{isTrusted:false});assert.equal(gate.canPoll(),false);
 h.event('keydown');assert.equal(resumed,1);assert.equal(gate.canPoll(),true);assert.equal(h.notices.length,0);
 h.box.document.hidden=true;assert.equal(gate.canPoll(),false);
 h.box.document.hidden=false;h.box.navigator.onLine=false;assert.equal(gate.canPoll(),false);
 h.box.navigator.onLine=true;h.event('online');assert.equal(resumed,2);
});

test('star escape resumes its idle poller once with the same connection and unsubscribes when stopped',async()=>{
 const h=browser();vm.runInContext(fs.readFileSync('public/labs/star-escape/network.js','utf8'),h.box);
 let reads=0;const poller=h.box.StarEscapeNetwork.createPoller(async()=>{reads++;},{interval:4000});
 poller.start();await h.advance(20*60000);const idle=reads;await h.advance(60000);assert.equal(reads,idle);
 h.event('pointerdown');await h.advance(1600);assert.equal(reads,idle+1);
 poller.stop();await h.advance(20*60000);h.box.SciLabClassroom.canPoll();h.event('keydown');await h.advance(10000);assert.equal(reads,idle+1);
});

for(const [file,exportName]of [['common-escape/group-client.mjs','GroupSession'],['first-love/client.mjs','Session']]){
 test(`${exportName}: hidden and idle lessons send no reads; resuming preserves identity and ended sessions stay stopped`,async()=>{
  const h=browser(),Client=h.load('public/labs/'+file)[exportName];let reads=0,ended=false;const tokens=[];
  h.box.fetch=async(_url,opts)=>{reads++;tokens.push(opts.headers.authorization);return{ok:true,status:200,json:async()=>({group:{status:ended?'ended':'playing',revision:reads},state:{stage:0}})};};
  const c=new Client(()=>{},()=>{});c.meta={code:'ABCDEFGH',token:'same-seat'};c.data={group:{status:'playing',revision:0}};c.active=true;c.schedule(0);
  await h.advance(5000);assert.ok(reads>0);
  h.box.document.hidden=true;const before=reads;await h.advance(60000);assert.equal(reads,before);
  h.box.document.hidden=false;h.event('visibilitychange');await h.advance(0);assert.equal(reads,before+1);
  await h.advance(20*60000);const idle=reads;await h.advance(5*60000);assert.equal(reads,idle);
  h.event('pointerdown');await h.advance(0);assert.equal(reads,idle+1);assert.equal(c.meta.token,'same-seat');assert.ok(tokens.every(t=>t==='Bearer same-seat'));
  ended=true;await h.advance(3000);const final=reads;assert.equal(c.data.group.status,'ended');await h.advance(60000);h.event('visibilitychange');await h.advance(5000);assert.equal(reads,final);c.pause();
 });
 test(`${exportName}: a removed lesson stops automatic retries`,async()=>{
  const h=browser(),Client=h.load('public/labs/'+file)[exportName];let reads=0;
  h.box.fetch=async()=>{reads++;return{ok:false,status:404,json:async()=>({error:'lesson no longer exists'})};};
  const c=new Client(()=>{},()=>{});c.meta={code:'ABCDEFGH',token:'same-seat'};c.data={group:{status:'playing',revision:0}};c.active=true;c.schedule(0);
  await h.advance(60000);assert.equal(reads,1);assert.equal(c.active,false);c.pause();
 });
}

for(const lab of ['common-escape','first-love']){
 test(`${lab} teacher: hidden/idle views stop reads, no overlap, and a final or expired snapshot stops retries`,async()=>{
  const h=browser(),Author=h.load(`public/labs/${lab}/author.mjs`).Author;
  const a=lab==='common-escape'?new Author({},{preview(){},home(){}}):new Author({},()=>{},()=>{});
  a.render=()=>{};a.active=true;a.view={status:'playing'};let reads=0,release;
  a.api=async()=>{reads++;return new Promise(r=>release=r);};a.poll();await h.advance(5000);assert.equal(reads,1);
  h.event('visibilitychange');await h.advance(15000);assert.equal(reads,1,'a slow request must not overlap');
  release({status:'playing'});await h.flush();
  h.box.document.hidden=true;await h.advance(60000);assert.equal(reads,1);
  h.box.document.hidden=false;a.api=async()=>{reads++;return{status:'playing'};};h.event('visibilitychange');await h.advance(5000);assert.equal(reads,2);
  await h.advance(20*60000);const idle=reads;await h.advance(60000);assert.equal(reads,idle);
  h.event('pointerdown');await h.advance(5000);assert.equal(reads,idle+1);
  a.api=async()=>{reads++;return{status:'ended'};};await h.advance(5000);const final=reads;await h.advance(60000);h.event('visibilitychange');await h.advance(6000);assert.equal(reads,final);
  a.view={status:'playing'};a.api=async()=>{reads++;const e=new Error('expired');e.status=410;throw e;};a.poll();await h.advance(60000);assert.equal(reads,final+1);a.pause();
 });
}

test('galaxy fetches the final ranking, drains pending notifications, then stops even after visibility changes',async()=>{
 const h=browser(),b=h.box;let reads=0,painted=0;
 Object.assign(b,{studentSyncStopped:false,classroom:{code:'ABC234'},scoreboardLoading:false,scoreboardTimer:0,actionEpoch:0,syncFailures:0,
  performance:{now:()=>0},classBlocked:()=>true,started:false,mode:'map',boardVersion:'',progressVersion:'',peerVersions:{},notificationCursor:{},notificationSeen:new Set(),lastLocalSave:0,
  actionQueue:{busy:false,flush(){}},ui:{scoreRank:{}},classroomHeaders:()=>({}),setText(){},applyFlightSnapshot(){},saveClassroom(){},showToast(){},
  renderScoreboard(data){painted++;assert.equal(data.leaders[0].score,100);},syncTiming(){},
  requestJson:async()=>{reads++;return{response:{ok:true},data:{timing:{state:'ended'},leaders:[{score:100}],notifications:[],notificationCursor:{},moreNotifications:reads===1,serverTime:'2026-11-02T06:00:00Z'}};}});
 const html=fs.readFileSync('public/labs/galaxy-voyage/index.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const src=ts.createSourceFile('galaxy.js',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),picked=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&['scheduleClassSync','loadScoreboard'].includes(n.name?.text))picked.push(n.getText(src));else ts.forEachChild(n,visit);}visit(src);vm.runInContext(picked.join('\n'),b);
 await b.loadScoreboard();assert.equal(b.studentSyncStopped,false);await h.advance(1000);assert.equal(reads,2);assert.equal(painted,2);assert.equal(b.studentSyncStopped,true);
 await b.loadScoreboard();h.event('visibilitychange');await h.advance(60000);assert.equal(reads,2);
 b.studentSyncStopped=false;b.actionQueue.busy=true;await b.loadScoreboard();assert.equal(b.studentSyncStopped,false,'an in-flight action must not suppress the final ranking read');assert.equal(painted,2);
 b.actionQueue.busy=false;await h.advance(3500);assert.equal(reads,4);assert.equal(painted,3);assert.equal(b.studentSyncStopped,true);
});
