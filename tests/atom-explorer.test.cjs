process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./helpers.cjs');
test('atom explorer: all 20 neutral models, shell transitions, invalid drops and save validation',async()=>{
 const {ELEMENTS}=await import('../public/labs/atom-explorer/data.mjs');
 const {place,isComplete,neutralModel,validateSave,fresh}=await import('../public/labs/atom-explorer/core.mjs');
 assert.equal(ELEMENTS.length,20);
 assert.deepEqual(ELEMENTS[18].electronShells,[2,8,8,1]);assert.deepEqual(ELEMENTS[19].electronShells,[2,8,8,2]);
 for(const e of ELEMENTS){let a={p:e.protons,n:e.exampleNeutrons,shells:[0,0,0,0]};for(let i=0;i<e.electronShells.length;i++)for(let j=0;j<e.electronShells[i];j++){const r=place(a,'e',String(i));assert.ok(r.model);a=r.model;}assert.ok(isComplete(a,e.atomicNumber));assert.ok(place(a,'e','3').error);}
 const li={...neutralModel(3),shells:[2,0,0,0]};assert.ok(place(li,'e','0').error);assert.equal(place(li,'e','1').model.shells[1],1);
 assert.ok(place(li,'e','nucleus').error);assert.ok(place(li,'n','0').error);assert.ok(place({...li,shells:[0,0,0,0]},'e','1').error);
 assert.equal(neutralModel(1).n,0);assert.equal(neutralModel(18).n,22);
 assert.ok(validateSave(fresh()));assert.equal(validateSave({version:1,step:99}),null);
});
test('the retired atom registration command never connects to production data',()=>{
 const {spawnSync}=require('node:child_process');
 const env={...process.env,VERCEL_ENV:'production'};delete env.DATABASE_URL;
 for(const args of [[],['--register']]){
  const result=spawnSync(process.execPath,['scripts/register-atom-explorer.mjs',...args],{env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/retired.*skipped/i);
 }
});
