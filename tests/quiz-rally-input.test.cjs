const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-sync.js','utf8'),context);
const {Keyboard}=context.window.quizArenaSync;
const event=(code,key,shiftKey=false,repeat=false)=>({code,key,shiftKey,repeat});

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
