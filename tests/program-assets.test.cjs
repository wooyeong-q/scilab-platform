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

test('a chunk retry already in flight cannot overwrite bytes after upload finalization',async()=>{
  await login();const bytes=Buffer.from('%PDF-original'),late=Buffer.from('%PDF-changed!');
  assert.equal(bytes.length,late.length);
  const asset=await allocate('늦은 재전송.pdf',bytes.length);await put(asset,0,bytes);
  let release,started;
  const reading=new Promise(resolve=>started=resolve);
  const body=new ReadableStream({pull(controller){started();return new Promise(resolve=>release=()=>{controller.enqueue(late);controller.close();resolve();});}},{highWaterMark:0});
  const retry=transfer.PUT(new Request('http://localhost/upload?part=0',{method:'PUT',body,duplex:'half'}),context(asset.id));
  await Promise.race([reading,retry.then(()=>{throw new Error('retry ended before reading its body');})]);
  try{assert.equal((await transfer.POST(request({}),context(asset.id))).status,200);}finally{release();}
  assert.equal((await retry).status,404);
  await edit.PATCH(request(payload([asset]),'PATCH'),params('asset-program'));h.cookies.clear();
  const response=await download.GET(new Request('http://localhost/file'),params(asset.id));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
});

test('cached attachments return no body or chunk reads after metadata updates and a fresh route instance',async()=>{
  await login();
  const {CHUNK_SIZE}=h.load('lib/program-assets.ts');
  const bytes=Buffer.alloc(6*1024*1024,42);bytes.write('%PDF-1.7\n');
  const asset=await allocate('반복 열기.pdf',bytes.length);
  for(let offset=0;offset<bytes.length;offset+=CHUNK_SIZE)await put(asset,offset/CHUNK_SIZE,bytes.subarray(offset,offset+CHUNK_SIZE));
  await transfer.POST(request({}),context(asset.id));
  await edit.PATCH(request(payload([asset]),'PATCH'),params('asset-program'));
  h.cookies.clear();
  const get=headers=>download.GET(new Request('http://localhost/file',{headers}),params(asset.id));
  const first=await get();const etag=first.headers.get('etag'),modified=first.headers.get('last-modified');
  assert.ok(etag);assert.equal(first.headers.get('cache-control'),'private, no-cache, must-revalidate');
  assert.equal(first.headers.get('vercel-cdn-cache-control'),'no-store');assert.equal(first.headers.get('vary'),'Cookie');
  assert.equal(first.headers.get('content-length'),String(bytes.length));assert.deepEqual(Buffer.from(await first.arrayBuffer()),bytes);
  await login();await edit.PATCH(request({title:'메타데이터만 바뀜'},'PATCH'),params('asset-program'));h.cookies.clear();
  for(const headers of [ {'if-none-match':etag}, {'if-none-match':`"old", W/${etag}`}, {'if-none-match':'*'}, {'if-modified-since':modified} ]) {
    const before=h.queries.length,response=await get(headers);
    assert.equal(response.status,304);assert.equal((await response.arrayBuffer()).byteLength,0);assert.equal(response.headers.get('etag'),etag);
    assert.ok(h.queries.slice(before).every(q=>!q.query.includes('FROM program_asset_chunks')));
  }
  // A deployment/process restart does not change an attachment's validator.
  {
    const run=new Function('require','module','exports',require('typescript').transpileModule(require('node:fs').readFileSync('app/api/program-assets/[id]/route.ts','utf8'),{compilerOptions:{module:require('typescript').ModuleKind.CommonJS,target:require('typescript').ScriptTarget.ES2022}}).outputText);
    const mod={exports:{}};
    run(name=>name==='@/lib/auth'?{isAdmin:async()=>false}:name==='@/lib/db'?{sql:h.sql}:name==='@/lib/program-assets'?h.load('lib/program-assets.ts'):require(name),mod,mod.exports);
    const response=await mod.exports.GET(new Request('http://localhost/file',{headers:{'if-none-match':etag}}),params(asset.id));
    assert.equal(response.status,304);assert.equal(response.headers.get('etag'),etag);
  }
  const before=h.queries.length;
  const head=await download.HEAD(new Request('http://localhost/file',{method:'HEAD',headers:{range:'bytes=0-3'}}),params(asset.id));
  assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  assert.ok(h.queries.slice(before).every(q=>!q.query.includes('FROM program_asset_chunks')));
});

