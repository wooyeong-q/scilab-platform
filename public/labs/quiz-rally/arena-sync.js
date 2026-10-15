/* Keep local input history until the server acknowledges it. Never rewind the running clock. */
(()=>{'use strict';
const movementCodes={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'ArrowUp',ArrowLeft:'ArrowLeft',ArrowDown:'ArrowDown',ArrowRight:'ArrowRight'};
const movementKeys=new Set(Object.values(movementCodes));
class Keyboard{
 constructor(){this.keys=new Set();this.shift=false;}
 clear(){this.keys.clear();this.shift=false;}
 update(event,down){
  // Physical codes keep WASD stable while an IME or Shift changes event.key.
  const key=movementCodes[event.code]||(event.key.length===1?event.key.toLowerCase():event.key);
  if(movementKeys.has(key)){if(down)this.keys.add(key);else this.keys.delete(key);}
  // A modal/focus change can clear the original Shift keydown. Movement
  // repeats still report the held modifier, so refresh it on every event.
  // On keyup, shiftKey also tells us whether the other Shift is still held.
  this.shift=!!event.shiftKey||(down&&(event.code==='ShiftLeft'||event.code==='ShiftRight'||key==='Shift'));
  return movementKeys.has(key);
 }
 controls(){const k=this.keys;return{x:(k.has('ArrowRight')||k.has('d')?1:0)-(k.has('ArrowLeft')||k.has('a')?1:0),y:(k.has('ArrowUp')||k.has('w')?1:0)-(k.has('ArrowDown')||k.has('s')?1:0),dash:this.shift};}
}
class Timeline{
 constructor(){this.base=0;this.received=0;this.correction=0;this.running=false;this.ready=false;}
 now(at=performance.now()){const elapsed=this.running?Math.max(0,at-this.received):0;return this.base+elapsed+Math.sign(this.correction)*Math.min(Math.abs(this.correction),elapsed*.02);}
 sync(raceClock,status,transit=0,at=performance.now()){
  // Half a round trip is not the response delay: asymmetric connections can
  // put the client ahead of the server and cause a jump to be retimed on ack.
  // Use the confirmed clock as a conservative target and never skip play time.
  const running=status==='running',target=raceClock,previous=this.now(at);
  if(!this.ready||!running||!this.running){this.base=target;this.correction=0;}
  // A slow response is not a reason to skip part of a jump or collision.
  // Keep elapsed play time continuous; correct clock drift gradually.
  else{this.base=previous;this.correction=target-previous;}
  this.received=at;this.running=running;this.ready=true;return this.now(at);
 }
}
function reconcile(M,source,pending,clock,arena,effects,id){let r=source;for(const event of pending){if(event.seq<=source.seq)continue;const at=Math.max(r.t,Math.min(clock,event.at));r=M.advanceRunner(r,at,arena,effects,id);r=M.control(r,event.dx,event.dy,event.jump,event.dash??event.dive,at,event.seq);}return M.advanceRunner(r,clock,arena,effects,id);}
// Presentation only: authoritative ranking, hits and the local player keep
// their own simulation. A small bounded history absorbs uneven classroom polls.
class RemoteTrack{
 constructor(){this.samples=[];this.interval=650;this.delay=650;this.cursor=null;this.clock=null;this.visual=null;this.prediction=null;this.live=false;this.poses=window.quizArenaMotion?new window.quizArenaMotion.PoseTrack():null;}
 pushPose(pose,clock){this.poses?.push(pose,clock);}
 setLive(live){if(this.live===live)return;this.live=live;if(!live)this.poses?.clear();this.delay=live?120:650;this.cursor=null;this.prediction=null;}
 push(r,clock){
  const last=this.samples.at(-1);
  if(last&&r.t<last.t)return;
  const key=q=>[q.t,q.seq,q.x,q.y,q.z,q.vz,q.dx,q.dy,q.jumpAt,q.jumpQueuedUntil,q.open,q.falls,q.fallUntil,q.stunUntil,q.boostUntil,q.shieldUntil,q.energy,q.finishAt].join(':');
  if(last&&key(last)===key(r))return;
  if(last&&r.t>last.t){
   this.interval=this.interval*.8+Math.min(2000,r.t-last.t)*.2;
   this.delay=Math.max(250,Math.min(1100,Math.max(0,clock-r.t)+this.interval*.75));
  }
  if(this.live)this.delay=Math.max(100,Math.min(600,Math.max(0,clock-r.t)+80));
  if(last&&r.t===last.t)this.samples[this.samples.length-1]=r;
  else this.samples.push(r);
  if(this.samples.length>10)this.samples.shift();
  this.prediction=null;
 }
 sample(M,clock,arena,effects,id){
  if(!this.samples.length)return null;
  const streamed=this.poses?.sample(clock,this.samples.at(-1));if(streamed){
   const previous=this.visual,elapsed=this.clock===null?0:Math.max(0,clock-this.clock);
   // Switching between the durable fallback and fast poses is also a
   // correction. Bound that handover, including the first socket packet.
   if(previous&&elapsed<2000&&!(previous.fallUntil&&!streamed.fallUntil)){
    const dx=streamed.x-previous.x,dy=streamed.y-previous.y,limit=(streamed.boostUntil>clock?580:335)*Math.min(80,elapsed)/1000,k=Math.min(1,limit/(Math.hypot(dx,dy)||1));
    streamed.x=previous.x+dx*k;streamed.y=previous.y+dy*k;
   }
   this.visual={x:streamed.x,y:streamed.y,z:streamed.z,falls:streamed.falls,fallUntil:streamed.fallUntil};this.clock=clock;return streamed;
  }
  const elapsed=this.clock===null?0:Math.max(0,clock-this.clock);this.clock=clock;
  const desired=clock-this.delay;
  if(this.cursor===null||elapsed>2000)this.cursor=desired;
  else this.cursor+=elapsed*Math.max(.85,Math.min(1.15,1+(desired-this.cursor)/1000));
  const at=this.cursor;
  while(this.samples.length>2&&this.samples[1].t<=at)this.samples.shift();
  const a=this.samples[0],b=this.samples.find(q=>q.t>at);let target;
  if(at<a.t)target=a;
  else if(b){
   const before=this.samples[this.samples.indexOf(b)-1];
   if(b.falls!==before.falls||before.fallUntil&&!b.fallUntil){
    // A checkpoint return is a real discontinuity, not a network correction.
    target=M.advanceRunner(before,Math.min(at,before.t+350),arena,effects,id);
   }else{
    const k=(at-before.t)/(b.t-before.t),mix=key=>before[key]+(b[key]-before[key])*k;
    target={...before,t:at,x:mix('x'),y:mix('y'),z:mix('z')};
    // Preserve the arc even if a poll missed the middle of a short jump.
    const jumpAt=b.jumpAt<=at?Math.max(before.jumpAt,b.jumpAt):before.jumpAt,seconds=(at-jumpAt)/1000;
    if(!before.fallUntil&&seconds>=0&&seconds<300/340){target.z=Math.max(0,300*seconds-340*seconds*seconds);target.vz=300-680*seconds;target.jumpAt=jumpAt;}
   }
  }else{
   const latest=this.samples.at(-1),until=Math.max(latest.t,Math.min(at,latest.t+(this.live?1100:350)));
   // Do not keep guessing a classmate's direction for several seconds.
   // Resume the cached projection between packets instead of replaying it.
   if(!this.prediction||this.prediction.t>until)this.prediction=latest;
   this.prediction=M.advanceRunner(this.prediction,until,arena,effects,id);target=this.prediction;
  }
  const previous=this.visual,respawn=previous&&!target.fallUntil&&(target.falls>previous.falls||previous.fallUntil);
  if(!previous||respawn||elapsed>2000)this.visual={x:target.x,y:target.y,z:target.z,falls:target.falls,fallUntil:target.fallUntil};
  else{
   const dt=Math.min(80,elapsed),blend=1-Math.exp(-dt/120),dx=(target.x-previous.x)*blend,dy=(target.y-previous.y)*blend;
   const limit=(M.SPEED*M.DASH_SPEED*(target.boostUntil>at?2:1)+90)*dt/1000,k=Math.min(1,limit/(Math.hypot(dx,dy)||1));
   previous.x+=dx*k;previous.y+=dy*k;previous.z+=Math.max(-450*dt/1000,Math.min(450*dt/1000,(target.z-previous.z)*blend));
   previous.falls=target.falls;previous.fallUntil=target.fallUntil;
  }
  return {...target,...this.visual};
 }
}
window.quizArenaSync={Keyboard,Timeline,RemoteTrack,reconcile};
})();
