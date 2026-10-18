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
test('late acknowledgements cannot restart ascent after a jump has begun descending',()=>{
 for(const fps of [30,60,120])for(const delay of [80,160,240]){
  const dt=1000/fps,start=source(),predicted=M.control(start,0,1,true,false,4000,1),confirmed=M.control({...start,t:4000+delay},0,1,true,false,4000+delay,1),view=new LocalView();let last=null,corrected=false;
  for(let t=4000;t<5500;t+=dt){
   if(!corrected&&t>=4500){const before=M.advanceRunner(predicted,t,arena),after=M.advanceRunner(confirmed,t,arena);view.correct(before,after);corrected=true;}
   const physical=M.advanceRunner(corrected?confirmed:predicted,t,arena),shown=view.sample(physical,dt);
   if(corrected&&last!==null)assert.ok(shown.z<=last+.001,`${fps}Hz / ${delay}ms: no second apex (${last} → ${shown.z})`);
   if(physical.z===0&&t>4500)assert.equal(shown.z,0,'authoritative landing remains grounded');last=shown.z;
  }
 }
});
test('adopting a confirmed clock preserves the displayed pose and does not hide a newly accepted jump',()=>{
 const view=new LocalView(),pred=M.control(source(),0,1,true,false,4000,1),shown=view.sample(M.advanceRunner(pred,4400,arena),16),before=M.advanceRunner(pred,4500,arena),after=M.advanceRunner(M.control({...source(),t:4160},0,1,true,false,4160,1),4500,arena);
 view.correct(before,after,true);const first=view.sample(after,0);for(const k of ['x','y','z'])assert.ok(Math.abs(first[k]-shown[k])<1e-7,k+' must not snap when the clock adopts a confirmed pose');
 const fresh=new LocalView();fresh.sample(source(),0);const accepted=M.advanceRunner(pred,4100,arena);fresh.correct(source(),accepted);assert.ok(fresh.sample(M.advanceRunner(pred,4160,arena),60).z>0,'an accepted jump must not be hidden for its whole flight');
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

test('harder rooms preserve the practice half and make later encounters require steering and timing',()=>{
 for(const duration of [300,480,600,900])for(const seed of [1,42,99999]){
  const a={...arena,course:4,length:M.raceLength(duration),seed},old={...a,course:3},Y=y=>Math.round(y*a.length/27000);
  for(const fn of ['gaps','barriers','fans','bumpers','conveyors'])assert.equal(JSON.stringify(M[fn](a,0,Y(13200))),JSON.stringify(M[fn](old,0,Y(13200))),fn+' practice geometry stays unchanged');
  for(const fn of ['gates','spinners','beams','pistons','balls'])assert.equal(JSON.stringify(M[fn](4000,a,0,Y(13200))),JSON.stringify(M[fn](4000,old,0,Y(13200))),fn+' practice timing stays unchanged');
  assert.equal(M.trackAt(Y(19450),a).width,190);assert.equal(M.trackAt(Y(25700),a).width,170);
  assert.ok(M.spinners(4000,a,Y(21900)).some(s=>s.arms===2&&Math.abs(s.period)<=630));
  assert.ok(M.checkpoints(a,Y(21800)).length<M.checkpoints(old,Y(21800)).length,'recover between encounters, not after every obstacle');
  const walls=M.barriers(a,Y(24600),Y(25100));assert.equal(walls.length,2);assert.ok(walls[0].x+walls[0].w/2>Math.max(...walls.map(w=>M.trackAt(w.y,a).center))&&walls[1].x-walls[1].w/2<Math.min(...walls.map(w=>M.trackAt(w.y,a).center)),'opposing tall walls close the straight centre route');
  for(let t=4000;t<14000;t+=100){
   const gate=M.gates(t,a,Y(23900),Y(24200))[0],road=M.trackAt(gate.y,a),left=Math.max(gate.gap-gate.width/2+M.RADIUS,road.center-road.width/2+M.RADIUS),right=Math.min(gate.gap+gate.width/2-M.RADIUS,road.center+road.width/2-M.RADIUS);
   assert.ok(right-left>=60,'moving final opening stays inside the narrow deck');
  }
  for(const cp of M.checkpoints(a))for(let t=4000;t<9000;t+=250)assert.ok(M.floorAt(M.trackAt(cp,a).center,cp,t,a),'safe respawn floor');
  for(const b of M.boxes(a))for(let t=4000;t<9000;t+=250)assert.ok(M.floorAt(b.x,b.y,t,a),'safe question floor');
  for(const g of M.gaps(a))for(const energy of [0,100]){
   const y=g.start-11,start={...source(),x:M.trackAt(y,a).center,y,energy},out=M.advanceRunner(M.control(start,0,1,true,false,4000,1),4900,a);
   assert.equal(out.falls,0,`${duration}s / seed ${seed} / charge ${energy}: gap ${g.start}`);assert.ok(out.y>g.end,'no mandatory dash or charge trap');
  }
  for(const fn of ['barriers','gaps','bumpers'])assert.equal(M[fn](a,Y(26400)).length,0,'clear finish approach');
  for(const fn of ['beams','spinners','pistons'])assert.equal(M[fn](4000,a,Y(26400)).length,0,'clear finish approach');
 }
});

test('the final slalom, timed beam and consecutive narrow jumps form a continuous playable route',()=>{
 for(const duration of [300,900])for(const energy of [0,100]){
  const a={...arena,course:4,length:M.raceLength(duration)},Y=y=>Math.round(y*a.length/27000),start=Y(24500);
  let r={...source(),x:M.trackAt(start,a).center,y:start,checkpoint:start,energy},seq=0;
  const step=(dx,dy,jump=false)=>{r=M.advanceRunner(M.control(r,dx,dy,jump,false,r.t,++seq),r.t+20,a);assert.equal(r.falls,0,'route does not depend on respawning');assert.equal(r.stunUntil,0,'route does not depend on damage immunity');assert.ok(r.t<150000,'route cannot stall');};
  const move=(x,y)=>{while(Math.hypot(r.x-x,r.y-y)>2)step((x-r.x)/3,(y-r.y)/3);};
  const [first,second]=M.barriers(a,Y(24600),Y(25100));
  move(first.x+first.w/2+M.RADIUS+24,r.y);move(r.x,first.y+45);
  move(second.x-second.w/2-M.RADIUS-24,r.y);move(r.x,second.y+45);
  const beam=M.beams(r.t,a,Y(25200),Y(25350))[0];move(M.trackAt(beam.y,a).center,beam.y-40);
  while(Array.from({length:33},(_,i)=>M.beams(r.t+i*50,a,beam.y,beam.y)[0].state).some(state=>state===2))step(0,0);
  move(r.x,beam.y+45);
  while(r.finishAt===undefined){
   const next=M.gaps(a,r.y,a.length)[0],jump=!!next&&next.start>=r.y&&next.start-r.y<=13&&r.z===0;
   step((M.trackAt(r.y+20,a).center-r.x)/10,1,jump);
  }
  assert.ok(r.y>=a.length);assert.ok(r.jumpAt>4000,'the gaps require actual player jumps');
 }
});
