/* Keep local input history until the server acknowledges it. Never rewind the running clock. */
(()=>{'use strict';
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
function reconcile(M,source,pending,clock,arena,effects,id){let r=source;for(const event of pending){if(event.seq<=source.seq)continue;const at=Math.max(r.t,Math.min(clock,event.at));r=M.advanceRunner(r,at,arena,effects,id);r=M.control(r,event.dx,event.dy,event.jump,event.dive,at,event.seq);}return M.advanceRunner(r,clock,arena,effects,id);}
window.quizArenaSync={Timeline,reconcile};
})();
