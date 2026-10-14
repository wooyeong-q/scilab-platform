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
window.quizArenaSync={Keyboard,Timeline,reconcile};
})();
