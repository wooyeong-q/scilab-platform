const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto');
const {harness}=require('./helpers.cjs');process.env.DATABASE_URL='postgres://test';
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
const read=async(h,code)=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[code])).rows[0].state;
async function setup(t,combat=true){
 const h=await harness();t.after(()=>h.close());const game=h.load('lib/quiz-rally.ts'),M=h.load('lib/quiz-rally-arena.ts'),C=h.load('lib/quiz-rally-course.ts');
 const made=await game.createQuizRoom({stealEnabled:combat,questions:[{prompt:'양성자의 전하는?',options:['양전하','음전하','중성','없음'],answer:0,topic:'물질의 구성',explanation:'양성자는 양전하입니다.'}]}),code=made.code;
 const s={role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()},teacher={role:'teacher',token:made.teacherKey,playerId:''};
 await game.joinQuizRoom(code,s,{nickname:'충전검증'});await game.actQuizRoom(code,teacher,action('start'));
 const real=Date.now;let now=real()+4000;Date.now=()=>now;t.after(()=>Date.now=real);
 const patch=async p=>h.pg.query(`UPDATE quiz_rally_sessions SET state=jsonb_set(state,ARRAY['players',$2],(state #> ARRAY['players',$2]) || $3::jsonb) WHERE code=$1`,[code,s.playerId,JSON.stringify(p)]);
 const collect=async(energy=20,gear=[])=>{const room=await read(h,code),box=M.boxes(room.arena)[0];await patch({gear,runner:{...M.freshRunner(C.gameClock(room)),x:box.x,y:box.y,energy}});return game.actQuizRoom(code,s,action('arena-collect',{box:box.id}));};
 return{h,game,M,C,code,s,teacher,patch,collect,tick:ms=>now+=ms};
}
test('energy drains over game time, smoothly slows running, and freezes during questions and countdown',async t=>{
 const {M}=await setup(t),a={version:2,length:27000,seed:7,combat:true,energy:true,supplies:2},r={...M.freshRunner(4000),x:0,y:300};
 assert.equal(M.advanceRunner(M.freshRunner(),3000,a).energy,100);
 assert.ok(Math.abs(M.advanceRunner(r,19000,a).energy-40)<1e-9);assert.equal(M.advanceRunner(r,29000,a).energy,0);
 assert.equal(M.advanceRunner({...r,energy:20,open:true},44000,a).energy,20);
 const full=M.advanceRunner(M.control(r,0,1,false,false,4000,1),4500,a),low=M.advanceRunner(M.control({...r,energy:10},0,1,false,false,4000,1),4500,a),empty=M.advanceRunner(M.control({...r,energy:0},0,1,false,false,4000,1),4500,a);
 assert.ok(full.y>low.y&&low.y>empty.y&&empty.y>300);assert.ok(Math.abs(empty.y-330.625)<1e-7);assert.ok(Math.abs(low.energy-8)<1e-9);
 // Actual travel, including sprinting and flat-ground jumps, follows charge.
 for(const energy of [100,50,0])for(const boost of [false,true]){
  const source={...r,energy,boostUntil:boost?7000:0},powered=Math.min(.5,energy/4),factor=boost?2:1;
  const distance=175*factor*(.35*.5+.65*(energy*powered-2*powered*powered)/100);
  const run=M.advanceRunner(M.control(source,0,1,false,false,4000,1),4500,a),leap=M.advanceRunner(M.control(source,0,1,true,false,4000,1),4500,a);
  assert.ok(Math.abs(run.y-300-distance)<1e-7,`${energy} charge, sprint ${boost}`);
  assert.ok(Math.abs(leap.y-run.y)<1e-7,'Jumping on flat ground must not bypass depleted energy');
 }
 assert.equal(M.energySpeed({...r,energy:0},a),.35);assert.equal(M.energySpeed({...r,energy:50},a),.675);
 const start=M.control(r,0,1,true,false,4000,1),expected=M.advanceRunner(start,4750,a);
 for(const fps of [30,60,120]){let p=start;for(let at=4000+1000/fps;at<4750;at+=1000/fps)p=M.advanceRunner(p,at,a);p=M.advanceRunner(p,4750,a);for(const key of ['x','y','z','energy'])assert.ok(Math.abs(p[key]-expected[key])<1e-7,`${fps}fps ${key}`);}
 for(const gap of M.gaps(a)){const y=gap.start-11,start={...r,energy:0,x:M.trackAt(y,a).center,y,checkpoint:100},jumped=M.advanceRunner(M.control(start,0,1,true,false,4000,1),4900,a);assert.equal(jumped.falls,0,'An empty battery must not make a required gap impossible');assert.ok(jumped.y>gap.end);}
});
test('full inventory still opens questions and correct answers charge once without replacing items',async t=>{
 const {h,game,code,s,collect,tick}=await setup(t),gear=['mine','shield','missile'];let snap=await collect(20,gear);assert.equal(snap.player.runner.open,true);
 tick(12000);let waiting=await game.getQuizSnapshot(code,s);assert.equal(waiting.player.runner.energy,20);
 const packet=action('answer',{nonce:snap.player.turn.nonce,choice:snap.player.turn.options.indexOf('양전하')});snap=await game.actQuizRoom(code,s,packet);
 assert.equal(snap.player.runner.energy,65);assert.deepEqual(snap.player.gear,gear);assert.equal(snap.player.runner.open,false);assert.equal(snap.player.correct,1);assert.equal(snap.player.turn.reward.type,'energy');
 snap=await game.actQuizRoom(code,s,packet);assert.equal(snap.player.runner.energy,65);assert.equal(snap.player.correct,1);assert.equal((await read(h,code)).players[s.playerId].score,0);
});
test('answer fast path uses one guarded write, never reveals keys, and safely retries stale room state',async t=>{
 const {h,game,code,s,teacher,collect}=await setup(t);let snap=await collect(80);
 assert.equal('answer' in snap.player.turn,false);assert.equal('correctOption' in snap.player.turn,false);assert.equal(snap.player.turn.feedback,null);
 let before=h.queries.length;snap=await game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:snap.player.turn.options.indexOf('양전하')}));
 const used=h.queries.slice(before);assert.equal(used.length,1);assert.match(used[0].query,/^UPDATE /);assert.equal(snap.player.runner.energy,100);assert.equal(snap.player.gear.length,1);
 snap=await collect(15);await game.actQuizRoom(code,teacher,action('pause'));
 await assert.rejects(game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:0})),/멈췄/);
 assert.equal((await read(h,code)).players[s.playerId].runner.energy,15);
 await game.actQuizRoom(code,teacher,action('resume'));await assert.rejects(game.actQuizRoom(code,{...s,token:randomBytes(32).toString('base64url')},action('answer',{nonce:snap.player.turn.nonce,choice:0})),/참여/);
});
test('new supply layout is denser, stable across classmates, and leaves every question on safe ground',async t=>{
 const {M}=await setup(t);for(const length of [14000,27000])for(const seed of [1,42,98765]){
  const a={version:2,length,seed,combat:true},old=M.boxes(a),dense={...a,supplies:2},boxes=M.boxes(dense);
  assert.ok(boxes.length>=old.length*1.7,`${length}/${seed}: ${old.length} to ${boxes.length}`);assert.equal(new Set(boxes.map(b=>b.id)).size,boxes.length);
  assert.deepEqual(M.boxes({...dense}),boxes);for(const b of boxes)for(const clock of [4000,5500,7000,8500])assert.ok(M.floorAt(b.x,b.y,clock,dense));
 }
});
test('each item cycle includes banana and bomb, duplicates and full bags never consume extra draws',async t=>{
 const {h,game,code,s,collect}=await setup(t),expected=['mine','missile','banana','field','shield','boost'].sort(),draws=[];
 for(let i=0;i<12;i++){
  let snap=await collect();const packet=action('answer',{nonce:snap.player.turn.nonce,choice:snap.player.turn.options.indexOf('양전하')});
  [snap]=await Promise.all([game.actQuizRoom(code,s,packet),game.actQuizRoom(code,s,packet)]);
  assert.equal(snap.player.gear.length,1);assert.equal(snap.player.correct,i+1);assert.equal('gearDeck' in snap.player,false);draws.push(snap.player.gear[0]);
 }
 assert.deepEqual(draws.slice(0,6).sort(),expected);assert.deepEqual(draws.slice(6).sort(),expected);
 const before=(await read(h,code)).players[s.playerId].gearDeck,gear=['mine','banana','shield'];let snap=await collect(20,gear);
 snap=await game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:snap.player.turn.options.indexOf('양전하')}));
 assert.deepEqual(snap.player.gear,gear);assert.deepEqual((await read(h,code)).players[s.playerId].gearDeck,before);
});
test('disabling interference only deals shield and boost in balanced cycles',async t=>{
 const {game,code,s,collect}=await setup(t,false),draws=[];
 for(let i=0;i<4;i++){let snap=await collect();snap=await game.actQuizRoom(code,s,action('answer',{nonce:snap.player.turn.nonce,choice:snap.player.turn.options.indexOf('양전하')}));draws.push(snap.player.gear[0]);}
 assert.deepEqual(draws.slice(0,2).sort(),['boost','shield']);assert.deepEqual(draws.slice(2).sort(),['boost','shield']);
});
test('item hits have documented stun times, no extra energy penalty, and respect jumping and shields',async t=>{
 const {M}=await setup(t),a={version:1,length:4700,seed:1,combat:true,energy:true},r={...M.freshRunner(4000),x:0,y:350};
 for(const [type,stun] of [['mine',850],['banana',1050],['missile',850]]){
  const e={id:type,type,owner:'other',x:0,y:350,dx:0,dy:1,born:type==='mine'?3000:4000,expires:15000};
  const hit=M.advanceRunner(r,4020,a,[e],'me');assert.equal(hit.hits.length,1);assert.equal(hit.stunUntil-hit.hits[0].t,stun);assert.ok(Math.abs(hit.energy-99.92)<1e-9);
  assert.equal(M.advanceRunner({...r,shieldUntil:5000},4020,a,[e],'me').stunUntil,0);
  assert.equal(M.advanceRunner({...r,z:60},4020,a,[e],'me').hits.length,0);assert.equal(M.advanceRunner(r,4020,a,[e],'other').hits.length,0);
 }
 const moving=M.control(r,0,1,false,false,4000,1),field={id:'field',type:'field',owner:'other',x:0,y:350,dx:0,dy:1,born:4000,expires:9000};
 const free=M.advanceRunner(moving,4500,a),slow=M.advanceRunner(moving,4500,a,[field],'me');assert.ok(Math.abs((slow.y-350)/(free.y-350)-.38)<1e-9);
});
