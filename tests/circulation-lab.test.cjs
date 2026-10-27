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
