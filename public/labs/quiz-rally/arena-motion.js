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
 clear(){this.samples=[];this.offset=null;this.cursor=null;this.clock=null;this.arrival=-Infinity;this.visual=null;}
 push(pose,clock){
  if(!Array.isArray(pose)||pose.length!==13||!pose.every(Number.isFinite))return;
  const [t,x,y,z,vx,vy,vz,fx,fy,flags,seq,falls,jumpAt]=pose,last=this.samples.at(-1);
  if(last&&(t<=last.t||seq<last.seq))return;
  const observed=clock-t;this.offset=this.offset===null?observed:this.offset+clamp(observed-this.offset,-20,20)*.05;
  this.arrival=clock;this.samples.push({t,x,y,z,vx,vy,vz,fx,fy,flags,seq,falls,jumpAt});
  if(this.samples.length>24)this.samples.shift();
 }
 sample(clock,source){
  if(!this.samples.length||clock-this.arrival>1500)return null;
  const elapsed=this.clock===null?0:Math.max(0,clock-this.clock);this.clock=clock;
  const desired=clock-this.offset-140;
  if(this.cursor===null||elapsed>2000)this.cursor=desired;
  else this.cursor+=elapsed*clamp(1+(desired-this.cursor)/1500,.92,1.08);
  const at=this.cursor;
  while(this.samples.length>2&&this.samples[1].t<=at)this.samples.shift();
  const a=this.samples[0],b=this.samples.find(p=>p.t>at);let target;
  if(at<a.t)target={...a};
  else if(b){
   const before=this.samples[this.samples.indexOf(b)-1],seconds=(b.t-before.t)/1000,k=clamp((at-before.t)/(b.t-before.t),0,1);
   const respawn=(before.flags&4)&&!(b.flags&4);
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
  if(!previous||respawn||elapsed>2000)this.visual={...target};
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
 reset(){this.x=0;this.y=0;}
 correct(before,after){
  if(!before||before.falls!==after.falls||Math.hypot(before.x-after.x,before.y-after.y)>250){this.reset();return;}
  this.x=clamp(this.x+before.x-after.x,-100,100);this.y=clamp(this.y+before.y-after.y,-100,100);
 }
 sample(r,dt){const decay=Math.exp(-Math.max(0,dt)/80);this.x*=decay;this.y*=decay;return{x:r.x+this.x,y:r.y+this.y,z:r.z};}
}
window.quizArenaMotion={PoseTrack,LocalView,hermite};
})();
