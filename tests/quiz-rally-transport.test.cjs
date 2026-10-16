const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
function client(){
 const sockets=[],events=[],fetches=[];
 class Socket {
  static OPEN=1;readyState=0;bufferedAmount=0;sent=[];
  constructor(url){this.url=url;sockets.push(this);}
  send(raw){this.sent.push(JSON.parse(raw));}
  open(){this.readyState=1;this.onopen?.();}
  event(value){this.onmessage?.({data:JSON.stringify(value)});}
  close(code=1000){this.readyState=3;this.onclose?.({code});}
 }
 const env={window:{},WebSocket:Socket,crypto:{randomUUID},URL,location:{href:'https://game.test/'},Date,performance,AbortController,setTimeout,clearTimeout,setInterval,clearInterval,fetch(...args){fetches.push(args);throw new Error('No HTTP expected');}};
 vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/arena-live.js','utf8'),env);
 const live=new env.window.quizArenaLive({event:e=>events.push(e),status(){},refresh(){}}),who={role:'student',token:'secret-token',playerId:randomUUID()};
 live.configure('/sessions/ABC234/events',who,true,{version:1,url:'wss://rooms.test/rooms/ABC234/generation/socket'});
 return {live,sockets,events,fetches,who};
}
test('the real-time client sends inputs and items immediately on one socket without HTTP polling',async()=>{
 const h=client();try{
  const socket=h.sockets[0];socket.open();assert.equal(socket.url.includes(h.who.token),false);assert.deepEqual(JSON.parse(JSON.stringify(socket.sent[0].identity)),h.who);
  socket.event({type:'ready'});socket.event({type:'snapshot',data:{code:'ABC234'}});assert.equal(h.live.ready,true);assert.equal(h.live.authoritative,true);
  h.live.sendInput({seq:1,at:4000,dx:1,dy:0},{roomRevision:3,arenaRevision:0});
  const command={action:'arena-use',slot:0,requestId:randomUUID()},reply=h.live.request(command),sent=socket.sent.at(-1);
  assert.equal(sent.type,'request');assert.equal(socket.sent.at(-2).type,'input');assert.equal(sent.body.requestId,command.requestId);assert.equal(h.fetches.length,0);
  socket.event({type:'response',id:sent.id,data:{status:'running',raceClock:4000}});assert.equal((await reply).status,'running');
  socket.event({type:'world',at:4000,players:[]});assert.equal(h.events.at(-1).authoritative,true);
 }finally{h.live.stop();}
});
test('connection loss rejects pending commands so the same request can be retried by the API',async()=>{
 const h=client();try{
  const socket=h.sockets[0];socket.open();socket.event({type:'ready'});socket.event({type:'snapshot',data:{code:'ABC234'}});const reply=h.live.request({action:'arena-use',requestId:randomUUID()});socket.close();
  await assert.rejects(reply);assert.equal(h.live.ready,false);assert.equal(h.live.sendInput({seq:2},{}),false);assert.equal(h.fetches.length,0);
 }finally{h.live.stop();}
});
test('server validation errors are preserved and do not become duplicate HTTP actions',async()=>{
 const h=client();try{
  const socket=h.sockets[0];socket.open();socket.event({type:'ready'});socket.event({type:'snapshot',data:{code:'ABC234'}});const reply=h.live.request({action:'arena-use',requestId:randomUUID()}),sent=socket.sent.at(-1);
  socket.event({type:'error',id:sent.id,status:409,error:'아이템이 바뀌었습니다.'});await assert.rejects(reply,e=>e.status===409);assert.equal(h.fetches.length,0);
 }finally{h.live.stop();}
});
test('reconnect restores its snapshot before replaying a 96-event input backlog as one message',()=>{
 const h=client();try{
  const socket=h.sockets[0];socket.open();socket.event({type:'ready'});
  assert.equal(h.live.ready,false,'unacknowledged old inputs must wait for the snapshot');
  socket.event({type:'snapshot',data:{code:'ABC234'}});assert.equal(h.live.ready,true);
  const inputs=Array.from({length:96},(_,i)=>({seq:i+1,at:4000+i,dx:0,dy:i<95?1:0,jump:i===70,dash:false}));
  assert.equal(h.live.sendInputs(inputs,{roomRevision:3,arenaRevision:0}),true);
  const sent=socket.sent.filter(e=>e.type==='input');assert.equal(sent.length,1);assert.equal(sent[0].inputs.length,96);
  assert.equal(sent[0].inputs[70].jump,true);assert.equal(sent[0].inputs.at(-1).dy,0);
 }finally{h.live.stop();}
});
test('temporary socket backpressure queues controls without disconnecting and retains jump/release',async()=>{
 const h=client();try{
  const socket=h.sockets[0];socket.open();socket.event({type:'ready'});socket.event({type:'snapshot',data:{code:'ABC234'}});
  socket.bufferedAmount=70000;
  h.live.sendInput({seq:1,at:4000,dx:0,dy:1,jump:true},{roomRevision:1,arenaRevision:0});
  h.live.sendInput({seq:2,at:4020,dx:0,dy:0,jump:false},{roomRevision:1,arenaRevision:0});
  assert.equal(h.live.ready,true);assert.equal(socket.readyState,1);
  socket.bufferedAmount=0;await new Promise(r=>setTimeout(r,80));
  assert.deepEqual(socket.sent.filter(e=>e.type==='input').at(-1).inputs.map(e=>e.seq),[1,2]);
 }finally{h.live.stop();}
});
test('a duplicate controller reports the other window instead of silently taking control back',()=>{
 const h=client();try{const socket=h.sockets[0];socket.open();socket.event({type:'ready'});socket.event({type:'snapshot',data:{code:'ABC234'}});socket.close(4001);
  assert.equal(h.live.ready,false);assert.equal(h.events.at(-1).type,'superseded');
 }finally{h.live.stop();}
});
