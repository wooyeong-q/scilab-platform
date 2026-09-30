process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness,root}=require('./helpers.cjs');
const program=JSON.parse(fs.readFileSync(path.join(root,'public/labs/matter-zoom/program.json'),'utf8'));
const fields=['summary','description','grade','tags','format','standard'];

test('matter zoom catalog describes middle/high modes and independent classroom access',()=>{
  assert.equal(program.id,'matter-zoom');
  assert.equal(program.title,'확대! 물질 탐험 연구소');
  assert.equal(program.url,'/labs/matter-zoom/index.html');
  assert.equal(program.author,'SciLab');
  assert.equal(program.grade,'중학교 · 고등학교');
  assert.match(program.description,/중학교 2학년/);
  assert.match(program.description,/통합과학/);
  assert.match(program.description,/화학 확장/);
  assert.match(program.description,/학생 계정 없이/);
  assert.match(program.description,/반별 독립 링크/);
});

test('matter zoom original seed metadata upgrades once and stays idempotent',async()=>{
  const h=await harness();
  try{
    const {registerMatterZoom,ORIGINAL_SEED_METADATA:old}=await import('../scripts/register-matter-zoom.mjs');
    await registerMatterZoom(h.sql,{...program,...old});
    await h.pg.query('UPDATE programs SET like_count=7,view_count=13 WHERE id=$1',[program.id]);
    await registerMatterZoom(h.sql,program);
    const first=(await h.pg.query('SELECT * FROM programs WHERE id=$1',[program.id])).rows[0];
    for(const field of fields)assert.deepEqual(first[field],program[field],field);
    assert.equal(first.like_count,7);
    assert.equal(first.view_count,13);
    await registerMatterZoom(h.sql,program);
    const second=(await h.pg.query('SELECT * FROM programs WHERE id=$1',[program.id])).rows[0];
    assert.deepEqual(second,first);
  }finally{await h.close();}
});

test('matter zoom upgrades seed fields individually while preserving every administrator-edited field',async()=>{
  const h=await harness();
  try{
    const {registerMatterZoom,ORIGINAL_SEED_METADATA:old}=await import('../scripts/register-matter-zoom.mjs');
    for(const editedField of fields){
      await h.pg.query('DELETE FROM programs WHERE id=$1',[program.id]);
      await registerMatterZoom(h.sql,{...program,...old});
      const value=editedField==='tags'?['교사 맞춤 태그']:'교사가 수정한 '+editedField;
      await h.pg.query(`UPDATE programs SET ${editedField}=$2${editedField==='tags'?'::jsonb':''},title=$3,like_count=4,view_count=6 WHERE id=$1`,
        [program.id,editedField==='tags'?JSON.stringify(value):value,'교사 맞춤 제목']);
      await registerMatterZoom(h.sql,program);
      await registerMatterZoom(h.sql,program);
      const row=(await h.pg.query('SELECT * FROM programs WHERE id=$1',[program.id])).rows[0];
      for(const field of fields)assert.deepEqual(row[field],field===editedField?value:program[field],`${editedField}: ${field}`);
      assert.equal(row.title,'교사 맞춤 제목');
      assert.equal(row.like_count,4);
      assert.equal(row.view_count,6);
    }
  }finally{await h.close();}
});

test('matter zoom registration inserts fresh metadata and leaves other programs untouched',async()=>{
  const h=await harness();
  try{
    const {registerMatterZoom,ORIGINAL_SEED_METADATA:old}=await import('../scripts/register-matter-zoom.mjs');
    await h.pg.query('INSERT INTO programs (id,title,summary,description,category,grade,tags,url,author,format,standard,like_count) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)',
      ['another-program','다른 프로그램',old.summary,old.description,'화학',old.grade,JSON.stringify(old.tags),'/another.html','다른 교사',old.format,old.standard,9]);
    const before=(await h.pg.query('SELECT * FROM programs WHERE id=$1',['another-program'])).rows[0];
    await registerMatterZoom(h.sql,program);
    const matter=(await h.pg.query('SELECT * FROM programs WHERE id=$1',[program.id])).rows[0];
    for(const field of fields)assert.deepEqual(matter[field],program[field],field);
    const after=(await h.pg.query('SELECT * FROM programs WHERE id=$1',['another-program'])).rows[0];
    assert.deepEqual(after,before);
  }finally{await h.close();}
});
