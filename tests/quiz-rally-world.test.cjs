const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./helpers.cjs');
const arena={version:1,length:4700,seed:1,combat:true};
const {randomUUID,randomBytes}=require('node:crypto'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.env.DATABASE_URL='postgres://test';process.env.DATABASE_URL_UNPOOLED='postgres://test';

test('the accepted fast journal advances common poses before a full save, without retiming a dash jump',async()=>{
 const h=await harness(),game=h.load('lib/quiz-rally.ts'),M=h.load('lib/quiz-rally-arena.ts'),{QuizWorldFeed}=h.load('lib/quiz-rally-combat.ts'),real=Date.now;let wall=real();Date.now=()=>wall;
 try{
  const made=await game.createQuizRoom({title:'빠른 입력 검증'}),teacher={role:'teacher',token:made.teacherKey,playerId:''},who={role:'student',playerId:randomUUID(),token:randomBytes(32).toString('base64url'),nickname:'입력'};
  await game.joinQuizRoom(made.code,who,{nickname:who.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});wall+=4400;
  const access=await game.getQuizMotionAccess(made.code,who),input=(seq,at,more={})=>({seq,at,dx:1,dy:1,jump:seq===1,dash:true,...more});
  const publish=inputs=>game.publishQuizMotion(made.code,who,inputs,access.roomRevision,access.arenaRevision);
  await publish([input(1,4000),input(3,4400)]);
  let rows=await h.pg.query('SELECT inputs FROM quiz_rally_motion_inputs WHERE code=$1',[made.code]),log=rows.rows[0].inputs;
  let projected=M.acceptedRunner(access.runner,log,4400,access.arena,[],who.playerId);
  assert.equal(projected.seq,1,'a missing sequence prevents sealing a later input');
  await publish([input(1,4300,{jump:false}),input(2,4200),input(3,4400)]);
  rows=await h.pg.query('SELECT inputs FROM quiz_rally_motion_inputs WHERE code=$1',[made.code]);log=rows.rows[0].inputs;
  assert.equal(log[0].at,4000,'the first accepted input wins over conflicting duplicates');assert.equal(log[0].jump,true);
  const feed=new QuizWorldFeed(made.code,(q,p)=>h.pg.query(q,p));await feed.publish();
  const state=(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[made.code])).rows[0].state;
  assert.equal(state.arenaCombatAt,4400);assert.equal(state.players[who.playerId].runner.seq,0,'pose publication does not rewrite inventory or the full player row');
  projected=M.sampleRunner(M.acceptedRunner(access.runner,log,4400,access.arena,[],who.playerId),4400,access.arena,[],who.playerId);
  assert.equal(projected.jumpAt,4000);assert.ok(projected.z>50);
  wall+=300;await game.actQuizRoom(made.code,who,{action:'arena-input',requestId:randomUUID(),inputs:[input(1,4000),input(2,4200),input(3,4400)]});
  const saved=(await game.getQuizMotionAccess(made.code,who)).runner;
  assert.equal(saved.seq,3);assert.equal(saved.jumpAt,4000,'an advanced common watermark does not delay the original jump');
  for(const k of ['x','y','z','vz'])assert.ok(Math.abs(saved[k]-projected[k])<1e-7,k);
  const stale=M.acceptedRunner(access.runner,log,14000,access.arena,[],who.playerId);
  assert.equal(stale.t,4400,'re-reading old inputs never refreshes their timestamps');
  assert.equal(M.advanceRunner(stale,14000,access.arena,[],who.playerId).inputUntil,6600);
  for(let start=4;start<=123;start+=24)await publish(Array.from({length:24},(_,i)=>input(start+i,4700,{jump:false})));
  const bounded=(await h.pg.query('SELECT inputs FROM quiz_rally_motion_inputs WHERE code=$1',[made.code])).rows[0].inputs;
  assert.equal(bounded.length,96);assert.equal(bounded.at(-1).seq,123);
 }finally{Date.now=real;await h.close();}
});

