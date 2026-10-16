const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto'),{harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
async function setup(t){
 const h=await harness();t.after(()=>h.close());const base=process.env.QUIZ_BASELINE||'.',game=h.load(base+'/lib/quiz-rally.ts'),M=h.load(base+'/lib/quiz-rally-arena.ts');
 const made=await game.createQuizRoom({durationSeconds:300}),code=made.code,teacher={role:'teacher',token:made.teacherKey,playerId:''};
 const players=[0,1].map(i=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()}));
 for(let i=0;i<players.length;i++)await game.joinQuizRoom(code,players[i],{nickname:'친구'+i});
 await game.actQuizRoom(code,teacher,action('start'));
 const real=Date.now;let wall=real()+4000;Date.now=()=>wall;t.after(()=>Date.now=real);
 const snapshot=await game.getQuizSnapshot(code,teacher),at=snapshot.raceClock,arena=snapshot.arena;
 const patch=(who,runner,extra={})=>h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1",[code,who.playerId,JSON.stringify({runner,...extra})]);
 return {h,game,M,code,teacher,players,at,arena,patch,tick:d=>wall+=d};
}
test('polls cannot turn predicted travel into a finish or discard a delayed stop before the line',async t=>{
 const {game,M,code,teacher,players:[p],at,arena,patch,tick}=await setup(t);
 const start={...M.freshRunner(at),x:M.center(arena.length),y:arena.length-100};
 await patch(p,M.control(start,0,1,false,false,at,1));tick(1000);
 let snap=await game.getQuizSnapshot(code,teacher);assert.equal(snap.finishers.length,0,'no input confirms that the player crossed');
 snap=await game.actQuizRoom(code,p,action('arena-input',{inputs:[{seq:2,at:at+50,dx:0,dy:0,jump:false,dash:false}]}));
 assert.equal(snap.player.finish,null);assert.equal(snap.player.runner.seq,2);assert.ok(snap.player.runner.y<arena.length-80);
 tick(3000);assert.equal((await game.getQuizSnapshot(code,teacher)).finishers.length,0);
});
test('arrival order follows confirmed crossing times even when the earlier finisher uploads later',async t=>{
 const {game,M,code,teacher,players:[early,late],at,arena,patch,tick}=await setup(t);
 await patch(early,{...M.freshRunner(at),x:M.center(arena.length),y:arena.length-40});
 await patch(late,M.control({...M.freshRunner(at),x:M.center(arena.length),y:arena.length-80},0,1,false,false,at,1));
 tick(1000);
 const packet=()=>action('arena-input',{inputs:[{seq:2,at:at+900,dx:0,dy:1,jump:false,dash:false}]});
 await game.actQuizRoom(code,late,packet());
 await game.actQuizRoom(code,early,action('arena-input',{inputs:[{seq:1,at,dx:0,dy:1,jump:false,dash:false},...packet().inputs]}));
 const snap=await game.getQuizSnapshot(code,teacher);
 assert.deepEqual(snap.finishers,[early.playerId,late.playerId]);assert.deepEqual(snap.ranking.map(p=>p.finish.place),[1,2]);
});
test('a confirmed crossing can be saved when the common combat clock has already passed the line',async t=>{
 const {h,game,M,code,players:[p],at,arena,patch,tick}=await setup(t);
 await patch(p,M.control({...M.freshRunner(at),x:M.center(arena.length),y:arena.length-40},0,1,false,false,at,1));tick(1200);
 await h.pg.query("UPDATE quiz_rally_sessions SET state=jsonb_set(state,'{arenaCombatAt}',to_jsonb($2::int)) WHERE code=$1",[code,at+1000]);
 const snap=await game.actQuizRoom(code,p,action('arena-input',{inputs:[{seq:2,at:at+1100,dx:0,dy:1,jump:false,dash:false}]}));
 assert.equal(snap.player.finish?.place,1);assert.equal(snap.player.runner.y,arena.length);
});
test('server ranking compares positions at one race clock instead of different save times',async t=>{
 const {game,M,code,teacher,players:[moving,idle],at,patch,tick}=await setup(t);
 await patch(moving,M.control({...M.freshRunner(at),x:0,y:300},0,1,false,false,at,1));
 tick(1000);await patch(idle,{...M.freshRunner(at+1000),x:0,y:350});
 const snap=await game.getQuizSnapshot(code,teacher);assert.equal(snap.ranking[0].id,moving.playerId);
});
test('an item carries an input backlog in one request and concurrent movement cannot restore spent gear',async t=>{
 const {game,M,code,players:[p],at,patch,tick}=await setup(t);
 await patch(p,{...M.freshRunner(at),x:0,y:300},{gear:['mine','shield']});tick(1000);
 const inputs=Array.from({length:32},(_,i)=>({seq:i+1,at:at+i*20,dx:i<20?1:0,dy:0,jump:i===8,dash:false}));
 const use=action('arena-use',{slot:0,gear:'mine,shield',inputs,at:at+700});
 await Promise.all([game.actQuizRoom(code,p,action('arena-input',{inputs:inputs.slice(0,8)})),game.actQuizRoom(code,p,use)]);
 let snap=await game.getQuizSnapshot(code,p);assert.deepEqual(snap.player.gear,['shield']);assert.equal(snap.player.runner.seq,32);assert.equal(snap.arenaEffects.length,1);
 snap=await game.actQuizRoom(code,p,use);assert.deepEqual(snap.player.gear,['shield']);assert.equal(snap.arenaEffects.length,1);
 tick(1000);await assert.rejects(game.actQuizRoom(code,p,action('arena-use',{slot:0,gear:'mine,shield',inputs:[]})),/아이템이 바뀌/);
});
