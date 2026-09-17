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
function client(scene,expose){
 let text=fs.readFileSync(`${root}/public/labs/star-escape/scene0${scene}.js`,'utf8');
 text=text.replace(`window.StarEscapeScene0${scene} =`, `window.test = {setup:function(c){ctx=c;draw=function(){};},${expose}}; window.StarEscapeScene0${scene} =`);
 const nodes={};const sandbox={window:{},document:{getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],querySelector:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},setTimeout,clearTimeout,console};
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
