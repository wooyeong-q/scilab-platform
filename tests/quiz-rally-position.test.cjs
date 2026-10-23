const test=require('node:test'),assert=require('node:assert/strict');
const {client,scheduler,fixture}=require('./quiz-rally-client-harness.cjs');

// The actual client/transport and room run on independent deterministic clocks.
// The long safe practice section excludes collisions from movement assertions.
function session(options,fn){
 const time=scheduler(),realNow=Date.now;Date.now=()=>1800000000000+time.now;
 const clients=[];
 try{
  const {game,students,teacher}=fixture(options.count||1);
  game.room.arena.length=270000;game.room.arena.energy=options.energy??false;
  for(const p of Object.values(game.room.players))Object.assign(p.runner,{x:0,y:1200,checkpoint:1200,energy:options.charge??100});
  const deliveries=[],upstream=[],downstream=[];
  const delay=(value,index)=>typeof value==='function'?value(time.now,index):value;
  const deliver=(index,socket,event)=>{
   const down=delay(options.down??80,index);
   downstream[index]=Math.max(time.now+down,(downstream[index]||0)+.001);
   const copied=JSON.parse(JSON.stringify(event));
   time.schedule(()=>socket.receive(copied),downstream[index]-time.now);
  };
  for(const [index,who]of students.entries()){
   const h=client(time,who,(socket,e)=>{
    const up=delay(options.up??80,index);
    upstream[index]=Math.max(time.now+up,(upstream[index]||0)+.001);
    time.schedule(()=>{
     if(e.type==='auth'){deliver(index,socket,{type:'ready'});deliver(index,socket,{type:'snapshot',data:game.snapshot(who,'wss://test/room')});}
     if(e.type==='input'){game.tick();try{game.input(who,e.inputs,e.roomRevision);}catch(error){deliver(index,socket,{type:'error',error:error.message,status:error.status||500});}}
     if(e.type==='ping')deliver(index,socket,{type:'pong'});
    },upstream[index]-time.now);
   },options);
   clients.push(h);deliveries.push(event=>deliver(index,h.sockets.at(-1),event));
  }
  const previous=new Map();
  time.schedule(()=>{
   game.tick();const frame=game.world(previous);
   for(const [i,who]of students.entries()){
    const p=game.room.players[who.playerId];
    deliveries[i]({...frame,self:{runner:p.runner,version:p.version}});
   }
  },50,100);
  const snapshots=()=>students.forEach((who,i)=>deliveries[i]({type:'snapshot',data:game.snapshot(who,'wss://test/room')}));
  if(options.snapshots)time.schedule(snapshots,175,175);
  fn({time,game,students,teacher,clients,snapshots,deliveries});
  for(const h of clients){assert.deepEqual(h.errors,[],'client callbacks cannot throw');assert.deepEqual(h.closes,[],'movement cannot close the socket');}
 }finally{for(const h of clients)h.transport.stop();Date.now=realNow;}
}
function forwardOnly(h,start,end,label){
 const frames=h.frames.filter(f=>f.at>=start&&f.at<end);
 const scale=Math.min(h.viewport.width/830,h.viewport.height/590,1.4),screenY=scale*.76;
 assert.ok(frames.length>50,label+' has rendered samples');
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i],step=b.shown.y-a.shown.y,dt=b.at-a.at;
  assert.equal(b.local.falls,0,label+' stays on safe floor');
  assert.equal(b.local.stunUntil,0,label+' has no hit');
  // Subpixel settling after release is not a visible rubber-band. Bound it
  // to half a screen pixel; held forward motion has no such allowance.
  const moving=a.local.dy>0&&b.local.dy>0&&b.clock<b.local.inputUntil;
  assert.ok(moving?step>=-.02:step*screenY>=-.5,`${label}: unexpected backward step ${step} (${step*screenY}px) at ${b.at}ms`);
  assert.ok(step<=175*2*dt/1000+.1,`${label}: position jump ${step} at ${b.at}ms`);
  assert.ok(b.clock>=a.clock,label+' simulation time never rewinds');
  const footA=a.shown.y-a.camera.y,footB=b.shown.y-b.camera.y;
  assert.ok(Math.abs(footB-footA)*screenY<.5,label+' ground camera cannot bob the robot during normal movement');
 }
}
test('own forward motion, stop/start and jumps do not rubber-band on symmetric or asymmetric links at PC/mobile frame rates',()=>{
 for(const fps of [30,60,120])for(const [up,down]of [[0,0],[20,20],[80,80],[160,160],[240,240],[10,200],[200,10],[80,t=>80+70*(1+Math.sin(t/150))]])for(const snapshots of [false,true]){
  session({fps,up,down,snapshots,width:fps===30?844:1363,height:fps===30?390:850},({time,clients,game,students})=>{
   const h=clients[0];time.run(1000);h.key('ArrowUp');
   for(let n=0;n<7;n++){time.schedule(()=>h.key('ArrowUp',false),800+n*700);time.schedule(()=>h.key('ArrowUp'),1000+n*700);}
   for(let n=0;n<4;n++)time.schedule(()=>{h.key('Space');h.key('Space',false);},400+n*1500);
   time.run(7000);h.key('ArrowUp',false);time.run(8500);
   const label=`${fps}fps ${up}/${typeof down==='function'?'jitter':down}ms snapshots=${snapshots}`;
   forwardOnly(h,1200,6900,label);
   const shown=h.frames.at(-1).shown,server=game.room.players[students[0].playerId].runner;
   assert.ok(Math.hypot(shown.x-server.x,shown.y-server.y)<.1,label+' converges to the server after release');
  });
 }
});
test('low energy, dash release and a short mobile thumb throw keep a single camera position',()=>{
 session({fps:30,up:100,down:160,width:844,height:390,energy:true,charge:10,snapshots:true},({time,clients})=>{
  const h=clients[0];time.run(1000);h.pointer('pointerdown',1,'pad');h.pointer('pointerdown',2,'jump');
  time.run(1600);h.pointer('pointerdown',2,'dash');time.run(2600);h.pointer('pointerdown',2,'dash');
  time.run(4200);h.pointer('pointerup',1,'pad');time.run(5700);
  forwardOnly(h,1200,5500,'mobile low charge');
 });
});
test('thirty local clients retain smooth own motion while sharing the same authoritative room',()=>{
 session({count:30,fps:30,up:(_t,i)=>20+(i%4)*40,down:(t,i)=>30+(i%3)*40+20*(1+Math.sin(t/180)),width:844,height:390},({time,clients})=>{
  time.run(1000);for(const h of clients)h.key('ArrowUp');
  time.run(2000);for(const h of clients){h.key('Space');h.key('Space',false);}
  time.run(3600);for(const h of clients)h.key('ArrowUp',false);
  time.run(4000);for(const h of clients)h.key('ArrowUp');
  time.run(5200);
  clients.forEach((h,i)=>forwardOnly(h,1400,5000,'classmate '+i));
 });
});
test('real server hits, falling/respawn and confirmed finishes still replace local prediction',()=>{
 session({fps:60,up:80,down:80},({time,game,clients,students,snapshots})=>{
  const h=clients[0],p=game.room.players[students[0].playerId];time.run(1000);h.key('ArrowUp');time.run(1700);
  const hitAt=p.runner.t+1;
  game.room.arenaEffects=[{id:'confirmed-hit',type:'missile',owner:'other',x:p.runner.x,y:p.runner.y-70,dx:0,dy:1,born:hitAt-100,expires:hitAt+2000,victim:p.id,hitAt,shared:true}];
  game.room.arenaRevision++;time.run(2200);
  assert.ok(h.frames.some(f=>f.at>1700&&f.local.usedEffects.includes('confirmed-hit')&&f.local.stunUntil>f.clock),'accepted hit is never hidden');
  // Put the authoritative runner outside the actual course, then let shared
  // physics decide the fall and checkpoint return; do not invent a fall flag.
  game.room.arenaEffects=[];game.room.arenaRevision++;Object.assign(p.runner,{x:2000,stunUntil:0,knockX:0,knockY:0,dx:0,dy:0,inputUntil:0});p.version++;
  h.key('ArrowUp',false);time.run(2600);
  assert.ok(h.frames.some(f=>f.at>2200&&f.local.fallUntil>0),'fall is shown');
  time.run(4000);assert.ok(h.frames.some(f=>f.at>2600&&f.local.falls>0&&!f.local.fallUntil&&Math.abs(f.local.y-1200)<80),'checkpoint return is shown');
  const clock=p.runner.t;Object.assign(p.runner,{x:0,y:game.room.arena.length-2,z:0,vz:0,dx:0,dy:1,inputUntil:clock+750,stunUntil:0,fallUntil:0});p.version++;
  time.run(4100);assert.ok(p.finish,'server physics crosses the real finish line');snapshots();time.run(4600);
  const last=h.frames.at(-1);assert.equal(last.local.finishAt,p.runner.finishAt);assert.equal(last.pending.length,0,'finish retires every pending input');
 });
});
test('only arrival-timed student rooms anticipate inputs; stale responses cannot rewind their clock',()=>{
 session({},({clients})=>{
  const {Timeline,mergeSnapshot}=clients[0].context.window.quizArenaSync;
  const t=new Timeline();t.sync(4000,'running',160,0,true);assert.equal(t.now(0),4320,'one RTT predicts input arrival');
  assert.equal(t.sync(2000,'running',0,200,true),4520,'old snapshot cannot re-anchor play time');
  t.sync(5000,'paused',160,300,true);assert.equal(t.now(2000),5000,'pause has no prediction lead');
  const observer=new Timeline();observer.sync(4000,'running',160,0);assert.equal(observer.now(0),4000,'legacy/teacher clock remains confirmed');
  const next={code:'ROOM',roomRevision:1,arenaRevision:0,raceClock:4000,ranking:[]};Object.defineProperty(next,'_transitMs',{value:160});
  const merged=mergeSnapshot({...next,ranking:[]},next);assert.equal(merged._transitMs,160);assert.equal(Object.keys(merged).includes('_transitMs'),false,'timing does not invalidate UI render identities');
 });
});
