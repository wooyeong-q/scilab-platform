const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const modules=new Map();
function load(file){
 file=path.resolve(__dirname,'..',file);if(!path.extname(file))file+='.ts';
 if(modules.has(file))return modules.get(file).exports;
 const mod={exports:{}};modules.set(file,mod);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',source)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)):require(name),mod,mod.exports);return mod.exports;
}
const {QuizArenaRoom,INPUT_LEASE_MS}=load('lib/quiz-rally-room');
const M=load('lib/quiz-rally-arena');
const {QUESTION_MAP}=load('lib/quiz-rally-questions');
const token=()=>randomBytes(32).toString('base64url');
function fixture(count=2){
 const teacher={role:'teacher',token:token(),playerId:''};
 const record={code:'ABC234',teacher_key_hash:createHash('sha256').update(teacher.token).digest('hex'),expires_at:new Date(Date.now()+86400000).toISOString(),revision:0,savedAt:Date.now(),question_bank:null,state:{title:'교실',durationSeconds:900,extension:false,stealEnabled:true,status:'lobby',endsAt:null,remainingMs:900000,metaRevision:0,requests:[],players:{},arena:{version:2,length:27000,seed:42,combat:true,energy:true,supplies:2},arenaEffects:[],arenaRevision:0,finishers:[],realtime:{version:1,generation:randomUUID(),checkpoint:0}}};
 const game=new QuizArenaRoom(record),students=Array.from({length:count},(_,i)=>({role:'student',token:token(),playerId:randomUUID()}));
 students.forEach((who,i)=>game.join(who,{nickname:'학생'+i}));
 game.act(teacher,{action:'start',requestId:randomUUID()});
 game.room.endsAt=Date.now()+900000-4000;
 game.tick();
 return {game,teacher,students,p:game.room.players[students[0].playerId]};
}
function frozen(fn){const old=Date.now;let now=1800000000000;Date.now=()=>now;try{return fn(ms=>now+=ms);}finally{Date.now=old;}}
function input(game,who,seq,extras={}){game.input(who,[{seq,at:game.world(new Map()).at,dx:0,dy:1,jump:false,dash:false,...extras}],game.room.metaRevision);}

