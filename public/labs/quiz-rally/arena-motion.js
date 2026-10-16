/* Presentation clocks are independent from authoritative gameplay state. */
(()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hermite(a,b,va,vb,k,seconds){
 const slope=(b-a)/seconds;if(!slope)return a;
 const tangent=v=>Math.sign(v)===Math.sign(slope)?Math.sign(slope)*Math.min(Math.abs(v),3*Math.abs(slope)):0;
 const k2=k*k,k3=k2*k;return (2*k3-3*k2+1)*a+(k3-2*k2+k)*tangent(va)*seconds+(-2*k3+3*k2)*b+(k3-k2)*tangent(vb)*seconds;
}
class PoseTrack{
 constructor(){this.clear();}
 clear(){this.samples=[];this.offset=null;this.cursor=null;this.clock=null;this.arrival=-Infinity;this.visual=null;this.cadence=null;this.jitter=0;this.delay=140;this.sealed=false;this.authoritative=false;this.batch=null;this.batchArrival=null;}
 push(pose,clock,through,authoritative=false){
  if(!Array.isArray(pose)||pose.length!==13||!pose.every(Number.isFinite))return false;
  const [t,x,y,z,vx,vy,vz,fx,fy,flags,seq,falls,jumpAt]=pose,last=this.samples.at(-1);
  if(last&&(t<=last.t||seq<last.seq))return false;
  const settled=Number.isFinite(through),newBatch=settled&&through!==this.batch;
  if(newBatch){this.sealed=true;this.authoritative=authoritative;const spacing=this.batchArrival===null?0:clock-this.batchArrival;
   if(spacing>20&&spacing<2500){this.cadence=this.cadence===null?spacing:this.cadence+(spacing-this.cadence)*.2;this.jitter+=(Math.abs(spacing-this.cadence)-this.jitter)*.15;this.delay=clamp(this.cadence*1.1+40+this.jitter*2,authoritative?140:250,authoritative?500:1400);}
   else if(this.batchArrival===null)this.delay=authoritative?180:400;
   this.batch=through;this.batchArrival=clock;
  }
  if(last&&!settled){const spacing=t-last.t,moving=Math.hypot(vx,vy,vz,last.vx,last.vy,last.vz)>.1;
   if(moving&&spacing>0&&spacing<=500){this.cadence=this.cadence===null?spacing:this.cadence+(spacing-this.cadence)*.2;
    this.jitter+=(Math.abs(clock-this.arrival-spacing)-this.jitter)*.1;
    // Match the observed link, not an assumed 100 ms delivery interval.
    // Idle heartbeats never enlarge the movement buffer.
    this.delay=clamp(this.cadence*1.15+20+this.jitter*2,140,500);
   }
  }
  const observed=clock-(settled?through:t);
  // A room watermark can catch up after classmates join or reconnect. Its
  // age is not clock drift: retaining the old offset would add seconds of lag.
  if(settled&&newBatch)this.offset=observed;
  else if(!settled)this.offset=this.offset===null?observed:this.offset+clamp(observed-this.offset,-20,20)*.05;
  this.arrival=clock;this.samples.push({t,x,y,z,vx,vy,vz,fx,fy,flags,seq,falls,jumpAt});
  if(this.samples.length>64)this.samples.shift();
  return true;
 }
 sample(clock,source){
  if(!this.samples.length||clock-this.arrival>(this.sealed?6000:1500))return null;
  const elapsed=this.clock===null?0:Math.max(0,clock-this.clock);this.clock=clock;
  const desired=clock-this.offset-this.delay;
  if(this.cursor===null||elapsed>2000)this.cursor=desired;
  else this.cursor+=elapsed*clamp(1+(desired-this.cursor)/1500,.92,this.sealed&&desired-this.cursor>1000?1.25:1.08);
  // Common frames are settled through their timestamp. Never extrapolate past
  // that boundary and show a player crossing an unresolved missile contact.
  if(this.sealed)this.cursor=Math.min(this.cursor,this.samples.at(-1).t);
  const at=this.cursor;
  while(this.samples.length>2&&this.samples[1].t<=at)this.samples.shift();
  const a=this.samples[0],b=this.samples.find(p=>p.t>at);let target;
  if(at<a.t)target={...a};
  else if(b){
   const before=this.samples[this.samples.indexOf(b)-1],seconds=(b.t-before.t)/1000,k=clamp((at-before.t)/(b.t-before.t),0,1);
   const respawn=b.falls>before.falls||(before.flags&4)&&!(b.flags&4);
   target={...before,t:at};
   if(!respawn){for(const [key,velocity] of [['x','vx'],['y','vy']])target[key]=hermite(before[key],b[key],before[velocity],b[velocity],k,seconds);
    target.z=before.z+(b.z-before.z)*k;
    const jumpAt=b.jumpAt<=at?Math.max(before.jumpAt,b.jumpAt):before.jumpAt,s=(at-jumpAt)/1000;
    if(!(before.flags&4)&&s>=0&&s<600/680){target.z=Math.max(0,300*s-340*s*s);target.jumpAt=jumpAt;target.vz=300-680*s;}
   }
  }else{
   const last=this.samples.at(-1),age=Math.max(0,(at-last.t)/1000),dt=Math.min(.35,age);
   // Short gaps continue smoothly; prolonged loss eases to a stop instead of
   // guessing through the map or suddenly freezing at a fixed millisecond.
   const travel=dt<=.1?dt:.1+.12*(1-Math.exp(-(dt-.1)/.12));
   target={...last,t:at,x:last.x+last.vx*travel,y:last.y+last.vy*travel};
   if(!(last.flags&4))target.z=Math.max(0,last.z+last.vz*Math.min(age,1)-340*Math.min(age,1)**2);
  }
  const previous=this.visual,respawn=previous&&(previous.flags&4)&&!(target.flags&4);
  // Settled server poses are already interpolated. A second low-pass filter
  // would put the visible victim behind the projectile's collision timestamp.
  if(this.authoritative||!previous||respawn||elapsed>2000)this.visual={...target};
  else{
   const dt=Math.min(80,elapsed),blend=1-Math.exp(-dt/35),dx=(target.x-previous.x)*blend,dy=(target.y-previous.y)*blend;
   const distance=Math.hypot(dx,dy),limit=((target.flags&16)?580:335)*dt/1000,k=Math.min(1,limit/(distance||1));
   this.visual={...target,x:previous.x+dx*k,y:previous.y+dy*k};
  }
  const p=this.visual,moving=Math.hypot(p.vx,p.vy)>.1,flags=p.flags;
  return {...source,...p,dx:moving?p.fx:0,dy:moving?p.fy:0,dash:!!(flags&1),open:!!(flags&2),
   inputUntil:clock+1500,fallUntil:flags&4?clock+100:0,stunUntil:flags&8?clock+100:0,
   boostUntil:flags&16?clock+100:0,shieldUntil:flags&32?clock+100:0};
 }
}
class LocalView{
 constructor(){this.reset();}
 reset(){this.x=0;this.y=0;this.z=0;this.zTime=0;}
 correct(before,after){
  if(!before||before.falls!==after.falls||!!before.fallUntil!==!!after.fallUntil||after.open||after.finishAt!==undefined||Math.hypot(before.x-after.x,before.y-after.y)>250){this.reset();return;}
  this.x=clamp(this.x+before.x-after.x,-100,100);this.y=clamp(this.y+before.y-after.y,-100,100);
  // A server acknowledgement can retime an otherwise valid jump. Preserve
  // the displayed height at that instant, then settle only its correction.
  // Do not low-pass the jump itself or alter collision/landing physics.
  if(Math.abs(before.z-after.z)>.001){this.z=clamp(this.z+before.z-after.z,-80,80);this.zTime=180;}
 }
 sample(r,dt){const elapsed=Math.max(0,dt),decay=Math.exp(-elapsed/80);this.x*=decay;this.y*=decay;
  if(this.zTime){const step=Math.min(elapsed,this.zTime);this.z*=1-step/this.zTime;this.zTime-=step;}
  if(!r.z&&!r.vz){this.z=0;this.zTime=0;}
  return{x:r.x+this.x,y:r.y+this.y,z:r.fallUntil?r.z:Math.max(0,r.z+this.z)};}
}
function mergeEffects(effects,delta){return effects.filter(e=>e.expires>delta.cutoff).map(e=>({...e,...delta.claims[e.id]})).concat(delta.added);}
// Projectiles and the player they hit must use the same presentation time.
// Local incoming hits stay on the immediate local physics timeline.
class EffectView{
 constructor(){this.clear();}
 clear(){this.entries=new Map();}
 begin(clock,players,own){
  this.clock=clock;this.players=players;this.own=own;
  this.hints=new Map();for(const player of players)for(const hit of player.hitHints||[]){const previous=this.hints.get(hit.id);if(!previous||hit.t<previous.t)this.hints.set(hit.id,{id:player.p.id,t:hit.t});}
  const times=players.filter(o=>o.p.id!==own?.id).map(o=>o.shown.t).filter(Number.isFinite).sort((a,b)=>a-b);
  // Server poses can be ahead of the conservative local input clock. Clamping
  // them to that clock shows a victim's knockback before the rocket arrives.
  this.remoteTime=times.length?times[Math.floor(times.length/2)]:clock;
  for(const [id,entry]of this.entries)if(Math.min(clock,this.remoteTime)>entry.expires+3000)this.entries.delete(id);
 }
 sample(effect){
  const own=this.own,localHit=own?.r.hits.find(h=>h.id===effect.id),localPrediction=!effect.shared||own?.predictions?.has(effect.id),hit=effect.victim?{id:effect.victim,t:effect.hitAt}:localHit&&localPrediction?{id:own.id,t:localHit.t}:effect.shared?null:this.hints.get(effect.id);
  const target=hit&&this.players.find(o=>o.p.id===hit.id);
  // A nearby incoming rocket must agree with this client's immediate dodge.
  const incoming=own&&effect.owner!==own.id&&Math.abs(own.r.x-effect.x)<100&&own.r.y>=effect.y-60&&own.r.y<effect.y+1100;
  const localTarget=!!hit&&hit.id===own?.id;
  const desired=localTarget||incoming&&!hit&&localPrediction?this.clock:target?target.shown.t:effect.type==='missile'?this.remoteTime:this.clock;
  let entry=this.entries.get(effect.id);
  if(!entry){entry={time:desired,clock:this.clock,expires:effect.expires,burstAt:null};this.entries.set(effect.id,entry);}
  const elapsed=Math.max(0,this.clock-entry.clock);entry.clock=this.clock;
  entry.time=localTarget?desired:entry.time+clamp(desired-entry.time,elapsed*.5,elapsed*1.5);
  const confirmed=hit&&desired>=hit.t&&entry.time>=hit.t;
  if(confirmed){
   if(entry.burstAt===null)entry.burstAt=this.clock;
   if(this.clock-entry.burstAt>500||desired-hit.t>3000)return null;
   return{effect:{...effect,victim:hit.id,hitAt:hit.t},time:hit.t+this.clock-entry.burstAt,positionAt:hit.t,burst:true};
  }
  const at=Math.min(entry.time,hit?.t??Infinity);if(at<effect.born||at>effect.expires)return null;
  return{effect,time:at,positionAt:at,burst:false};
 }
}
window.quizArenaMotion={PoseTrack,LocalView,EffectView,mergeEffects,hermite};
})();
