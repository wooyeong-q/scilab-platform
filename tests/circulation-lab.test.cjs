const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=import('../public/labs/circulation-lab/model.mjs');
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('both textbook circuits connect through atrium → ventricle and form a closed cycle',async()=>{
 const {ROUTES,CYCLE,nextPart}=await model;
 assert.deepEqual(ROUTES.pulmonary.ids,['rv','pa','lung','pv','la']);
 assert.deepEqual(ROUTES.systemic.ids,['lv','ao','body','vc','ra']);
 assert.equal(nextPart('ra'),'rv');assert.equal(nextPart('la'),'lv');
 assert.equal(new Set(CYCLE).size,10);
});
test('100 generated mazes each have exactly one valid solution, including both starting places',async()=>{
 const {generateMaze,solveMaze,checkStep}=await model;
 for(let seed=1;seed<=100;seed++){
  const start=seed%2?'rv':'ao',{board,path}=generateMaze(start,seeded(seed));
  assert.equal(board.cells[0],start);assert.equal(board.cells[35],start);
  const solution=solveMaze(board);assert.equal(solution.limited,false);assert.equal(solution.count,1);assert.deepEqual(solution.path,path);
  let walked=[0];for(const cell of path.slice(1)){const r=checkStep(board,walked,cell);assert.equal(r.ok,true);walked=r.path;}
  assert.equal(walked.at(-1),35);
 }
});
test('manual path validation rejects diagonal, repeated, short and incomplete routes',async()=>{
 const {fillPath,createPath}=await model;
 assert.throws(()=>fillPath([0,7,14,21,28,35]));
 assert.throws(()=>fillPath([0,1,0,1,2,3,4,5,11,17,35]));
 assert.throws(()=>fillPath([0,1,2]));
 for(const n of [11,21,31]){const path=createPath(seeded(n),n);assert.equal(path.length,n);assert.equal(fillPath(path).cells[35],'rv');}
});
test('share links round-trip only the problem and validate the full puzzle',async()=>{
 const {generateMaze,encodeMaze,decodeMaze}=await model;
 const {board}=generateMaze('ao',seeded(420));const code=encodeMaze(board);
 assert.match(code,/^[A-Za-z0-9_-]+$/);assert.deepEqual(decodeMaze(code),board);
 const p=JSON.parse(atob(code.replace(/-/g,'+').replace(/_/g,'/')));assert.deepEqual(Object.keys(p).sort(),['c','n','s','v']);
 for(const input of ['', 'x'.repeat(1801),'<script>',btoa('{}'),btoa(JSON.stringify({...p,n:7})),btoa(JSON.stringify({...p,c:p.c.slice(1)})),btoa(JSON.stringify({...p,c:p.c.map(()=>0)})),btoa(JSON.stringify({...p,s:9.5}))])assert.throws(()=>decodeMaze(input));
});
test('solver detects ambiguity instead of authorizing an unsound shared maze',async()=>{
 const {generateMaze,solveMaze,decodeMaze,encodeMaze,neighbors,nextPart}=await model;
 let ambiguous=null;
 for(let seed=0;seed<100&&!ambiguous;seed++){
  const {board,path}=generateMaze('rv',seeded(seed));
  for(let k=0;k<path.length-1&&!ambiguous;k++){
   for(const cell of neighbors(path[k]))if(!path.includes(cell)){
    const b=structuredClone(board);b.cells[cell]=nextPart(b.cells[path[k]]);
    if(solveMaze(b).count>1)ambiguous=b;
   }
  }
 }
 assert.ok(ambiguous,'a genuinely ambiguous board was constructed');
 assert.equal(solveMaze(ambiguous).count,2);assert.throws(()=>decodeMaze(encodeMaze(ambiguous)));
});
test('wrong words can be selected freely; explicit evaluation finds errors and backtracking works',async()=>{
 const {generateMaze,checkStep,neighbors,assessPath}=await model;
 const {board,path}=generateMaze('rv',seeded(11));
 assert.equal(checkStep(board,[0],7).reason,'adjacent');
 const wrong=neighbors(0).find(i=>board.cells[i]!=='pa');
 if(wrong!==undefined){const r=checkStep(board,[0],wrong);assert.equal(r.ok,true);assert.equal(assessPath(board,r.path).errors.length,1);assert.equal(assessPath(board,r.path).complete,false);}
 assert.equal(assessPath(board,path).complete,true);
 assert.equal(assessPath(board,[0]).complete,false);
 assert.deepEqual(checkStep(board,path.slice(0,5),path[1]).path,path.slice(0,2));
});

