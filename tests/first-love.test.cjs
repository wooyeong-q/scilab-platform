const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomBytes,randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
let pg,service,SAMPLE,c,e,importWorkbook;
const token=()=>randomBytes(32).toString('hex');
before(async()=>{
 c=await import('../public/labs/first-love/content.mjs');e=await import('../public/labs/first-love/engine.mjs');({SAMPLE}=await import('../public/labs/first-love/sample.mjs'));({importWorkbook}=await import('../lib/first-love/import.mjs'));
 pg=await PGlite.create();await pg.exec(fs.readFileSync('scripts/schema.sql','utf8'));
 const {createService}=await import('../lib/first-love/service.mjs');service=createService(async(sql,params)=>(await pg.query(sql,params)).rows);
});
after(async()=>pg.close());
function solution(stage,lesson=SAMPLE){
 if(stage===9){const d=lesson.devices;return {turns:d.turns,start:d.start,moves:d.route,drawer:c.finalAnswer(d).drawer};}
 const p=lesson.puzzles[stage];
 if(['order','select-order'].includes(p.type))return {order:p.items.filter(i=>i.answer!=='제외').sort((a,b)=>Number(a.answer)-Number(b.answer)).map(i=>i.id)};
 return Object.fromEntries(p.items.map(i=>[i.id,p.type==='route-match'?{via:i.via,to:i.answer}:p.type==='deduce'?{choice:i.answer,reason:[1,2,3,4].find(n=>!i.passes.includes(n))||0}:i.answer]));
}
async function classroom(count=4,lesson=SAMPLE){const room=await service.create({lesson}),keys=Array.from({length:count},token);for(let i=0;i<count;i++)await service.join(room.code,keys[i],{name:'학생'+(i+1),team:1,role:i+1});await service.teacherAction(room.code,room.teacherKey,{action:'start'});return {...room,keys};}
async function draft(room,value,key=room.keys[0]){const v=await service.state(room.code,key);return service.event(room.code,key,{type:'draft',stage:v.state.stage,draftVersion:v.state.draftVersion,draft:value,contentKey:v.contentKey});}
async function submit(room,key=room.keys[0],attemptId=randomUUID()){const v=await service.state(room.code,key);return service.event(room.code,key,{type:'submit',stage:v.state.stage,draftVersion:v.state.draftVersion,attemptId});}
async function stats(room){return (await service.getTeacher(room.code,room.teacherKey)).teams[0];}

test('six-sheet XLSX round trip, compatibility rejection and meaningful validation',async()=>{
 assert.deepEqual(c.fromSheets(c.toSheets(SAMPLE)),SAMPLE);
 const imported=await importWorkbook(fs.readFileSync('public/labs/first-love/first-love-template.xlsx'),'template.xlsx');assert.deepEqual(imported.lesson,SAMPLE);assert.deepEqual(imported.warnings,[]);
 await assert.rejects(importWorkbook(fs.readFileSync('tests/fixtures/common-escape-filled.xlsx'),'old.xlsx'),/TODAY-TO-YOU/);
 await assert.rejects(importWorkbook(new Uint8Array(3*1024*1024+1),'big.xlsx'),/3MB/);
 await assert.rejects(importWorkbook(new Uint8Array([1,2,3]),'bad.xlsx'),/엑셀을 읽지/);
 for(const change of [l=>l.puzzles[0].items[0].owner=2,l=>l.puzzles[3].items[0].answer='F1',l=>l.puzzles[5].items.find(i=>i.answer!=='제외').answer='제외',l=>l.puzzles[7].items[4].passes=[1,2],l=>l.devices.route=['up','up','up','up'],l=>l.endings.neutralMax=10]){
  const l=structuredClone(SAMPLE);change(l);assert.throws(()=>c.validateLesson(l));
 }
 const swapped=structuredClone(SAMPLE);[swapped.puzzles[0].items[0].answer,swapped.puzzles[0].items[1].answer]=[swapped.puzzles[0].items[1].answer,swapped.puzzles[0].items[0].answer];c.validateLesson(swapped);
 assert.equal(e.correct(0,swapped.puzzles[0],solution(0),swapped.devices),false);
 assert.equal(e.correct(0,swapped.puzzles[0],solution(0,swapped),swapped.devices),true);
});

