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
  assert.equal((before.match(/data-action="discover"/g)||[]).length,1);
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