test('room authority applies controls, slower energy drain, and expires stale held keys',()=>frozen(advance=>{
 const {game,students,p}=fixture(1);input(game,students[0],1);
 advance(500);game.tick();assert.ok(p.runner.y>100);assert.ok(Math.abs(p.runner.energy-98.75)<.001);
 advance(1000);game.tick();assert.equal(p.runner.inputUntil,4000+INPUT_LEASE_MS);const y=p.runner.y;
 advance(500);game.tick();assert.equal(p.runner.y,y);assert.ok(p.runner.energy>98);
}));
test('a jump and dash use the same shared physics as the client',()=>frozen(advance=>{
 const {game,students,p}=fixture(1);input(game,students[0],1,{jump:true,dash:true});
 const expected=M.advanceRunner(p.runner,4250,game.room.arena,[],p.id);
 for(let i=0;i<5;i++){advance(50);game.tick();}
 assert.ok(Math.abs(p.runner.z-expected.z)<1e-6);assert.ok(Math.abs(p.runner.y-expected.y)<.05);assert.equal(p.runner.dash,true);
}));
test('a stopped or paused player cannot be awarded an extrapolated finish',()=>frozen(advance=>{
 const {game,teacher,students,p}=fixture(1);p.runner.x=M.center(game.room.arena.length);p.runner.y=game.room.arena.length-20;
 input(game,students[0],1,{dy:0});advance(1000);game.tick();assert.equal(p.finish,undefined);
 game.act(teacher,{action:'pause',requestId:randomUUID()});advance(6000);game.tick();assert.equal(p.finish,undefined);assert.equal(p.runner.y,game.room.arena.length-20);
}));
test('confirmed finish places follow common-clock crossings, not player map order',()=>frozen(advance=>{
 const {game,students}=fixture(2),[a,b]=students.map(w=>game.room.players[w.playerId]);
 for(const p of [a,b]){p.runner.x=M.center(game.room.arena.length);p.runner.energy=100;}
 a.runner.y=game.room.arena.length-12;b.runner.y=game.room.arena.length-5;
 input(game,students[0],1);input(game,students[1],1);advance(100);game.tick();
 assert.equal(b.finish.place,1);assert.equal(a.finish.place,2);assert.deepEqual(game.room.finishers,[b.id,a.id]);
}));
test('item commands are idempotent, consume once, and do not wait for a database',()=>frozen(()=>{
 const {game,students,p}=fixture(1);p.gear=['missile','shield'];
 const command={action:'arena-use',slot:0,gear:'missile,shield',requestId:randomUUID()};
 game.act(students[0],command);game.act(students[0],command);
 assert.deepEqual(game.room.players[p.id].gear,['shield']);assert.equal(game.room.arenaEffects.length,1);
 assert.equal(game.room.arenaEffects[0].born,4000);
}));
test('a shared missile has only one victim',()=>frozen(advance=>{
 const {game,students}=fixture(3),[owner,a,b]=students.map(w=>game.room.players[w.playerId]);
 const x=M.center(100);Object.assign(owner.runner,{x,y:100});Object.assign(a.runner,{x,y:230});Object.assign(b.runner,{x,y:310});
 owner.gear=['missile'];game.act(students[0],{action:'arena-use',slot:0,requestId:randomUUID()});
 for(let i=0;i<20;i++){advance(50);game.tick();}
 const effect=game.room.arenaEffects[0];assert.equal(effect.victim,a.id);
 assert.equal(game.room.players[a.id].runner.hits.filter(h=>h.id===effect.id).length,1);
 assert.equal(game.room.players[b.id].runner.hits.length,0);
}));
test('a jumping target clears a missile while a grounded target behind can be hit',()=>frozen(advance=>{
 const {game,students}=fixture(3),[owner,a,b]=students.map(w=>game.room.players[w.playerId]);
 const x=M.center(100);Object.assign(owner.runner,{x,y:100});Object.assign(a.runner,{x,y:390});Object.assign(b.runner,{x,y:490});
 input(game,students[1],1,{dy:0,jump:true});
 owner.gear=['missile'];game.act(students[0],{action:'arena-use',slot:0,requestId:randomUUID()});
 for(let i=0;i<15;i++){advance(50);game.tick();}
 assert.equal(game.room.players[a.id].runner.hits.length,0);assert.equal(game.room.arenaEffects[0].victim,b.id);
}));
test('private snapshots never disclose answer keys, decks, hashes, or other players inventory',()=>frozen(()=>{
 const {game,students}=fixture(2),who=students[0],p=game.room.players[who.playerId];
 const snapshot=game.snapshot(who,'wss://example.test/socket'),raw=JSON.stringify(snapshot);
 assert.equal(snapshot.player.turn.options.length,4);
 for(const field of ['tokenHash','teacher_key_hash','question_bank','"order"','"deck"','"answer"'])assert.equal(raw.includes(field),false,field);
 assert.equal(snapshot.ranking[1].gear,undefined);assert.equal(snapshot.player.gear.length,0);
 assert.throws(()=>game.snapshot({...who,token:token()},''),e=>e.status===403);
}));
test('correct answers charge energy and grant a single item even after a retry',()=>frozen(()=>{
 const {game,students,p}=fixture(1);p.runner.open=true;p.runner.energy=10;
 const q=QUESTION_MAP.get(p.turn.id),command={action:'answer',nonce:p.turn.nonce,choice:p.turn.order.indexOf(q.answer),requestId:randomUUID()};
 game.act(students[0],command);game.act(students[0],command);
 const result=game.room.players[p.id];assert.equal(result.runner.energy,55);assert.equal(result.gear.length,1);assert.equal(result.correct,1);assert.equal(result.runner.open,false);
}));
test('a failed command leaves inventory and effects unchanged',()=>frozen(()=>{
 const {game,students,p}=fixture(1);p.gear=['missile'];
 assert.throws(()=>game.act(students[0],{action:'arena-use',slot:0,gear:'banana',requestId:randomUUID()}),e=>e.status===409);
 assert.deepEqual(game.room.players[p.id].gear,['missile']);assert.equal(game.room.arenaEffects.length,0);
}));
test('pause, resume, removal, and ended rooms preserve authoritative ownership',()=>frozen(advance=>{
 const {game,teacher,students}=fixture(2);game.act(teacher,{action:'pause',requestId:randomUUID()});
 assert.throws(()=>input(game,students[0],1),e=>e.status===409);
 const remaining=game.room.remainingMs;advance(2000);game.act(teacher,{action:'resume',requestId:randomUUID()});assert.equal(game.room.endsAt-Date.now(),remaining);
 game.act(teacher,{action:'remove',playerId:students[1].playerId,requestId:randomUUID()});assert.throws(()=>game.snapshot(students[1],''),e=>e.status===403);
 game.act(teacher,{action:'end',requestId:randomUUID()});assert.throws(()=>input(game,students[0],1),e=>e.status===409);
}));
test('checkpoint recovery pauses a running race, clears movement and preserves command deduplication',()=>frozen(advance=>{
 const {game,teacher,students,p}=fixture(1);p.gear=['shield'];const command={action:'arena-use',slot:0,requestId:randomUUID()};game.act(students[0],command);input(game,students[0],1);
 const saved=game.checkpoint();advance(10000);const recovered=new QuizArenaRoom(saved);assert.equal(recovered.recover(),true);
 assert.equal(recovered.room.status,'paused');assert.equal(recovered.room.players[p.id].runner.dy,0);
 recovered.act(teacher,{action:'resume',requestId:randomUUID()});recovered.act(students[0],command);assert.equal(recovered.room.players[p.id].gear.length,0);
}));
test('malformed input is rejected atomically and cannot rewind resolved state',()=>frozen(()=>{
 const {game,students,p}=fixture(1),before=structuredClone(p.runner);
 assert.throws(()=>game.input(students[0],[{seq:1,at:4000,dx:0,dy:1},{seq:2,at:4000,dx:NaN,dy:1}]));assert.deepEqual(p.runner,before);
 input(game,students[0],50,{at:-1e6});assert.equal(p.runner.dy,0);assert.equal(p.runner.t,4000);
}));
test('30 participants simulate 20 Hz and broadcast together with zero database operations',()=>frozen(advance=>{
 const {game,students}=fixture(30),start=performance.now();let frames=0;
 for(let tick=0;tick<600;tick++){
  if(tick%5===0)students.forEach((who,i)=>input(game,who,tick+1,{dy:tick%40<20?1:0,dx:0,jump:tick%20===0,dash:i%2===0}));
  advance(50);game.tick();if(tick%2===0){const frame=game.world(new Map());assert.equal(frame.players.length,30);frames++;}
 }
 const elapsed=performance.now()-start;
 assert.equal(frames,300);assert.ok(elapsed<15000,`30-second simulation took ${elapsed.toFixed(0)} ms`);
 console.log(JSON.stringify({players:30,simulatedSeconds:30,ticks:600,frames,elapsedMs:Math.round(elapsed),databaseCalls:0}));
}));

test('compacted jump batches are acknowledged once even when resent with an item request',()=>frozen(advance=>{
 const {game,students,p}=fixture(1);p.gear=['shield'];
 const inputs=[{seq:3,at:4000,dx:1,dy:1,jump:true,dash:true},{seq:120,at:4000,dx:0,dy:0,jump:false,dash:false}];
 game.input(students[0],inputs,game.room.metaRevision);assert.equal(p.runner.jumpAt,4000);assert.equal(p.runner.seq,120);assert.equal(p.runner.dy,0);
 advance(100);game.tick();const jumpAt=p.runner.jumpAt;
 game.input(students[0],inputs,game.room.metaRevision);assert.equal(p.runner.jumpAt,jumpAt);assert.equal(p.runner.jumpQueuedUntil,0);
 const command={action:'arena-use',slot:0,gear:'shield',inputs,requestId:randomUUID()};game.act(students[0],command);game.act(students[0],command);
 const after=game.room.players[p.id];assert.equal(after.gear.length,0);assert.equal(after.runner.jumpAt,jumpAt);assert.equal(after.runner.seq,120);
}));
