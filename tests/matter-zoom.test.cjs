process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./helpers.cjs');

test('matter zoom: molecular/metallic paths and representative isotope data are consistent',async()=>{
 const {ELEMENTS,GOLD,MATERIALS}=await import('../public/labs/matter-zoom/data.mjs');
 assert.equal(ELEMENTS.length,20);
 assert.deepEqual(MATERIALS.water.atoms,[1,8,1]);assert.equal(MATERIALS.water.kind,'molecule');
 assert.deepEqual(MATERIALS.hydrogen.atoms,[1,1]);assert.equal(MATERIALS.gold.kind,'array');
 assert.equal(ELEMENTS[0].n,0);assert.equal(ELEMENTS[7].n,8);
 assert.equal(GOLD.z,79);assert.equal(GOLD.n,118);assert.equal(GOLD.shells.reduce((a,b)=>a+b),79);
 for(const e of ELEMENTS){assert.equal(e.shells.reduce((a,b)=>a+b),e.z);assert.ok(e.group>=1&&e.group<=18);}
});
test('matter zoom: all 20 electron configurations, invalid drops, and unknown atom assessment',async()=>{
 const {ELEMENTS}=await import('../public/labs/matter-zoom/data.mjs');
 const {placeElectron,correctShells,checkMission}=await import('../public/labs/matter-zoom/core.mjs');
 for(const e of ELEMENTS){let s=[0,0,0,0];for(let i=0;i<e.shells.length;i++)for(let j=0;j<e.shells[i];j++){const r=placeElectron(s,i,e.z);assert.ok(r.ok);s=r.shells;}assert.ok(correctShells(s,e.z));assert.equal(placeElectron(s,3,e.z).ok,false);}
 assert.equal(placeElectron([0,0,0,0],1,8).ok,false);
 assert.equal(placeElectron([2,0,0,0],0,8).ok,false);
 assert.equal(placeElectron([0,0,0,0],0,79).ok,false);
 assert.deepEqual(ELEMENTS[18].shells,[2,8,8,1]);assert.deepEqual(ELEMENTS[19].shells,[2,8,8,2]);
 assert.ok(Object.values(checkMission(12,{neutral:'yes',number:'12',element:'12',shells:'2, 8, 2'})).every(Boolean));
 assert.ok(Object.values(checkMission(8,{neutral:'yes',number:'8',element:'8',shells:'2,6'})).every(Boolean));
 assert.deepEqual(checkMission(12,{neutral:'no',number:'24',element:'11',shells:'2,10'}),{neutral:false,number:false,element:false,shells:false});
});
test('matter zoom: corrupted/hostile/inconsistent local saves recover safely',async()=>{
 const {restore,fresh}=await import('../public/labs/matter-zoom/core.mjs');
 assert.deepEqual(restore('{broken'),fresh());assert.deepEqual(restore('null'),fresh());
 const s=restore(JSON.stringify({...fresh(),chapter:6,unlocked:2,material:'<img>',shells:[0,0,8,0],records:['<script>','water'],visited:['gold','gold'],z:999,mission:{element:'<svg/onload=alert(1)>'}}));
 assert.equal(s.chapter,2);assert.equal(s.material,null);assert.equal(s.z,8);assert.deepEqual(s.shells,[0,0,0,0]);assert.deepEqual(s.records,['water']);assert.deepEqual(s.visited,['gold']);
});
test('matter zoom registration preserves existing catalog entries and administrator edits',async()=>{
 const h=await harness();try{
 const p=JSON.parse(fs.readFileSync('public/labs/matter-zoom/program.json','utf8'));
 const source=fs.readFileSync('scripts/register-matter-zoom.mjs','utf8');const query=source.match(/sql.query\(`([\s\S]*?)`/)[1];
 const args=[p.id,p.title,p.summary,p.description,p.category,p.grade,JSON.stringify(p.tags),p.icon,p.url,p.author,p.featured,p.duration,p.format,p.standard];
 await h.pg.query(query,args);await h.pg.query("UPDATE programs SET title='수업 맞춤 제목',like_count=5 WHERE id=$1",[p.id]);await h.pg.query(query,args);
 const rows=(await h.pg.query('SELECT * FROM programs WHERE id=$1',[p.id])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].title,'수업 맞춤 제목');assert.equal(rows[0].like_count,5);
 assert.equal((await h.load('lib/db.ts').getProgram(p.id)).url,p.url);
 }finally{await h.close();}
});
