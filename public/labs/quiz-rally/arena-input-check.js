/* Local, bounded movement diagnostics. No room identity or network upload. */
(()=>{'use strict';
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','KeyE','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','Space']);
const movementKeys=new Set(['w','a','s','d','e','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Shift',' ']);
class InputCheck{
 constructor(){this.reset();}
 reset(){this.entries=new Array(2400);this.next=0;this.size=0;this.started=performance.now();this.sampleAt=0;}
 record(type,data={}){this.entries[this.next]={ms:Math.round(performance.now()-this.started),type,...data};this.next=(this.next+1)%this.entries.length;this.size=Math.min(this.size+1,this.entries.length);}
 key(event,down,accepted){
  const key=event.key?.length===1?event.key.toLowerCase():event.key;
  if(!movementCodes.has(event.code)&&!movementKeys.has(key))return;
  this.record('key',{code:movementCodes.has(event.code)?event.code:key,down,repeat:event.repeat,shift:event.shiftKey,accepted,trusted:event.isTrusted,eventTime:Math.round(event.timeStamp),focused:document.hasFocus()});
 }
 runner(r){return{seq:r.seq,t:Math.round(r.t),x:Math.round(r.x*10)/10,y:Math.round(r.y*10)/10,dx:r.dx,dy:r.dy,dash:!!r.dash,inputUntil:Math.round(r.inputUntil),energy:Math.round((r.energy??100)*10)/10,open:r.open,fallUntil:r.fallUntil,stunUntil:r.stunUntil,finishAt:r.finishAt};}
 sample(controls,keyboard,r,active,t,pending){
  const now=performance.now();if(now<this.sampleAt)return;this.sampleAt=now+100;
  this.record('frame',{controls,keys:[...keyboard.keys],shift:keyboard.shift,runner:this.runner(r),active,clock:Math.round(t),pending,focused:document.hasFocus(),hidden:document.hidden});
 }
 report(){const first=(this.next-this.size+this.entries.length)%this.entries.length;return{format:1,build:'dash-lock-1',browser:navigator.userAgent,events:Array.from({length:this.size},(_,i)=>this.entries[(first+i)%this.entries.length])};}
 download(){const url=URL.createObjectURL(new Blob([JSON.stringify(this.report(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='quiz-rally-input.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
window.quizArenaInputCheck=InputCheck;
})();
