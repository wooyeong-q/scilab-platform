const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { harness } = require('./helpers.cjs');
const { createOutbox, updatePose, samplePose } = require('../public/labs/galaxy-voyage/classroom-sync.js');
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
let h, game, sync;
before(async () => { h=await harness();game=h.load('lib/galaxy-voyage.ts');sync=h.load('lib/galaxy-voyage-sync.ts'); });
after(async () => h.close());
async function room(duration) {
  const {session,teacherKey}=await game.createGalaxySession('우리은하 천체 탐사 · isolated regression',duration);
  const students=await Promise.all(['A','B','C'].map(name=>game.joinGalaxySession(session.code,name)));
  return {session,teacherKey,students,args:students.map(p=>[session.code,p.player.id,p.playerKey])};
}
function known(snapshot) {return {boardVersion:snapshot.boardVersion,progressVersion:snapshot.progressVersion,peers:Object.fromEntries(snapshot.flight.peers.map(p=>[p.id,p.version])),notifications:snapshot.notificationCursor};}

test('one authenticated statement per sync; unchanged progress, ranking and peers are omitted',async()=>{
  const r=await room();await game.applyGalaxyScoreEvent(...r.args[0],'observation','lagoon');
  await sync.syncGalaxyClassroom(...r.args[1],{position:[100,0,0]});
  const begin=h.queries.length,first=await sync.syncGalaxyClassroom(...r.args[0],{position:[0,0,0]});
  assert.equal(h.queries.length-begin,1);assert.equal(first.self.score,20);assert.deepEqual(first.self.observations,['observation:lagoon']);assert.equal(first.leaders.length,3);assert.equal(first.flight.peers.length,1);
  const next=await sync.syncGalaxyClassroom(...r.args[0],known(first));
  assert.equal(next.leaders,null);assert.equal(next.self.observations,undefined);assert.deepEqual(next.flight.peers,[]);assert.deepEqual(next.flight.peerIds,[r.students[1].player.id]);
  await game.applyGalaxyScoreEvent(...r.args[0],'classification_correct','lagoon');
  const changed=await sync.syncGalaxyClassroom(...r.args[0],known(next));
  assert.equal(changed.self.score,220);assert.deepEqual(changed.self.classifications,['classification_correct:lagoon']);assert.ok(changed.leaders);
  assert.equal(await sync.syncGalaxyClassroom(r.session.code,r.students[0].player.id,'wrong',{}),null);
});

test('stationary presence is refreshed only on heartbeat; disabled and ended players cannot move',async()=>{
  const r=await room(60);await sync.syncGalaxyClassroom(...r.args[0],{position:[100,0,0]});
  let row=(await h.pg.query('SELECT * FROM galaxy_voyage_players WHERE id=$1',[r.students[0].player.id])).rows[0];assert.equal(row.flight_at,null);
  await h.pg.query("UPDATE galaxy_voyage_sessions SET started_at=NOW()-INTERVAL '1 second' WHERE id=$1",[r.session.id]);
  await sync.syncGalaxyClassroom(...r.args[0],{position:[100,0,0]});
  row=(await h.pg.query('SELECT * FROM galaxy_voyage_players WHERE id=$1',[r.students[0].player.id])).rows[0];assert.equal(row.flight_x,100);
  await h.pg.query("UPDATE galaxy_voyage_players SET flight_at=NOW()-INTERVAL '2 seconds' WHERE id=$1",[r.students[0].player.id]);
  const old=(await h.pg.query('SELECT flight_at::text AS at FROM galaxy_voyage_players WHERE id=$1',[r.students[0].player.id])).rows[0].at;
  await sync.syncGalaxyClassroom(...r.args[0],{position:[100,0,0]});
  assert.equal((await h.pg.query('SELECT flight_at::text AS at FROM galaxy_voyage_players WHERE id=$1',[r.students[0].player.id])).rows[0].at,old);
  await h.pg.query("UPDATE galaxy_voyage_players SET flight_at=NOW()-INTERVAL '5 seconds',disabled_until=NOW()+INTERVAL '30 seconds' WHERE id=$1",[r.students[0].player.id]);
  await sync.syncGalaxyClassroom(...r.args[0],{position:[900,0,0]});
  row=(await h.pg.query('SELECT * FROM galaxy_voyage_players WHERE id=$1',[r.students[0].player.id])).rows[0];assert.equal(row.flight_x,100);assert.ok(Date.now()-Date.parse(row.flight_at)<2000);
  await h.pg.query("UPDATE galaxy_voyage_sessions SET started_at=NOW()-INTERVAL '2 minutes' WHERE id=$1",[r.session.id]);
  const ended=await sync.syncGalaxyClassroom(...r.args[0],{position:[900,0,0]});assert.equal(ended.timing.state,'ended');assert.equal(ended.self.x,100);
});

