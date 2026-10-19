const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {spawnSync}=require('node:child_process');
const {harness,request,params,root}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test:test@localhost/test';
process.env.ADMIN_PASSWORD='rename-test-password';
process.env.SESSION_SECRET='rename-test-secret';

async function fixture(h) {
  await h.pg.query(`INSERT INTO programs(id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard,thumbnail_url,
    worksheet_url,ppt_url,video_url,source_url,guide_url,assets,usage_steps,display_order,view_count,launch_count,like_count)
    VALUES ('quiz-rally','도시 재가동','기존 소개','기존 설명','화학','중2','["원자","분자"]','🏁','/labs/quiz-rally/index.html','교사',TRUE,'15분','학급 게임','기준','/thumb.png',
    '/worksheet.pdf','https://example.com/slides','https://example.com/video','https://example.com/source','/guide.pdf','[]','["먼저 입장","다음 시작"]',3,12,7,4)`);
}
async function login(h) {
  assert.equal((await h.load('app/api/admin/login/route.ts').POST(request({password:process.env.ADMIN_PASSWORD}))).status,200);
}
const row=async h=>(await h.pg.query("SELECT * FROM programs WHERE id='quiz-rally'")).rows[0];

test('local program paths and web URLs are valid; unrelated schemes and remote-looking paths are rejected',async()=>{
  const h=await harness();
  try {
    const {isValidProgramLink,programLinkError}=h.load('lib/program-links.ts');
    for(const url of ['/labs/quiz-rally/index.html','/labs/galaxy-voyage/index.html?experience=milky-way-objects#start','https://example.com/lab','http://localhost:3000/lab']) assert.equal(isValidProgramLink(url),true,url);
    for(const url of ['', 'not a link','javascript:alert(1)','data:text/html,test','//example.com/lab','/\\\\example.com/lab','/lab\nother']) assert.equal(isValidProgramLink(url),false,url);
    assert.equal(programLinkError({url:'/labs/quiz-rally/index.html',guideUrl:'/guide.pdf'}),null);
    assert.equal(programLinkError({}),null);
    assert.equal(programLinkError({guideUrl:''}),null);
    assert.match(programLinkError({url:''}),/실행 주소/);
    assert.match(programLinkError({pptUrl:'invalid'}),/PPT 링크/);
  }finally{await h.close();}
});

test('a name-only admin update preserves the original address and every other saved field',async()=>{
  const h=await harness();
  try {
    await fixture(h);const before=await row(h);
    const api=h.load('app/api/admin/programs/[id]/route.ts');
    assert.equal((await api.PATCH(request({title:'장애물레이스'},'PATCH'),params('quiz-rally'))).status,401);
    assert.deepEqual(await row(h),before);await login(h);
    const catalog=h.load('lib/program-cache.ts');assert.equal((await catalog.getProgram('quiz-rally')).title,'도시 재가동');
    assert.equal((await api.PATCH(request({title:'장애물레이스'},'PATCH'),params('quiz-rally'))).status,200);
    const after=await row(h);const omit=({title,updated_at,...rest})=>rest;
    assert.equal(after.title,'장애물레이스');assert.deepEqual(omit(after),omit(before));
    assert.equal((await catalog.getProgram('quiz-rally')).title,'장애물레이스');
    assert.deepEqual(h.paths.slice(-3),[['/'],['/programs/[id]','page'],['/run/[id]','page']]);
  }finally{await h.close();}
});

