const test=require('node:test'),assert=require('node:assert/strict');
const {client,scheduler,fixture}=require('./quiz-rally-client-harness.cjs');
function session(options,fn){
 const time=scheduler(),old=Date.now;Date.now=()=>1800000000000+time.now;
 let h;
 try{
  const {game,students,teacher}=fixture(),who=students[0],up=options.up??80,down=options.down??80;let upstream=0,downstream=0;
  const deliver=(socket,event)=>{downstream=Math.max(time.now+(typeof down==='function'?down(time.now):down),downstream+.001);const copied=JSON.parse(JSON.stringify(event));time.schedule(()=>socket.receive(copied),downstream-time.now);};
  h=client(time,who,(socket,e)=>{upstream=Math.max(time.now+up,upstream+.001);time.schedule(()=>{
   if(e.type==='auth'){deliver(socket,{type:'ready'});deliver(socket,{type:'snapshot',data:game.snapshot(who,'wss://test/room')});}
   if(e.type==='input'){game.tick();game.input(who,e.inputs,e.roomRevision);}
   if(e.type==='ping')deliver(socket,{type:'pong'});
  },upstream-time.now);},options);
  const previous=new Map();time.schedule(()=>{game.tick();const p=game.room.players[who.playerId];deliver(h.sockets.at(-1),{...game.world(previous),self:{runner:p.runner,version:p.version}});},50,100);
  if(options.snapshots)time.schedule(()=>deliver(h.sockets.at(-1),{type:'snapshot',data:game.snapshot(who,'wss://test/room')}),175,175);
  fn({...h,time,game,who,teacher,deliver});
  assert.deepEqual(h.errors,[],'real frontend callbacks must not throw');assert.deepEqual(h.closes,[],'valid packets must not close the socket');
 }finally{h?.transport.stop();Date.now=old;}
}
function checkArc(frames,start,end,label){
 const points=frames.filter(f=>f.at>=start&&f.at<end);assert.ok(points.length>15,label);
 assert.ok(points.some(f=>f.at-start<70&&f.shown.z>0),label+' immediate jump');
 let descending=false,last=0,max=0;
 for(const f of points){const z=f.shown.z;
  if(z<last-.15)descending=true;
  if(descending)assert.ok(z<=last+.15,`${label}: second ascent at ${Math.round(f.at-start)}ms (${last} -> ${z})`);
  assert.ok(Math.abs(z-last)<400/frames.fps+1,`${label}: visible teleport at ${Math.round(f.at-start)}ms (${last} -> ${z}), clock ${f.clock}, jump ${f.local.jumpAt}`);
  assert.equal(f.local.falls,0,label+' no obstacle/fall');max=Math.max(max,z);last=z;
 }
 assert.ok(max>40&&max<=66.3,label+' bounded apex');assert.equal(last,0,label+' lands');
}
test('whole client: repeated pre-jump acknowledgements, accepted jump and heartbeat frames form one arc',()=>{
 for(const fps of [30,60,120])for(const [up,down]of [[0,0],[20,20],[80,80],[160,160],[240,240],[10,200],[200,10]])for(const mode of ['standing','moving','touch']){
  session({fps,up,down,width:mode==='touch'?844:1363,height:mode==='touch'?390:850,snapshots:true},h=>{
   h.time.run(1000);
   if(mode==='moving')h.key('ArrowUp');
   if(mode==='touch'){h.pointer('pointerdown',1,'pad');h.pointer('pointerdown',2,'jump');}else{h.key('Space');h.key('Space',false);}
   h.time.run(2500);h.frames.fps=fps;checkArc(h.frames,1000,2500,`${fps}fps ${up}/${down}ms ${mode}`);
   if(mode==='touch')h.pointer('pointerup',1,'pad');else h.key('ArrowUp',false);
  });
 }
});
test('repeated Space/J and touch jumps stay single arcs under uneven FIFO delivery',()=>{
 for(const touch of [false,true])session({fps:60,up:80,down:at=>80+60*(1+Math.sin(at/150)),snapshots:true},h=>{
  for(let i=0;i<5;i++){const start=1000+i*1800;h.time.run(start);if(touch)h.pointer('pointerdown',2,'jump');else{h.key(i%2?'KeyJ':'Space');h.key(i%2?'KeyJ':'Space',false);}h.time.run(start+1600);h.frames.fps=60;checkArc(h.frames,start,start+1600,`jitter ${touch?'touch':'keys'} ${i}`);}
 });
});
