const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
const ctx={window:{}};for(const f of ['arena-model.js','arena-motion.js'])vm.runInNewContext(fs.readFileSync('public/labs/quiz-rally/'+f,'utf8'),ctx);
const M=ctx.window.quizArenaModel,{EffectView}=ctx.window.quizArenaMotion;
const arena={version:1,length:4700,seed:3,combat:true},runner=(extra={})=>({...M.freshRunner(4000),x:0,y:600,...extra});
const rocket=(extra={})=>({id:'rocket',type:'missile',owner:'shooter',x:0,y:345,dx:0,dy:1,born:4000,expires:6200,...extra});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test('rocket body hits, visible side misses, shield, jump clearance and owner immunity agree at 30/60/120 fps',()=>{
 const e=rocket(),expected=4000+(600-48-345)/460*1000;
 for(const fps of [30,60,120]){
  let r=runner();for(let t=4000+1000/fps;t<4800;t+=1000/fps)r=M.advanceRunner(r,t,arena,[e],'target');
  assert.equal(r.hits.length,1);assert.ok(Math.abs(r.hits[0].t-expected)<.0001);assert.ok(r.stunUntil>4800);
  for(const x of [-40,-29,29,40])assert.equal(M.advanceRunner(runner({x}),5000,arena,[e],'target').hits.length,0,'visible lateral gap must miss');
 }
 assert.equal(M.advanceRunner(runner(),5000,arena,[e],'shooter').hits.length,0);
 const shield=M.advanceRunner(runner({shieldUntil:6000}),5000,arena,[e],'target');assert.equal(shield.hits.length,1);assert.equal(shield.stunUntil,0);
 const jump=M.control(runner({y:590}),0,0,true,false,4000,1);assert.equal(M.advanceRunner(jump,5000,arena,[e],'target').hits.length,0);
 const early=M.control(runner({y:610}),0,0,true,false,4000,1);assert.equal(M.advanceRunner(early,5000,arena,[e],'target').hits.length,1,'landing on the passing tail is still a hit');
 assert.equal(M.advanceRunner(runner({open:true}),5000,arena,[e],'target').hits.length,0);
});

test('a classroom volley retains every contact, and launching beside classmates does not hit behind the muzzle',()=>{
 const effects=Array.from({length:30},(_,i)=>rocket({id:'volley-'+i})),target=M.advanceRunner(runner(),5000,arena,effects,'target');
 assert.equal(target.hits.length,30);assert.equal(new Set(target.hits.map(h=>h.id)).size,30);assert.equal(target.usedEffects.length,30);
 const beside=M.advanceRunner(runner({y:300}),5000,arena,effects,'classmate');assert.equal(beside.hits.length,0);
});

test('relative sweep catches a fast diagonal crossing between samples without widening the rocket',()=>{
 const e=rocket({y:600});
 const at=M.missileContact(e,4000,4020,{x:-40,y:600,z:0,vz:0},{x:40,y:608});assert.ok(at>4000&&at<4020);
 assert.equal(M.missileContact(e,4000,4020,{x:-40,y:600,z:65,vz:0},{x:40,y:608}),null);
 // Exercise actual boost + dash physics, with and without a simultaneous jump.
 for(const jump of [false,true])for(const dx of [-1,1]){
  const r=M.control(runner({x:-dx*110,y:570,boostUntil:6000}),dx,1,jump,true,4000,1),q=M.advanceRunner(r,4500,arena,[rocket()],'target');
  assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.z));if(jump)assert.equal(q.hits.length,0);
 }
});

