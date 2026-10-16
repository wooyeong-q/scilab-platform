const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};for(const file of ['arena-model.js','arena-motion.js'])vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/'+file,'utf8'),ctx);
const M=ctx.window.quizArenaModel,{LocalView}=ctx.window.quizArenaMotion;
const arena={version:2,length:27000,seed:42,combat:true,energy:true,course:3,supplies:2};
const source=()=>({...M.freshRunner(4000),x:0,y:300});
test('standing, moving and diagonal dash jumps stay continuous on a retimed server acknowledgement',()=>{
 for(const [dx,dy,dash]of [[0,0,false],[0,1,false],[1,1,true]])for(const fps of [30,60,120]){
  const start=source(),predicted=M.control(start,dx,dy,true,dash,4000,1),confirmed=M.control({...start,t:4160},dx,dy,true,dash,4160,1);
  const before=M.advanceRunner(predicted,4200,arena),after=M.advanceRunner(confirmed,4200,arena),raw=JSON.stringify(after),view=new LocalView();
  const previous=view.sample(before,0);view.correct(before,after);const first=view.sample(after,0);
  assert.ok(Math.abs(before.z-after.z)>30,'exercise the visible height mismatch');assert.ok(Math.abs(first.z-previous.z)<1e-7,'ack cannot snap the height');assert.equal(JSON.stringify(after),raw,'display correction cannot alter authoritative physics');
  let last=first;for(let t=4200+1000/fps;t<=5200;t+=1000/fps){const physical=M.advanceRunner(confirmed,t,arena),shown=view.sample(physical,1000/fps);assert.ok(Math.abs(shown.z-last.z)<360/fps,'no one-frame vertical teleport');if(t>4400)assert.ok(Math.abs(shown.z-physical.z)<1e-7,'height converges promptly');if(physical.z===0)assert.equal(shown.z,0,'no hovering after landing');last=shown;}
 }
});
test('vertical corrections reset for respawn and never smooth an ordinary uncorrected jump',()=>{
 const view=new LocalView(),start=M.control(source(),0,0,true,false,4000,1);
 for(let t=4000;t<5000;t+=16){const physical=M.advanceRunner(start,t,arena);assert.equal(view.sample(physical,16).z,physical.z);}
 view.correct({...source(),z:50},{...source(),z:20,vz:100});view.correct({...source(),z:20},{...source(),falls:1,fallUntil:5000,z:-10});assert.equal(view.z,0);assert.equal(view.sample({...source(),fallUntil:5000,z:-20},16).z,-20,'fall stays below the floor');assert.equal(view.sample({...source(),falls:1},16).z,0);
});
test('new courses teach on safe wide ground and reserve tight, fast combinations for the finish',()=>{
 for(const duration of [300,480,600,900])for(const seed of [1,42,99999]){
  const a={...arena,length:M.raceLength(duration),seed},intro=a.length*5200/27000,final=a.length*21900/27000;
  assert.equal(M.gaps(a,0,intro).length,0);assert.equal(M.fans(a,0,intro).length,0);assert.equal(M.spinners(4000,a,0,intro).length,0);assert.equal(M.beams(4000,a,0,intro).length,0);
  assert.ok(M.barriers(a,0,intro).some(w=>w.height<=24));assert.ok(M.gates(4000,a,0,intro).every(g=>g.width>=250));
  assert.ok(M.gates(4000,a,final).some(g=>g.width<=145));assert.ok(M.spinners(4000,a,final).some(g=>g.arms===2));assert.ok(M.beams(4000,a,final).length);assert.ok(M.bumpers(a,final).length);
  for(const b of M.boxes(a))for(const t of [4000,5100,6200,7900])assert.ok(M.floorAt(b.x,b.y,t,a),'safe refill floor');
  for(const cp of M.checkpoints(a))for(const t of [4000,5100,6200,7900])assert.ok(M.floorAt(M.trackAt(cp,a).center,cp,t,a),'safe checkpoint');
  for(const g of M.gaps(a)){const y=g.start-11,r=M.control({...source(),x:M.trackAt(y,a).center,y},0,1,true,false,4000,1),out=M.advanceRunner(r,4900,a);assert.equal(out.falls,0,`single jump crosses ${duration}s gap ${g.start}`);assert.ok(out.y>g.end);}
  assert.ok(M.checkpoints(a).at(-1)>a.length*.97);assert.equal(M.beams(4000,a,a.length*.975).length,0,'clear finish line');
 }
});
test('new beams warn before contact, can be jumped, and bumpers use shared authoritative collision',()=>{
 const beam=M.beams(0,arena)[0];let warning,active,off;
 for(let t=4000;t<8000;t+=10){const b=M.beams(t,arena).find(b=>b.y===beam.y);if(b.state===0)off=t;if(b.state===1)warning=t;if(b.state===2)active=t;}
 assert.ok(warning&&active&&off);for(const [t,hit]of [[warning,false],[off,false],[active,true]]){const r={...source(),x:beam.x,y:beam.y,t},out=M.advanceRunner(r,t+1,arena);assert.equal(out.stunUntil>t,hit);}
 const high={...source(),x:beam.x,y:beam.y,t:active,z:60,vz:0};assert.equal(M.advanceRunner(high,active+1,arena).stunUntil,0);
 const b=M.bumpers(arena)[0],ground={...source(),x:b.x+10,y:b.y,t:4000};assert.ok(M.advanceRunner(ground,4020,arena).stunUntil>4000);assert.equal(M.advanceRunner({...ground,z:60},4020,arena).stunUntil,0);
 assert.equal(M.beams(4000,{...arena,course:undefined}).length,0);assert.equal(M.bumpers({...arena,course:undefined}).length,0,'live legacy rooms keep their geometry');
});
