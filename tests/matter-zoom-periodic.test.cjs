const {test}=require('node:test');
const assert=require('node:assert/strict');

test('periodic rows, columns and feature scenes cover every element from 1 to 20',async()=>{
 const {ELEMENTS}=await import('../public/labs/matter-zoom/data.mjs');
 const {ELEMENT_FEATURES,sourceFor}=await import('../public/labs/matter-zoom/element-features.mjs');
 const {periodicMembers,periodicExplorer}=await import('../public/labs/matter-zoom/periodic-view.mjs');
 assert.deepEqual(Object.keys(ELEMENT_FEATURES).map(Number),Array.from({length:20},(_,i)=>i+1));
 assert.deepEqual(periodicMembers('group',3).map(e=>e.symbol),['H','Li','Na','K']);
 assert.deepEqual(periodicMembers('group',2).map(e=>e.symbol),['He','Ne','Ar']);
 assert.deepEqual(periodicMembers('period',8).map(e=>e.z),[3,4,5,6,7,8,9,10]);
 assert.deepEqual(periodicMembers('period',19).map(e=>e.z),[19,20]);
 for(const e of ELEMENTS){
  const f=ELEMENT_FEATURES[e.z],html=periodicExplorer({z:e.z,observedZ:e.z});
  assert.match(sourceFor(e.z),new RegExp('https://periodic-table.rsc.org/element/'+e.z+'/'));
  assert.ok(f.title&&f.text&&f.alt&&f.scene);
  assert.match(html,new RegExp('data-element="'+e.z+'"'));
  assert.equal((html.match(/class="element-cell /g)||[]).length,20);
  assert.doesNotMatch(html,/undefined|NaN|전자\s*배치|껍질/);
 }
});

test('periodic explanations preserve hydrogen exception, compound distinctions and incomplete fourth row',async()=>{
 const {ELEMENT_FEATURES,GROUP_NOTES}=await import('../public/labs/matter-zoom/element-features.mjs');
 const {periodicExplorer}=await import('../public/labs/matter-zoom/periodic-view.mjs');
 assert.match(GROUP_NOTES[1],/H.*비금속/);
 assert.match(GROUP_NOTES[18],/잘 하지 않는/);
 for(const z of [5,20])assert.equal(ELEMENT_FEATURES[z].category,'화합물의 쓰임');
 assert.match(ELEMENT_FEATURES[15].text,/성냥갑 옆면/);
 assert.match(ELEMENT_FEATURES[8].text,/산소 자체가 연료처럼 타는 것은 아니/);
 assert.match(periodicExplorer({z:19,observedZ:26,axis:'period'}),/4주기에는 더 많은 원소/);
 assert.match(periodicExplorer({z:1,observedZ:79}),/79번은.*범위 밖/);
});

test('table direction survives reload and old or malformed records receive a safe default',async()=>{
 const {freshExplorer,restoreExplorer}=await import('../public/labs/matter-zoom/exploration.mjs');
 for(const mode of ['middle','high'])for(const tableAxis of ['group','period']){
  const saved={...freshExplorer(mode),material:'helium',z:2,level:4,drawer:'number',numberZ:19,tableAxis,records:['groups','periods','elementFeatures']};
  const restored=restoreExplorer(JSON.stringify(saved),mode);
  assert.equal(restored.tableAxis,tableAxis);assert.equal(restored.numberZ,19);
  assert.deepEqual(restored.records,saved.records);
 }
 for(const tableAxis of [undefined,'shells','<img>',null])assert.equal(restoreExplorer(JSON.stringify({...freshExplorer(),tableAxis})).tableAxis,'group');
});


test('room-temperature states distinguish substances, elements, and heated samples',async()=>{
 const {ELEMENT_FEATURES,ROOM_STATES}=await import('../public/labs/matter-zoom/element-features.mjs');
 const {MATERIALS}=await import('../public/labs/matter-zoom/data.mjs');
 const {periodicExplorer}=await import('../public/labs/matter-zoom/periodic-view.mjs');
 assert.deepEqual(Object.keys(ELEMENT_FEATURES).map(Number).filter(z=>ELEMENT_FEATURES[z].state==='기체'),[1,2,7,8,9,10,17,18]);
 assert.equal(Object.values(ELEMENT_FEATURES).filter(f=>f.state==='고체').length,12);
 assert.equal(Object.values(ELEMENT_FEATURES).filter(f=>f.state==='액체').length,0);
 assert.equal(MATERIALS.water.roomState,'액체');assert.equal(MATERIALS.gold.roomState,'고체');
 for(const material of Object.values(MATERIALS))assert.ok(ROOM_STATES[material.roomState]);
 assert.equal(ELEMENT_FEATURES[16].state,'고체');
 assert.match(periodicExplorer({z:16,observedZ:8}),/황은 상온에서는 고체이며.*가열/);
 assert.match(periodicExplorer({z:17,observedZ:8}),/기체인 염소와 소독제 용액의 상태는 구별/);
});