test('P8 needs each of four conditions; P10 requires distinct prior clues and one valid prescribed solution',()=>{
 const p=SAMPLE.puzzles[7];assert.equal(p.items.filter(i=>i.passes.length===4).length,1);
 for(let role=1;role<=4;role++)assert.ok(p.items.filter(i=>[1,2,3,4].filter(n=>n!==role).every(n=>i.passes.includes(n))).length>=2);
 const d=SAMPLE.devices,a=c.finalAnswer(d);assert.equal(a.drawer,'H');
 const allTurns=[0,1,2,3].map(t=>c.walk(c.rotated(d.grid,t),d.start,d.route));assert.equal(new Set(allTurns.filter(Boolean).map(w=>w.symbol)).size,4);
 const allStarts=d.grid.map(s=>c.walk(c.rotated(d.grid,d.turns),s,d.route)).filter(Boolean);assert.ok(allStarts.length>1);assert.ok(new Set(allStarts.map(w=>w.symbol)).size>1);
 const alt=solution(9);alt.moves=['up','right','down','left','down','right'];assert.ok(e.complete(9,null,alt,d));assert.equal(e.correct(9,null,alt,d),false);
 assert.equal(e.correct(9,null,{...solution(9),drawer:'I'},d),false);
 assert.equal(e.correct(9,null,solution(9),d),true);
});

test('one to four players can finish all ten stages; private clues, frozen endings and reconnect',async()=>{
 for(let count=1;count<=4;count++){
  const room=await classroom(count);
  for(let stage=0;stage<10;stage++){
   const v=await service.state(room.code,room.keys[0]);assert.equal(v.state.stage,stage);assert.equal(v.state.wrong,undefined);assert.equal(v.state.ending,null);
   assert.deepEqual(v.allowedRoles,[1,...[2,3,4].filter(r=>r>count)]);
   if(v.content.puzzle){assert.ok(v.content.puzzle.clues.every(x=>v.allowedRoles.includes(x.role)));for(const i of v.content.puzzle.items){assert.equal(i.answer,undefined);assert.equal(i.passes,undefined);assert.equal(i.original,undefined);if(i.owner&&!v.allowedRoles.includes(i.owner)){assert.equal(i.text,undefined);assert.equal(i.hidden,true);}}}
   if(stage===8){for(const [n,id]of ['desk','cubby','file'].entries())await service.event(room.code,room.keys[n]||room.keys[0],{type:'photo',stage:8,id});}
   else{await draft(room,solution(stage));assert.equal((await submit(room)).outcome,'correct');}
  }
  const final=await service.event(room.code,room.keys[0],{type:'confess',stage:10});assert.equal(final.state.ending,'smile');assert.equal(final.state.finished,true);
  assert.equal((await stats(room)).wrong,0);assert.equal((await service.state(room.code,room.keys[0])).state.ending,'smile');
  assert.deepEqual((await service.event(room.code,room.keys[0],{type:'confess',stage:10})).state,final.state);
 }
});

test('only complete wrong submissions count; retries, unchanged answers and simultaneous clicks count once',async()=>{
 const room=await classroom();
 assert.equal((await submit(room)).outcome,'incomplete');await service.event(room.code,room.keys[0],{type:'hint',stage:0});assert.equal((await stats(room)).wrong,0);
 await draft(room,{order:['A','B','C','D']});const v=await service.state(room.code,room.keys[0]),attempt={type:'submit',stage:0,draftVersion:v.state.draftVersion,attemptId:randomUUID()};
 const clicks=await Promise.all(room.keys.map(k=>service.event(room.code,k,attempt)));assert.ok(clicks.every(x=>x.outcome==='wrong'));assert.equal((await stats(room)).wrong,1);
 await submit(room);assert.equal((await stats(room)).wrong,1);
 await assert.rejects(service.event(room.code,room.keys[0],{...attempt,draftVersion:-1,attemptId:randomUUID()}),err=>err.status===409);assert.equal((await stats(room)).wrong,1);
 const good=await draft(room,solution(0)),correctAttempt={type:'submit',stage:0,draftVersion:good.state.draftVersion,attemptId:randomUUID()};
 const done=await Promise.all(room.keys.map(k=>service.event(room.code,k,correctAttempt)));assert.ok(done.every(x=>x.state.stage===1));assert.equal((await stats(room)).wrong,1);
 const replay=await service.event(room.code,room.keys[1],attempt);assert.equal(replay.duplicate,true);assert.equal(replay.state.stage,1);assert.equal((await stats(room)).wrong,1);
 await assert.rejects(service.event(room.code,room.keys[0],undefined),err=>err.status===400);
});

test('ending boundaries 10 / 29 / 30, teacher changes and ending freeze',()=>{
 for(const [wrong,ending]of [[0,'smile'],[10,'smile'],[11,'surprise'],[20,'surprise'],[29,'surprise'],[30,'disgust'],[100,'disgust']]){
  let state={...e.previewState(9),wrong,draft:solution(9)};state=e.transition(state,{type:'submit',stage:9,draftVersion:state.draftVersion,attemptId:randomUUID()},SAMPLE).state;assert.equal(state.ending,ending);
  const changed=structuredClone(SAMPLE);changed.endings={positiveMax:0,neutralMax:1};assert.equal(e.transition(state,{type:'confess',stage:10},changed).state.ending,ending);
 }
 assert.equal(e.branch(2,{positiveMax:1,neutralMax:2}),'surprise');assert.equal(e.branch(3,{positiveMax:1,neutralMax:2}),'disgust');
});

