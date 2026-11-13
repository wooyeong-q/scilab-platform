const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {randomBytes,randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
let pg,service,lesson;
const token=()=>randomBytes(32).toString('hex');
before(async()=>{
 pg=await PGlite.create();await pg.exec(fs.readFileSync('scripts/schema.sql','utf8'));
 const {createService}=await import('../lib/first-love/service.mjs');
 service=createService(async(sql,params)=>(await pg.query(sql,params)).rows);
 ({ESCAPE_SAMPLE:lesson}=await import('../public/labs/first-love/escape-sample.mjs'));
});
after(async()=>pg.close());
test('all four romance pairings survive joins, puzzle progress and reconnection',async()=>{
 for(const lead of ['yunjae','harin'])for(const recipient of ['seoa','doyun']){
  const room=await service.create({lesson}),keys=Array.from({length:4},token),actors=[lead,'soyeon','jian','naeun'];
  for(let i=0;i<4;i++)await service.join(room.code,keys[i],{name:'학생'+i,team:1,role:i+1,characterId:actors[i],recipientId:i===0?recipient:recipient==='seoa'?'doyun':'seoa'});
  let state=await service.state(room.code,keys[0]);
  assert.deepEqual(state.state.casting,{actors,recipient});
  assert.deepEqual(state.members.map(m=>m.characterId),actors);
  assert.ok(!state.members.some(m=>m.characterId===recipient));
  await service.teacherAction(room.code,room.teacherKey,{action:'start'});
  const p=lesson.puzzles[0],draft={values:[1,2,3,4].map(n=>p.items.find(i=>i.answer===String(n)).id)};
  const saved=await service.event(room.code,keys[0],{type:'draft',stage:0,draft,draftVersion:state.state.draftVersion});
  const result=await service.event(room.code,keys[0],{type:'submit',stage:0,draftVersion:saved.state.draftVersion,attemptId:randomUUID()});
  assert.equal(result.outcome,'correct');assert.equal(result.state.stage,1);
  for(let i=0;i<4;i++){
   const again=await service.state(room.code,keys[i]);
   assert.deepEqual(again.state.casting,{actors,recipient});assert.equal(again.me.characterId,actors[i]);
  }
  // Retrying the original admission after progress cannot change the shared recipient.
  await service.join(room.code,keys[0],{name:'학생0',team:1,role:1,characterId:lead,recipientId:recipient==='seoa'?'doyun':'seoa'});
  assert.equal((await service.state(room.code,keys[0])).state.casting.recipient,recipient);
 }
});
test('simultaneous role choices merge without losing another role and stay within their team',async()=>{
 const room=await service.create({lesson}),keys=Array.from({length:4},token),actors=['harin','soyeon','jian','naeun'];
 await Promise.all(actors.map((characterId,i)=>service.join(room.code,keys[i],{name:'학생'+i,team:1,role:i+1,characterId,recipientId:'doyun'})));
 const view=await service.state(room.code,keys[0]);assert.deepEqual(view.state.casting,{actors,recipient:'doyun'});
 const other=await service.join(room.code,token(),{name:'다른 모둠',team:2,role:1,characterId:'yunjae',recipientId:'seoa'});
 assert.equal(other.state.casting.recipient,'seoa');assert.equal((await service.state(room.code,keys[0])).state.casting.recipient,'doyun');
 for(const input of [{characterId:'doyun'},{characterId:'seoa'},{characterId:'soyeon'},{characterId:'harin',recipientId:'unknown'}])
  await assert.rejects(service.join(room.code,token(),{name:'잘못된 자리',team:3,role:1,...input}),e=>e.status===400);
});
test('old saved classrooms keep their original cast and state when read after this update',async()=>{
 const room=await service.create({lesson}),key=token();await service.join(room.code,key,{name:'기존 학생',team:1,role:1});
 await pg.query("UPDATE first_love_teams SET state=state-'casting' WHERE session_id=(SELECT id FROM first_love_sessions WHERE code=$1)",[room.code]);
 const [beforeRow]=(await pg.query('SELECT state,revision FROM first_love_teams WHERE session_id=(SELECT id FROM first_love_sessions WHERE code=$1)',[room.code])).rows;
 const view=await service.state(room.code,key);assert.equal(view.me.characterId,'yunjae');assert.equal(view.state.stage,0);
 const [afterRow]=(await pg.query('SELECT state,revision FROM first_love_teams WHERE session_id=(SELECT id FROM first_love_sessions WHERE code=$1)',[room.code])).rows;
 assert.deepEqual(afterRow,beforeRow);
});
test('changing subject devices preserves the full story and the reason for the first puzzle',async()=>{
 const story=await import('../public/labs/first-love/escape-story.mjs');
 const {lessonStages}=await import('../public/labs/first-love/escape-content.mjs');
 const {castingPickerHTML}=await import('../public/labs/first-love/casting-ui.mjs');
 const stages=lessonStages(lesson),changed=stages.map((s,i)=>({...s,type:i%2?'circuit':'dials',object:'교체한 학습 장치'}));
 const adapted=story.adaptDevices(changed);
 for(const section of ['OPENING','BEFORE','AFTER']){
  const original=section==='OPENING'?[story[section]]:Object.values(story[section]);
  const replacement=section==='OPENING'?[adapted[section]]:Object.values(adapted[section]);
  assert.deepEqual(replacement.map(l=>l.length),original.map(l=>l.length));
  for(let i=0;i<original.length;i++)assert.deepEqual(replacement[i].map(l=>l[0]),original[i].map(l=>l[0]));
 }
 assert.ok(story.OPENING.length>=20);assert.match(story.OPENING.map(x=>x[1]).join(' '),/자동으로 잠긴/);
 assert.ok(!story.OPENING.some(x=>x[1].includes('지우개')));
 for(const lead of ['yunjae','harin'])for(const recipient of ['seoa','doyun']){
  const html=castingPickerHTML({casting:{actors:[lead,'soyeon','jian','naeun'],recipient},panel:'recipient'});
  assert.match(html,/네 명의 퍼즐 모둠원에 포함되지/);assert.match(html,/data-value="doyun"/);assert.match(html,/data-value="seoa"/);
 }
});
