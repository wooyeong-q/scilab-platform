const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomBytes,randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
let c,e,q,sample,legacy,importWorkbook,pg,service;
before(async()=>{
 c=await import('../public/labs/first-love/content.mjs');e=await import('../public/labs/first-love/engine.mjs');q=await import('../public/labs/first-love/cooperative.mjs');
 ({COOPERATIVE_SAMPLE:sample}=await import('../public/labs/first-love/cooperative-sample.mjs'));({SAMPLE:legacy}=await import('../public/labs/first-love/sample.mjs'));({importWorkbook}=await import('../lib/first-love/import.mjs'));
 pg=await PGlite.create();await pg.exec(fs.readFileSync('scripts/schema.sql','utf8'));const {createService}=await import('../lib/first-love/service.mjs');service=createService(async(sql,params)=>(await pg.query(sql,params)).rows);
});
after(async()=>pg.close());
const answer=p=>p.type==='choose'?{picked:q.answerKey(p)}:p.type==='order'?{order:q.answerKey(p)}:q.answerKey(p);
test('v2 workbook imports exactly and every private clue changes the answer space',async()=>{
 assert.deepEqual(c.fromSheets(c.toSheets(sample)),sample);
 assert.deepEqual((await importWorkbook(fs.readFileSync('public/labs/first-love/first-love-template-v2.xlsx'),'new.xlsx')).lesson,sample);
 assert.equal(sample.puzzles.length,8);
 for(const p of sample.puzzles){const proof=q.cooperationProof(p);assert.deepEqual(proof.valid,[q.answerKey(p)]);assert.ok(proof.without.every(r=>r.count>=2));}
});
test('rejects redundant, inconsistent and malformed constraints and oversized student prose',()=>{
 const invalid=(change,rx)=>{const l=structuredClone(sample);change(l);assert.throws(()=>c.validateLesson(l),rx);};
 invalid(l=>l.puzzles[0].clues[0].rule='A=T1',/정답이 다릅니다/);
 invalid(l=>l.puzzles[0].clues[0].rule='A=T2;B=T1',/2번 단서 없이도/);
 invalid(l=>l.puzzles[0].clues[0].rule='A!=T3',/정답은 하나/);
 invalid(l=>l.puzzles[0].clues[0].rule='A=T1;A=T2',/현재 0개/);
 invalid(l=>l.puzzles[0].clues[0].rule='globalThis.secret()',/읽을 수 없습니다/);
 invalid(l=>l.puzzles[0].items[0].owner=1,/담당은 모두 0/);
 invalid(l=>l.puzzles[0].clues[0].text='가'.repeat(91),/90자/);
 invalid(l=>l.puzzles[0].task='가'.repeat(49),/48자/);
 invalid(l=>l.puzzles[0].clues={},/배열/);
});
test('grammar preserves OR/AND, adjacency and repeated classification destinations',()=>{
 const order=sample.puzzles.find(p=>p.type==='order');
 assert.equal(q.constraint(order,'A<B;C~D|A=4')(['A','B','C','D']),true);
 assert.equal(q.constraint(order,'A<B;C~D|A=4')(['C','A','D','B']),false);
 assert.equal(q.constraint(order,'A<B;C~D|A=4')(['C','D','B','A']),true);
 const p=sample.puzzles[0],d=answer(p);assert.equal(d.A,d.D);assert.equal(e.correct(0,p,e.normalizeDraft(0,p,d),sample.devices),true);
});
test('all roles see the same answer cards, only their own clues, and no grading fields',()=>{
 for(let n=0;n<8;n++){
  const views=[1,2,3,4].map(role=>e.playerContent(sample,[role],e.previewState(n)));
  for(let i=0;i<4;i++){assert.equal(views[i].puzzle.clues.length,1);assert.equal(views[i].puzzle.clues[0].role,i+1);assert.equal(views[i].puzzle.cooperative,true);assert.deepEqual(views[i].puzzle.items,views[0].puzzle.items);assert.ok(views[i].puzzle.items.every(x=>!x.hidden));assert.doesNotMatch(JSON.stringify(views[i]),/"(?:answer|rule|passes|original|explanation)":/);}
 }
});
test('cross-subject lessons use the same validator; renaming subjects cannot change grading',()=>{
 for(const subject of ['국어','수학','사회','역사','과학','영어','음악','미술','체육']){
  const l=structuredClone(sample);l.meta.subject=subject;const valid=c.validateLesson(l);
  for(let n=0;n<8;n++){const p=valid.puzzles[n],d=e.normalizeDraft(n,p,answer(p));assert.ok(e.complete(n,p,d,valid.devices));assert.ok(e.correct(n,p,d,valid.devices));}
 }
});
test('one to four players complete v2 over the service; missing-role clues, stale drafts and reconnect remain safe',async()=>{
 for(const count of [1,2,3,4]){
  const room=await service.create({lesson:sample}),keys=Array.from({length:count},()=>randomBytes(32).toString('hex'));
  for(let i=0;i<count;i++)await service.join(room.code,keys[i],{name:'검증'+(i+1),team:1,role:i+1});
  await service.teacherAction(room.code,room.teacherKey,{action:'start'});
  for(let n=0;n<8;n++){
   const state=await service.state(room.code,keys[0]);assert.equal(state.content.puzzle.clues.length,5-count);assert.doesNotMatch(JSON.stringify(state.content),/"rule":/);
   if(count===4)await assert.rejects(service.event(room.code,keys[0],{type:'discover-clue',stage:n,role:2}),/담당 모둠원/);
   await Promise.all([1,2,3,4].map(role=>service.event(room.code,keys[role-1]||keys[0],{type:'discover-clue',stage:n,role})));
   const found=await service.state(room.code,keys[0]);assert.equal(found.state.discoveries.length,(n+1)*4);assert.equal(found.state.draftVersion,state.state.draftVersion);
   await service.event(room.code,keys[0],{type:'discover-clue',stage:n,role:1});
   const resumed=await service.state(room.code,keys[0]);assert.deepEqual(resumed.state.discoveries,found.state.discoveries);
   const saved=await service.event(room.code,keys[0],{type:'draft',stage:n,draftVersion:state.state.draftVersion,draft:answer(sample.puzzles[n])});
   await assert.rejects(service.event(room.code,keys[0],{type:'draft',stage:n,draftVersion:state.state.draftVersion,draft:{}}),/새 답안/);
   const result=await service.event(room.code,keys[0],{type:'submit',stage:n,draftVersion:saved.state.draftVersion,attemptId:randomUUID()});assert.equal(result.outcome,'correct');
  }
  const ids=['desk','cubby','file','clock'];
  if(count===4)await assert.rejects(service.event(room.code,keys[0],{type:'photo',stage:8,id:'clock'}),/담당 모둠원/);
  for(let i=0;i<4;i++){const result=await service.event(room.code,keys[i]||keys[0],{type:'photo',stage:8,id:ids[i]});assert.equal(result.state.stage,i===3?9:8);}
  const state=await service.state(room.code,keys[0]);assert.equal(state.state.photos.length,4);
  const found=await service.event(room.code,keys[0],{type:'inspect-cabinet',stage:9});assert.ok(found.content.cabinet.found);
  const saved=await service.event(room.code,keys[0],{type:'draft',stage:9,draftVersion:state.state.draftVersion,draft:{sequence:c.finalAnswer(sample.devices).sequence}});
  const done=await service.event(room.code,keys[0],{type:'submit',stage:9,draftVersion:saved.state.draftVersion,attemptId:randomUUID()});assert.equal(done.state.stage,10);
  await service.event(room.code,keys[0],{type:'confess'});const resumed=await service.state(room.code,keys[0]);assert.equal(resumed.state.ending,'smile');assert.equal(resumed.state.finished,true);
 }
});
test('legacy candidate drafts and the simplified one-card answer both grade correctly',()=>{
 const p=legacy.puzzles[7],correct=p.items.find(i=>i.answer==='가능');
 assert.ok(e.correct(7,p,e.normalizeDraft(7,p,{picked:correct.id}),legacy.devices));
 assert.equal(e.complete(7,p,e.normalizeDraft(7,p,{picked:'unknown'}),legacy.devices),false);
 const full=Object.fromEntries(p.items.map(i=>[i.id,{choice:i.answer,reasons:[1,2,3,4].filter(n=>!i.passes.includes(n))}]));assert.ok(e.correct(7,p,e.normalizeDraft(7,p,full),legacy.devices));
 assert.equal(c.validateLesson(legacy).schema,'TODAY-TO-YOU-1');
});
test('paged details preserve every character of old material and keep hidden cards private',async()=>{
 const {textPages,clueDeck,boardHTML,overlayHTML}=await import('../public/labs/first-love/desk-ui.mjs');
 const text=('긴 자료의 문장입니다.\n').repeat(150);const pages=textPages(text,90);assert.equal(pages.join(''),text);assert.ok(pages.every(p=>[...p].length<=90));
 const p=e.playerContent(legacy,[1],e.fresh()).puzzle;assert.equal(clueDeck(p).length,1);assert.doesNotMatch(boardHTML(p,{},''),new RegExp(legacy.puzzles[0].items.find(i=>i.owner===2).text));
 assert.equal(overlayHTML(p,{overlay:{kind:'detail',id:p.items.find(i=>i.hidden).id}}),'');
 const p2=e.playerContent(sample,[2],e.previewState(1)).puzzle;const html=boardHTML(p2,{},'');assert.equal((html.match(/class="desk-card /g)||[]).length,6);assert.equal((html.match(/data-action="pick"/g)||[]).length,6);
});