test('small update payloads, seat ownership, stale writes, session isolation and class controls',async()=>{
 const room=await classroom(1),k=room.keys[0];let v=await service.state(room.code,k);
 assert.equal(await service.state(room.code,k,v.group.revision,v.contentKey),null);
 const update=await service.event(room.code,k,{type:'hint',stage:0,contentKey:v.contentKey});assert.equal(update.content,undefined);assert.ok(JSON.stringify(update).length<2400);
 const newKey=token();await service.join(room.code,newKey,{name:'둘째',team:1,role:2});v=await service.state(room.code,k,update.group.revision,v.contentKey);assert.deepEqual(v.allowedRoles,[1,3,4]);assert.ok(v.content);
 await assert.rejects(service.join(room.code,token(),{name:'중복',team:1,role:2}),err=>err.status===409);
 await draft(room,solution(0));await assert.rejects(service.event(room.code,newKey,{type:'draft',stage:0,draftVersion:0,draft:{}}),err=>err.status===409);
 const second=await classroom(1);await assert.rejects(service.state(second.code,k),err=>err.status===401);
 assert.equal((await service.state(second.code,second.keys[0])).state.stage,0);
 await service.leave(room.code,newKey);assert.deepEqual((await service.state(room.code,k)).allowedRoles,[1,2,3,4]);
 await service.teacherAction(room.code,room.teacherKey,{action:'end'});assert.equal((await service.state(room.code,k)).group.status,'ended');
 await assert.rejects(service.event(room.code,k,{type:'hint',stage:0}),err=>err.status===409);
 await assert.rejects(service.getTeacher(room.code,token()),err=>err.status===403);
});

test('30 clients across eight teams: concurrent joins, polling and independent answers',async t=>{
 const started=performance.now(),room=await service.create({lesson:SAMPLE}),players=Array.from({length:30},(_,i)=>({key:token(),team:Math.floor(i/4)+1,role:i%4+1}));
 const joins=await Promise.all(players.map(p=>service.join(room.code,p.key,{name:'동시접속'+p.team+'-'+p.role,team:p.team,role:p.role})));assert.equal(joins.length,30);
 await service.teacherAction(room.code,room.teacherKey,{action:'start'});
 const states=await Promise.all(players.map(p=>service.state(room.code,p.key)));assert.ok(states.every(v=>v.group.status==='playing'));
 const leaders=players.filter(p=>p.role===1);
 await Promise.all(leaders.map(async p=>{const r={...room,keys:[p.key]};await draft(r,p.team===1?{order:['A','B','C','D']}:solution(0));return submit(r);}));
 const view=await service.getTeacher(room.code,room.teacherKey);assert.equal(view.teams.length,8);assert.equal(view.teams[0].wrong,1);assert.equal(view.teams[0].stage,0);assert.ok(view.teams.slice(1).every(t=>t.wrong===0&&t.stage===1));
 const fresh=await Promise.all(players.map(p=>service.state(room.code,p.key)));const unchanged=await Promise.all(players.map((p,i)=>service.state(room.code,p.key,fresh[i].group.revision,fresh[i].contentKey)));assert.ok(unchanged.every(v=>v===null));
 t.diagnostic(`30 logical clients on in-memory PostgreSQL/PGlite: ${Math.round(performance.now()-started)} ms; not a production load guarantee.`);
});

test('placed answers display visible content without revealing another player’s private card',async()=>{
 const {puzzleHTML,interactionGuide,progress}=await import('../public/labs/first-love/puzzle-ui.mjs');
 const lesson=structuredClone(SAMPLE);lesson.puzzles[0].items[1].text='PRIVATE-OTHER-PLAYER';
 const state=e.fresh(),visible=e.playerContent(lesson,[1],state),answer={order:['B','A','','']};
 const html=puzzleHTML(visible.puzzle,answer,'',visible);
 assert.doesNotMatch(html,/PRIVATE-OTHER-PLAYER/);
 assert.match(html,/2번 친구의 자료/);assert.match(html,/−2/);assert.match(html,/배치 취소/);
 assert.deepEqual(progress(visible.puzzle,answer,visible),{count:2,total:4,label:'카드 배치'});
 const all=e.playerContent(lesson,[1,2,3,4],state),full={order:['A','B','C','D']};
 assert.match(puzzleHTML(all.puzzle,full,'',all),/PRIVATE-OTHER-PLAYER/);
 assert.match(interactionGuide(all.puzzle,full,'',all),/아직 제출 전/);
 assert.doesNotMatch(interactionGuide(all.puzzle,full,'',all,true),/아직 제출 전/);
});

test('existing lesson templates migrate only the two relocated corridor scenes',()=>{
 const old=structuredClone(SAMPLE);old.puzzles[4].room='club';old.puzzles[7].room='club';
 assert.deepEqual(c.validateLesson(old),SAMPLE);
 old.puzzles[0].room='club';assert.throws(()=>c.validateLesson(old),/장소/);
});