test('impact remains at contact and plays when the displayed victim reaches that time',()=>{
 const e=rocket({victim:'peer',hitAt:4500}),pos=M.effectPosition(e,4500);
 for(const t of [4500,4700,5000])assert.deepEqual(M.effectPosition(e,t),pos);
 const view=new EffectView(),own={id:'shooter',r:runner({y:300})};
 const peers=t=>[{p:{id:'peer'},r:runner(),shown:runner({t:t-500})}];
 view.begin(4800,peers(4800),own);assert.equal(view.sample(e).burst,false,'do not explode while delayed victim is still before collision');
 let shown;for(let t=4816;t<=5024;t+=16){view.begin(t,peers(t),own);shown=view.sample(e);}
 assert.equal(shown.burst,true);assert.equal(shown.positionAt,4500);assert.deepEqual(M.effectPosition(shown.effect,shown.positionAt),pos);
 view.begin(5600,peers(5600),own);assert.equal(view.sample(e),null);
 const local=new EffectView();local.begin(4500,[],{id:'target',r:runner({hits:[{id:e.id,t:4500}]})});const hit=local.sample(rocket());assert.equal(hit.burst,true);assert.equal(hit.positionAt,4500);
 // Slow HTTP responses keep local input time behind server pose time.
 const ahead=new EffectView();ahead.begin(4200,[{p:{id:'peer'},r:runner(),shown:runner({t:4500})}],own);assert.equal(ahead.sample(e).burst,true);
 const spectator=new EffectView();spectator.begin(4200,[{p:{id:'peer'},r:runner(),shown:runner({t:4500})}],null);assert.equal(spectator.sample(rocket()).positionAt,4500);
});

test('30 authenticated streams receive simultaneous launches and unique hits without room refresh storms',async()=>{
 process.env.DATABASE_URL='postgres://test';process.env.DATABASE_URL_UNPOOLED='postgres://test';
 const h=await harness(),game=h.load('lib/quiz-rally.ts'),{quizStream}=h.load('lib/quiz-rally-stream.ts'),realNow=Date.now;let wall=realNow();Date.now=()=>wall;
 const streams=[];let snapshot;
 async function until(fn){for(let i=0;i<400;i++){if(fn())return;await sleep(10);}assert.fail('stream condition timed out');}
 try{
  const made=await game.createQuizRoom({title:'30명 동시 미사일'}),teacher={role:'teacher',token:made.teacherKey,playerId:''};
  const students=Array.from({length:30},(_,i)=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID(),nickname:'검사'+i}));
  for(const s of students)await game.joinQuizRoom(made.code,s,{nickname:s.nickname});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});wall+=4000;
  await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,'{arena}',$2::jsonb) WHERE code=$1",[made.code,JSON.stringify(arena)]);
  for(const [i,s]of students.entries()){
   let r=runner({x:(i%15-7)*36,y:i<15?300:590});if(i===16)r.shieldUntil=6000;if(i===17)r=M.control(r,0,0,true,true,4000,1);
   await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1",[made.code,s.playerId,JSON.stringify({runner:r,gear:['missile']})]);
  }
  for(const who of students){
   const abort=new AbortController(),events=[],response=await quizStream(new Request('http://localhost/events?motion=1',{signal:abort.signal}),made.code,who),reader=response.body.getReader();
   const stream={abort,events};streams.push(stream);stream.read=(async()=>{let buffer='';const decoder=new TextDecoder();while(true){const q=await reader.read();if(q.done)break;buffer+=decoder.decode(q.value,{stream:true});let n;while((n=buffer.indexOf('\n\n'))>=0){const part=buffer.slice(0,n);buffer=buffer.slice(n+2);if(part.startsWith('data: '))events.push(JSON.parse(part.slice(6)));}}})();
  }
  await until(()=>streams.every(s=>s.events.some(e=>e.type==='ready')));
  const before=h.queries.length;
  await Promise.all(students.map(s=>game.actQuizRoom(made.code,s,{action:'arena-use',slot:0,at:4000,requestId:randomUUID()})));
  await until(()=>streams.every(s=>s.events.filter(e=>e.type==='effects').length===30));
  assert.equal(h.queries.slice(before).filter(q=>q.query.startsWith('SELECT code,teacher_key_hash')).length,30,'one action read each; no per-shot reauthentication of the entire class');
  assert.ok(streams.every(s=>s.events.every(e=>e.type!=='refresh')));
  assert.ok(streams.every(s=>s.events.filter(e=>e.type==='effects').every((e,i)=>e.arenaRevision===i+1)));
  wall+=1000;
  await Promise.all(students.map(s=>game.actQuizRoom(made.code,s,{action:'arena-input',inputs:[{seq:2,at:5000,dx:0,dy:0,jump:false,dash:false}],requestId:randomUUID()})));
  snapshot=await game.getQuizSnapshot(made.code,teacher);
  assert.equal(snapshot.arenaEffects.length,30);const hits=snapshot.arenaEffects.filter(e=>e.victim);assert.equal(hits.length,14);
  assert.equal(new Set(hits.map(e=>e.id)).size,14);assert.ok(hits.every(e=>e.victim!==e.owner&&e.hitAt>=e.born));
  assert.ok(!hits.some(e=>e.victim===students[17].playerId),'jumped target dodges');
  assert.equal(snapshot.ranking.find(p=>p.id===students[16].playerId).runner.stunUntil,0,'shield absorbs contact');
  assert.equal(snapshot.ranking.filter(p=>p.runner.stunUntil>5000).length,13);
  await until(()=>streams.every(s=>s.events.filter(e=>e.type==='effects').length===44));
  assert.ok(streams.every(s=>s.events.every(e=>e.type!=='refresh')));
  assert.ok(!JSON.stringify(streams[0].events).includes(students[1].token));
  // A concentrated volley must not lose early claims to a short hit journal.
  wall+=2000;
  for(const [i,s]of students.entries())await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1",[made.code,s.playerId,JSON.stringify({runner:runner({t:7000,seq:3,x:0,y:i===29?590:300}),gear:['missile']})]);
  await Promise.all(students.slice(0,29).map(s=>game.actQuizRoom(made.code,s,{action:'arena-use',slot:0,at:7000,requestId:randomUUID()})));
  wall+=1000;
  const victim=students[29],hit=await game.actQuizRoom(made.code,victim,{action:'arena-input',inputs:[{seq:4,at:8000,dx:0,dy:0,jump:false,dash:false}],requestId:randomUUID()});
  assert.equal(hit.player.runner.hits.length,29);assert.equal(hit.arenaEffects.filter(e=>e.born===7000&&e.victim===victim.playerId).length,29);
  const bystander=await game.actQuizRoom(made.code,students[0],{action:'arena-input',inputs:[{seq:4,at:8000,dx:0,dy:0,jump:false,dash:false}],requestId:randomUUID()});assert.equal(bystander.player.runner.hits.length,0);
 }finally{Date.now=realNow;for(const s of streams)s.abort.abort();await Promise.all(streams.map(s=>s.read));await h.close();}
});