test('peer movement deltas, stale peer removal and reconnect full snapshot',async()=>{
  const r=await room();await sync.syncGalaxyClassroom(...r.args[1],{position:[100,0,0]});
  const first=await sync.syncGalaxyClassroom(...r.args[0],{});
  await h.pg.query("UPDATE galaxy_voyage_players SET flight_at=NOW()-INTERVAL '2 seconds' WHERE id=$1",[r.students[1].player.id]);
  await sync.syncGalaxyClassroom(...r.args[1],{position:[200,0,0]});
  const next=await sync.syncGalaxyClassroom(...r.args[0],known(first));assert.equal(next.flight.peers.length,1);assert.equal(next.flight.peers[0].x,200);assert.equal(next.leaders,null);
  const restored=await sync.syncGalaxyClassroom(...r.args[0],{});assert.equal(restored.leaders.length,3);assert.equal(restored.flight.peers.length,1);
  await h.pg.query("UPDATE galaxy_voyage_players SET flight_at=NOW()-INTERVAL '9 seconds' WHERE id=$1",[r.students[1].player.id]);
  assert.deepEqual((await sync.syncGalaxyClassroom(...r.args[0],known(next))).flight.peerIds,[]);
});

test('teacher receives changed students only; unchanged learning arrays are not regenerated for movement',async()=>{
  const r=await room();const first=await sync.syncGalaxyTeacher(r.session.code,r.teacherKey,{});
  const input={progress:Object.fromEntries(first.players.map(p=>[p.id,p.progressVersion])),flights:Object.fromEntries(first.players.map(p=>[p.id,p.flightVersion]))};
  assert.equal(first.players.length,3);assert.equal((await sync.syncGalaxyTeacher(r.session.code,r.teacherKey,input)).players.length,0);
  await sync.syncGalaxyClassroom(...r.args[1],{position:[100,0,0]});
  const moving=await sync.syncGalaxyTeacher(r.session.code,r.teacherKey,input);assert.equal(moving.players.length,1);assert.equal(moving.players[0].progress,null);
  await game.applyGalaxyScoreEvent(...r.args[1],'observation','eagle');
  const learned=await sync.syncGalaxyTeacher(r.session.code,r.teacherKey,input);assert.deepEqual(learned.players[0].progress.observations,['observation:eagle']);assert.equal(learned.playerIds[0],r.students[1].player.id);
  assert.equal(await sync.syncGalaxyTeacher(r.session.code,'wrong',{}),null);
});

test('notifications paginate more than 50 equal timestamps without skipping records',async()=>{
  const r=await room(),at='2026-01-01T00:00:00.123456Z';
  for(let i=0;i<63;i++)await h.pg.query("INSERT INTO galaxy_voyage_score_events(id,session_id,actor_id,target_id,event_key,event_kind,target_message,created_at) VALUES($1,$2,$3,$4,$5,'player_attack',$5,$6)",[randomUUID(),r.session.id,r.students[1].player.id,r.students[0].player.id,'note-'+i,at]);
  const a=await sync.syncGalaxyClassroom(...r.args[0],{}),b=await sync.syncGalaxyClassroom(...r.args[0],known(a));
  assert.equal(a.notifications.length,50);assert.equal(a.moreNotifications,true);assert.equal(b.notifications.length,13);assert.equal(new Set([...a.notifications,...b.notifications].map(n=>n.id)).size,63);assert.equal((await sync.syncGalaxyClassroom(...r.args[0],known(b))).notifications.length,0);
});