test('fast journal rejects wrong identity, stale revisions and paused rooms without changing its accepted log',async()=>{
 const h=await harness(),game=h.load('lib/quiz-rally.ts');
 try{
  const made=await game.createQuizRoom({title:'입력 인증'}),teacher={role:'teacher',token:made.teacherKey,playerId:''},who={role:'student',playerId:randomUUID(),token:randomBytes(32).toString('base64url'),nickname:'인증'};
  await game.joinQuizRoom(made.code,who,{nickname:who.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});
  const a=await game.getQuizMotionAccess(made.code,who),inputs=[{seq:1,at:0,dx:0,dy:0,jump:false,dash:false}];
  await assert.rejects(game.publishQuizMotion(made.code,{...who,token:randomBytes(32).toString('base64url')},inputs,a.roomRevision,a.arenaRevision));
  await assert.rejects(game.publishQuizMotion(made.code,{...who,playerId:randomUUID()},inputs,a.roomRevision,a.arenaRevision));
  await assert.rejects(game.publishQuizMotion(made.code,who,inputs,a.roomRevision+1,a.arenaRevision));
  await assert.rejects(game.publishQuizMotion(made.code,who,inputs,a.roomRevision,a.arenaRevision+1));
  assert.equal((await h.pg.query('SELECT * FROM quiz_rally_motion_inputs')).rows.length,0);
  await game.publishQuizMotion(made.code,who,inputs,a.roomRevision,a.arenaRevision);
  await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,'{arenaRevision}',to_jsonb($2::int)) WHERE code=$1",[made.code,a.arenaRevision+1]);
  await game.publishQuizMotion(made.code,who,inputs,a.roomRevision,a.arenaRevision);
  await game.actQuizRoom(made.code,teacher,{action:'pause',requestId:randomUUID()});
  await assert.rejects(game.publishQuizMotion(made.code,who,[{...inputs[0],seq:2}],a.roomRevision,a.arenaRevision));
  assert.equal((await h.pg.query('SELECT inputs FROM quiz_rally_motion_inputs')).rows[0].inputs.length,1);
 }finally{await h.close();}
});

test('common contacts use physical order, independent of upload order and late saved anchors',async()=>{
 const h=await harness(),M=h.load('lib/quiz-rally-arena.ts'),{resolveCombat}=h.load('lib/quiz-rally-combat.ts');
 try{
  const missile={id:'shot',type:'missile',shared:true,owner:'shooter',x:0,y:345,dx:0,dy:1,born:4000,expires:6200};
  const player=(id,y)=>{let r=M.withHistory({...M.freshRunner(4000),x:0,y});r=M.control(r,0,0,false,false,4000,1);r=M.control(M.advanceRunner(r,5000,arena,[missile],id),0,0,false,false,5000,2);return{id,runner:r};};
  const near=player('near',590),far=player('far',620);
  assert.equal(near.runner.hits.length,0,'unconfirmed shared missiles cannot stun a local projection');
  for(const players of [[far,near],[near,far]]){
   const {effects,claims}=resolveCombat(players,5000,arena,[missile]);assert.equal(claims.shot.victim,'near');
   assert.ok(Math.abs(claims.shot.hitAt-(4000+(590-48-345)/460*1000))<1e-7);
   const saved=M.advanceRunner(near.runner,5000,arena,effects,'near');assert.equal(saved.hits.length,1);assert.equal(saved.hits[0].t,claims.shot.hitAt);assert.ok(saved.stunUntil>5000);
   assert.equal(M.advanceRunner(far.runner,5000,arena,effects,'far').hits.length,0);
   assert.equal(resolveCombat(players,5000,arena,effects).claims.shot,undefined,'a committed victim is immutable');
  }
 }finally{await h.close();}
});