test('late missile requests start at acceptance time without consuming a queued jump',async()=>{
 process.env.DATABASE_URL='postgres://test';const h=await harness(),game=h.load('lib/quiz-rally.ts'),real=Date.now;let wall=real();Date.now=()=>wall;
 try{
  const made=await game.createQuizRoom({title:'늦은 발사'}),s={role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()},teacher={role:'teacher',token:made.teacherKey,playerId:''};await game.joinQuizRoom(made.code,s,{nickname:'발사'});await game.actQuizRoom(made.code,teacher,{action:'start',requestId:randomUUID()});wall+=4000;
  await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1",[made.code,s.playerId,JSON.stringify({runner:runner({y:300}),gear:['missile']})]);
  wall+=1000;const fired=await game.actQuizRoom(made.code,s,{action:'arena-use',at:4100,slot:0,requestId:randomUUID()});assert.equal(fired.arenaEffects[0].born,5000);assert.equal(fired.player.runner.t,4100);
  const jumped=await game.actQuizRoom(made.code,s,{action:'arena-input',inputs:[{seq:1,at:4200,dx:1,dy:1,jump:true,dash:true}],requestId:randomUUID()});assert.equal(jumped.player.runner.jumpAt,4200);
 }finally{Date.now=real;await h.close();}
});
