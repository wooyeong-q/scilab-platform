const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness, request, params } = require('./helpers.cjs');
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
process.env.ADMIN_PASSWORD = 'catalog-deletion-test-password';
process.env.SESSION_SECRET = 'catalog-deletion-test-secret';
const atom = require('../public/labs/atom-explorer/program.json');
const matter = require('../public/labs/matter-zoom/program.json');
const quiz = require('../public/labs/quiz-rally/program.json');
const legacyAtomQuery = fs.readFileSync('scripts/register-atom-explorer.mjs','utf8').match(/sql.query\(`([\s\S]*?)`/)[1];
const args = p => [p.id,p.title,p.summary,p.description,p.category,p.grade,JSON.stringify(p.tags),p.icon,p.url,p.author,p.featured,p.duration,p.format,p.standard];
async function login(h) {
  assert.equal((await h.load('app/api/admin/login/route.ts').POST(request({password:process.env.ADMIN_PASSWORD}))).status,200);
}

test('deleting either active built-in survives repeated build registration and hides it from admin and cached public reads', async () => {
  const { registerMatterZoom } = await import('../scripts/register-matter-zoom.mjs');
  const { registerQuizRally } = await import('../scripts/register-quiz-rally.mjs');
  for (const [p, register] of [[matter,registerMatterZoom],[quiz,registerQuizRally]]) {
    const h = await harness();
    try {
      await register(h.sql,p);
      const catalog = h.load('lib/program-cache.ts');
      assert.ok(await catalog.getProgram(p.id));
      assert.equal((await catalog.getPrograms()).length,1);
      await login(h);
      const route = h.load('app/api/admin/programs/[id]/route.ts');
      assert.equal((await route.DELETE(undefined,params(p.id))).status,200);
      const deleted = (await h.pg.query('SELECT * FROM programs WHERE id=$1',[p.id])).rows[0];
      assert.ok(deleted.deleted_at);
      assert.equal(deleted.is_published,false);
      assert.equal(await catalog.getProgram(p.id),null);
      assert.deepEqual(await catalog.getPrograms(),[]);
      await register(h.sql,p);
      await register(h.sql,p);
      assert.deepEqual((await h.pg.query('SELECT * FROM programs WHERE id=$1',[p.id])).rows[0],deleted);
      assert.deepEqual((await h.load('lib/db.ts').getAdminData()).programs,[]);
      assert.equal((await route.PATCH(request({title:'stale edit'},'PATCH'),params(p.id))).status,404);
      assert.equal((await h.load('app/api/admin/programs/[id]/assets/route.ts').POST(request({name:'draft.pdf',size:10,kind:'file'}),params(p.id))).status,404);
      assert.equal((await route.DELETE(undefined,params(p.id))).status,200);
      assert.equal(await catalog.getProgram(p.id),null);
    } finally { await h.close(); }
  }
});

test('retiring atom explorer removes it before static generation and prevents legacy registration from resurrecting it', async () => {
  const { retireAtomExplorer } = await import('../scripts/retire-atom-explorer.mjs');
  const h = await harness();
  try {
    await h.sql.query(legacyAtomQuery,args(atom));
    await h.pg.query('UPDATE programs SET title=$2,like_count=7 WHERE id=$1',[atom.id,'관리자가 수정한 제목']);
    await h.pg.query("INSERT INTO program_assets(id,program_id,name,mime,kind,size,ready) VALUES ('atom-file',$1,'file.pdf','application/pdf','file',10,TRUE)",[atom.id]);
    await h.pg.query("INSERT INTO program_asset_chunks(asset_id,chunk_index,data,byte_size) VALUES ('atom-file',0,'AAAA',10)");
    await retireAtomExplorer(h.sql,atom);
    const retired = (await h.pg.query('SELECT * FROM programs WHERE id=$1',[atom.id])).rows[0];
    assert.ok(retired.deleted_at);
    assert.equal(retired.title,'관리자가 수정한 제목');
    assert.equal(retired.like_count,7);
    assert.equal(retired.is_published,false);
    assert.equal((await h.pg.query("SELECT * FROM program_assets WHERE id='atom-file'")).rows.length,0);
    assert.equal((await h.pg.query("SELECT * FROM program_asset_chunks WHERE asset_id='atom-file'")).rows.length,0);
    await h.sql.query(legacyAtomQuery,args(atom));
    await retireAtomExplorer(h.sql,atom);
    assert.deepEqual((await h.pg.query('SELECT * FROM programs WHERE id=$1',[atom.id])).rows[0],retired);
    const db = h.load('lib/db.ts');
    assert.equal(await db.getProgram(atom.id),null);
    assert.deepEqual(await db.getPrograms(),[]);
    assert.deepEqual((await db.getAdminData()).programs,[]);
    assert.ok(!h.load('lib/programs.ts').programs.some(p=>p.id===atom.id));
  } finally { await h.close(); }
});

test('atom retirement records a missing ID and leaves other programs untouched', async () => {
  const { retireAtomExplorer } = await import('../scripts/retire-atom-explorer.mjs');
  const { registerMatterZoom } = await import('../scripts/register-matter-zoom.mjs');
  const h = await harness();
  try {
    await registerMatterZoom(h.sql,matter);
    const before = (await h.pg.query('SELECT * FROM programs WHERE id=$1',[matter.id])).rows[0];
    await retireAtomExplorer(h.sql,atom);
    await h.sql.query(legacyAtomQuery,args(atom));
    assert.equal(await h.load('lib/db.ts').getProgram(atom.id),null);
    assert.deepEqual((await h.pg.query('SELECT * FROM programs WHERE id=$1',[matter.id])).rows[0],before);
    await assert.rejects(retireAtomExplorer(h.sql,matter),/Only atom-explorer/);
  } finally { await h.close(); }
});

test('unauthorized and failed deletion leave the program, attachments and public cache intact', async () => {
  const h = await harness();
  try {
    await h.sql.query(legacyAtomQuery,args(atom));
    const catalog = h.load('lib/program-cache.ts');
    const route = h.load('app/api/admin/programs/[id]/route.ts');
    assert.ok(await catalog.getProgram(atom.id));
    assert.equal((await route.DELETE(undefined,params(atom.id))).status,401);
    await login(h);
    await h.pg.query("INSERT INTO program_assets(id,program_id,name,mime,kind,size) VALUES ('safe-file',$1,'file.pdf','application/pdf','file',10)",[atom.id]);
    h.outage(true);
    await assert.rejects(route.DELETE(undefined,params(atom.id)),/outage/);
    h.outage(false);
    const row = (await h.pg.query('SELECT is_published,deleted_at FROM programs WHERE id=$1',[atom.id])).rows[0];
    assert.equal(row.is_published,true);
    assert.equal(row.deleted_at,null);
    assert.equal((await h.pg.query("SELECT * FROM program_assets WHERE id='safe-file'")).rows.length,1);
    assert.ok(await catalog.getProgram(atom.id));
  } finally { await h.close(); }
});