test('late common hits replay input, shield changes and dash-jump timestamps exactly once',async()=>{
 const h=await harness(),M=h.load('lib/quiz-rally-arena.ts');
 try{
  const start=M.withHistory({...M.freshRunner(4000),x:0,y:590});
  let r=M.control(start,1,1,true,true,4000,1);r=M.advanceRunner(r,4800,arena,[],'me');r=M.control(r,1,1,true,true,4800,2);
  const before=M.runnerState(r);r.shieldUntil=8000;M.recordRunnerPatch(before,r);r=M.control(M.advanceRunner(r,5200,arena,[],'me'),0,0,false,false,5200,3);
  const e={id:'confirmed',type:'missile',shared:true,owner:'other',x:0,y:400,dx:0,dy:1,born:4000,expires:6500,victim:'me',hitAt:5000};
  const replay=M.advanceRunner(r,5400,arena,[e],'me'),sample=M.sampleRunner(r,5400,arena,[e],'me');
  assert.equal(replay.hits.length,1);assert.equal(replay.stunUntil,0,'shield active at contact absorbs damage');assert.equal(replay.jumpAt,4000+600/680*1000);
  for(const k of ['x','y','z','vz','jumpAt','seq'])assert.equal(replay[k],sample[k]);
  assert.equal(M.advanceRunner(replay,5600,arena,[e],'me').hits.length,1);
 }finally{await h.close();}
});

test('simultaneous overlapping targets have one deterministic winner for each of 30 missiles',async()=>{
 const h=await harness(),M=h.load('lib/quiz-rally-arena.ts'),{resolveCombat}=h.load('lib/quiz-rally-combat.ts');
 try{
  const players=Array.from({length:30},(_,i)=>({id:'student-'+String(i).padStart(2,'0'),runner:M.withHistory({...M.freshRunner(4000),x:(i%3-1)*5,y:590+Math.floor(i/3)*3,shieldUntil:i===1?6000:0})}));
  const effects=Array.from({length:30},(_,i)=>({id:'missile-'+i,type:'missile',shared:true,owner:'shooter',x:0,y:345,dx:0,dy:1,born:4000,expires:6200}));
  const a=resolveCombat(players,5000,arena,effects),b=resolveCombat([...players].reverse(),5000,arena,[...effects].reverse());
  assert.deepEqual(a.claims,b.claims);assert.equal(Object.keys(a.claims).length,30);assert.ok(Object.values(a.claims).every(c=>c.victim==='student-01'));
 }finally{await h.close();}
});

test('local prediction is restricted to an isolated corridor; crowded victims remain server decisions',async()=>{
 const h=await harness(),M=h.load('lib/quiz-rally-arena.ts');
 try{
  const own={...M.freshRunner(4000),x:0,y:590},shot={id:'shot',type:'missile',shared:true,owner:'shooter',x:0,y:345,dx:0,dy:1,born:4000,expires:6200};
  const shooter={id:'shooter',runner:{...own,y:300}},me={id:'me',runner:own};
  const isolated=M.localCombatEffects('me',own,[me,shooter],[shot]);assert.equal(isolated[0].shared,false);assert.equal(M.advanceRunner(own,5000,arena,isolated,'me').hits.length,1);
  const crowd=[...Array.from({length:28},(_,i)=>({id:'peer-'+i,runner:{...own,x:i*10-140,y:300+i*10}})),me,shooter];
  assert.equal(M.localCombatEffects('me',own,crowd,[shot])[0].shared,true);
  assert.equal(M.localCombatEffects('me',own,[me,shooter],[{...shot,victim:'other',hitAt:4400}])[0].shared,true,'a confirmed decision overrides all local predictions');
 }finally{await h.close();}
});

