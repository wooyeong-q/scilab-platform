const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function sync(){const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-sync.js','utf8'),ctx);return ctx.window.quizArenaSync;}
const state=(version,gear,extra={})=>({code:'ABCDEF',status:'running',roomRevision:1,arenaRevision:0,arena:{},arenaEffects:[],ranking:[{id:'p',version}],player:{id:'p',version,gear,turn:{nonce:'turn'}},...extra});
test('items dispatch while a movement save is still waiting and reordered responses cannot restore inventory',async()=>{
 const N=sync(),requests=[],ctx={window:{quizArena:{actionTime:()=>5000}},crypto:require('node:crypto'),inputSave:null,busy:false,epoch:0,pollTimer:0,code:'ABCDEF',identity:{playerId:'p'},snapshot:state(1,['mine']),
  clearTimeout(){},schedulePoll(){},refreshLive(){},setBusy(v){ctx.busy=v;},update(data){ctx.snapshot=N.mergeSnapshot(ctx.snapshot,data)||ctx.snapshot;},
  request(path,payload){return new Promise(resolve=>requests.push({payload,resolve}));},toast(){assert.fail('unexpected error');},renderRoom(){}};
 const source=fs.readFileSync('public/labs/quiz-rally/app.js','utf8');vm.runInNewContext(source.slice(source.indexOf('async function saveArenaInput('),source.indexOf('async function copyLink(')),ctx);
 const save=ctx.mutate('arena-input',{inputs:[{seq:1}]});assert.equal(requests.length,1);assert.equal(ctx.busy,false);
 const use=ctx.mutate('arena-use',{slot:0,inputs:[{seq:1},{seq:2}]});assert.equal(requests.length,2,'item POST starts before the input response');assert.equal(requests[1].payload.action,'arena-use');assert.equal(ctx.busy,true);
 await ctx.mutate('arena-input',{inputs:[{seq:3}]});assert.equal(requests.length,2,'bounded concurrency');
 requests[1].resolve(state(3,[],{arenaRevision:1,arenaEffects:[{id:'mine'}]}));await use;
 requests[0].resolve(state(2,['mine']));await save;
 assert.deepEqual(ctx.snapshot.player.gear,[]);assert.equal(ctx.snapshot.player.version,3);assert.equal(ctx.snapshot.arenaEffects[0].id,'mine');assert.equal(ctx.busy,false);
});
test('an older snapshot cannot undo a pause or a newer player version',()=>{
 const N=sync(),paused=state(4,[],{roomRevision:2,status:'paused'});
 assert.equal(N.mergeSnapshot(paused,state(3,['mine'])),null);
 const newer=state(5,[],{roomRevision:2,status:'paused'}),merged=N.mergeSnapshot(newer,state(4,['mine'],{roomRevision:3,status:'running'}));
 assert.equal(merged.status,'running');assert.deepEqual(merged.player.gear,[]);assert.equal(merged.ranking[0].version,5);
});
test('live rank follows the local runner and displayed peers, not stale saved anchors',()=>{
 const N=sync(),ctx={N,clock:()=>5000,local:{y:500,t:5000},state:{player:{id:'me'},arena:{},arenaEffects:[],ranking:[{id:'me',nickname:'나',runner:{y:200,t:4500}},{id:'peer',nickname:'친구',runner:{y:600,t:5000}}]},simulated:new Map(),remoteTracks:new Map([['peer',{sample:()=>({y:400,t:4900})}]]),M:{advanceRunner:r=>r}};
 const source=fs.readFileSync('public/labs/quiz-rally/arena.js','utf8');vm.runInNewContext(source.slice(source.indexOf('function ranked(){'),source.indexOf('\nfunction shell')),ctx);
 assert.equal(ctx.ranked()[0].p.id,'me');ctx.local.y=300;assert.equal(ctx.ranked()[0].p.id,'peer');
 ctx.state.ranking[0].finish={place:1};assert.equal(ctx.ranked()[0].p.id,'me','confirmed finish order takes priority');
});
