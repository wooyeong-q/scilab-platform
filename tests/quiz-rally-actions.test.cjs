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
test('every client uses the common ranking even when its local prediction and peer interpolation disagree',()=>{
 const N=sync(),ctx={N,clock:()=>5000,local:{y:500,t:5000},state:{player:{id:'me'},arena:{},arenaEffects:[],ranking:[{id:'me',nickname:'나',runner:{y:200,t:4500}},{id:'peer',nickname:'친구',runner:{y:600,t:5000}}]},simulated:new Map(),remoteTracks:new Map([['peer',{sample:()=>({y:400,t:4900})}]]),M:{advanceRunner:r=>r}};
 const source=fs.readFileSync('public/labs/quiz-rally/arena.js','utf8');vm.runInNewContext(source.slice(source.indexOf('function ranked(){'),source.indexOf('\nfunction shell')),ctx);
 assert.equal(ctx.ranked()[0].p.id,'me');ctx.local.y=300;assert.equal(ctx.ranked()[0].p.id,'me','interpolation must not change rank');
 ctx.state.liveRanks=['peer','me'];assert.equal(ctx.ranked()[0].p.id,'peer','a new common frame changes rank');
 ctx.state.ranking[0].finish={place:1};assert.equal(ctx.ranked()[0].p.id,'me','confirmed finish order takes priority');
});
test('a motion-only acknowledgement cannot hide an item response or rewind the newer runner',()=>{
 const N=sync(),old=state(4,['mine']);old.player.runner={seq:10,t:5000};old.player.motionVersion=9;
 const response=state(6,[]);response.player.runner={seq:8,t:4800};
 const merged=N.mergeSnapshot(old,response);
 assert.equal(merged.player.version,6);assert.deepEqual(merged.player.gear,[]);
 assert.equal(merged.player.runner.seq,10);assert.equal(merged.player.motionVersion,9);
});
test('an authoritative socket does not run a second background save, but HTTP recovery remains available',async()=>{
 let requests=0;const ctx={inputSave:null,busy:false,snapshot:{arena:{},status:'running',realtime:{version:1}},live:{ready:true,authoritative:true},code:'ABC234',identity:{playerId:'p'},epoch:0,request:async()=>{requests++;return {};},update(){},refreshLive(){},schedulePoll(){},crypto:require('node:crypto')};
 const source=fs.readFileSync('public/labs/quiz-rally/app.js','utf8');vm.runInNewContext(source.slice(source.indexOf('async function saveArenaInput('),source.indexOf('async function mutate(')),ctx);
 await ctx.saveArenaInput({inputs:[{seq:1}]});assert.equal(requests,0);
 ctx.live.ready=false;await ctx.saveArenaInput({inputs:[{seq:1}]});assert.equal(requests,1);
});
test('temporary entry failures preserve identity and retry; invalid credentials stop and stale responses are ignored',async()=>{
 const blocked=[],timers=[],updates=[],who={playerId:'p',token:'saved-token',role:'student'},ctx={inputSave:null,live:{stop(){}},resetLobbyRobot(){},epoch:0,pollTimer:0,clearTimeout(){},setTimeout:fn=>{timers.push(fn);return timers.length;},code:'',identity:null,snapshot:null,viewKey:'',rankPage:0,lastNotice:'',crewFocus:'',setLocation(){},main:{innerHTML:''},connection(){},schedulePoll(){},update:data=>updates.push(data),showBlocked:message=>blocked.push(message),request:async()=>{throw Object.assign(new Error('temporary'),{status:503});}};
 const source=fs.readFileSync('public/labs/quiz-rally/app.js','utf8');vm.runInNewContext(source.slice(source.indexOf('async function enter('),source.indexOf('function showBlocked(')),ctx);
 await ctx.enter('ABC234',who);assert.equal(blocked.length,0);assert.equal(timers.length,1);assert.equal(ctx.identity,who);
 ctx.request=async()=>{throw Object.assign(new Error('invalid'),{status:403});};await ctx.enter('ABC234',who);assert.deepEqual(blocked,['invalid']);
 let resolve;ctx.request=()=>new Promise(r=>resolve=r);const pending=ctx.enter('ABC234',who);ctx.epoch++;resolve({code:'ABC234'});await pending;assert.equal(updates.length,0);
});