test('a room publishes settled poses once and another connection takes over when its leader closes',async()=>{
 process.env.DATABASE_URL='postgres://test';process.env.DATABASE_URL_UNPOOLED='postgres://test';
 const h=await harness(),game=h.load('lib/quiz-rally.ts'),{quizStream}=h.load('lib/quiz-rally-stream.ts'),real=Date.now;let wall=real();Date.now=()=>wall;
 const streams=[];async function until(fn){for(let i=0;i<300;i++){if(fn())return;await sleep(10);}assert.fail('common feed did not progress');}
 try{
  const made=await game.createQuizRoom({title:'공통 경기 시각'}),teacher={role:'teacher',token:made.teacherKey,playerId:''},students=[0,1].map(i=>({role:'student',playerId:randomUUID(),token:randomBytes(32).toString('base64url'),nickname:'공통'+i}));
  for(const s of students)await game.joinQuizRoom(made.code,s,{nickname:s.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});wall+=4000;
  for(const who of students){const abort=new AbortController(),events=[],response=await quizStream(new Request('http://localhost/events?motion=1&world=1',{signal:abort.signal}),made.code,who),reader=response.body.getReader(),s={abort,events,done:false};streams.push(s);
   s.read=(async()=>{let buffer='';const d=new TextDecoder();try{while(true){const q=await reader.read();if(q.done)break;buffer+=d.decode(q.value,{stream:true});let n;while((n=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,n);buffer=buffer.slice(n+2);if(block.startsWith('data: '))events.push(JSON.parse(block.slice(6)));}}}finally{s.done=true;}})();
  }
  await until(()=>streams.every(s=>s.events.some(e=>e.type==='ready'&&e.world)));
  const input=async(seq,at)=>Promise.all(students.map(s=>game.actQuizRoom(made.code,s,{action:'arena-input',requestId:randomUUID(),inputs:[{seq,at,dx:1,dy:0,jump:seq===1,dash:true}]})));
  await input(1,4000);wall+=400;await input(2,4400);
  await until(()=>streams.every(s=>s.events.some(e=>e.type==='world'&&e.at===4400)));
  assert.equal(h.leaders.size,1);assert.ok(streams[0].events.filter(e=>e.type==='world').every(e=>e.at<=4400));
  assert.ok(streams[0].events.some(e=>e.type==='world'&&e.players.some(p=>p.pose[3]>30&&p.pose[9]&1)));
  const leader=h.leaders.get(made.code);await leader.end();await until(()=>streams.some(s=>s.done));
  wall+=2000;await input(3,6400);await until(()=>streams.filter(s=>!s.done).every(s=>s.events.some(e=>e.type==='world'&&e.at===6400)));
  assert.notEqual(h.leaders.get(made.code),leader);assert.equal(h.leaders.size,1);
  for(const s of streams){const frames=s.events.filter(e=>e.type==='world');assert.equal(new Set(frames.map(e=>e.at)).size,frames.length,'a time is not published by competing leaders');}
 }finally{Date.now=real;for(const s of streams)s.abort.abort();await Promise.all(streams.map(s=>s.read));await h.close();}
});

test('a short burst of 100 small room updates does not disconnect a stream that briefly pauses reading',async()=>{
 const h=await harness(),game=h.load('lib/quiz-rally.ts'),{quizStream}=h.load('lib/quiz-rally-stream.ts'),abort=new AbortController();
 let reader;
 try{
  const made=await game.createQuizRoom({title:'스트림 버퍼'}),teacher={role:'teacher',token:made.teacherKey,playerId:''},who={role:'student',playerId:randomUUID(),token:randomBytes(32).toString('base64url'),nickname:'수신'};
  await game.joinQuizRoom(made.code,who,{nickname:who.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});
  const access=await game.getQuizMotionAccess(made.code,who),response=await quizStream(new Request('http://localhost/events?motion=1&world=1',{signal:abort.signal}),made.code,who);reader=response.body.getReader();
  let buffer='',ended=false;const events=[],decoder=new TextDecoder();
  async function read(){const q=await reader.read();if(q.done){ended=true;return;}buffer+=decoder.decode(q.value,{stream:true});let n;while((n=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,n);buffer=buffer.slice(n+2);if(block.startsWith('data: '))events.push(JSON.parse(block.slice(6)));}}
  while(!events.some(e=>e.type==='ready'))await read();
  const update={type:'motion',code:made.code,status:'running',roomRevision:access.roomRevision,arenaRevision:access.arenaRevision,id:randomUUID(),runner:access.runner};
  await h.pg.query("SELECT pg_notify($1,($2::jsonb || jsonb_build_object('version',n))::text) FROM generate_series(1,100) AS n",['quiz_rally_'+made.code.toLowerCase(),JSON.stringify(update)]);
  while(!ended&&events.filter(e=>e.type==='motion'&&e.id===update.id).length<100)await read();
  assert.equal(events.filter(e=>e.type==='motion'&&e.id===update.id).length,100);
  assert.equal(ended,false,'bounded byte buffering absorbs the burst without a reconnect');
 }finally{abort.abort();await reader?.cancel();await h.close();}
});
