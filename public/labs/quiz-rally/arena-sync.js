/* Keep local input history until the server acknowledges it. Never rewind the running clock. */
(()=>{'use strict';
class Timeline{
 constructor(){this.base=0;this.received=0;this.rate=1;this.running=false;this.ready=false;}
 now(at=performance.now()){return this.base+(this.running?Math.max(0,at-this.received)*this.rate:0);}
 sync(raceClock,status,transit=0,at=performance.now()){
  const running=status==='running',target=raceClock+(running?Math.max(0,Math.min(1500,transit)):0),previous=this.now(at);
  if(!this.ready||!running||!this.running){this.base=target;this.rate=1;}
  else{const drift=target-previous;this.base=drift>400?target:previous;this.rate=Math.max(.85,Math.min(1.15,1+drift/1500));}
  this.received=at;this.running=running;this.ready=true;return this.now(at);
 }
}
function reconcile(M,source,pending,clock,arena,effects,id){let r=source;for(const event of pending){if(event.seq<=source.seq)continue;const at=Math.max(r.t,Math.min(clock,event.at));r=M.advanceRunner(r,at,arena,effects,id);r=M.control(r,event.dx,event.dy,event.jump,event.dive,at,event.seq);}return M.advanceRunner(r,clock,arena,effects,id);}
window.quizArenaSync={Timeline,reconcile};
})();
