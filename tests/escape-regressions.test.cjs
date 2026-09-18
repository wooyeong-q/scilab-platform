const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {harness,root}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test:test@localhost/test';
let h,game;
before(async()=>{h=await harness();game=h.load('lib/star-escape.ts')});
after(async()=>h.close());
async function setup(stage,question){
 const {session,teacherKey}=await game.createStarEscapeSession('Escape regression');
 const p=await game.joinStarEscapeSession(session.code,'Tester','1',1);
 const other=await game.joinStarEscapeSession(session.code,'Partner','1',2);
 await game.controlStarEscapeSession(session.code,teacherKey,{action:'start'});
 await h.pg.query('UPDATE star_escape_team_progress SET stage=$1,question_no=$2 WHERE session_id=$3',[stage,question,session.id]);
 return {args:[session.code,p.player.id,p.playerKey],other:[session.code,other.player.id,other.playerKey]};
}
const s3=()=>({p1Slots:['1','2','3','4','5','6'],p1Complete:true,dataSent:true,q2Selected:'A',q2Complete:true,p3Positions:{A:22,B:37,C:82,D:68},p3Aligned:false,p3ResultConfirmed:false,referenceCard:'',q3Complete:false,p4Slots:['','',''],p4Complete:false,maintenanceOpen:false,maintenanceDialogue:-1,recordingStarted:false,recordingLine:0,recordingComplete:false});
test('independent simultaneous star moves survive and all four align',async()=>{
 const {args,other}=await setup(3,3);let base=s3();
 assert.equal((await game.updateStarEscapeSceneState(...args,3,3,base,base)).status,'ok');
 const move=(letter)=>({...base,p3Positions:{...base.p3Positions,[letter]:50}});
 const results=await Promise.all(['A','B','C','D'].map((letter,i)=>game.updateStarEscapeSceneState(...(i%2?other:args),3,3,move(letter),base)));
 assert.ok(results.every(r=>r.status==='ok'));
 const state=(await game.getStarEscapeState(...args)).progress.sceneState;
 assert.deepEqual(state.p3Positions,{A:50,B:50,C:50,D:50});assert.equal(state.p3Aligned,true);
});
test('scene 3 near/far completion recovers prior milestones and reaches scene 4',async()=>{
 const {args}=await setup(3,4);let base=s3();
 let result=await game.updateStarEscapeSceneState(...args,3,4,{...base,p4Slots:['X','Y','Z'],p4Complete:true},base);
 assert.equal(result.status,'ok');assert.equal(result.sceneState.p4Complete,true);
 base=result.sceneState;
 result=await game.updateStarEscapeSceneState(...args,3,4,{...base,maintenanceOpen:true,maintenanceDialogue:2,recordingStarted:true,recordingLine:5,recordingComplete:true},base);
 assert.equal(result.sceneState.recordingComplete,true);
 assert.equal((await game.submitStarEscapeAnswer(...args,3,4,'XYZ')).stage,4);
 assert.equal((await game.updateStarEscapeSceneState(...args,3,4,base,base)).status,'stale');
});
test('scene 4 authenticates chips without saving UV record',async()=>{
 const {args}=await setup(4,4);
 const scene={patternA:true,filmB:true,overlayComplete:true,lensAcquired:true,photosRestored:{A:true,B:true,C:true},nebulaSlots:['emission','reflection','dark'],nebulaComplete:true,lockerActive:true,dataSent:true,clusterSlots:['open','globular'],clusterComplete:true,handleUnlocked:true,lockerOpen:true,uvAcquired:true,uvRevealed:false,finalSlots:['emission','open','dark','globular','reflection'],authComplete:true};
 const result=await game.updateStarEscapeSceneState(...args,4,4,scene);
 assert.equal(result.status,'ok');assert.equal(result.sceneState.uvRevealed,false);assert.equal(result.sceneState.authComplete,true);
});
test('conflicting duplicate chips are rejected instead of corrupting team state',async()=>{
 const {args,other}=await setup(3,1);let base={...s3(),p1Slots:['','','','','',''],p1Complete:false};
 assert.equal((await game.updateStarEscapeSceneState(...args,3,1,base)).status,'ok');
 const a={...base,p1Slots:['1','','','','','']},b={...base,p1Slots:['','1','','','','']};
 assert.equal((await game.updateStarEscapeSceneState(...args,3,1,a,base)).status,'ok');
 assert.equal((await game.updateStarEscapeSceneState(...other,3,1,b,base)).status,'conflict');
 assert.deepEqual((await game.getStarEscapeState(...args)).progress.sceneState.p1Slots,a.p1Slots);
});
function client(scene,expose,extra={}){
 let text=fs.readFileSync(`${root}/public/labs/star-escape/scene0${scene}.js`,'utf8');
 text=text.replace(`window.StarEscapeScene0${scene} =`, `window.test = {setup:function(c){ctx=c;draw=function(){};},${expose}}; window.StarEscapeScene0${scene} =`);
 const nodes={};const sandbox={window:{},document:{getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],querySelector:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},setTimeout,clearTimeout,console,...extra};
 vm.runInNewContext(text,sandbox);return {api:sandbox.window.test,nodes};
}
test('client final chip verification accepts no UV save; optional save precedes map',async()=>{
 const {api}=client(4,'baseSceneState:baseState,coreMarkup:coreMarkup,uvMarkup:uvMarkup,verify:verifyFinalOrder');
 const scene={...api.baseSceneState(),nebulaComplete:true,lockerOpen:true,uvAcquired:true,finalSlots:['emission','open','dark','globular','reflection']};
 const state={progress:{stage:4,question:4,sceneState:scene},player:{role:1}};
 api.setup({state,toast:()=>{},syncState:async()=>({status:'ok'})});
 assert.match(api.coreMarkup(scene),/s4AuthSubmit/);assert.doesNotMatch(api.coreMarkup(scene),/data-s4-drop="final"[^>]+disabled/);
 const markup=api.uvMarkup(scene);assert.ok(markup.indexOf('id="s4SaveUv"')<markup.indexOf('id="s4UvBoard"'));
 await api.verify();assert.equal(state.progress.sceneState.authComplete,true);
});
test('client near/far result opens next maintenance step',async()=>{
 const {api,nodes}=client(3,'submitP4:submitP4,bindOverlays:bindOverlays');
 const state={session:{code:'TEST'},player:{role:1},progress:{stage:3,question:4,sceneState:{...s3(),q3Complete:true,p4Slots:['X','Y','Z']}}};
 api.setup({state,toast:()=>{},syncState:async()=>({status:'ok'})});
 await api.submitP4({disabled:false});nodes.s3ResultContinue={};api.bindOverlays(state.progress.sceneState);
 await nodes.s3ResultContinue.onclick();assert.equal(state.progress.sceneState.maintenanceOpen,true);assert.equal(state.progress.sceneState.maintenanceDialogue,0);
});
test('distance dragging snaps to 10pc with an off-center grab on a narrow surface',async()=>{
 let text=fs.readFileSync(`${root}/public/labs/star-escape/scene03.js`,'utf8');
 text=text.replace('window.StarEscapeScene03 =','window.test={setup:function(c){ctx=c;draw=function(){};},bind:bindDistanceDrag,point:distancePoint}; window.StarEscapeScene03 =');
 const handlers={},star={dataset:{s3DistanceStar:'A'},classList:{add(){},remove(){}},style:{setProperty(){}},querySelector:()=>({textContent:''}),addEventListener:(k,v)=>handlers[k]=v,removeEventListener(){},setPointerCapture(){}};
 const surface={getBoundingClientRect:()=>({left:0,top:0,width:320,height:180})};
 const sandbox={window:{},document:{getElementById:id=>id==='s3DistanceSurface'?surface:null,querySelectorAll:()=>[star]},console};
 vm.runInNewContext(text,sandbox);const api=sandbox.window.test;
 const state={progress:{sceneState:s3()}};let saves=0;
 api.setup({state,toast(){},syncState:async()=>{saves++}});api.bind();
 const start=api.point('A',22),end=api.point('A',50);
 handlers.pointerdown({button:0,pointerId:1,clientX:start.x*3.2+8,clientY:start.y*1.8-5,preventDefault(){}});
 handlers.pointermove({clientX:end.x*3.2+8,clientY:end.y*1.8-5});
 await handlers.pointerup();assert.equal(state.progress.sceneState.p3Positions.A,50);assert.equal(saves,1);
});
test('teacher advance: authorized, one step only, isolated to selected team, all prerequisite states',async()=>{
 const {session,teacherKey}=await game.createStarEscapeSession('Teacher rescue');
 const p=await game.joinStarEscapeSession(session.code,'Rescued','1',1);
 const peer=await game.joinStarEscapeSession(session.code,'Unaffected','2',1);
 const started=await game.controlStarEscapeSession(session.code,teacherKey,{action:'start'});
 const counts=[3,3,4,4];
 for(let stage=1;stage<=4;stage++)for(let question=1;question<=counts[stage-1];question++){
  const input={action:'advance',team:'1',stage,question,startedAt:started.startedAt};
  assert.equal((await game.controlStarEscapeSession(session.code,p.playerKey,input)).status,'unauthorized');
  assert.equal((await game.controlStarEscapeSession(session.code,teacherKey,{...input,startedAt:new Date(0).toISOString()})).status,'stale');
  const results=await Promise.all([game.controlStarEscapeSession(session.code,teacherKey,input),game.controlStarEscapeSession(session.code,teacherKey,input)]);
  assert.deepEqual(results.map(r=>r.status).sort(),['advanced','stale']);
  const state=(await game.getStarEscapeState(session.code,p.player.id,p.playerKey)).progress;
  assert.equal(state.lastActionStatus,'teacher_advance');
  if(state.stage===3){
   if(state.question>=2)assert.equal(state.sceneState.p1Complete,true);
   if(state.question>=3)assert.equal(state.sceneState.q2Complete,true);
   if(state.question>=4)assert.equal(state.sceneState.q3Complete,true);
  }
  if(state.stage===4){
   if(state.question>=2)assert.equal(state.sceneState.overlayComplete,true);
   if(state.question>=3)assert.equal(state.sceneState.nebulaComplete,true);
   if(state.question>=4)assert.equal(state.sceneState.handleUnlocked,true);
  }
 }
 const untouched=await game.getStarEscapeState(session.code,peer.player.id,peer.playerKey);
 assert.equal(untouched.progress.stage,1);assert.equal(untouched.progress.question,1);
 assert.ok((await game.getStarEscapeState(session.code,p.player.id,p.playerKey)).progress.completedAt);
 const teacher=await game.getStarEscapeTeacherState(session.code,teacherKey);
 assert.ok(teacher.questionStats.every(q=>q.attempts===0));
});
function playableScene4(){return {patternA:true,filmB:true,overlayComplete:true,lensAcquired:true,photosRestored:{A:true,B:true,C:true},nebulaSlots:['emission','reflection','dark'],nebulaComplete:true,lockerActive:true,dataSent:true,clusterSlots:['open','globular'],clusterComplete:true,handleUnlocked:true,lockerOpen:true,uvAcquired:true,uvRevealed:true,finalSlots:['emission','open','dark','globular','reflection'],authComplete:true,horrorSeen:true,maintenanceOpen:true};}
test('recording and CCTV finish through the real shared-state merge, with only start/end saves',async()=>{
 const {args}=await setup(4,4);let scene=playableScene4();
 scene=(await game.updateStarEscapeSceneState(...args,4,4,scene)).sceneState;
 let timer, pending=[],writes=0;
 const extra={setInterval:fn=>{timer=fn;return 1},clearInterval:()=>{},clearTimeout:()=>{}};
 const {api}=client(4,'record:startRecording,cctv:startCctv,recorder:recorderMarkup,sync:sync',extra);
 const state={progress:{stage:4,question:4,sceneState:scene},player:{role:1}};
 api.setup({state,toast(){},syncState:(next,base)=>{
  writes++;const job=game.updateStarEscapeSceneState(...args,4,4,next,base).then(r=>{assert.equal(r.status,'ok');state.progress.sceneState=r.sceneState;return r});pending.push(job);return job;
 }});
 await api.record();assert.equal(writes,1);
 for(let i=0;i<4;i++)timer();
 assert.equal(writes,1);assert.equal(state.progress.sceneState.recordingLine,0);
 timer();await Promise.all(pending);await Promise.resolve();
 assert.equal(state.progress.sceneState.recordingComplete,true);assert.match(api.recorder(state.progress.sceneState),/s4RecordingContinue/);assert.equal(writes,2);
 await api.sync({logSeen:true});const before=writes;
 await api.cctv();for(let i=0;i<10;i++)timer();assert.equal(writes,before+1);
 timer();await Promise.all(pending);await Promise.resolve();
 assert.equal(state.progress.sceneState.cctvComplete,true);assert.equal(state.progress.sceneState.exitOpen,true);assert.equal(writes,before+2);
 await api.sync({exitOpen:true});assert.equal(writes,before+2,'unchanged value is not sent again');
});
test('interrupted recording can replay, and failed completion rolls back for retry',async()=>{
 let timer,failed=false;
 const {api}=client(4,'record:startRecording,recorder:recorderMarkup,sync:sync',{setInterval:fn=>{timer=fn;return 1},clearInterval(){}});
 const state={progress:{sceneState:{...playableScene4(),recordingStarted:true,recordingLine:0,recordingComplete:false}},player:{role:1}};
 api.setup({state,toast(){},syncState:async next=>{if(next.recordingComplete&&!failed){failed=true;throw Error('network interruption')}return {status:'ok'}}});
 assert.match(api.recorder(state.progress.sceneState),/기록 다시 재생/);
 await api.record();for(let i=0;i<5;i++)timer();await new Promise(r=>setImmediate(r));
 assert.equal(state.progress.sceneState.recordingComplete,false);assert.match(api.recorder(state.progress.sceneState),/기록 다시 재생/);
 await api.record();for(let i=0;i<5;i++)timer();await new Promise(r=>setImmediate(r));
 assert.equal(state.progress.sceneState.recordingComplete,true);
});
test('teacher removal revokes credentials, releases name/role, and preserves team progress and attempts',async()=>{
 const {session,teacherKey}=await game.createStarEscapeSession('Removal test');
 const p=await game.joinStarEscapeSession(session.code,'Wrong team','1',1);
 const args=[session.code,p.player.id,p.playerKey];
 await game.controlStarEscapeSession(session.code,teacherKey,{action:'start'});
 await game.submitStarEscapeAnswer(...args,1,1,'5268');
 const before=await game.getStarEscapeTeacherState(session.code,teacherKey);
 assert.equal(before.teams[0].members[0].id,p.player.id);
 const input={action:'remove_player',playerId:p.player.id};
 assert.equal((await game.controlStarEscapeSession(session.code,p.playerKey,input)).status,'unauthorized');
 const other=await game.createStarEscapeSession('Different class');
 assert.equal((await game.controlStarEscapeSession(other.session.code,other.teacherKey,input)).removed,false);
 assert.equal((await game.controlStarEscapeSession(session.code,teacherKey,input)).removed,true);
 assert.equal(await game.getStarEscapeState(...args),null);
 assert.equal((await game.submitStarEscapeAnswer(...args,1,2,'8642')).status,'unauthorized');
 assert.equal((await game.controlStarEscapeSession(session.code,teacherKey,input)).removed,false);
 const after=await game.getStarEscapeTeacherState(session.code,teacherKey);
 assert.equal(after.players,0);assert.equal(after.teams[0].question,2);assert.equal(after.questionStats[0].attempts,1);
 assert.equal((await game.joinStarEscapeSession(session.code,'Wrong team','2',1)).status,'joined');
 assert.equal((await game.joinStarEscapeSession(session.code,'Replacement','1',1)).status,'joined');
});

