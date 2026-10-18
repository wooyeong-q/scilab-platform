const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-sync.js','utf8'),context);
const {Keyboard}=context.window.quizArenaSync;
const event=(code,key,shiftKey=false,repeat=false)=>({code,key,shiftKey,repeat});
test('touch control has a dead zone, short full-speed throw and equal diagonal speed',()=>{
 const touch=context.window.quizArenaSync.touchVector;
 assert.equal(Math.hypot(...Object.values(touch(3,2))),0);
 assert.ok(Math.abs(Math.hypot(...Object.values(touch(14,0)))-.5)<1e-9);
 for(const [x,y]of [[24,0],[0,-24],[17,17],[80,-80]])assert.ok(Math.abs(Math.hypot(...Object.values(touch(x,y)))-1)<1e-9);
});

test('diagonal direction repeats recover held Shift after controls were cleared',()=>{
 const k=new Keyboard();k.update(event('ShiftLeft','Shift',true),true);
 k.update(event('ArrowUp','ArrowUp',true),true);k.update(event('ArrowRight','ArrowRight',true),true);
 assert.equal(k.controls().dash,true);k.clear();assert.equal(k.controls().dash,false);
 // Re-focus or leave a question while all three keys are still physically down.
 // The browser repeats directions without sending a new Shift keydown.
 k.update(event('ArrowUp','ArrowUp',true,true),true);k.update(event('ArrowRight','ArrowRight',true,true),true);
 for(let i=0;i<60;i++){k.update(event('ArrowRight','ArrowRight',true,true),true);assert.equal(k.controls().dash,true);}
 assert.equal(k.controls().x,1);assert.equal(k.controls().y,1);
 k.update(event('ShiftLeft','Shift',false),false);
 assert.equal(k.controls().dash,false);assert.equal(k.controls().x,1);assert.equal(k.controls().y,1);
});

test('changing or releasing one diagonal direction does not release a held modifier',()=>{
 const k=new Keyboard();k.update(event('ArrowUp','ArrowUp',true),true);k.update(event('ArrowRight','ArrowRight',true),true);
 k.update(event('ArrowRight','ArrowRight',true),false);
 assert.equal(k.controls().dash,true);assert.equal(k.controls().x,0);assert.equal(k.controls().y,1);
 k.update(event('ArrowLeft','ArrowLeft',true),true);
 assert.equal(k.controls().dash,true);assert.equal(k.controls().x,-1);
});

test('physical WASD survives Korean IME and modifier-dependent key labels',()=>{
 const k=new Keyboard();k.update(event('KeyW','ㅉ',true),true);k.update(event('KeyD','ㅇ',true),true);
 assert.equal(k.controls().x,1);assert.equal(k.controls().y,1);assert.equal(k.controls().dash,true);
 k.update(event('KeyD','Process',true),false);assert.equal(k.controls().x,0);
 k.update(event('KeyW','w',false),false);assert.equal(k.controls().y,0);assert.equal(k.controls().dash,false);
});

test('both Shift keys and missing physical codes use the current modifier state',()=>{
 const k=new Keyboard();k.update(event('ShiftLeft','Shift',true),true);k.update(event('ShiftRight','Shift',true),true);
 k.update(event('ShiftLeft','Shift',true),false);assert.equal(k.controls().dash,true);
 k.update(event('ShiftRight','Shift',false),false);assert.equal(k.controls().dash,false);
 k.update(event('','Shift',true),true);k.update(event('','ArrowUp',true),true);
 assert.equal(k.controls().dash,true);assert.equal(k.controls().y,1);
 k.update(event('','Shift',false),false);assert.equal(k.controls().dash,false);
});

