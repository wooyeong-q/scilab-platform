// Optional local browser regression: PLAYWRIGHT_MODULE=/path/to/playwright
// CHROMIUM_EXECUTABLE=/path/to/chromium node tests/galaxy-browser.cjs
// All requests use an isolated in-process PGlite database, never production.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {harness,root}=require('./helpers.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
process.env.DATABASE_URL='postgres://test:test@localhost/test';
const storageKey='scilab-milky-way-objects-classroom';
async function main(){
  const h=await harness(),errors=[],requests=[];
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost'),match=url.pathname.match(/^\/api\/labs\/galaxy-voyage\/sessions(?:\/([^/]+)\/([^/]+))?$/);
      if(match){
        let body='';for await(const chunk of req)body+=chunk;
        const route=h.load('app/api/labs/galaxy-voyage/sessions/'+(match[1]?'[code]/'+match[2]+'/':'')+'route.ts');
        const response=await route[req.method](new Request(url,{method:req.method,headers:req.headers,...(req.method!=='GET'?{body}: {})}),{params:Promise.resolve({code:match[1]})});
        requests.push({path:url.pathname,status:response.status});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
      }
      const file=path.join(root,'public',decodeURIComponent(url.pathname));
      if(!file.startsWith(path.join(root,'public')+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
    }catch(e){errors.push(e.stack);res.writeHead(500);res.end('test server error')}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  const base=`http://127.0.0.1:${server.address().port}/labs/galaxy-voyage/index.html?experience=milky-way-objects`;
  async function page(){const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);return p}
  try{
    const teacher=await page();await teacher.locator('#createClassButton').click();await teacher.waitForFunction(()=>document.getElementById('createdClassCode').textContent.length===6);
    const code=await teacher.locator('#createdClassCode').textContent();
    const a=await page(),b=await page();
    for(const [p,name]of [[a,'Student A'],[b,'Student B']]){await p.locator('#classCodeInput').fill(code);await p.locator('#playerNameInput').fill(name);await p.locator('#joinClassButton').click();await p.waitForFunction(()=>document.querySelector('.brandText').textContent.includes('시작 대기'))}
    await teacher.getByRole('button',{name:'교사 모드 · 분류 / 관전',exact:true}).click();await teacher.waitForFunction(()=>document.querySelector('[data-teacher="status"]').textContent.includes('2명'));
    await teacher.locator('[data-teacher="start"]').click();await a.waitForFunction(()=>document.querySelector('.brandText').textContent.includes('남은 시간'),{},{timeout:20000});
    const saved=await a.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey),game=h.load('lib/galaxy-voyage.ts'),args=[code,saved.player.id,saved.playerKey];
    await a.bringToFront();await a.evaluate(()=>document.activeElement?.blur());const moved=a.waitForResponse(r=>r.url().endsWith('/sync')&&r.request().postDataJSON()?.position?.[2]>0,{timeout:8000});await a.keyboard.down('w');await a.waitForTimeout(600);await a.keyboard.up('w');await moved;
    assert.ok((await h.pg.query('SELECT flight_z FROM galaxy_voyage_players WHERE id=$1',[saved.player.id])).rows[0].flight_z>0);
    // Fixture: four already completed observations, and restore near the fifth.
    for(const key of ['eagle','omega','north-america','rosette'])await game.applyGalaxyScoreEvent(...args,'observation',key);
    const index=5,angle=(index+.65)*2.3999632297,radius=1280+(index*223)%980,yRadius=690+(index%5)*175;
    const camera={x:Math.round(Math.cos(angle)*radius),y:Math.round(Math.sin(angle*1.31)*yRadius),z:1100+(index*467)%1850-250,yaw:0,pitch:0};
    // Lose the first response after its transaction commits. The client must
    // retain the event, then recover it using the same key after a reload.
    let lost=false;
    await a.route('**/events',async route=>{if(!lost&&route.request().postDataJSON()?.reference==='lagoon'){lost=true;await route.fetch();await route.abort('failed')}else await route.continue()});
    await a.evaluate(({storageKey,camera})=>{const value=JSON.parse(localStorage.getItem(storageKey));value.voyageState={...value.voyageState,camera};localStorage.setItem(storageKey,JSON.stringify(value))},{storageKey,camera});
    // pagehide saves the current camera: use an init script to model a persisted
    // prior browser checkpoint immediately before the restored page executes.
    await a.addInitScript(({storageKey,camera})=>{const value=JSON.parse(localStorage.getItem(storageKey));if(value){value.voyageState={...value.voyageState,camera};localStorage.setItem(storageKey,JSON.stringify(value))}},{storageKey,camera});
    await a.reload();await a.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.pendingEvents?.some(e=>e.reference==='lagoon'),storageKey);
    await a.reload();await a.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.pendingEvents?.length===0,storageKey,{timeout:15000});
    await a.waitForFunction(()=>document.getElementById('expeditionScore').textContent==='100');
    assert.equal((await h.pg.query("SELECT COUNT(*)::int AS n FROM galaxy_voyage_score_events WHERE actor_id=$1 AND event_key='observation:lagoon'",[saved.player.id])).rows[0].n,1);
    await a.locator('#scanButton').click();await a.locator('.sampleCard[data-id="lagoon"]').click();await a.locator('.classBin[data-type="emission"]').click();
    await a.waitForFunction(()=>document.getElementById('expeditionScore').textContent==='300');
    await teacher.bringToFront();await teacher.waitForFunction(()=>document.querySelector('[data-teacher="students"]').textContent.includes('Student A · 300점'),{},{timeout:10000});
    await a.bringToFront();await a.reload();await a.waitForFunction(()=>document.getElementById('expeditionScore').textContent==='300');
    const ids=await a.evaluate(key=>JSON.parse(localStorage.getItem(key)).player.id,storageKey);assert.equal(ids,saved.player.id);
    await h.pg.query("UPDATE galaxy_voyage_sessions SET started_at=NOW()-INTERVAL '1 hour' WHERE code=$1",[code]);
    await a.waitForFunction(()=>document.querySelector('.brandText').textContent.includes('수업 종료'),{},{timeout:10000});await a.reload();await a.waitForFunction(()=>document.querySelector('.brandText').textContent.includes('수업 종료'));
    assert.ok(await a.evaluate(key=>!!localStorage.getItem(key),storageKey));await a.getByRole('button',{name:'새 수업 참여',exact:true}).click();await a.waitForFunction(key=>!localStorage.getItem(key),storageKey);assert.equal(requests.filter(r=>/\/(scoreboard)$/.test(r.path)).length,0);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',checks:['teacher create and start','two student browser contexts','keyboard movement saved','lost committed response and reload recovery','one observation reward','classification saved','teacher progress updated','student identity restored','ended results retained','single sync endpoint','no browser or server exceptions']},null,2));
  }finally{await browser.close();await new Promise(r=>server.close(r));await h.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