test('scene 3 failed personal-data transmission unlocks retry and avoids duplicate saves',async()=>{
 let callback;let saves=0;let fail=true;
 const {api}=client(3,'beginTransmission:beginTransmission,isTransmitting:function(){return transmitting}',{setTimeout:fn=>{callback=fn;return 1}});
 const state={session:{code:'TEST'},player:{role:1},progress:{stage:3,question:2,sceneState:{...s3(),dataSent:false}}};
 api.setup({state,toast(){},syncState:async()=>{saves++;if(fail)throw Error('offline')}});
 api.beginTransmission();api.beginTransmission();assert.equal(api.isTransmitting(),true);
 await callback();assert.equal(api.isTransmitting(),false);assert.equal(state.progress.sceneState.dataSent,false);assert.equal(saves,1);
 fail=false;api.beginTransmission();await callback();assert.equal(api.isTransmitting(),false);assert.equal(state.progress.sceneState.dataSent,true);assert.equal(saves,2);
});
test('delayed wrong-card reset never erases a newer correct selection',async()=>{
 let callback;
 const {api}=client(3,'placeQ2:placeQ2',{setTimeout:fn=>{callback=fn;return 1}});
 const state={progress:{stage:3,question:2,sceneState:s3()}};
 api.setup({state,toast(){},syncState:async()=>({status:'ok'})});
 await api.placeQ2('B','slot');state.progress.sceneState.q2Selected='A';state.progress.sceneState.q2Complete=true;
 await callback();assert.equal(state.progress.sceneState.q2Selected,'A');
});