test('blur clears movement and a later unmodified repeat cannot leave dash stuck',()=>{
 const k=new Keyboard();k.update(event('KeyW','W',true),true);k.update(event('KeyD','D',true),true);k.clear();
 assert.equal(k.controls().x,0);assert.equal(k.controls().y,0);assert.equal(k.controls().dash,false);
 k.update(event('KeyW','w',false,true),true);
 assert.equal(k.controls().x,0);assert.equal(k.controls().y,1);assert.equal(k.controls().dash,false);
});
test('Space and physical J each jump once, including Korean IME, while question modals block input',()=>{
 const callbacks={},jumps=[],ctx={document:{addEventListener:(name,fn)=>callbacks[name]=fn,querySelector:()=>null,activeElement:{tagName:'CANVAS'}},canvas:{isConnected:true},state:{arena:{},status:'running',player:{}},dialog:{open:false},inputCheck:{key(){}},keyboard:new Keyboard(),nudge:j=>{if(j)jumps.push(j);},toggleDashLock(){},use(){}};
 const source=fs.readFileSync('public/labs/quiz-rally/arena.js','utf8');vm.runInNewContext(source.slice(source.indexOf("document.addEventListener('keydown'"),source.indexOf("window.addEventListener('blur'")),ctx);
 const press=(code,key,repeat=false)=>callbacks.keydown({...event(code,key,false,repeat),preventDefault(){}});
 press('Space',' ');press('Space',' ',true);press('KeyJ','ㅓ');assert.equal(jumps.length,2);
 ctx.dialog.open=true;press('KeyJ','j');assert.equal(jumps.length,2);
 ctx.dialog.open=false;ctx.document.activeElement.tagName='INPUT';press('Space',' ');assert.equal(jumps.length,2);
});
test('a clock restored after a long outage immediately returns inside the input freshness window',()=>{
 const t=new context.window.quizArenaSync.Timeline();t.sync(4000,'running',0,0);
 assert.equal(t.sync(7000,'running',0,500),7000);
 assert.equal(t.now(750),7250);
});
test('a confirmed future self pose cannot freeze movement while the conservative clock catches up',()=>{
 const t=new context.window.quizArenaSync.Timeline();t.sync(4000,'running',500,0);assert.equal(t.now(100),4100,'RTT is not guessed');
 assert.equal(t.ensureAtLeast(4300,100),true);assert.equal(t.now(116),4316);
 assert.equal(t.ensureAtLeast(4200,116),false);assert.equal(t.now(116),4316,'older poses never rewind');
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-model.js','utf8'),ctx);const M=ctx.window.quizArenaModel,a={version:2,length:27000,seed:42,course:4,combat:true};
 const r=M.control({...M.freshRunner(4300),x:0,y:300},0,1,true,false,4300,1),next=M.advanceRunner(r,t.now(116),a);
 assert.ok(next.y>r.y&&next.z>r.z,'the very next render frame advances, rather than waiting 200 ms');
 t.sync(5000,'paused',0,200);assert.equal(t.ensureAtLeast(5100,210),false);assert.equal(t.now(9999),5000);
});
test('two fingers can steer, toggle dash and jump; another touch cannot steal the stick',()=>{
 const source=fs.readFileSync('public/labs/quiz-rally/arena.js','utf8'),callbacks={},sent=[],handle={style:{setProperty(){},transform:''}},pad={getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){},querySelector:()=>handle};
 const ctx={document:{addEventListener:(name,fn)=>callbacks[name]=fn,querySelector:()=>null},dialog:{open:false},state:{status:'running',player:{}},root:{querySelector:()=>handle},N:context.window.quizArenaSync,touch:{x:0,y:0},dashLocked:false,keyboard:new Keyboard(),inputCheck:{record(){}},renderInputGuide(){},lastInput:'',queuedUse:null};
 ctx.nudge=jump=>sent.push({jump:!!jump,x:ctx.touch.x,y:ctx.touch.y,dash:ctx.dashLocked});
 vm.runInNewContext(source.slice(source.indexOf('function toggleDashLock('),source.indexOf('function canUseItem('))+source.slice(source.indexOf('function clearControls('),source.indexOf('function controls('))+source.slice(source.indexOf('let padPointer='),source.indexOf('function download(')),ctx);
 const e=(pointerId,kind,x=50,y=26)=>({pointerId,clientX:x,clientY:y,preventDefault(){},target:{closest:selector=>selector===`[data-arena-action="${kind}"]`?{}:kind==='pad'&&selector==='[data-arena-pad]'?pad:null}});
 callbacks.pointerdown(e(1,'pad'));assert.equal(ctx.touch.y,-1);
 callbacks.pointerdown(e(2,'dash'));assert.equal(ctx.dashLocked,true);callbacks.pointerup(e(2,'dash'));assert.equal(ctx.dashLocked,true,'dash does not require a third finger');
 callbacks.pointerdown(e(2,'jump'));assert.deepEqual(sent.at(-1),{jump:true,x:0,y:-1,dash:true});
 callbacks.pointerdown(e(3,'pad',74,50));assert.equal(ctx.touch.x,0,'first finger owns the stick');
 callbacks.pointercancel(e(1,'pad'));assert.equal(ctx.touch.y,0);callbacks.pointerdown(e(2,'dash'));assert.equal(ctx.dashLocked,false);
 callbacks.pointerdown(e(1,'pad'));ctx.clearControls('question');callbacks.pointermove(e(1,'pad',74,50));assert.equal(ctx.touch.x,0,'stale capture cannot resume after a modal');assert.equal(ctx.touch.y,0);assert.equal(ctx.dashLocked,false);
 ctx.dialog.open=true;callbacks.pointerdown(e(2,'dash'));assert.equal(ctx.dashLocked,false);
});
