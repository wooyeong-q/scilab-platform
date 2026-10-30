const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {randomUUID,randomBytes}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
let l,e,c,pg,service;
before(async()=>{({ESCAPE_SAMPLE:l}=await import('../public/labs/first-love/escape-sample.mjs'));e=await import('../public/labs/first-love/engine.mjs');c=await import('../public/labs/first-love/content.mjs');pg=await PGlite.create();await pg.exec(fs.readFileSync('scripts/schema.sql','utf8'));const {createService}=await import('../lib/first-love/service.mjs');service=createService(async(sql,params)=>(await pg.query(sql,params)).rows);});
after(async()=>pg.close());
const solve=p=>p.type==='film'?{x:0,y:0,turns:2}:['dials','circuit'].includes(p.type)?{values:[1,2,3,4].map(n=>p.items.find(i=>i.answer.split('|').includes(String(n))).id)}:{order:[1,2,3,4].map(n=>p.items.find(i=>i.answer===String(n)).id),rotations:Object.fromEntries(p.items.map(i=>[i.id,Number(i.via)]))};
test('new schema round trips, rejects ambiguous device answers and retains four curriculum slots',()=>{
 assert.deepEqual(c.fromSheets(c.toSheets(l)),l);
 assert.deepEqual(l.puzzles.map(p=>p.type),['riddle','jigsaw','dials','circuit','tools','film','frames','key']);
 assert.deepEqual(c.finalAnswer(l.devices).sequence,['H','F','C','D','H','D','C']);
 for(const change of [x=>x.puzzles[2].items[0].answer='1',x=>x.puzzles[3].clues[0].role=2,x=>x.puzzles[6].items[0].via='9',x=>x.puzzles[7].items[0].answer='1']){const x=structuredClone(l);change(x);assert.throws(()=>c.validateLesson(x));}
});
test('undiscovered private clues and grading fields never leave the server; discovered content keys refresh',async()=>{
 const room=await service.create({lesson:l}),keys=[1,2,3,4].map(()=>randomBytes(32).toString('hex'));
 for(let i=0;i<4;i++)await service.join(room.code,keys[i],{name:'학생'+i,team:1,role:i+1});
 await service.teacherAction(room.code,room.teacherKey,{action:'start'});
 let view=await service.state(room.code,keys[1]);assert.equal(view.me.role,2);assert.equal(view.content.puzzle.clues.length,1);assert.equal(view.content.puzzle.clues[0].text,'');
 await assert.rejects(service.event(room.code,keys[1],{type:'discover-clue',stage:0,role:1}),err=>err.status===403);
 const old=view.contentKey;view=await service.event(room.code,keys[1],{type:'discover-clue',stage:0,role:2,contentKey:old});assert.notEqual(view.contentKey,old);assert.ok(view.content.puzzle.clues[0].text);assert.equal(view.state.wrong,undefined);
 const other=await service.state(room.code,keys[0]);assert.equal(other.content.puzzle.clues[0].text,'');
 for(let stage=0;stage<8;stage++)for(let role=1;role<=4;role++){
  const s=e.previewState(stage),content=e.playerContent(l,[role],s);
  assert.ok(content.puzzle.clues.every(c=>c.role===role));
  assert.ok(content.archive.every(p=>p.clues.every(c=>c.role===role)));
  assert.ok(content.puzzle.items.every(i=>!('answer'in i)&&!('via'in i)&&!('passes'in i)));
 }
});
test('one through four players complete every device over the real service and retain all discoveries on reconnect',async()=>{
 for(let count=1;count<=4;count++){
  const room=await service.create({lesson:l}),keys=Array.from({length:count},()=>randomBytes(32).toString('hex'));
  for(let i=0;i<count;i++)await service.join(room.code,keys[i],{name:'학생'+i,team:1,role:i+1});
  await service.teacherAction(room.code,room.teacherKey,{action:'start'});
  const send=(input,key=keys[0])=>service.event(room.code,key,input),state=()=>service.state(room.code,keys[0]);
  for(let stage=0;stage<10;stage++){
   assert.equal((await state()).state.stage,stage);
   if(stage<8)for(let role=1;role<=4;role++)await send({type:'discover-clue',stage,role},keys[role-1]||keys[0]);
   if(stage===0){assert.equal((await send({type:'escape-act',stage,target:'pencil'})).state.stage,0);await send({type:'escape-act',stage,target:'eraser'});}
   else if(stage===4){
    assert.equal((await send({type:'escape-act',stage,target:'gap',tool:'tongs'})).state.stage,4);
    await send({type:'escape-act',stage,target:'gap',tool:'mirror'});await send({type:'escape-act',stage,target:'gap',tool:'tongs'});
   }else if(stage===8){
    await assert.rejects(send({type:'photo',stage,id:'desk'}),/열쇠/);
    await send({type:'escape-act',stage,target:'cover'});
    for(const [i,id] of ['desk','cubby','file','clock'].entries())await send({type:'photo',stage,id},keys[i]||keys[0]);
   }else{
    if(stage===3)await send({type:'escape-act',stage,target:'socket'});
    if(stage===6)await send({type:'escape-act',stage,target:'tab'});
    const v=await state(),draft=stage===9?{sequence:c.finalAnswer(l.devices).sequence}:solve(l.puzzles[stage]);
    const saved=await send({type:'draft',stage,draft,draftVersion:v.state.draftVersion});
    const attempt={type:'submit',stage,draftVersion:saved.state.draftVersion,attemptId:randomUUID()};
    const result=await send(attempt);assert.equal(result.outcome,'correct',`P${stage+1}, ${count} players`);
    assert.equal((await send(attempt)).duplicate,true);
   }
  }
  const finish=await send({type:'confess',stage:10});assert.equal(finish.state.ending,'smile');assert.equal(finish.state.finished,true);
  const reconnect=await state();assert.equal(reconnect.state.stage,10);assert.ok(reconnect.state.discoveries.includes('item:films'));assert.ok(reconnect.state.discoveries.includes('item:cover'));
  assert.equal((await service.getTeacher(room.code,room.teacherKey)).teams[0].wrong,0);
 }
});
test('whole combinations grade atomically, exploration is free, and identical submissions count once',()=>{
 for(const stage of [1,2,3,5,6,7]){
  let s=e.previewState(stage);s.discoveries=['item:connector','item:tab'];
  const p=l.puzzles[stage],good=solve(p),bad=structuredClone(good);
  if(bad.values)bad.values[0]=p.items.find(i=>i.id!==bad.values[0]).id;
  else if(p.type==='film')bad.turns=0;
  else [bad.order[0],bad.order[1]]=[bad.order[1],bad.order[0]];
  s=e.transition(s,{type:'draft',stage,draftVersion:s.draftVersion,draft:bad},l).state;
  let r=e.transition(s,{type:'submit',stage,draftVersion:s.draftVersion,attemptId:randomUUID()},l);s=r.state;
  assert.equal(r.outcome,'wrong');assert.equal(s.wrong,p.type==='film'?0:1);assert.equal(s.stage,stage);assert.equal(r.correctCount,undefined);
  if(stage===6){const unchanged=structuredClone(bad);const unused=p.items.find(i=>!bad.order.includes(i.id)).id;unchanged.rotations[unused]=1-unchanged.rotations[unused];s=e.transition(s,{type:'draft',stage,draftVersion:s.draftVersion,draft:unchanged},l).state;r=e.transition(s,{type:'submit',stage,draftVersion:s.draftVersion,attemptId:randomUUID()},l);s=r.state;assert.equal(r.duplicate,true);assert.equal(s.wrong,1);}
  s=e.transition(s,{type:'draft',stage,draftVersion:s.draftVersion,draft:{}},l).state;
  s=e.transition(s,{type:'draft',stage,draftVersion:s.draftVersion,draft:bad},l).state;
  r=e.transition(s,{type:'submit',stage,draftVersion:s.draftVersion,attemptId:randomUUID()},l);s=r.state;assert.equal(r.duplicate,true);assert.equal(s.wrong,p.type==='film'?0:1);
  s=e.transition(s,{type:'draft',stage,draftVersion:s.draftVersion,draft:good},l).state;
  assert.equal(e.transition(s,{type:'submit',stage,draftVersion:s.draftVersion,attemptId:randomUUID()},l).state.stage,stage+1);
 }
});
test('fixed cast remains present through the final cabinet; only Yunjae confesses',async()=>{
 const story=await import('../public/labs/first-love/escape-story.mjs'),{castForHero,HEROES}=await import('../public/labs/first-love/characters.mjs');
 const present=new Set([0]),seen=new Set();
 const stages=[story.OPENING];for(let n=0;n<10;n++){if(story.BEFORE[n])stages.push(story.BEFORE[n]);stages.push(story.AFTER[n]||[]);}
 for(const list of stages)for(const [who,text,o={}]of list){if(o.arrival!==undefined)for(const id of [o.arrival].flat())present.add(id);if(who>=0&&!o.channel){assert.ok(present.has(who),text);seen.add(who);}assert.equal(o.exit,undefined,'Friends must stay until P10');}
 assert.deepEqual([...present].sort(),[0,2,3,4]);assert.deepEqual([...seen].sort(),[0,2,3,4]);
 for(const h of HEROES){const cast=castForHero(h.id);assert.equal(cast[0].short,'윤재');assert.equal(cast[1].short,'서아');}
 assert.ok(story.WALK_TO_YOU.some(x=>x[2]?.exit?.length===3));
});
