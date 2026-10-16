const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {harness,request,params}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test:test@localhost/test';
process.env.ADMIN_PASSWORD='guide-test-password';
process.env.SESSION_SECRET='guide-test-secret';

test('usage steps require administrator access and validation; an older edit preserves them',async()=>{
  const h=await harness();
  try {
    await h.pg.query("INSERT INTO programs(id,title,summary,description,category,grade,url,author,usage_steps) VALUES ('guide','소개','요약','설명','화학','중2','/guide','교사','[\"기존 단계\"]')");
    const api=h.load('app/api/admin/programs/[id]/route.ts');
    const catalog=h.load('lib/program-cache.ts');
    assert.deepEqual((await catalog.getProgram('guide')).usageSteps,['기존 단계']);
    assert.equal((await api.PATCH(request({title:'소개',usageSteps:['변경']},'PATCH'),params('guide'))).status,401);
    await h.load('app/api/admin/login/route.ts').POST(request({password:process.env.ADMIN_PASSWORD}));
    for (const usageSteps of [null,'단계',[12],Array(13).fill('단계'),['a'.repeat(801)]]) {
      assert.equal((await api.PATCH(request({title:'소개',usageSteps},'PATCH'),params('guide'))).status,400);
    }
    assert.equal((await api.PATCH(request({title:'제목 수정'},'PATCH'),params('guide'))).status,200);
    assert.deepEqual((await catalog.getProgram('guide')).usageSteps,['기존 단계']);
    assert.equal((await api.PATCH(request({title:'제목 수정',usageSteps:[' 먼저 관찰 ','','다음 비교']},'PATCH'),params('guide'))).status,200);
    assert.deepEqual((await catalog.getProgram('guide')).usageSteps,['먼저 관찰','다음 비교']);
    assert.equal((await api.PATCH(request({title:'제목 수정',usageSteps:[]},'PATCH'),params('guide'))).status,200);
    assert.deepEqual((await catalog.getProgram('guide')).usageSteps,[]);
  }finally{await h.close();}
});

test('the explicit copy update changes only requested public content and is idempotent',async()=>{
  const {catalogGuides,applyCatalogGuides}=await import('../scripts/update-catalog-guides-20261016.mjs');
  const h=await harness();
  try {
    assert.equal(catalogGuides.length,9);
    for (const p of catalogGuides) {
      assert.ok(p.summary.length>20&&p.summary.length<120);
      assert.ok(p.usageSteps.length>=4&&p.usageSteps.length<=12);
      await h.pg.query(`INSERT INTO programs(id,title,summary,description,category,grade,url,author,like_count,view_count,launch_count,assets,display_order)
        VALUES ($1,$1,$2,$3,'과학','중2','/lab','교사',5,7,3,'[{"id":"keep-file"}]',4)`,[p.id,p.expectedSummary,p.expectedDescription]);
    }
    await h.pg.query("INSERT INTO programs(id,title,summary,description,category,grade,url,author,deleted_at,is_published) VALUES ('atom-explorer','원자탐험','유지','유지','화학','중2','/retired','교사',NOW(),FALSE)");
    const before=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const first=await applyCatalogGuides(h.sql);
    assert.ok(first.every(p=>p.status==='updated'));
    const after=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const unchanged=rows=>rows.map(({summary,description,usage_steps,updated_at,...rest})=>rest);
    assert.deepEqual(unchanged(after),unchanged(before));
    for (const p of catalogGuides) {
      const row=after.find(x=>x.id===p.id);
      assert.equal(row.summary,p.summary);assert.equal(row.description,p.description);assert.deepEqual(row.usage_steps,p.usageSteps);
    }
    assert.deepEqual(after.find(x=>x.id==='atom-explorer'),before.find(x=>x.id==='atom-explorer'));
    assert.ok((await applyCatalogGuides(h.sql)).every(p=>p.status==='current'));
    assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,after);
  }finally{await h.close();}
});

test('new administrator copy, unpublished and deleted rows win over the one-time guide update',async()=>{
  const {catalogGuides,applyCatalogGuides}=await import('../scripts/update-catalog-guides-20261016.mjs');
  const h=await harness();
  try {
    for (const p of catalogGuides.slice(0,4)) {
      await h.pg.query("INSERT INTO programs(id,title,summary,description,category,grade,url,author) VALUES ($1,$1,$2,$3,'과학','중2','/lab','교사')",[p.id,p.expectedSummary,p.expectedDescription]);
    }
    await h.pg.query("UPDATE programs SET summary='관리자의 새 설명' WHERE id=$1",[catalogGuides[0].id]);
    await h.pg.query("UPDATE programs SET deleted_at=NOW(),is_published=FALSE WHERE id=$1",[catalogGuides[1].id]);
    await h.pg.query("UPDATE programs SET is_published=FALSE WHERE id=$1",[catalogGuides[2].id]);
    await h.pg.query('UPDATE programs SET usage_steps=$2::jsonb WHERE id=$1',[catalogGuides[3].id,JSON.stringify(['관리자가 쓴 사용법'])]);
    const before=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const result=await applyCatalogGuides(h.sql);
    assert.equal(result.filter(p=>p.status==='administrator-edit-preserved').length,2);
    assert.equal(result.filter(p=>p.status==='unavailable').length,7);
    assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,before);
  }finally{await h.close();}
});

test('a normal or preview invocation cannot apply the copy update',()=>{
  const script='scripts/update-catalog-guides-20261016.mjs';
  const env={...process.env,VERCEL_ENV:'production'};delete env.DATABASE_URL;
  for (const args of [[],['--other'],['--apply-guides-20261016','unexpected']]) {
    const r=spawnSync(process.execPath,[script,...args],{env,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/skipped/);
  }
  const r=spawnSync(process.execPath,[script,'--apply-guides-20261016'],{env:{...env,VERCEL_ENV:'preview'},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/deferred to production/);
});
