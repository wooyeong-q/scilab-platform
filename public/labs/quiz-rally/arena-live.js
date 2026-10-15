/* Authenticated server push. HTTP snapshots remain the fallback and resync. */
(()=>{'use strict';
class Live{
 constructor({event,status,refresh}){this.event=event;this.status=status;this.refresh=refresh;this.key='';this.ready=false;this.fast=false;this.attempt=0;this.timer=0;this.abort=null;this.socket=null;this.generation=0;this.socketRetryAt=0;}
 configure(url,who,enabled){
  const key=enabled&&who?url+':'+who.role+':'+who.playerId+':'+who.token:'';
  if(key===this.key)return;this.stop();if(!key)return;
  this.key=key;this.url=url;this.who={...who};this.attempt=0;this.connect();
 }
 state(ready,fast=false){if(this.ready!==ready||this.fast!==fast){this.ready=ready;this.fast=fast;this.status(ready,fast);}}
 stop(){this.key='';this.generation++;clearTimeout(this.timer);this.abort?.abort();this.abort=null;this.socket?.close();this.socket=null;this.state(false);}
 reconnect(){if(!this.key)return;clearTimeout(this.timer);if(this.socket)this.socket.close();else if(this.abort)this.abort.abort();else this.connect();}
 sendInput(input){if(!this.fast||this.socket?.readyState!==1||this.socket.bufferedAmount>32768)return false;this.socket.send(JSON.stringify({type:'input',inputs:[input]}));return true;}
 async websocket(generation){
  if(typeof WebSocket==='undefined'||Date.now()<this.socketRetryAt)return false;
  return new Promise(resolve=>{
   let ws,ready=false,watchdog;const arm=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>ws.close(),ready?20000:5000);};
   try{const url=new URL(this.url,location.href);url.pathname=url.pathname.replace(/\/events$/,'/socket');url.protocol=url.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(url);this.socket=ws;arm();}
   catch{resolve(false);return;}
   ws.onopen=()=>{if(generation!==this.generation){ws.close();return;}ws.send(JSON.stringify({type:'auth',...this.who}));};
   ws.onmessage=message=>{
    if(generation!==this.generation)return;
    try{const event=JSON.parse(message.data);arm();
     if(event.type==='ready'){ready=true;this.attempt=0;this.state(true,true);this.refresh();}
     else if(event.type!=='ping')this.event(event);
    }catch{ws.close();}
   };
   ws.onerror=()=>ws.close();
   ws.onclose=()=>{clearTimeout(watchdog);if(this.socket===ws)this.socket=null;
    if(generation===this.generation){this.state(false);if(!ready)this.socketRetryAt=Date.now()+30000;}
    resolve(ready);
   };
  });
 }
 async connect(){
  if(!this.key)return;const generation=++this.generation,abort=new AbortController();this.abort=abort;
  const socketWasReady=await this.websocket(generation);
  if(generation!==this.generation)return;
  if(socketWasReady){this.abort=null;if(this.key)this.timer=setTimeout(()=>this.connect(),300+Math.random()*300);return;}
  let watchdog,reader;
  const arm=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>abort.abort(),20000);};arm();
  try{
   const who=this.who,response=await fetch(this.url,{headers:{Authorization:'Bearer '+who.token,'X-Quiz-Role':who.role,'X-Player-Id':who.playerId||'',Accept:'text/event-stream'},cache:'no-store',signal:abort.signal});
   if(generation!==this.generation)return;
   if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw new Error('stream unavailable');
   reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
   while(true){
    const {value,done}=await reader.read();if(done||generation!==this.generation)break;arm();
    buffer+=decoder.decode(value,{stream:true});if(buffer.length>131072)throw new Error('stream overflow');
    let end;while((end=buffer.indexOf('\n\n'))>=0){
     const block=buffer.slice(0,end);buffer=buffer.slice(end+2);
     const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)continue;
     const event=JSON.parse(data);
     if(event.type==='ready'){this.attempt=0;this.state(true);this.refresh();}
     else if(event.type!=='ping')this.event(event);
    }
   }
  }catch{}finally{
   clearTimeout(watchdog);try{await reader?.cancel();}catch{}
   if(generation===this.generation){this.abort=null;this.state(false);if(this.key)this.timer=setTimeout(()=>this.connect(),Math.min(15000,400*2**Math.min(this.attempt++,5))+Math.random()*400);}
  }
 }
}
window.quizArenaLive=Live;
})();
