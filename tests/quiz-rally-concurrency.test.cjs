const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
const read=async(h,code)=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;
async function setup(t,count=30){
 const h=await harness();t.after(()=>h.close());
 const game=h.load('lib/quiz-rally.ts'),M=h.load('lib/quiz-rally-arena.ts'),C=h.load('lib/quiz-rally-course.ts');
 const made=await game.createQuizRoom({durationSeconds:900}),code=made.code,teacher={role:'teacher',token:made.teacherKey,playerId:''};
 const players=Array.from({length:count},()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()}));
 await Promise.all(players.map((p,i)=>game.joinQuizRoom(code,p,{nickname:'동시검증'+i})));
 await game.actQuizRoom(code,teacher,action('start'));
 const real=Date.now;let now=real()+4000;Date.now=()=>now;t.after(()=>Date.now=real);
 const room=await read(h,code),clock=C.gameClock(room);
 for(const [i,p] of players.entries())room.players[p.playerId]={...room.players[p.playerId],gear:['field'],runner:{...M.freshRunner(clock,i),x:0,y:350}};
 await h.pg.query('UPDATE quiz_rally_sessions SET state=$2::jsonb WHERE code=$1',[code,JSON.stringify(room)]);
 return {h,game,M,C,code,players,tick:ms=>now+=ms};
}

test('30 simultaneous item uses and movement keep every effect and consume each inventory once',async t=>{
 const {h,game,code,players,tick}=await setup(t),packets=players.map(()=>action('arena-use',{slot:0}));
 const results=await Promise.allSettled(players.map((p,i)=>game.actQuizRoom(code,p,packets[i])));
 assert.equal(results.filter(r=>r.status==='rejected').length,0,'Every independent item use must succeed without the client resubmitting it');
 let room=await read(h,code);assert.equal(room.arenaEffects.length,30);assert.equal(new Set(room.arenaEffects.map(e=>e.owner)).size,30);
 assert.ok(players.every(p=>room.players[p.playerId].gear.length===0));
 await Promise.all(players.map((p,i)=>game.actQuizRoom(code,p,packets[i])));
 assert.equal((await read(h,code)).arenaEffects.length,30,'Replayed requests cannot create duplicate items');
 tick(100);
 await Promise.all(players.map(p=>game.actQuizRoom(code,p,action('arena-input',{dx:0,dy:1,seq:1}))));
 room=await read(h,code);assert.ok(players.every(p=>room.players[p.playerId].runner.seq===1));assert.equal(room.arenaEffects.length,30);
});

test('simultaneous trap claims and new items preserve other effects with exactly one victim per trap',async t=>{
 const {h,game,M,C,code,players,tick}=await setup(t),room=await read(h,code),clock=C.gameClock(room);
 room.arenaEffects=[-200,200].map((x,i)=>({id:randomUUID(),type:'mine',owner:'external-owner',x,y:350,dx:0,dy:1,born:clock-1000,expires:clock+10000}));
 for(const [i,p] of players.entries())room.players[p.playerId].runner={...M.freshRunner(clock),x:i<10?-200:i<20?200:0,y:350};
 await h.pg.query('UPDATE quiz_rally_sessions SET state=$2::jsonb WHERE code=$1',[code,JSON.stringify(room)]);tick(50);
 await Promise.all(players.map((p,i)=>game.actQuizRoom(code,p,i<20?action('arena-input',{dx:0,dy:0,seq:1}):action('arena-use',{slot:0}))));
 const final=await read(h,code);assert.equal(final.arenaEffects.length,12);assert.equal(final.arenaEffects.filter(e=>e.type==='field').length,10);
 for(const trap of final.arenaEffects.filter(e=>e.type==='mine')){
  assert.ok(trap.victim);const hits=players.filter(p=>final.players[p.playerId].runner.usedEffects.includes(trap.id));assert.equal(hits.length,1);assert.equal(hits[0].playerId,trap.victim);
 }
});

test('the shared item limit remains atomic and expired effects can be removed during concurrent appends',async t=>{
 const {h,game,C,code,players,tick}=await setup(t,2),room=await read(h,code),clock=C.gameClock(room);
 room.arenaEffects=Array.from({length:199},()=>({id:randomUUID(),type:'field',owner:'external-owner',x:0,y:1000,dx:0,dy:1,born:clock-1000,expires:clock+5000}));
 await h.pg.query('UPDATE quiz_rally_sessions SET state=$2::jsonb WHERE code=$1',[code,JSON.stringify(room)]);
 const result=await Promise.allSettled(players.map(p=>game.actQuizRoom(code,p,action('arena-use',{slot:0}))));
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.match(result.find(r=>r.status==='rejected').reason.message,/아이템이 많아요/);
 let final=await read(h,code);assert.equal(final.arenaEffects.length,200);assert.equal(players.reduce((n,p)=>n+final.players[p.playerId].gear.length,0),1);
 tick(11000);for(const p of players)final.players[p.playerId].gear=['field'];
 await h.pg.query('UPDATE quiz_rally_sessions SET state=$2::jsonb WHERE code=$1',[code,JSON.stringify(final)]);
 await Promise.all(players.map(p=>game.actQuizRoom(code,p,action('arena-use',{slot:0}))));
 final=await read(h,code);assert.equal(final.arenaEffects.length,2);assert.equal(new Set(final.arenaEffects.map(e=>e.owner)).size,2);
});
