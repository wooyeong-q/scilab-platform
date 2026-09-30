const {test}=require('node:test');
const assert=require('node:assert/strict');
const corePath='../public/labs/matter-zoom/core.mjs';

test('matter zoom v2: a class-level save cannot inherit a legacy or other-level lesson',async()=>{
 const {fresh,restore}=await import(corePath);
 const completed={...fresh('middle'),chapter:6,unlocked:6,visited:['water','hydrogen','gold'],records:['final']};
 assert.equal(fresh().version,2);
 assert.equal(fresh('high').mode,'high');
 assert.deepEqual(restore(JSON.stringify({...completed,version:1}),'middle'),fresh('middle'));
 assert.deepEqual(restore(JSON.stringify(completed),'high'),fresh('high'));
 assert.deepEqual(restore(JSON.stringify({...completed,mode:undefined}),'middle'),fresh('middle'));
 assert.equal(restore(JSON.stringify(completed),'middle').chapter,6);
});

test('matter zoom v2: predictions and evidence reject arbitrary persisted content',async()=>{
 const {fresh,restore}=await import(corePath);
 const hostile={...fresh('high'),
  conceptAnswers:{water:{atoms:'3',types:'2',extra:'1'},hydrogen:{atoms:[2],types:'1'},gold:{atoms:'1',types:'1'}},
  shellPrediction:'<img onerror=alert(1)>',shellPredictionChecked:true,
  familyAnswer:'<script>',isotopeAnswer:'same-element',massAnswer:'19',
  evidence:{identity:'proton_count',neutral:'<svg>',shells:'inner-first',final:'p-and-e',extra:'token'},
  mission:{element:'<svg>',number:'9',shells:'2,7',mass:'19'},highViewed:true,
  visited:['gold','gold','<script>'],seen:['8:p','9:e','79:n'],records:['water','<script>']};
 const result=restore(JSON.stringify(hostile),'high');
 assert.deepEqual(result.conceptAnswers,{water:{atoms:'3',types:'2'},hydrogen:{types:'1'}});
 assert.equal(result.shellPrediction,'');assert.equal(result.shellPredictionChecked,false);
 assert.equal(result.familyAnswer,'');assert.equal(result.massAnswer,'19');
 assert.deepEqual(result.evidence,{identity:'proton_count',shells:'inner-first',final:'p-and-e'});
 assert.equal(result.mission.element,undefined);assert.equal(result.mission.mass,'19');
 assert.deepEqual(result.visited,['gold']);assert.deepEqual(result.seen,['8:p','79:n']);assert.deepEqual(result.records,['water']);
 assert.equal(result.highViewed,true);
});

test('matter zoom v2: valid predictions resume and mission completion must be earned',async()=>{
 const {fresh,restore}=await import(corePath);
 const raw={...fresh(),missionIndex:2500,done:true,mission:{},shellPrediction:'2,10',shellPredictionChecked:true};
 const result=restore(JSON.stringify(raw));
 assert.equal(result.missionIndex,1000);assert.equal(result.done,false);
 assert.equal(result.shellPrediction,'2,10');assert.equal(result.shellPredictionChecked,false);
 const validPrediction={...fresh(),shellPrediction:'2,8,2',shellPredictionChecked:true,evidence:{shells:'second-shell'}};
 assert.equal(restore(JSON.stringify(validPrediction)).shellPredictionChecked,true);
 assert.equal(restore(JSON.stringify({...validPrediction,evidence:{shells:'outer-shell'}})).shellPredictionChecked,false);
 assert.equal(restore(JSON.stringify({...validPrediction,shellPredictionChecked:false})).shellPredictionChecked,false);
 assert.equal(restore(JSON.stringify({...raw,missionIndex:-3})).missionIndex,0);
 assert.deepEqual(restore('null'),fresh());assert.deepEqual(restore('{broken'),fresh());
});

test('matter zoom v2: restoring completion checks ion answers, evidence and any offered mass answer',async()=>{
 const {fresh,restore}=await import(corePath);
 const {missionFor}=await import('../public/labs/matter-zoom/levels.mjs');
 const selected=missionFor('middle',2);
 const answers={neutral:'no',number:String(selected.z),element:String(selected.z),shells:selected.shells.join(',')};
 const middle={...fresh(),missionIndex:2,mission:answers,done:true,evidence:{final:'protons'}};
 assert.equal(restore(JSON.stringify(middle)).done,true);
 assert.equal(restore(JSON.stringify({...middle,mission:{...answers,neutral:'yes'}})).done,false);
 assert.equal(restore(JSON.stringify({...middle,evidence:{final:'electrons'}})).done,false);
 assert.equal(restore(JSON.stringify({...middle,evidence:{}})).done,false);
 const advanced=missionFor('high',1);
 const high={...fresh('high'),missionIndex:1,done:true,evidence:{final:'protons'},mission:{neutral:'yes',number:String(advanced.z),element:String(advanced.z),shells:advanced.shells.join(',')}};
 assert.equal(restore(JSON.stringify(high),'high').done,true);
 high.mission.mass=String(advanced.p+advanced.n);
 assert.equal(restore(JSON.stringify(high),'high').done,true);
 high.mission.mass=String(advanced.n);
 assert.equal(restore(JSON.stringify(high),'high').done,false);
});
