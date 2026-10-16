const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};for(const file of ['arena-model.js','arena-sync.js'])vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/'+file,'utf8'),ctx);
const M=ctx.window.quizArenaModel,N=ctx.window.quizArenaSync,arena={version:1,length:4700,seed:7,combat:true,energy:true};
const runner=()=>({...M.freshRunner(4000),x:0,y:300});
const near=(a,b,why)=>assert.ok(Math.abs(a-b)<1e-7,`${why}: ${a} vs ${b}`);

test('dash jumps work in every direction; a press just before landing is consumed exactly once',()=>{
 for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const start=M.control(runner(),dx,dy,true,true,4000,1),air=M.advanceRunner(start,4800,arena);
  assert.ok(air.z>0,'dash preserves the first jump');
  const queued=M.control(air,dx,dy,true,true,4800,2),expected=M.advanceRunner(queued,5100,arena);
  near(expected.jumpAt,4000+600/680*1000,'buffer fires at landing');assert.ok(expected.z>40);assert.equal(expected.jumpQueuedUntil,0);
  for(const fps of [30,60,120]){let r=queued;for(let at=4800+1000/fps;at<5100;at+=1000/fps)r=M.advanceRunner(r,at,arena);r=M.advanceRunner(r,5100,arena);for(const k of ['z','vz','jumpAt','energy'])near(r[k],expected[k],`${fps} fps ${k}`);}
  const landed=M.advanceRunner(M.control(expected,0,0,false,false,5100,3),6000,arena);assert.equal(landed.z,0);near(landed.jumpAt,expected.jumpAt,'holding a press never auto-jumps again');
 }
});

test('an early midair press expires; a near-landing jump survives a delayed acknowledgement',()=>{
 const start=M.control(runner(),0,1,true,true,4000,1),early=M.control(M.advanceRunner(start,4300,arena),0,1,true,true,4300,2);
 const ended=M.advanceRunner(early,5100,arena);assert.equal(ended.z,0);assert.equal(ended.jumpAt,4000);
 const event={seq:2,at:4800,dx:0,dy:1,jump:true,dash:true},queued=M.control(M.advanceRunner(start,event.at,arena),0,1,true,true,event.at,2);
 const predicted=N.reconcile(M,start,[event],5100,arena,[],'me'),acknowledged=N.reconcile(M,queued,[],5100,arena,[],'me');
 for(const k of ['x','y','z','vz','jumpAt','energy'])near(predicted[k],acknowledged[k],`acknowledged buffer ${k}`);
 const popup=M.advanceRunner({...queued,open:true},5100,arena);assert.equal(popup.jumpQueuedUntil,0);
});

test('idle, held Shift, released inputs, stun and expired input consume no energy',()=>{
 for(const y of [300,1300,2000])for(const dash of [false,true]){
  const idle=M.control({...runner(),y,x:M.center(y)},0,0,false,dash,4000,1);
  near(M.advanceRunner(idle,24000,arena).energy,100,'idle charge');
 }
 const moving=M.control(runner(),0,1,false,true,4000,1),stopped=M.control(M.advanceRunner(moving,4500,arena),0,0,false,true,4500,2);
 near(stopped.energy,97,'moving dash drain');near(M.advanceRunner(stopped,24000,arena).energy,97,'released keys preserve remaining charge');
 const resumed=M.advanceRunner(M.control({...stopped,t:24000},0,1,false,false,24000,3),24500,arena);near(resumed.energy,95.75,'walk resumes base drain');
 const stunned=M.advanceRunner({...moving,stunUntil:4500},4800,arena);near(stunned.energy,98.2,'only 300 ms of active dash');
 near(M.advanceRunner(moving,24000,arena).energy,86.8,'expired input is not moving');
});

test('uneven remote snapshots and reversals are interpolated with bounded frame movement',()=>{
 const track=new N.RemoteTrack(),source=runner(),anchors=[];let r=source,seq=0;
 // Alternate directions without reaching a hazard; delay and skip updates.
 for(let i=0;i<12;i++){const at=4000+i*650;r=M.control(M.advanceRunner(r,at,arena),0,i%2?1:-1,false,true,at,++seq);anchors.push({at:at+[100,650,250,1100][i%4],r});}
 anchors.sort((a,b)=>a.at-b.at);let previous,cursor=-Infinity,largest=0,index=0;
 for(let at=4000;at<13000;at+=1000/60){while(anchors[index]?.at<=at){track.push(anchors[index].r,at);index++;}
  const shown=track.sample(M,at,arena,[],'other');if(!shown)continue;
  assert.ok(track.cursor>=cursor,'display time never rewinds');cursor=track.cursor;
  if(previous){const step=Math.hypot(shown.x-previous.x,shown.y-previous.y);largest=Math.max(largest,step);assert.ok(step<5.59,`snapshot cannot teleport: ${step}px/frame`);}
  previous=shown;assert.ok(track.samples.length<=10);
 }
 assert.ok(largest>1,'the remote avatar actually moves');
 const stable=track.sample(M,16000,arena,[],'other'),later=track.sample(M,19000,arena,[],'other');near(stable.x,later.x,'no endless horizontal guess');near(stable.y,later.y,'no endless forward guess');
});

test('remote history retains short jump arcs, ignores old packets and freezes with the race clock',()=>{
 const track=new N.RemoteTrack(),a=runner(),air=M.advanceRunner(M.control(a,0,1,true,true,4000,1),4650,arena),b=M.control(air,0,1,false,true,4650,2);
 track.push(a,4000);track.push(b,4800);track.delay=250;track.cursor=4400;
 const q=track.sample(M,4650,arena,[],'other');assert.ok(q.z>50,'known jump arc is visible between polls');
 track.push({...a,t:3990,x:999},4900);assert.equal(track.samples.at(-1).seq,2);
 const frozen=track.sample(M,4650,arena,[],'other');near(frozen.x,q.x,'pause x');near(frozen.y,q.y,'pause y');near(frozen.z,q.z,'pause z');
});
