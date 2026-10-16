const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const token=()=>randomBytes(32).toString('base64url');

test('new rooms stay on the existing backend until real-time hosting is configured',async()=>{
 const h=await harness();try{
  const lib=h.load('lib/quiz-rally.ts'),room=await lib.createQuizRoom({title:'기존 경기'});
  const saved=await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[room.code]);
  assert.equal(saved.rows[0].state.realtime,undefined);
  assert.equal((await lib.getQuizSnapshot(room.code,{role:'teacher',token:room.teacherKey,playerId:''})).status,'lobby');
 }finally{await h.close();}
});
test('a configured room boots once and all HTTP actions go to the same authority',async()=>{
 const h=await harness(),oldFetch=global.fetch;process.env.QUIZ_REALTIME_URL='https://rooms.test';process.env.QUIZ_REALTIME_SECRET=token();process.env.QUIZ_REALTIME_NEW_ROOMS='1';
 const calls=[];global.fetch=async(url,options)=>{calls.push({url,payload:JSON.parse(options.body),options});return Response.json(String(url).endsWith('/init')?{ok:true}:{status:'running',fromAuthority:true});};
 try{
  const lib=h.load('lib/quiz-rally.ts'),room=await lib.createQuizRoom({title:'실시간 경기'}),who={role:'student',token:token(),playerId:randomUUID()};
  assert.ok(calls[0].url.endsWith('/init'));assert.ok(calls[0].payload.state.realtime.generation);assert.equal(calls[0].payload.question_bank,null);
  const count=h.queries.length;
  for(const operation of [()=>lib.joinQuizRoom(room.code,who,{nickname:'참여자'}),()=>lib.getQuizSnapshot(room.code,who),()=>lib.actQuizRoom(room.code,who,{action:'arena-use',slot:0,requestId:randomUUID()})])assert.equal((await operation()).fromAuthority,true);
  assert.equal(h.queries.length,count,'warm routed requests do not touch Neon');
  assert.equal(calls.length,4);assert.equal(calls[1].payload.body.action,'join');
  assert.equal(calls[3].payload.body.action,'arena-use');
  process.env.QUIZ_REALTIME_NEW_ROOMS='0';assert.equal(h.load('lib/quiz-rally-realtime.ts').newQuizRealtimeRoute(),undefined);
  assert.equal((await lib.getQuizSnapshot(room.code,who)).fromAuthority,true,'disabling new rooms must preserve existing room routing');
 }finally{global.fetch=oldFetch;delete process.env.QUIZ_REALTIME_URL;delete process.env.QUIZ_REALTIME_SECRET;delete process.env.QUIZ_REALTIME_NEW_ROOMS;await h.close();}
});
test('disabling or losing the real-time endpoint cannot split a room into two authorities',async()=>{
 const h=await harness();try{
  const lib=h.load('lib/quiz-rally.ts'),room=await lib.createQuizRoom({title:'권한 검증'}),who={role:'teacher',token:room.teacherKey,playerId:''};
  await h.pg.query("UPDATE quiz_rally_sessions SET state=state || jsonb_build_object('realtime',$2::jsonb) WHERE code=$1",[room.code,JSON.stringify({version:1,generation:randomUUID(),checkpoint:0})]);
  await assert.rejects(()=>lib.getQuizSnapshot(room.code,who),e=>e.status===503);
  await assert.rejects(()=>lib.actQuizRoom(room.code,who,{action:'end',requestId:randomUUID()}),e=>e.status===503);
  await assert.rejects(()=>lib.authorizeQuizStream(room.code,who),e=>e.status===503);
  const row=(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[room.code])).rows[0];assert.equal(row.state.status,'lobby');
 }finally{await h.close();}
});
test('checkpoint endpoint authenticates and rejects older or foreign-generation writes',async()=>{
 const h=await harness();try{
  const lib=h.load('lib/quiz-rally.ts'),room=await lib.createQuizRoom({}),bridge=h.load('lib/quiz-rally-realtime.ts'),generation=randomUUID();
  process.env.QUIZ_REALTIME_SECRET=token();
  assert.throws(()=>bridge.authorizeQuizCheckpoint(new Request('https://game.test/')),e=>e.status===403);
  bridge.authorizeQuizCheckpoint(new Request('https://game.test/',{headers:{Authorization:'Bearer '+process.env.QUIZ_REALTIME_SECRET}}));
  const state=(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[room.code])).rows[0].state;
  state.realtime={version:1,generation,checkpoint:0};await h.pg.query('UPDATE quiz_rally_sessions SET state=$2::jsonb WHERE code=$1',[room.code,JSON.stringify(state)]);
  const save=revision=>bridge.saveQuizCheckpoint({code:room.code,generation,revision,state:{...state,title:'revision '+revision,realtime:{version:1,generation,checkpoint:revision}}});
  assert.equal((await save(10)).saved,true);assert.equal((await save(3)).saved,false);
  const foreign=randomUUID();assert.equal((await bridge.saveQuizCheckpoint({code:room.code,generation:foreign,revision:20,state:{...state,realtime:{version:1,generation:foreign,checkpoint:20}}})).saved,false);
  const saved=(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[room.code])).rows[0].state;assert.equal(saved.title,'revision 10');
 }finally{delete process.env.QUIZ_REALTIME_SECRET;await h.close();}
});