test('PDF ranges read and transfer only required chunks, honor If-Range, and never return a partial cache as a full file',async()=>{
  await login();
  const {CHUNK_SIZE}=h.load('lib/program-assets.ts');
  const bytes=Buffer.alloc(CHUNK_SIZE*2+1234);
  for(let n=0;n<3;n++)bytes.fill(30+n,n*CHUNK_SIZE,Math.min((n+1)*CHUNK_SIZE,bytes.length));
  bytes.write('%PDF-1.7\n');
  const asset=await allocate('부분 전송.pdf',bytes.length);
  for(let offset=0;offset<bytes.length;offset+=CHUNK_SIZE)await put(asset,offset/CHUNK_SIZE,bytes.subarray(offset,offset+CHUNK_SIZE));
  await transfer.POST(request({}),context(asset.id));await edit.PATCH(request(payload([asset]),'PATCH'),params('asset-program'));h.cookies.clear();
  const get=headers=>download.GET(new Request('http://localhost/file',{headers}),params(asset.id));
  const head=await download.HEAD(new Request('http://localhost/file',{method:'HEAD'}),params(asset.id));
  const etag=head.headers.get('etag');
  for(const [range,start,end,count] of [ ['bytes=0-31',0,31,1], [`bytes=${CHUNK_SIZE-11}-${CHUNK_SIZE+17}`,CHUNK_SIZE-11,CHUNK_SIZE+17,2], ['bytes=-40',bytes.length-40,bytes.length-1,1], [`bytes=${CHUNK_SIZE}-`,CHUNK_SIZE,bytes.length-1,2], [`bytes=0-${bytes.length+500}`,0,bytes.length-1,3] ]) {
    const before=h.queries.length,response=await get({range,'if-range':etag});
    assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${bytes.length}`);
    assert.equal(response.headers.get('content-length'),String(end-start+1));assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(start,end+1));
    assert.equal(h.queries.slice(before).filter(q=>q.query.includes('FROM program_asset_chunks')).length,count);
  }
  for(const headers of [{range:'bytes=0-3','if-range':'"old"'},{range:'bytes=0-3','if-range':`W/${etag}`},{range:'bytes=0-3','if-none-match':'"old"','if-modified-since':head.headers.get('last-modified')},{range:'bytes=0-3,10-12'}]) {
    const response=await get(headers);assert.equal(response.status,headers['if-none-match']?206:200);
    const expected=headers['if-none-match']?bytes.subarray(0,4):bytes;assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected);
  }
  for(const range of [`bytes=${bytes.length}-`,'bytes=20-10','bytes=-0','bytes=99999999999999999999999-']) {
    const before=h.queries.length,response=await get({range});assert.equal(response.status,416);
    assert.equal(response.headers.get('content-range'),`bytes */${bytes.length}`);assert.equal((await response.arrayBuffer()).byteLength,0);
    assert.ok(h.queries.slice(before).every(q=>!q.query.includes('FROM program_asset_chunks')));
  }
  const dated=await get({range:'bytes=0-3','if-range':head.headers.get('last-modified')});
  assert.equal(dated.status,206);assert.deepEqual(Buffer.from(await dated.arrayBuffer()),bytes.subarray(0,4));
  const future=await get({range:'bytes=0-3','if-range':'Fri, 31 Dec 9999 23:59:59 GMT'});
  assert.equal(future.status,200);assert.deepEqual(Buffer.from(await future.arrayBuffer()),bytes);
});

test('a cached validator cannot expose an unpublished, removed, draft, or deleted attachment; replacement files get a new validator',async()=>{
  await login();const bytes=Buffer.from('%PDF-new file');
  const asset=await allocate('공개 여부.pdf',bytes.length);await put(asset,0,bytes);await transfer.POST(request({}),context(asset.id));
  await edit.PATCH(request(payload([asset]),'PATCH'),params('asset-program'));h.cookies.clear();
  const response=await download.GET(new Request('http://localhost/file'),params(asset.id));const etag=response.headers.get('etag');await response.arrayBuffer();
  const hidden=async()=>{
    const before=h.queries.length,r=await download.GET(new Request('http://localhost/file',{headers:{'if-none-match':etag,range:'bytes=0-3'}}),params(asset.id));
    assert.equal(r.status,404);assert.equal(r.headers.get('etag'),null);assert.match(r.headers.get('cache-control'),/no-store/);
    assert.ok(h.queries.slice(before).every(q=>!q.query.includes('FROM program_asset_chunks')));
  };
  await h.pg.query("UPDATE programs SET is_published=FALSE WHERE id='asset-program'");await hidden();
  await h.pg.query("UPDATE programs SET is_published=TRUE,assets='[]' WHERE id='asset-program'");await hidden();
  await h.pg.query("UPDATE programs SET assets=$1::jsonb WHERE id='asset-program'",[JSON.stringify([asset])]);
  await h.pg.query('UPDATE program_assets SET ready=FALSE WHERE id=$1',[asset.id]);await hidden();
  await h.pg.query('UPDATE program_assets SET ready=TRUE WHERE id=$1',[asset.id]);
  await h.pg.query("UPDATE programs SET deleted_at=NOW() WHERE id='asset-program'");await login();await hidden();
  await h.pg.query("UPDATE programs SET deleted_at=NULL WHERE id='asset-program'");
  const replacement=await allocate('공개 여부.pdf',bytes.length);await put(replacement,0,bytes);await transfer.POST(request({}),context(replacement.id));
  await edit.PATCH(request(payload([replacement]),'PATCH'),params('asset-program'));h.cookies.clear();await hidden();
  const changed=await download.GET(new Request('http://localhost/file',{headers:{'if-none-match':etag}}),params(replacement.id));
  assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag);assert.deepEqual(Buffer.from(await changed.arrayBuffer()),bytes);
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
