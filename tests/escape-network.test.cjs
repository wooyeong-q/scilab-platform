const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function setup(fetch, random=()=>0.5){
 const node={}, navigator={onLine:true}, document={hidden:false,getElementById:()=>node};
 let now=100000, sequence=0;
 const timers=new Map();
 class Clock extends Date { static now(){return now;} }
 const math=Object.create(Math);math.random=random;
 const box={window:{},navigator,document,AbortController,Date:Clock,Math:math,fetch,
  setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:now+ms});return id;},
  clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync('public/labs/star-escape/network.js','utf8'),box);
 async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
 async function advance(ms){
  const end=now+ms;
  for(;;){
   const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next)break;
   now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();
  }
  now=end;await flush();
 }
 return {api:box.window.StarEscapeNetwork,node,navigator,document,timers,advance,flush};
}
const ok=()=>({ok:true,json:async()=>({ok:true})});

test('offline prevents requests; recovery resumes polling and clears status',async()=>{
 let calls=0;const {api,node,navigator}=setup(async()=>{calls++;return ok();});
 navigator.onLine=false;await assert.rejects(api.request('/state'));assert.equal(calls,0);assert.equal(api.canPoll(),false);
 navigator.onLine=true;api.resume();await api.request('/state');assert.equal(api.canPoll(),true);assert.equal(node.hidden,true);
});
test('one failed read backs off; repeated actions cannot bypass the shared cooldown',async()=>{
 let calls=0,failed=true;
 const {api,advance}=setup(async()=>{calls++;if(failed)throw Error('network');return ok();});
 await assert.rejects(api.request('/state'));assert.equal(calls,1);assert.equal(api.canPoll(),false);
 await assert.rejects(api.request('/state'));await assert.rejects(api.request('/answers',{method:'POST'}));assert.equal(calls,1);
 await advance(5500);await assert.rejects(api.request('/state'));assert.equal(calls,2);
 await advance(10499);assert.equal(api.canPoll(),false);
 await advance(1);failed=false;await api.request('/state');assert.equal(api.canPoll(),true);
});
test('authentication and conflict responses remain actionable without connection retries',async()=>{
 for(const status of [401,409]){
  let calls=0;const {api}=setup(async()=>{calls++;return{ok:false,status,json:async()=>({error:'rejected'})};});
  await assert.rejects(api.request('/state'),{status});assert.equal(calls,1);assert.equal(api.canPoll(),true);
 }
});
test('lost mutation response never duplicates teacher start or player submission',async()=>{
 let calls=0;const {api}=setup(async()=>{calls++;throw Error('lost response');});
 await assert.rejects(api.request('/answers',{method:'POST'}));assert.equal(calls,1);
});
test('rate-limited HTML responses honor Retry-After and retain player authentication',async()=>{
 let calls=0;const {api,advance}=setup(async()=>{calls++;return{ok:false,status:429,headers:{get:()=> '60'},json:async()=>{throw Error('HTML response');}};});
 await assert.rejects(api.request('/state'),e=>e.connection===true&&e.status!==401);
 await advance(60000);assert.equal(api.canPoll(),false);
 await assert.rejects(api.request('/state'));assert.equal(calls,1);
 await advance(500);assert.equal(api.canPoll(),true);
});
test('polls wait for a slow response, then delay; recovery never overlaps a read',async()=>{
 let calls=0,release;
 const box=setup(async()=>ok());
 const poll=box.api.createPoller(()=>{calls++;if(calls===1)return new Promise(r=>release=r);},{interval:4000});
 poll.start();await box.advance(0);assert.equal(calls,1);
 await box.advance(10000);poll.resume();await box.advance(1000);assert.equal(calls,1);
 release();await box.flush();await box.advance(3000);assert.equal(calls,2);
 await box.advance(4500);assert.equal(calls,3);
 poll.stop();await box.advance(30000);assert.equal(calls,3);
});
test('hidden and offline screens stop polling; recovery is staggered and stopping cancels pending work',async()=>{
 let calls=0;const box=setup(async()=>ok());
 const poll=box.api.createPoller(async()=>{calls++;},{interval:4000});
 poll.start();await box.advance(0);assert.equal(calls,1);
 box.document.hidden=true;poll.pause();await box.advance(30000);assert.equal(calls,1);
 box.document.hidden=false;poll.resume();await box.advance(899);assert.equal(calls,1);
 await box.advance(1);assert.equal(calls,2);
 box.navigator.onLine=false;poll.pause();await box.advance(30000);assert.equal(calls,2);
 box.navigator.onLine=true;poll.resume();poll.stop();await box.advance(30000);assert.equal(calls,2);
});
test('45 simulated clients spread recovery and keep steady polling under the previous request budget',async()=>{
 let polls=0;const recovery=[];
 for(let i=0;i<45;i++){
  const box=setup(async()=>ok(),()=>i/45);
  const poll=box.api.createPoller(async()=>{polls++;},{interval:4000});
  poll.start();await box.advance(60000);poll.pause();poll.resume();
  recovery.push([...box.timers.values()][0].at);
  poll.stop();
 }
 assert.ok(polls<=45*16,`observed ${polls} reads; old schedule sends 45*25 including initial reads`);
 assert.equal(new Set(recovery).size,45);
});
