const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness, request, params, root } = require('./helpers.cjs');
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
process.env.ADMIN_PASSWORD = 'isolated-test-password';
process.env.SESSION_SECRET = 'isolated-test-secret';
let h;
before(async () => {
  h = await harness();
  await h.pg.query(`INSERT INTO programs (id,title,summary,description,category,grade,url,author,featured,view_count,launch_count,like_count,worksheet_url)
    VALUES ('existing','Original title','Summary','Description','Space','Grade 8','/original','Teacher',TRUE,7,5,2,'https://example.com/worksheet')`);
  await h.pg.query(`INSERT INTO programs (id,title,summary,description,category,grade,url,author,is_published)
    VALUES ('private','Private','Private','Private','Space','Grade 8','/private','Teacher',FALSE)`);
});
after(async () => h.close());

test('idempotent additive migration preserves all existing program fields and counts', async () => {
  const before = (await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
  await h.pg.exec(fs.readFileSync(path.join(root, 'scripts/schema.sql'), 'utf8'));
  assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows, before);
});

test('cold public reads issue only SELECT, exclude unpublished programs, and have a per-query deadline', async () => {
  const db = h.load('lib/db.ts'); h.queries.length = 0;
  assert.equal((await db.getPrograms()).length, 1);
  assert.equal((await db.getProgram('existing')).worksheetUrl, 'https://example.com/worksheet');
  assert.equal(await db.getProgram('private'), null);
  assert.equal(await db.getProgram('missing'), null);
  assert.ok(h.queries.every(q => q.query.startsWith('SELECT')));
  assert.ok(h.queries.every(q => q.options.fetchOptions.signal instanceof AbortSignal));
  assert.notEqual(h.queries[0].options.fetchOptions.signal, h.queries[1].options.fetchOptions.signal);
  h.outage(true);
  await assert.rejects(db.getPrograms(), /outage/);
  h.outage(false);
});

test('30 catalog callers share cached data; admin login/edit invalidates catalog, detail and runner', async () => {
  const catalog = h.load('lib/program-cache.ts'); h.queries.length = 0;
  const result = await Promise.all(Array.from({ length: 30 }, () => catalog.getPrograms()));
  assert.equal(result.length, 30); assert.equal(h.queries.length, 1);
  assert.equal((await catalog.getProgram('existing')).title, 'Original title');
  assert.ok([...h.cache.values()].every(item => item.options.revalidate === 60));
  const route = h.load('app/api/admin/programs/[id]/route.ts');
  const edit = { title: 'Teacher edit', url: '/edited', summary: 'New summary', category: 'Space', grade: 'Grade 8', worksheetUrl: 'https://example.com/new-worksheet' };
  assert.equal((await route.PATCH(request(edit, 'PATCH'), params('existing'))).status, 401);
  const login = h.load('app/api/admin/login/route.ts');
  assert.equal((await login.POST(request({ password: 'incorrect' }))).status, 401);
  assert.equal((await login.POST(request({ password: process.env.ADMIN_PASSWORD }))).status, 200);
  assert.equal((await route.PATCH(request(edit, 'PATCH'), params('existing'))).status, 200);
  assert.equal((await catalog.getProgram('existing')).title, 'Teacher edit');
  assert.equal((await catalog.getPrograms())[0].url, '/edited');
  assert.deepEqual(h.paths.slice(-3), [['/'], ['/programs/[id]', 'page'], ['/run/[id]', 'page']]);
  const data = await h.load('app/api/admin/data/route.ts').GET();
  assert.equal((await data.json()).programs.length, 2);
});

test('view, launch, like and unlike update the real counters; concurrent views are retained', async () => {
  const route = h.load('app/api/programs/[id]/interactions/route.ts');
  for (const action of ['view', 'launch', 'like', 'unlike']) assert.equal((await route.POST(request({ action }), params('existing'))).status, 200);
  await Promise.all(Array.from({ length: 30 }, () => route.POST(request({ action: 'view' }), params('existing'))));
  const stats = (await h.pg.query("SELECT view_count,launch_count,like_count FROM programs WHERE id='existing'")).rows[0];
  assert.deepEqual(stats, { view_count: 38, launch_count: 6, like_count: 2 });
  assert.equal((await route.POST(request({ action: 'bad' }), params('existing'))).status, 400);
});

test('submission, approval, publication removal and targeted deletion refresh public caches', async () => {
  const submit = h.load('app/api/submissions/route.ts');
  assert.equal((await submit.POST(request({}))).status, 400);
  const response = await submit.POST(request({ title: 'Submitted', author: 'Test', url: 'https://example.com/lab', category: 'Earth', grade: '8', summary: 'Test submission', worksheetUrl: 'https://example.com/worksheet', tags: ['earth'] }));
  assert.equal(response.status, 201);
  const { id } = await response.json();
  const catalog = h.load('lib/program-cache.ts'); await catalog.getPrograms();
  assert.equal((await h.load('app/api/admin/submissions/[id]/route.ts').PATCH(request({ action: 'approve' }, 'PATCH'), params(id))).status, 200);
  assert.equal((await catalog.getPrograms()).length, 2);
  const programId = 'community-' + id;
  assert.equal((await catalog.getProgram(programId)).worksheetUrl, 'https://example.com/worksheet');
  await h.pg.query('UPDATE programs SET is_published=FALSE WHERE id=$1', [programId]);
  catalog.revalidatePrograms();
  assert.equal(await catalog.getProgram(programId), null);
  assert.equal((await h.load('app/api/admin/programs/[id]/route.ts').DELETE(undefined, params(programId))).status, 200);
  assert.equal((await catalog.getPrograms()).length, 1);
  assert.equal((await h.pg.query("SELECT title FROM programs WHERE id='existing'")).rows[0].title, 'Teacher edit');
});

test('game cold-start guards perform zero queries', async () => {
  h.queries.length = 0;
  await h.load('lib/galaxy-voyage.ts').ensureGalaxyVoyageDatabase();
  await h.load('lib/earthquake-volcano.ts').ensureEarthquakeVolcanoDatabase();
  await h.load('lib/star-escape.ts').ensureStarEscapeDatabase();
  assert.equal(h.queries.length, 0);
});
