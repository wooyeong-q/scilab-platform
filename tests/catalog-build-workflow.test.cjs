const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const pkg=require('../package.json');

test('the complete deployment command performs no program registration or catalog mutations',()=>{
 const resolve=command=>command.replace(/npm run ([\w:-]+)/g,(_,name)=>resolve(pkg.scripts[name]||''));
 const command=resolve(pkg.scripts.build);
 assert.match(command,/next build/);
 assert.doesNotMatch(command,/register-|retire-|catalog:register|seed|update-catalog|apply-guides|update-program-names|rename-programs/i);
 // Additive schema changes may run, but catalog content cannot be changed by them.
 const statements=fs.readFileSync('scripts/schema.sql','utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
 assert.ok(statements.every(s=>/^(CREATE (TABLE|INDEX) IF NOT EXISTS|ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS)\b/.test(s)));
});

for(const name of ['matter-zoom','quiz-rally']){
 test(name+' registrar is harmless when invoked by an old build command',()=>{
  const env={...process.env,VERCEL_ENV:'production'};delete env.DATABASE_URL;
  for(const args of [[],['--other'],['--register','unexpected-extra']]){
   const result=spawnSync(process.execPath,['scripts/register-'+name+'.mjs',...args],{env,encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
   assert.match(result.stdout,/registration skipped/i);
  }
 });
 test(name+' registration is an explicit separate command and preview execution stays read-only',()=>{
  assert.equal(pkg.scripts['catalog:register:'+name],'node scripts/register-'+name+'.mjs --register');
  const env={...process.env,VERCEL_ENV:'preview'};delete env.DATABASE_URL;
  const result=spawnSync(process.execPath,['scripts/register-'+name+'.mjs','--register'],{env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/deferred to production/i);
 });
}
