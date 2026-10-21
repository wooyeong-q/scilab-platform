const {test}=require('node:test'),assert=require('node:assert/strict');
test('lost join and submission responses retain identity and attempt; stale responses cannot roll progress back',async()=>{
 const saved=new Map();global.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};global.document={hidden:false};
 const {Session}=await import('../public/labs/first-love/client.mjs');
 let requests=[],fail=true;
 const state={group:{revision:1},state:{stage:0},contentKey:'stage0',content:{puzzle:{id:'P1'}}};
 global.fetch=async(url,options)=>{requests.push({url,...options});if(fail){fail=false;throw Error('response lost');}return {ok:true,status:200,json:async()=>structuredClone(state)};};
 const first=new Session(()=>{},()=>{}),join={code:'ABCDEFGH',team:1,role:1,name:'검증'};
 await assert.rejects(first.connect(join),/lost/);assert.equal(first.meta.pending,true);
 const restored=new Session(()=>{},()=>{});await restored.connect();restored.pause();assert.equal(restored.meta.pending,false);assert.equal(requests[0].headers.authorization,requests[1].headers.authorization);
 assert.equal(restored.setData({group:{revision:0},state:{stage:9}}),undefined);assert.equal(restored.data.state.stage,0);
 restored.setData({group:{revision:2},state:{stage:0},contentKey:'stage0'});assert.equal(restored.data.content.puzzle.id,'P1');
 const attempt={type:'submit',stage:0,draftVersion:1,attemptId:'stable-attempt'};fail=true;await assert.rejects(restored.send(attempt),/lost/);
 const reloaded=new Session(()=>{},()=>{});assert.deepEqual(reloaded.meta.pendingAttempt,attempt);await reloaded.connect();reloaded.pause();await reloaded.send(reloaded.meta.pendingAttempt);assert.equal(reloaded.meta.pendingAttempt,undefined);
 const bodies=requests.filter(r=>r.body).map(r=>JSON.parse(r.body));assert.equal(bodies.filter(b=>b.event?.attemptId==='stable-attempt').length,2);
 global.fetch=async()=>({ok:false,status:409,json:async()=>({error:'stale draft'})});await assert.rejects(reloaded.send(attempt),/stale/);assert.equal(reloaded.meta.pendingAttempt,undefined);
 first.pause();restored.pause();reloaded.forget();
});
