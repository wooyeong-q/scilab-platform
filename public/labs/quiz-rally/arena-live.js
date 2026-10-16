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
// A real-time room never falls back to the independent Neon motion publisher.
// HTTP retries are routed to the same room authority by the application API.
class RealtimeLive {
 constructor(callbacks){Object.assign(this,callbacks);this.key='';this.ready=false;this.fast=false;this.pending=new Map();this.generation=0;this.attempt=0;this.inputQueue=[];this.lastInputSend=0;this.sentSeq=-1;this.ackSeq=-1;}
 state(ready){if(this.ready!==ready){this.ready=ready;this.fast=ready;this.status(ready,ready);}}
 configure(url,who,enabled,realtime){const key=enabled&&who?realtime.url+':'+who.role+':'+who.playerId+':'+who.token:'';if(key===this.key)return;this.stop();if(!key)return;this.key=key;this.url=realtime.url;this.who={...who};this.attempt=0;this.connect();}
 stop(){this.key='';this.generation++;clearTimeout(this.timer);clearTimeout(this.watchdog);clearTimeout(this.inputTimer);this.inputTimer=0;this.inputQueue=[];clearInterval(this.heartbeat);if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null;}for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('실시간 서버에 다시 연결하고 있어요.'));}this.pending.clear();this.state(false);}
 arm(){clearTimeout(this.watchdog);this.watchdog=setTimeout(()=>this.socket?.close(),12000);}
 connect(){
  if(!this.key)return;const generation=++this.generation;let socket;
  try{socket=new WebSocket(this.url);}catch{this.timer=setTimeout(()=>this.connect(),2000);return;}
  this.socket=socket;this.awaitingSnapshot=true;this.lastInputSend=0;this.sentSeq=-1;this.ackSeq=-1;this.arm();
  socket.onopen=()=>{if(generation!==this.generation)return;socket.send(JSON.stringify({type:'auth',identity:this.who,playerDeltas:1}));};
  socket.onmessage=message=>{
   if(generation!==this.generation)return;this.arm();
   try{const event=JSON.parse(message.data);
    const snapshot=event.data,ack=event.type==='world'?event.self?.runner:snapshot?.player?.runner;
    if(snapshot&&snapshot.status!=='running'){this.inputQueue=[];clearTimeout(this.inputTimer);this.inputTimer=0;}
    if(ack){this.ackSeq=Math.max(this.ackSeq,ack.seq);this.inputQueue=this.inputQueue.filter(e=>e.seq>this.ackSeq);if(!this.inputQueue.length){clearTimeout(this.inputTimer);this.inputTimer=0;}}
    if(event.type==='ready'){this.attempt=0;clearInterval(this.heartbeat);this.heartbeat=setInterval(()=>{if(socket.readyState===WebSocket.OPEN){this.pingAt=performance.now();socket.send('{"type":"ping"}');}},4000);}
    else if(event.type==='pong'){if(this.pingAt)this.transit=Math.min(250,(performance.now()-this.pingAt)/2);}
    else if(event.type==='response'||event.type==='error'){
     const pending=this.pending.get(event.id);if(pending){clearTimeout(pending.timer);this.pending.delete(event.id);if(event.type==='error'){const error=new Error(event.error);error.status=event.status;pending.reject(error);}else{if(event.data)Object.defineProperty(event.data,'_transitMs',{value:Math.min(250,(performance.now()-pending.started)/2)});pending.resolve(event.data);}}
     else if(event.type==='error'){this.refresh();if(event.status===403)socket.close();}
    }else{if(event.type==='snapshot'&&event.data)Object.defineProperty(event.data,'_transitMs',{value:this.transit||0});if(event.type==='world'){event.authoritative=true;event.transitMs=this.transit||0;}this.event(event);if(event.type==='snapshot'&&this.awaitingSnapshot){this.awaitingSnapshot=false;this.state(true);}}
   }catch{socket.close();}
  };
  socket.onclose=event=>{if(generation!==this.generation)return;this.socket=null;clearTimeout(this.watchdog);clearTimeout(this.inputTimer);this.inputTimer=0;this.inputQueue=[];clearInterval(this.heartbeat);this.state(false);for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('실시간 서버에 다시 연결하고 있어요.'));}this.pending.clear();if(event.code===4001){this.key='';this.event({type:'superseded'});return;}if(this.key)this.timer=setTimeout(()=>this.connect(),Math.min(10000,400*2**Math.min(this.attempt++,5))+Math.random()*300);};
  socket.onerror=()=>socket.close();
 }
 reconnect(){if(this.socket)this.socket.close();else if(this.key){clearTimeout(this.timer);this.connect();}}
 sendInput(input,revision){return this.sendInputs([input],revision);}
 sendInputs(inputs,revision){
  if(!this.ready||this.socket?.readyState!==WebSocket.OPEN||this.who.role!=='student'||!inputs.length)return false;
  // Movement is a held state; jumps are edge events. Keep every unacknowledged
  // jump (with its direction/dash state), plus the newest held state.
  this.inputRevision={...revision};const queued=new Map(this.inputQueue.map(e=>[e.seq,e]));for(const e of inputs)if(e.seq>this.ackSeq)queued.set(e.seq,e);
  const ordered=[...queued.values()].sort((a,b)=>a.seq-b.seq),latest=ordered.at(-1);
  this.inputQueue=ordered.filter(e=>e.jump||e===latest);
  if(this.inputQueue.length>96){this.refresh();this.socket.close();return false;}
  this.flushInputs(inputs.some(e=>e.jump&&e.seq>this.sentSeq));return true;
 }
 flushInputs(urgent=false){
  clearTimeout(this.inputTimer);this.inputTimer=0;
  if(!this.ready||this.socket?.readyState!==WebSocket.OPEN||!this.inputQueue.length)return;
  // Never add another batch to an already congested socket. Retain edges until
  // a common frame acknowledges them; sequence numbers make retries harmless.
  const retry=this.inputQueue.at(-1).seq<=this.sentSeq;
  const wait=this.socket.bufferedAmount>65536?50:urgent?0:Math.max(0,(retry?250:60)-(Date.now()-this.lastInputSend));
  if(wait){this.inputTimer=setTimeout(()=>this.flushInputs(),wait);return;}
  this.socket.send(JSON.stringify({type:'input',inputs:this.inputQueue,...this.inputRevision}));
  this.sentSeq=Math.max(this.sentSeq,this.inputQueue.at(-1).seq);this.lastInputSend=Date.now();
  this.inputTimer=setTimeout(()=>this.flushInputs(),250);
 }
 request(body){
  if(!this.ready||this.socket?.readyState!==WebSocket.OPEN)return Promise.reject(new Error('실시간 서버에 다시 연결하고 있어요.'));
  this.flushInputs(true);const id=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('응답을 다시 확인하고 있어요.'));},4000);this.pending.set(id,{resolve,reject,timer,started:performance.now()});this.socket.send(JSON.stringify({type:'request',id,body:body||undefined}));});
 }
}
class Transport {
 constructor(callbacks){this.legacy=new Live(callbacks);this.realtime=new RealtimeLive(callbacks);this.active=this.legacy;}
 get ready(){return this.active.ready;}get fast(){return this.active.fast;}get authoritative(){return this.active===this.realtime;}
 configure(url,who,enabled,realtime){const next=realtime?.version===1?this.realtime:this.legacy;if(this.active!==next){this.active.stop();this.active=next;}this.active.configure(url,who,enabled,realtime);}
 stop(){this.active.stop();}reconnect(){this.active.reconnect();}sendInput(input,revision){return this.active.sendInput(input,revision);}sendInputs(inputs,revision){if(this.authoritative)return this.realtime.sendInputs(inputs,revision);return inputs.every(e=>this.legacy.sendInput(e,revision));}request(body){return this.realtime.request(body);}
}
window.quizArenaLive=Transport;
})();
