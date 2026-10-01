const {test}=require('node:test');
const assert=require('node:assert/strict');
const data=()=>import('../public/labs/matter-zoom/data.mjs');

test('seven materials distinguish molecules, separate atoms, and metal arrays',async()=>{
 const {MATERIALS,MOLECULE_LAYOUTS,atom}=await data();
 const expected={water:{kind:'molecule',atoms:[1,1,8]},hydrogen:{kind:'molecule',atoms:[1,1]},gold:{kind:'array',atoms:[79]},oxygen:{kind:'molecule',atoms:[8,8]},'carbon-dioxide':{kind:'molecule',atoms:[6,8,8]},helium:{kind:'atom',atoms:[2]},iron:{kind:'array',atoms:[26]}};
 assert.deepEqual(Object.keys(MATERIALS).sort(),Object.keys(expected).sort());
 for(const [id,e]of Object.entries(expected)){
  const m=MATERIALS[id];assert.equal(m.kind,e.kind);assert.deepEqual([...m.atoms].sort((a,b)=>a-b),e.atoms);
  assert.ok(m.atoms.includes(m.defaultZ));for(const z of m.atoms)assert.ok(atom(z)?.symbol);
  if(e.kind==='molecule')assert.deepEqual(MOLECULE_LAYOUTS[id].atoms.map(a=>a.z).sort((a,b)=>a-b),e.atoms);
  else assert.equal(MOLECULE_LAYOUTS[id],undefined);
 }
 const co2=MOLECULE_LAYOUTS['carbon-dioxide'].atoms;assert.deepEqual(co2.map(a=>a.z),[8,6,8]);assert.equal(new Set(co2.map(a=>a.y)).size,1);
 assert.equal(atom(2).n,2);assert.equal(atom(6).n,6);assert.equal(atom(26).z,26);assert.equal(atom(26).n,30);
});

test('new materials retain their atom and particle observations after a class save',async()=>{
 const {MATERIALS}=await data();const {freshExplorer,restoreExplorer}=await import('../public/labs/matter-zoom/exploration.mjs');
 for(const mode of ['middle','high'])for(const [id,m]of Object.entries(MATERIALS))for(const z of new Set(m.atoms)){
  const saved={...freshExplorer(mode),material:id,z,level:4,deepest:5,visited:[id],seen:[`${z}:p`,`${z}:n`,`${z}:e`],records:[id,'particles'],drawer:'compare'};
  const restored=restoreExplorer(JSON.stringify(saved),mode);
  assert.equal(restored.material,id);assert.equal(restored.z,z);assert.deepEqual(restored.seen,saved.seen);assert.deepEqual(restored.records,saved.records);
  assert.equal(restored.drawer,'compare');assert.equal(Object.hasOwn(restored,'shells'),false);
 }
});

test('monatomic gases and metals never resume in a molecule screen',async()=>{
 const {freshExplorer,restoreExplorer}=await import('../public/labs/matter-zoom/exploration.mjs');
 for(const [material,z]of [['helium',2],['iron',26],['gold',79]]){
  const restored=restoreExplorer(JSON.stringify({...freshExplorer(),material,z:999,level:2,deepest:2}));
  assert.equal(restored.z,z);assert.equal(restored.level,4);assert.equal(restored.deepest,4);
 }
 const co2=restoreExplorer(JSON.stringify({...freshExplorer(),material:'carbon-dioxide',z:1,level:2,deepest:2}));
 assert.equal(co2.z,6);assert.equal(co2.level,2);
});