test('the program edit API saves a local address, reports invalid links, and permits clearing optional links',async()=>{
  const h=await harness();
  try{
    await fixture(h);await login(h);const api=h.load('app/api/admin/programs/[id]/route.ts');
    const before=await row(h);
    assert.equal((await api.PATCH(request({title:'장애물레이스',url:before.url,worksheetUrl:'/자료/활동지.pdf'},'PATCH'),params('quiz-rally'))).status,200);
    assert.equal((await row(h)).url,before.url);
    const valid=await row(h);
    for(const field of ['url','worksheetUrl','pptUrl','videoUrl','sourceUrl','guideUrl']) {
      const response=await api.PATCH(request({title:'변경되면 안 됨',[field]:'javascript:alert(1)'},'PATCH'),params('quiz-rally'));
      assert.equal(response.status,400);assert.deepEqual(await row(h),valid);
    }
    assert.equal((await api.PATCH(request({title:'장애물레이스',url:''},'PATCH'),params('quiz-rally'))).status,400);
    for(const body of [null,[],2]) assert.equal((await api.PATCH(request(body,'PATCH'),params('quiz-rally'))).status,400);
    assert.equal((await api.PATCH(new Request('http://localhost/test',{method:'PATCH',body:'bad JSON'}),params('quiz-rally'))).status,400);
    assert.equal((await api.PATCH(request({title:'장애물레이스',worksheetUrl:''},'PATCH'),params('quiz-rally'))).status,200);
    assert.equal((await row(h)).worksheet_url,'');assert.equal((await row(h)).url,before.url);
    await api.DELETE(undefined,params('quiz-rally'));const deleted=await row(h);
    assert.equal((await api.PATCH(request({title:'장애물레이스'},'PATCH'),params('quiz-rally'))).status,404);
    assert.deepEqual(await row(h),deleted);
  }finally{await h.close();}
});

test('the rendered admin form submits a changed name with its existing local address to the real edit handler',async()=>{
  const h=await harness();const originalFetch=global.fetch;
  try{
    await fixture(h);await login(h);
    const program=await h.load('lib/db.ts').getProgram('quiz-rally');
    const editing={...program,title:'장애물레이스'};
    const states=[true,'','',[program],[],editing,program.tags.join(', '),false,false,false,program.usageSteps.join('\n')];
    let stateIndex=0;
    const hooks={useState:()=>[states[stateIndex++],()=>{}],useEffect:()=>{},useCallback:fn=>fn};
    const empty={ProgramAssetEditor:()=>null,ProgramOrderList:()=>null};
    const icons=new Proxy({}, {get:()=>()=>null});
    const source=fs.readFileSync(path.join(root,'components/AdminConsole.tsx'),'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const mod={exports:{}};
    const requireLocal=id=>id==='react'?hooks:id==='lucide-react'?icons:id==='./ProgramAssetEditor'||id==='./ProgramOrderList'?empty:id==='@/lib/program-links'?h.load('lib/program-links.ts'):require(id);
    new Function('require','module','exports',compiled)(requireLocal,mod,mod.exports);
    const tree=mod.exports.AdminConsole();
    const html=require('react-dom/server').renderToStaticMarkup(tree);
    assert.ok(html.includes('value="/labs/quiz-rally/index.html"'));assert.ok(html.includes('inputMode="url"'));assert.ok(!html.includes('type="url"'));
    function findForm(node){if(!node||typeof node!=='object')return null;if(node.type==='form'&&node.props.onSubmit)return node;for(const child of [node.props?.children].flat(Infinity)){const found=findForm(child);if(found)return found;}return null;}
    let submitted;
    global.fetch=async(url,options={})=>{
      if(options.method==='PATCH'){submitted=JSON.parse(options.body);return h.load('app/api/admin/programs/[id]/route.ts').PATCH(new Request('http://localhost'+url,options),params('quiz-rally'));}
      return h.load('app/api/admin/data/route.ts').GET();
    };
    const form=findForm(tree);assert.ok(form);
    await form.props.onSubmit({preventDefault(){}});
    assert.equal(submitted.title,'장애물레이스');assert.equal(submitted.url,program.url);
    assert.equal((await row(h)).title,'장애물레이스');assert.equal((await row(h)).url,program.url);
    assert.equal((await row(h)).description,program.description);
  }finally{global.fetch=originalFetch;await h.close();}
});

test('the requested one-time rename changes only titles of nine existing public programs and is idempotent',async()=>{
  const {programRenames,renamePublicPrograms}=await import('../scripts/update-program-names-20261019.mjs');
  const h=await harness();
  try{
    assert.equal(programRenames.length,9);assert.equal(programRenames.find(p=>p.id==='quiz-rally').title,'장애물레이스');
    for(const p of programRenames) await h.pg.query("INSERT INTO programs(id,title,summary,description,category,grade,url,author,assets,usage_steps,display_order,like_count) VALUES ($1,$2,'유지','유지','과학','중2','/existing','교사','[{\"id\":\"keep\"}]','[\"유지\"]',5,7)",[p.id,p.previousTitle]);
    await h.pg.query("INSERT INTO programs(id,title,summary,description,category,grade,url,author,deleted_at,is_published) VALUES ('atom-explorer','삭제된 원자탐험','유지','유지','화학','중2','/retired','교사',NOW(),FALSE)");
    const before=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    assert.ok((await renamePublicPrograms(h.sql)).every(p=>p.status==='renamed'));
    const after=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const keep=rows=>rows.map(({title,updated_at,...rest})=>rest);assert.deepEqual(keep(after),keep(before));
    for(const p of programRenames)assert.equal(after.find(row=>row.id===p.id).title,p.title);
    assert.deepEqual(after.find(row=>row.id==='atom-explorer'),before.find(row=>row.id==='atom-explorer'));
    assert.ok((await renamePublicPrograms(h.sql)).every(p=>p.status==='current'));
    assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,after);
  }finally{await h.close();}
});