test('lost response and browser restart retry the same observation once, retaining classification order',async()=>{
  const r=await room();let persisted=[],fail=true,active=false;
  let queue=createOutbox({persist:p=>{persisted=structuredClone(p)},canSend:()=>active,send:async event=>{const result=await game.applyGalaxyScoreEvent(...r.args[0],event.kind,event.reference);if(fail){fail=false;throw Error('response lost after commit')}return result}});
  void queue.enqueue({kind:'observation',reference:'lagoon'});void queue.enqueue({kind:'classification_correct',reference:'lagoon'});
  active=true;await queue.flush();assert.equal(persisted.length,2);
  queue=createOutbox({initial:persisted,persist:p=>{persisted=structuredClone(p)},send:e=>game.applyGalaxyScoreEvent(...r.args[0],e.kind,e.reference)});
  await queue.flush();assert.equal(persisted.length,0);
  const state=await sync.syncGalaxyClassroom(...r.args[0],{});assert.equal(state.self.score,220);assert.equal(state.self.observations.length,1);assert.equal(state.self.classifications.length,1);
});

test('duplicate UFO returns a committed outcome during cooldown without another reward',async()=>{
  const r=await room(),first=await game.applyRandomUfoEvent(...r.args[0],'same-ufo-1234');
  const second=await game.applyRandomUfoEvent(...r.args[0],'same-ufo-1234');assert.equal(first.status,'applied');assert.equal(second.status,'duplicate');assert.equal(second.score,first.score);assert.equal(second.delta,0);assert.equal(second.message,first.message);
});

test('lost join response can retry with saved credentials without duplicating or taking another student',async()=>{
  const {session}=await game.createGalaxySession('Retry join');const retry={id:randomUUID(),key:randomUUID()};
  const results=await Promise.all([game.joinGalaxySession(session.code,'Student',retry),game.joinGalaxySession(session.code,'Student',retry)]);
  assert.ok(results.every(p=>p.status==='joined'&&p.player.id===retry.id&&p.playerKey===retry.key));
  assert.equal((await game.joinGalaxySession(session.code,'Student',{id:randomUUID(),key:randomUUID()})).status,'duplicate');
  assert.equal((await h.pg.query('SELECT COUNT(*)::int AS n FROM galaxy_voyage_players WHERE session_id=$1',[session.id])).rows[0].n,1);
});

test('client queue serializes overlapping flush calls and retains retryable actions',async()=>{
  let persisted=[],release,calls=0;const queue=createOutbox({persist:p=>{persisted=structuredClone(p)},send:async()=>{calls++;await new Promise(r=>{release=r});return {retry:true}}});
  void queue.enqueue({kind:'ufo',reference:'same-id'});void queue.enqueue({kind:'ufo',reference:'same-id'});await queue.flush();assert.equal(calls,1);assert.equal(persisted.length,1);release();await new Promise(r=>setImmediate(r));assert.equal(queue.pending.length,1);
});

test('remote pose spans the observed update interval, remains bounded and does not replay physics',()=>{
  const peer={current:[0,0,0]};updatePose(peer,[150,0,0],0);assert.deepEqual(samplePose(peer,750),[75,0,0]);assert.deepEqual(samplePose(peer,1500),[150,0,0]);
  updatePose(peer,[300,0,0],1500);assert.deepEqual(samplePose(peer,2250),[225,0,0]);assert.deepEqual(samplePose(peer,9000),[300,0,0]);
});

test('sync API rejects oversized, malformed and unauthenticated input',async()=>{
  const route=h.load('app/api/labs/galaxy-voyage/sessions/[code]/sync/route.ts'),context={params:Promise.resolve({code:'ABCDEF'})};
  for(const [body,status] of [['{',400],['[]',400],['{}',401],['x'.repeat(16385),413]])assert.equal((await route.POST(new Request('http://localhost/sync',{method:'POST',body}),context)).status,status);
});
