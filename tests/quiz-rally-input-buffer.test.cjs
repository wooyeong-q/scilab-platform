const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({hangClose=false,onEvent=()=>{}}={}){
 let now=10000,id=0;const timers=new Map(),sockets=[];
 class WS{static OPEN=1;constructor(){this.readyState=1;this.bufferedAmount=0;this.sent=[];sockets.push(this);}send(raw){this.sent.push(JSON.parse(raw));}close(){this.readyState=hangClose?2:3;if(!hangClose)this.onclose?.({code:1000});}receive(data){this.onmessage({data:JSON.stringify(data)});}}
 const warnings=[],context={window:{},console:{error:(...args)=>warnings.push(args)},WebSocket:WS,Date:{now:()=>now},performance:{now:()=>now},crypto:require('node:crypto'),setTimeout(fn,ms){const key=++id;timers.set(key,{at:now+ms,fn});return key;},clearTimeout:key=>timers.delete(key),setInterval:()=>0,clearInterval(){}};
 vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-live.js','utf8'),context);
 const transport=new context.window.quizArenaLive({event:onEvent,status(){},refresh(){warnings.push('refresh');}}),live=transport.realtime;
 transport.configure('',{role:'student',playerId:'me',token:'test'},true,{version:1,url:'wss://test'});
 const socket=sockets[0];socket.onopen();socket.receive({type:'snapshot',data:{status:'running',player:{runner:{seq:0}}}});
 function tick(ms){const end=now+ms;for(let n=0;n<1000;n++){const due=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=end;}
 const rev={roomRevision:1,arenaRevision:0},input=(seq,extra={})=>({seq,at:4000+seq,dx:1,dy:1,dash:true,jump:false,...extra});
 return {live,socket,sockets,tick,rev,input,warnings};
}
test('congestion coalesces movement, retains jump edges and latest release, and retries until acknowledged',()=>{
 const {live,socket,tick,rev,input}=fixture();socket.bufferedAmount=70000;
 for(let seq=1;seq<=120;seq++)live.sendInput(input(seq,{jump:seq===3||seq===80,dx:seq===120?0:1,dy:seq===120?0:1}),rev);
 assert.deepEqual(Array.from(live.inputQueue,e=>e.seq),[3,80,120]);
 socket.bufferedAmount=0;tick(60);const batches=()=>socket.sent.filter(e=>e.type==='input');assert.deepEqual(batches()[0].inputs.map(e=>e.seq),[3,80,120]);
 assert.equal(batches()[0].inputs[0].dash,true);assert.equal(batches()[0].inputs.at(-1).dy,0);
 tick(250);assert.equal(batches().length,2);socket.receive({type:'world',self:{runner:{seq:120}}});tick(1000);assert.equal(batches().length,2);assert.equal(live.inputQueue.length,0);live.stop();
});
test('jump dispatch bypasses the movement throttle and duplicate or older acknowledgements cannot restore inputs',()=>{
 const {live,socket,tick,rev,input}=fixture();live.sendInput(input(1),rev);tick(1);live.sendInput(input(2,{jump:true}),rev);
 assert.equal(socket.sent.filter(e=>e.type==='input').length,2);
 socket.receive({type:'world',self:{runner:{seq:2}}});socket.receive({type:'response',data:{status:'running',player:{runner:{seq:1}}}});
 live.sendInputs([input(1),input(2,{jump:true})],rev);tick(1000);assert.equal(live.inputQueue.length,0);assert.equal(socket.sent.filter(e=>e.type==='input').length,2);live.stop();
});
test('a structural room revision keeps unacknowledged jumps, but pause cancels held input retries',()=>{
 const {live,socket,tick,rev,input}=fixture();socket.bufferedAmount=70000;live.sendInput(input(1,{jump:true}),rev);live.sendInput(input(2),{...rev,roomRevision:2});
 assert.deepEqual(Array.from(live.inputQueue,e=>e.seq),[1,2]);socket.receive({type:'snapshot',data:{status:'paused',player:{runner:{seq:0}}}});socket.bufferedAmount=0;tick(1000);assert.equal(socket.sent.filter(e=>e.type==='input').length,0);live.stop();
});

// The production watchdog must recover even when a mobile socket never emits
// close; late events from that retired connection cannot cancel the new one.
test('a silent half-open socket reconnects without waiting for the close handshake',()=>{
 const {live,socket,sockets,tick}=fixture({hangClose:true});
 const lateClose=socket.onclose;tick(13000);
 assert.equal(sockets.length,2);assert.equal(live.ready,false);
 const replacement=sockets[1];replacement.onopen();replacement.receive({type:'snapshot',data:{status:'running',player:{runner:{seq:10}}}});
 assert.equal(live.ready,true);lateClose({code:4001});assert.equal(live.ready,true);assert.equal(live.socket,replacement);live.stop();
});
test('a screen callback failure refreshes on the existing socket instead of repeatedly disconnecting',()=>{
 let fail=false;const {live,socket,sockets,warnings}=fixture({onEvent:event=>{if(fail&&event.type==='world')throw Error('render failure');}});
 fail=true;for(let i=0;i<5;i++)socket.receive({type:'world',self:{runner:{seq:0}}});
 assert.equal(socket.readyState,1);assert.equal(live.ready,true);assert.equal(sockets.length,1);assert.equal(warnings.filter(x=>x==='refresh').length,1);
 fail=false;socket.receive({type:'snapshot',data:{status:'running',player:{runner:{seq:1}}}});assert.equal(live.ackSeq,1);live.stop();
});