test('the explicit rename preserves newer administrator names, missing programs and deletion/publication choices',async()=>{
  const {programRenames,renamePublicPrograms}=await import('../scripts/update-program-names-20261019.mjs');
  const h=await harness();
  try{
    for(const p of programRenames.slice(0,3))await h.pg.query("INSERT INTO programs(id,title,summary,description,category,grade,url,author) VALUES ($1,$2,'소개','설명','과학','중2','/same','교사')",[p.id,p.previousTitle]);
    await h.pg.query("UPDATE programs SET title='주인님이 직접 정한 이름' WHERE id=$1",[programRenames[0].id]);
    await h.pg.query("UPDATE programs SET deleted_at=NOW(),is_published=FALSE WHERE id=$1",[programRenames[1].id]);
    await h.pg.query("UPDATE programs SET is_published=FALSE WHERE id=$1",[programRenames[2].id]);
    const before=(await h.pg.query('SELECT * FROM programs ORDER BY id')).rows;
    const result=await renamePublicPrograms(h.sql);
    assert.equal(result.filter(p=>p.status==='administrator-edit-preserved').length,1);
    assert.equal(result.filter(p=>p.status==='unavailable').length,8);
    assert.deepEqual((await h.pg.query('SELECT * FROM programs ORDER BY id')).rows,before);
  }finally{await h.close();}
});

test('ordinary and preview invocation of the naming script remains read-only',()=>{
  const script='scripts/update-program-names-20261019.mjs';
  const env={...process.env,VERCEL_ENV:'production'};delete env.DATABASE_URL;
  for(const args of [[],['--other'],['--rename-programs-20261019','extra']]){
    const r=spawnSync(process.execPath,[script,...args],{env,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/skipped/);
  }
  const r=spawnSync(process.execPath,[script,'--rename-programs-20261019'],{env:{...env,VERCEL_ENV:'preview'},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/deferred/);
});

test('race page and connection labels use the requested name',()=>{
  const index=fs.readFileSync(path.join(root,'public/labs/quiz-rally/index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'public/labs/quiz-rally/app.js'),'utf8');
  assert.ok(index.includes('<title>장애물레이스 · SciLab</title>'));assert.ok(!index.includes('도시 재가동'));assert.ok(!app.includes('도시 재가동'));
});
