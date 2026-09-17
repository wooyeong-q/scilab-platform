const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { harness, request, params } = require('./helpers.cjs');
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
process.env.ADMIN_PASSWORD = 'asset-test-password';
process.env.SESSION_SECRET = 'asset-test-secret';
let h, create, transfer, download, edit;
const context = (assetId, id='asset-program') => ({params:Promise.resolve({id,assetId})});
const payload = assets => ({title:'첨부 테스트',summary:'소개',description:'상세 설명',assets});
async function login() { await h.load('app/api/admin/login/route.ts').POST(request({password:process.env.ADMIN_PASSWORD})); }
async function allocate(name,size,kind='file',program='asset-program') {
  const response = await create.POST(request({name,size,kind}),params(program));
  assert.equal(response.status,201); return response.json();
}
async function put(asset,index,bytes,program='asset-program') {
  return transfer.PUT(new Request(`http://localhost/upload?part=${index}`,{method:'PUT',body:bytes}),context(asset.id,program));
}
before(async()=>{
  h=await harness();
  for(const id of ['asset-program','other-program']) await h.pg.query(`INSERT INTO programs (id,title,summary,description,category,grade,url,author) VALUES ($1,'Test','Summary','Description','Space','8','/test','Teacher')`,[id]);
  create=h.load('app/api/admin/programs/[id]/assets/route.ts');
  transfer=h.load('app/api/admin/programs/[id]/assets/[assetId]/route.ts');
  download=h.load('app/api/program-assets/[id]/route.ts');
  edit=h.load('app/api/admin/programs/[id]/route.ts');
});
after(async()=>h.close());

test('only an administrator can upload; type, size, and signature checks reject unsafe files',async()=>{
  assert.equal((await create.POST(request({name:'test.pdf',size:12,kind:'file'}),params('asset-program'))).status,401);
  assert.equal((await transfer.PUT(request({}),context('missing'))).status,401);
  assert.equal((await transfer.POST(request({}),context('missing'))).status,401);
  assert.equal((await transfer.DELETE(request({}),context('missing'))).status,401);
  await login();
  for(const data of [{name:'evil.svg',size:100,kind:'image'},{name:'x.pdf',size:31*1024*1024,kind:'file'},{name:'x.png',size:11*1024*1024,kind:'image'},{name:'empty.pdf',size:0,kind:'file'}]) assert.equal((await create.POST(request(data),params('asset-program'))).status,400);
  const asset=await allocate('fake.png',20,'image');
  assert.equal((await put(asset,0,Buffer.alloc(20,60))).status,400);
  assert.equal((await put(asset,0,Buffer.alloc(20), 'other-program')).status,404);
  assert.equal((await transfer.POST(request({}),context(asset.id))).status,400);
  assert.equal((await edit.PATCH(request(payload([asset]),'PATCH'),params('asset-program'))).status,400);
});

test('a 6MB PDF round trips byte-for-byte, stays private until save, and disappears publicly on removal',async()=>{
  const {CHUNK_SIZE}=h.load('lib/program-assets.ts');
  const bytes=Buffer.alloc(6*1024*1024+29,42); bytes.write('%PDF-1.7\n');
  const asset=await allocate('설명서 (교사용).pdf',bytes.length);
  assert.equal((await put(asset,99,bytes.subarray(0,10))).status,400);
  assert.equal((await put(asset,0,bytes.subarray(0,10))).status,400);
  assert.equal((await put(asset,0,bytes.subarray(0,CHUNK_SIZE+1))).status,413);
  for(let offset=0;offset<bytes.length;offset+=CHUNK_SIZE) assert.equal((await put(asset,offset/CHUNK_SIZE,bytes.subarray(offset,offset+CHUNK_SIZE))).status,200);
  // Retried chunks are idempotent.
  assert.equal((await put(asset,0,bytes.subarray(0,CHUNK_SIZE))).status,200);
  assert.equal((await transfer.POST(request({}),context(asset.id))).status,200);
  assert.equal((await put(asset,0,bytes.subarray(0,CHUNK_SIZE))).status,404);
  h.cookies.clear();
  assert.equal((await download.GET(new Request('http://localhost/file'),params(asset.id))).status,404);
  await login();
  assert.equal((await edit.PATCH(request(payload([asset]),'PATCH'),params('other-program'))).status,400);
  assert.equal((await edit.PATCH(request(payload([{...asset,name:'spoof.html',mime:'text/html'}]),'PATCH'),params('asset-program'))).status,200);
  const persisted=await h.load('lib/db.ts').getProgram('asset-program');
  assert.equal(persisted.assets[0].name,'설명서 (교사용).pdf');
  // An old client that omits assets must preserve the existing attachments.
  assert.equal((await edit.PATCH(request({title:'Old client'},'PATCH'),params('asset-program'))).status,200);
  h.cookies.clear();
  const response=await download.GET(new Request('http://localhost/file'),params(asset.id));
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Disposition'),/^attachment;.*filename\*=UTF-8''/);
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  await login();
  await edit.PATCH(request(payload([]),'PATCH'),params('asset-program'));
  h.cookies.clear();
  assert.equal((await download.GET(new Request('http://localhost/file'),params(asset.id))).status,404);
});

test('images render inline, unpublished programs deny downloads, and stale draft cleanup preserves referenced files',async()=>{
  await login();
  const bytes=Buffer.from('89504e470d0a1a0a00000000','hex');
  const asset=await allocate('이미지.png',bytes.length,'image');
  assert.equal((await put(asset,0,bytes)).status,200);
  await transfer.POST(request({}),context(asset.id));
  await edit.PATCH(request(payload([asset]),'PATCH'),params('asset-program'));
  h.cookies.clear();
  let response=await download.GET(new Request('http://localhost/file'),params(asset.id));
  assert.match(response.headers.get('Content-Disposition'),/^inline;/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  await h.pg.query("UPDATE programs SET is_published=FALSE WHERE id='asset-program'");
  assert.equal((await download.GET(new Request('http://localhost/file'),params(asset.id))).status,404);
  await login();
  const orphan=await allocate('orphan.pdf',10);
  await h.pg.query("UPDATE program_assets SET created_at=NOW()-INTERVAL '2 days'");
  await allocate('new.pdf',10);
  assert.equal((await h.pg.query('SELECT id FROM program_assets WHERE id=$1',[orphan.id])).rows.length,0);
  assert.equal((await h.pg.query('SELECT id FROM program_assets WHERE id=$1',[asset.id])).rows.length,1);
  await edit.DELETE(undefined,params('asset-program'));
  assert.equal((await h.pg.query('SELECT * FROM program_asset_chunks WHERE asset_id=$1',[asset.id])).rows.length,0);
});
