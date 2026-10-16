const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, request, params } = require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test:test@localhost/test';
process.env.ADMIN_PASSWORD='order-test-password';
process.env.SESSION_SECRET='order-test-secret';
const ids = programs => programs.map(p=>p.id);
async function login(h) {
  assert.equal((await h.load('app/api/admin/login/route.ts').POST(request({password:process.env.ADMIN_PASSWORD}))).status,200);
}
async function fixture(h) {
  await h.pg.query(`INSERT INTO programs(id,title,summary,description,category,grade,url,author,featured,like_count,assets,usage_steps)
    VALUES ('earth-a','가','소개','설명','별과 우주','중2','/a','교사',TRUE,9,'[{"id":"file"}]','["기존 사용법"]'),
           ('earth-b','나','소개','설명','지질','중2','/b','교사',FALSE,2,'[]','[]'),
           ('chem','다','소개','설명','화학','중2','/c','교사',FALSE,1,'[]','[]'),
           ('private','비공개','소개','설명','화학','중2','/p','교사',FALSE,0,'[]','[]'),
           ('retired','삭제됨','소개','설명','지질','중2','/r','교사',FALSE,0,'[]','[]')`);
  await h.pg.query("UPDATE programs SET is_published=FALSE WHERE id='private'");
  await h.pg.query("UPDATE programs SET is_published=FALSE,deleted_at=NOW(),display_order=99 WHERE id='retired'");
}
test('only an authenticated administrator can order, and a valid save persists without changing other fields', async()=>{
  const h=await harness();
  try {
    await fixture(h);
    const api=h.load('app/api/admin/programs/order/route.ts');
    const catalog=h.load('lib/program-cache.ts');
    await catalog.getPrograms();
    const before=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const order=['chem','private','earth-b','earth-a'];
    assert.equal((await api.PUT(request({ids:order},'PUT'))).status,401);
    assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,before);
    await login(h);
    assert.equal((await api.PUT(request({ids:order},'PUT'))).status,200);
    const after=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const withoutOrder=rows=>rows.map(({display_order,...rest})=>rest);
    assert.deepEqual(withoutOrder(after),withoutOrder(before));
    assert.deepEqual(ids(await catalog.getPrograms()),['chem','earth-b','earth-a']);
    assert.deepEqual(ids((await h.load('lib/db.ts').getAdminData()).programs),order);
    assert.deepEqual(after.map(row=>[row.id,row.display_order]),[['chem',0],['earth-a',3],['earth-b',2],['private',1],['retired',99]]);
    assert.deepEqual(h.paths.slice(-3),[['/'],['/programs/[id]','page'],['/run/[id]','page']]);
    await h.load('app/api/admin/logout/route.ts').POST();
    assert.equal((await api.PUT(request({ids:[...order].reverse()},'PUT'))).status,401);
  } finally {await h.close();}
});
test('malformed and stale lists cannot partially save or restore a deleted program', async()=>{
  const h=await harness();
  try {
    await fixture(h);await login(h);
    const api=h.load('app/api/admin/programs/order/route.ts');
    const before=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    for (const body of [{},{ids:null},{ids:['earth-a','earth-a']},{ids:[1]},{ids:[' ']},{ids:['a'.repeat(201)]},{ids:Array(1001).fill('x')}]) {
      assert.equal((await api.PUT(request(body,'PUT'))).status,400);
    }
    assert.equal((await api.PUT(new Request('http://localhost/test',{method:'PUT',body:'{bad'}))).status,400);
    for (const list of [[],['earth-a'],['chem','private','earth-b','unknown'],['chem','private','earth-b','earth-a','retired']]) {
      assert.equal((await api.PUT(request({ids:list},'PUT'))).status,409);
      assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,before);
    }
    await h.load('app/api/admin/programs/[id]/route.ts').DELETE(undefined,params('earth-a'));
    const deleted=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    assert.equal((await api.PUT(request({ids:['chem','private','earth-b','earth-a']},'PUT'))).status,409);
    assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,deleted);
    h.outage(true);
    assert.equal((await api.PUT(request({ids:['chem','private','earth-b']},'PUT'))).status,500);
  } finally {await h.close();}
});
test('an empty catalog saves safely',async()=>{
  const h=await harness();try {await login(h);assert.equal((await h.load('app/api/admin/programs/order/route.ts').PUT(request({ids:[]},'PUT'))).status,200);}finally{await h.close();}
});
test('program moves, field moves, boundaries and default sorting preserve a complete immutable catalog',async()=>{
  const h=await harness();
  try {
    await fixture(h);
    const programs=await h.load('lib/db.ts').getPrograms();
    const before=structuredClone(programs);
    const {catalogOrder,moveCatalogProgram,moveCatalogProgramTo,moveCatalogSubject}=h.load('lib/program-order.ts');
    const {selectPrograms,groupPrograms}=h.load('lib/program-catalog.ts');
    assert.deepEqual(ids(catalogOrder(programs)),['earth-a','earth-b','chem']);
    const moved=moveCatalogProgram(programs,'earth-b',-1);
    assert.deepEqual(ids(catalogOrder(moved)),['earth-b','earth-a','chem']);
    assert.deepEqual(ids(moveCatalogProgramTo(moved,'earth-b','chem')),['earth-b','earth-a','chem']);
    assert.deepEqual(ids(moveCatalogProgram(moved,'earth-b',-1)),['earth-b','earth-a','chem']);
    assert.deepEqual(ids(moveCatalogProgram(programs,'missing',1)),ids(catalogOrder(programs)));
    const swapped=moveCatalogSubject(moved,'化学',-1);
    assert.deepEqual(ids(swapped),ids(moved));
    const reordered=moveCatalogSubject(moved,'화학',-1);
    assert.deepEqual(ids(catalogOrder(reordered)),['chem','earth-b','earth-a']);
    assert.deepEqual(groupPrograms(reordered).map(g=>g.name),['화학','지구과학']);
    assert.deepEqual(ids(selectPrograms(reordered,'','전체','recommended')),['chem','earth-b','earth-a']);
    assert.deepEqual(ids(selectPrograms(reordered,'','지구과학','recommended')),['earth-b','earth-a']);
    assert.deepEqual(ids(selectPrograms(reordered,'','전체','popular')),['earth-a','earth-b','chem']);
    assert.deepEqual(programs,before);
  } finally {await h.close();}
});
