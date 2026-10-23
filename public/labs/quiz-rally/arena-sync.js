/* Keep local input history until acknowledgement; smooth normal clock drift. */
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
 constructor(){this.base=0;this.received=0;this.correction=0;this.running=false;this.ready=false;this.confirmed=-Infinity;}
 // A confirmed own-player pose is a lower bound, not an RTT estimate. Without
 // this, a future anchor freezes local physics until the slow clock catches up.
 ensureAtLeast(confirmed,at=performance.now()){
  if(!this.running||!Number.isFinite(confirmed)||confirmed<=this.now(at)+.5)return false;
  this.base=confirmed;this.received=at;this.correction=0;return true;
 }
 now(at=performance.now()){const elapsed=this.running?Math.max(0,at-this.received):0;return this.base+elapsed+Math.sign(this.correction)*Math.min(Math.abs(this.correction),elapsed*.02);}
 sync(raceClock,status,transit=0,at=performance.now(),anticipateInput=false){
  const running=status==='running';
  // HTTP snapshots and socket frames can finish in a different order. Their
  // timestamps must not rewind the clock after a newer frame was accepted.
  if(this.ready&&this.running&&running&&raceClock<this.confirmed)return this.now(at);
  this.confirmed=raceClock;
  // The room applies controls on arrival, not at the client's old timestamp.
  // Predict that arrival: from a received server stamp, downlink + uplink is
  // one measured RTT, including asymmetric links. Legacy journals and teacher
  // views keep the confirmed clock; they do not use this input lead.
  const lead=running&&anticipateInput?Math.min(500,Math.max(0,Number.isFinite(transit)?transit*2:0)):0;
  const target=raceClock+lead,previous=this.now(at);
  if(!this.ready||!running||!this.running){this.base=target;this.correction=0;}
  // After an outage, drift beyond the server's input freshness window would
  // reject every jump for minutes at a 2% correction rate. Re-anchor once;
  // reconciliation restores the confirmed runner and replays pending inputs.
  else if(Math.abs(target-previous)>1500){this.base=target;this.correction=0;}
  // A slow response is not a reason to skip part of a jump or collision.
  // Keep elapsed play time continuous; correct clock drift gradually.
  else{this.base=previous;this.correction=target-previous;}
  this.received=at;this.running=running;this.ready=true;return this.now(at);
 }
}
function reconcile(M,source,pending,clock,arena,effects,id,previous){
 // A snapshot can be newer than a locally pressed jump without having
 // acknowledged that input. Replaying that edge at snapshot.t would restart
 // the same jump on every world frame. Retain its already simulated flight
 // until the server accepts/rejects the edge; movement still reconciles.
 const keepJump=previous&&!previous.fallUntil&&previous.falls===source.falls&&!source.fallUntil&&!source.open&&source.finishAt===undefined&&source.stunUntil<=previous.stunUntil&&source.t>=previous.jumpAt&&pending.some(e=>e.jump&&e.seq>source.seq&&e.seq<=previous.seq&&e.at<=previous.jumpAt);
 let r=source;
 if(keepJump){const seconds=(source.t-previous.jumpAt)/1000,z=Math.max(0,300*seconds-340*seconds**2);r={...source,z,vz:z>0||seconds===0?300-680*seconds:0,jumpAt:previous.jumpAt,jumpQueuedUntil:0};}
 for(const event of pending){
  if(event.seq<=source.seq)continue;
  const at=Math.max(r.t,Math.min(clock,event.at));r=M.advanceRunner(r,at,arena,effects,id);
  let jump=event.jump;
  if(keepJump&&event.seq<=previous.seq&&event.at<=previous.jumpAt)jump=false;
  else if(jump&&previous&&event.seq<=previous.seq&&event.at<at){r={...r,jumpQueuedUntil:event.at+150};jump=false;}
  r=M.control(r,event.dx,event.dy,jump,event.dash??event.dive,at,event.seq);
 }
 return M.advanceRunner(r,clock,arena,effects,id);
}
// Presentation only: authoritative ranking, hits and the local player keep
// their own simulation. A small bounded history absorbs uneven classroom polls.
class RemoteTrack{
 constructor(){this.samples=[];this.interval=650;this.delay=650;this.cursor=null;this.clock=null;this.visual=null;this.prediction=null;this.live=false;this.poses=window.quizArenaMotion?new window.quizArenaMotion.PoseTrack():null;}
 pushPose(pose,clock,hits=[],through,authoritative=false){if(this.poses?.push(pose,clock,through,authoritative))this.hitHints=hits;}
 setLive(live){if(this.live===live)return;this.live=live;if(!live){if(!this.poses?.sealed)this.poses?.clear();this.hitHints=[];}this.delay=live?120:650;this.cursor=null;this.prediction=null;}
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
   if(!this.poses.authoritative&&previous&&elapsed<2000&&!(streamed.falls>previous.falls||previous.fallUntil&&!streamed.fallUntil)){
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
// The input save and an urgent item can finish in either order. A late
// response must never restore spent gear or rewind anyone's accepted controls.
function mergeSnapshot(previous,next){
 if(!previous||previous.code!==next.code)return next;
 if((next.roomRevision||0)<(previous.roomRevision||0))return null;
 const merged={...next};
 // Transport timing is deliberately non-enumerable. Preserve it across a
 // player merge without adding per-packet timing to rendered UI identities.
 if(Number.isFinite(next._transitMs))Object.defineProperty(merged,'_transitMs',{value:next._transitMs});
 if((previous.arenaRevision||0)>(next.arenaRevision||0)){merged.arenaRevision=previous.arenaRevision;merged.arenaEffects=previous.arenaEffects;}
 const mergePlayer=(old,p)=>{
  if(!old||old.id!==p.id)return p;
  const result=(old.version||0)>(p.version||0)?old:p;
  // Motion frames carry only the runner. They must not claim to have received
  // the corresponding inventory/question/finish fields of a full snapshot.
  return (old.motionVersion||0)>Math.max(p.version||0,p.motionVersion||0)?{...result,runner:old.runner,motionVersion:old.motionVersion}:result;
 };
 const peers=new Map(previous.ranking.map(p=>[p.id,p]));
 merged.ranking=next.ranking.map(p=>mergePlayer(peers.get(p.id),p));
 if(next.player)merged.player=mergePlayer(previous.player,next.player);
 if(previous.roomRevision===next.roomRevision&&(previous.liveRankAt||0)>next.raceClock){merged.liveRanks=previous.liveRanks;merged.liveRankAt=previous.liveRankAt;}
 return merged;
}
function orderPlayers(players,order){const places=new Map((order||[]).map((id,i)=>[id,i]));return players.sort((a,b)=>a.p.finish||b.p.finish?(a.p.finish?.place||999)-(b.p.finish?.place||999):order?(places.get(a.p.id)??999)-(places.get(b.p.id)??999):b.r.y-a.r.y||a.p.id.localeCompare(b.p.id));}
// A small dead zone prevents drift. Full input is reachable without stretching
// a thumb to the pad edge; preserve low-speed precision and diagonal magnitude.
function touchVector(dx,dy){const distance=Math.hypot(dx,dy);if(distance<=4)return{x:0,y:0};const strength=Math.min(1,(distance-4)/20);return{x:dx/distance*strength,y:dy/distance*strength};}
window.quizArenaSync={Keyboard,Timeline,RemoteTrack,reconcile,mergeSnapshot,orderPlayers,touchVector};
})();

