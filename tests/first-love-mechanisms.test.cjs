const {test}=require('node:test');
const assert=require('node:assert/strict');
const modules=Promise.all([
 import('../public/labs/first-love/cooperative-sample.mjs'),
 import('../public/labs/first-love/engine.mjs'),
 import('../public/labs/first-love/mechanism-ui.mjs'),
 import('../public/labs/first-love/content.mjs')
]);
test('undiscovered records are absent from the DOM; discovery never exposes another role',async()=>{
 const [{COOPERATIVE_SAMPLE:s},e,m,{STAGES}]=await modules;
 for(let n=0;n<8;n++)for(let role=1;role<=4;role++){
  const p=e.playerContent(s,[role],e.previewState(n)).puzzle;
  const options={stage:STAGES[n],role,busy:false,dirty:false};
  const view={note:0,page:0,discovered:[]};
  const before=m.mechanismHTML(p,{},'',view,options);
  assert.ok(!before.includes(p.clues[0].text));
  assert.equal((before.match(/data-action="discover"/g)||[]).length,0);
  assert.ok(before.includes('data-action="search-clues"'));
  for(const item of p.items)assert.ok(before.includes(item.label));
  view.discovered=[m.discoveryKey(p.id,role),m.discoveryKey(p.id,role%4+1)];
  assert.deepEqual(m.discoveryNotes(p,view).map(x=>x.role),[role]);
  assert.ok(m.mechanismHTML(p,{},'',view,options).includes(p.clues[0].text));
 }
});
test('every scene accepts all three subject-independent draft formats and keeps placed props visible',async()=>{
 const [{COOPERATIVE_SAMPLE:s},e,m,{STAGES}]=await modules;
 for(const stage of STAGES.slice(0,8))for(const type of ['choose','order','classify']){
  const original=s.puzzles.find(p=>p.type===type);
  const source={...original,...stage,type};
  const l={...s,puzzles:s.puzzles.map(p=>p.id===stage.id?source:p)};
  const n=STAGES.indexOf(stage),p=e.playerContent(l,[1,2,3,4],e.previewState(n)).puzzle;
  const raw=type==='choose'?{picked:'A'}:type==='order'?{order:['A','B','C','D']}:{A:'T1',B:'T1',C:'T1',D:'T1'};
  const draft=e.normalizeDraft(n,source,raw);
  const html=m.mechanismHTML(p,draft,'',{discovered:[]},{stage});
  assert.equal((html.match(/data-piece=/g)||[]).length,p.items.length);
  assert.equal((html.match(/data-action="place"/g)||[]).length,type==='choose'?0:type==='order'?4:p.targets.length);
  assert.doesNotMatch(html,/data-action="candidate"|data-action="reason"/);
  assert.ok(html.includes(m.mechanismFor(stage.id).verb));
  assert.ok(e.complete(n,source,draft,s.devices));
 }
});
test('missing-role discoveries and resumable UI retain the exact clue pages',async()=>{
 const [{COOPERATIVE_SAMPLE:s},e,m]=await modules;
 const {restoreStoryUI}=await import('../public/labs/first-love/narrative.mjs');
 const p=e.playerContent(s,[1,3,4],e.previewState(2)).puzzle;
 const ui=restoreStoryUI({discoveredProps:[m.discoveryKey('P3',1),m.discoveryKey('P3',3)],revealStage:1},5);
 assert.equal(ui.revealStage,1);
 assert.deepEqual(m.discoveryNotes(p,{discovered:ui.discoveredProps}).map(x=>x.role),[1,3]);
 for(const note of m.discoveryNotes(p,{discovered:ui.discoveredProps}))assert.equal(note.pages.join(''),p.clues.find(c=>c.role===note.role).text);
});
test('scene discovery persists without changing answers and rejects other seats',async()=>{
 const [{COOPERATIVE_SAMPLE:l},e,m,{STAGES}]=await modules;
 const {clueSource,clueRecords,clueRecordHTML}=await import('../public/labs/first-love/scene-clues.mjs');
 const {EXPLORE,MAIN_SPOTS}=await import('../public/labs/first-love/exploration.mjs');
 for(let stage=0;stage<8;stage++){
  let s=e.previewState(stage);s.draft={picked:'A'};s.draftVersion=7;
  const ids=[];
  for(let role=1;role<=4;role++){
   const source=clueSource(STAGES[stage].id,role);ids.push(source.id);
   assert.deepEqual(EXPLORE[STAGES[stage].room].find(o=>o.id===source.id),source);
   const [x,y]=MAIN_SPOTS[STAGES[stage].room];assert.ok(Math.hypot(source.x-x,source.y-y)>=8);
   assert.throws(()=>e.transition(s,{type:'discover-clue',stage,role},l,[role%4+1]),/담당/);
   const next=e.transition(s,{type:'discover-clue',stage,role},l,[role]).state;
   assert.deepEqual(next.draft,s.draft);assert.equal(next.draftVersion,7);assert.equal(next.wrong,0);
   assert.deepEqual(e.transition(next,{type:'discover-clue',stage,role},l,[role]).state,next);s=next;
  }
  assert.equal(new Set(ids).size,4);assert.equal(s.discoveries.length,4);
  const c=e.playerContent(l,[2],s),records=clueRecords(c,s,s.discoveries);
  assert.equal(records.length,1);assert.equal(records[0].role,2);assert.equal(records[0].status,'발견');
  assert.match(clueRecordHTML(records,0),/쓸 곳/);
  s.stage++;const past=e.playerContent(l,[2],s);assert.ok(past.archive.every(p=>p.clues.every(c=>c.role===2&&!('rule' in c))));
  assert.equal(clueRecords(past,s,s.discoveries)[0].status,'사용 완료');
 }
 const s=e.fresh(),c=e.playerContent(l,[1],s),records=clueRecords(c,s,[]);
 assert.equal(records[0].status,'미발견');assert.ok(!clueRecordHTML(records,0).includes(c.puzzle.clues[0].text));
 assert.throws(()=>e.transition(s,{type:'discover-clue',stage:1,role:1},l),/다음 단계/);
});
