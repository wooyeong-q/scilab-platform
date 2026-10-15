/* Durable game saves and low-latency motion travel independently. */
(()=>{'use strict';
class Live{
 constructor({event,status,refresh}){this.event=event;this.status=status;this.refresh=refresh;this.key='';this.ready=false;this.fast=false;this.attempt=0;this.timer=0;this.abort=null;this.generation=0;this.inputTimer=0;this.inputRequests=new Set();this.inputs=[];this.inputRevision='';this.dispatched=0;this.lastPost=0;}
 configure(url,who,enabled){const key=enabled&&who?url+':'+who.role+':'+who.playerId+':'+who.token:'';if(key===this.key)return;this.stop();if(!key)return;this.key=key;this.url=url;this.who={...who};this.attempt=0;this.connect();}
 state(ready,fast=false){if(this.ready!==ready||this.fast!==fast){this.ready=ready;this.fast=fast;this.status(ready,fast);}}
 stop(){this.key='';this.generation++;clearTimeout(this.timer);clearTimeout(this.inputTimer);this.inputTimer=0;this.abort?.abort();this.abort=null;for(const request of this.inputRequests)request.abort();this.inputRequests.clear();this.inputs=[];this.inputRevision='';this.dispatched=0;this.state(false);}
 reconnect(){if(!this.key)return;clearTimeout(this.timer);if(this.abort)this.abort.abort();else this.connect();}
 sendInput(input,revision){
  if(!this.fast||!this.key||this.who?.role!=='student'||!Number.isSafeInteger(revision?.roomRevision)||!Number.isSafeInteger(revision?.arenaRevision))return false;
  const key=String(revision.roomRevision);
  if(key!==this.inputRevision){this.inputRevision=key;this.inputs=[];this.dispatched=0;}
  if(!this.inputs.some(e=>e.seq===input.seq))this.inputs.push({...input});
  this.inputs.sort((a,b)=>a.seq-b.seq);if(this.inputs.length>96){this.inputs=this.inputs.slice(-96);this.refresh();}
  this.revision={...revision};this.scheduleInput();return true;
 }
 scheduleInput(){if(this.inputTimer||!this.fast||!this.inputs.length||this.inputRequests.size>=2||this.inputs.at(-1).seq<=this.dispatched)return;
  this.inputTimer=setTimeout(()=>{this.inputTimer=0;this.flushInputs();},Math.max(0,100-(Date.now()-this.lastPost)));
 }
 async flushInputs(){
  if(!this.fast||!this.key||!this.inputs.length||this.inputRequests.size>=2)return;
  const generation=this.generation,revisionKey=this.inputRevision,inputs=this.inputs.slice(0,24),last=inputs.at(-1).seq,abort=new AbortController();
  if(last<=this.dispatched)return;this.dispatched=last;this.lastPost=Date.now();this.inputRequests.add(abort);
  const timeout=setTimeout(()=>abort.abort(),3000),url=new URL(this.url,location.href);url.pathname=url.pathname.replace(/\/events$/,'/motion');url.search='';
  try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.who.token,'X-Quiz-Role':this.who.role,'X-Player-Id':this.who.playerId},body:JSON.stringify({inputs,...this.revision}),cache:'no-store',signal:abort.signal});
   if(!response.ok)throw new Error('motion unavailable');
   if(generation===this.generation&&revisionKey===this.inputRevision)this.inputs=this.inputs.filter(e=>e.seq>last);
  }catch{if(generation===this.generation&&revisionKey===this.inputRevision){this.dispatched=0;this.lastPost=Date.now()+200;this.refresh();}}
  finally{clearTimeout(timeout);this.inputRequests.delete(abort);if(generation===this.generation)this.scheduleInput();}
 }
 async connect(){
  if(!this.key)return;const generation=++this.generation,abort=new AbortController();this.abort=abort;let watchdog,reader;
  const arm=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>abort.abort(),20000);};arm();
  try{
   const who=this.who,url=new URL(this.url,location.href);url.searchParams.set('motion','1');url.searchParams.set('world','1');
   const response=await fetch(url,{headers:{Authorization:'Bearer '+who.token,'X-Quiz-Role':who.role,'X-Player-Id':who.playerId||'',Accept:'text/event-stream'},cache:'no-store',signal:abort.signal});
   if(generation!==this.generation)return;
   if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw new Error('stream unavailable');
   reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
   while(true){const{value,done}=await reader.read();if(done||generation!==this.generation)break;arm();buffer+=decoder.decode(value,{stream:true});if(buffer.length>131072)throw new Error('stream overflow');
    let end;while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)continue;
     const event=JSON.parse(data);if(event.type==='ready'){this.attempt=0;this.world=event.world===true;this.state(true,event.motion===true);this.refresh();this.scheduleInput();}else if(event.type!=='ping')this.event(event);
    }
   }
  }catch{}finally{clearTimeout(watchdog);try{await reader?.cancel();}catch{}
   if(generation===this.generation){this.abort=null;this.state(false);if(this.key)this.timer=setTimeout(()=>this.connect(),Math.min(15000,400*2**Math.min(this.attempt++,5))+Math.random()*400);}
  }
 }
}
window.quizArenaLive=Live;
})();