test('editor supports a custom 13-cell path with a different finishing word',async()=>{
 const {fillPath,generateMaze,solveMaze,decodeMaze,encodeMaze}=await model;
 const path=[0,6,7,1,2,3,4,5,11,17,23,29,35];
 const {board}=generateMaze('rv',seeded(37),path);
 assert.equal(fillPath(path).cells[35],'lung');
 assert.deepEqual(solveMaze(board).path,path);
 assert.deepEqual(decodeMaze(encodeMaze(board)),board);
});
test('QR renderer encodes the complete shared URL with a four-module quiet zone',async()=>{
 const {qrMatrix,qrSvg}=await import('../public/labs/circulation-lab/qr.mjs');
 const {generateMaze,encodeMaze}=await model;
 const url='https://example.com/labs/circulation-lab/index.html#maze='+encodeMaze(generateMaze('rv',seeded(12)).board);
 const m=qrMatrix(url);assert.ok(m.length>21);assert.ok(m.every(row=>row.length===m.length));
 assert.match(qrSvg(url),new RegExp(`viewBox="0 0 ${m.length+8} ${m.length+8}"`));
 assert.throws(()=>qrMatrix('javascript:alert(1)'));
});

test('visual heart cycle changes receiving/ejection and both valve states',async()=>{
 const {labAction,labView}=await import('../public/labs/circulation-lab/experiments.mjs');
 labAction('lab-mode-heart');labAction('lab-receive');
 assert.match(labView(),/심실 이완 · 받기/);assert.match(labView(),/심방 ↔ 심실 판막<\/span><strong class="open">열림/);
 labAction('lab-pump');assert.match(labView(),/심실 수축 · 내보내기/);assert.match(labView(),/심실 ↔ 동맥 판막<\/span><strong class="open">열림/);
 labAction('lab-backflow');assert.match(labView(),/닫힌 판막이 거꾸로 흐르려는 혈액을 막았어요/);
});
test('tissue exchange distinguishes all four materials and their opposite directions',async()=>{
 const {exchangeSteps,labAction,labView}=await import('../public/labs/circulation-lab/experiments.mjs');
 assert.deepEqual(exchangeSteps[1].out,['산소','영양소']);assert.deepEqual(exchangeSteps[2].into,['이산화 탄소','노폐물']);
 labAction('lab-mode-exchange');labAction('lab-exchange-0');assert.doesNotMatch(labView(),/산소 <b>→ 세포/);
 labAction('lab-exchange-2');assert.match(labView(),/산소 <b>→ 세포/);assert.match(labView(),/노폐물 <b>→ 혈액/);
});
test('pulse comparison uses actual inputs and leaves unmeasured results empty',async()=>{
 const {pulseComparison,labAction,labChange,labView}=await import('../public/labs/circulation-lab/experiments.mjs');
 assert.equal(pulseComparison('',''),null);assert.equal(pulseComparison(80,120),40);assert.equal(pulseComparison(100,90),-10);
 labAction('lab-mode-pulse');labAction('lab-pulse-manual');labChange({id:'pulse-rest',value:'80'});labChange({id:'pulse-active',value:'120'});assert.match(labView(),/40회\/분 늘었어요/);
 labChange({id:'pulse-rest',value:'-5'});assert.match(labView(),/두 값을 입력/);
});

test('15-second wrist counts convert to per-minute values without a sensor',async()=>{
 const {labAction,labChange,labView}=await import('../public/labs/circulation-lab/experiments.mjs');
 labAction('lab-mode-pulse');labAction('lab-pulse-manual');
 labChange({id:'pulse-count-rest',value:'18'});labChange({id:'pulse-count-active',value:'30'});
 assert.match(labView(),/72회 \/ 분/);assert.match(labView(),/120회 \/ 분/);assert.match(labView(),/48회\/분 늘었어요/);
 labAction('lab-pulse-demo');assert.match(labView(),/모의 값/);assert.doesNotMatch(labView(),/측정 취소/);
});
