// Exercise actual rendered actions with a small DOM adapter. This checks the
// controller flow; it is deliberately not a browser/layout test.
import assert from 'node:assert/strict';
const events={},timers=new Map(),saved=new Map(),effects=[],worldEffects=[];let nextTimer=0;
class Element{
 constructor(){this.innerHTML='';this.textContent='';this.open=false;this.isConnected=true;this.handlers={};const tokens=new Set();this.classList={add:x=>tokens.add(x),remove:x=>tokens.delete(x),contains:x=>tokens.has(x),toggle(x,on){if(on??!tokens.has(x))tokens.add(x);else tokens.delete(x);}};}
 set innerHTML(value){this.markup=value;this.version=(this.version||0)+1;}
 get innerHTML(){return this.markup;}
 addEventListener(n,f){(this.handlers[n]??=[]).push(f)}
 showModal(){this.open=true}
 close(){if(!this.open)return;this.open=false;queueMicrotask(()=>{for(const f of this.handlers.close||[])f()})}
 insertAdjacentHTML(_pos,html){this.innerHTML+=html;if(html.includes('data-world-event='))worldEffects.push(html);if(html.includes('class="apparition '))effects.push({html,pan:elements['.scene-pan'].scrollLeft});}
 querySelector(){return {addEventListener(){},insertAdjacentHTML:(_pos,html)=>{this.innerHTML+=html}}}
 querySelectorAll(){return []}
 focus(){document.activeElement=this}
 getBoundingClientRect(){return{left:0,right:1000,top:0,bottom:1000}}
}
const elements=Object.fromEntries(['#app','#dialog','#dialog-content','#toast','.scene-inner','.scene-pan','#lock-readout'].map(id=>[id,new Element()]));
Object.assign(elements['.scene-pan'],{scrollLeft:0,scrollWidth:700,clientWidth:360});
let endingVersion=0;
globalThis.document={body:new Element(),activeElement:null,querySelector(s){const html=elements['#dialog-content'].innerHTML;if(s==='#dialog-title')return{textContent:html.match(/id="dialog-title">([^<]*)/)?.[1]||''};if(s==='.lock-panel'){const lock=html.match(/class="lock-panel" data-lock="([^"]+)"/)?.[1];return lock?{dataset:{lock}}:null;}if(s==='.ending'||s==='#ending-observation'){if(!elements['#app'].innerHTML.includes('class="ending"'))return null;if(endingVersion!==elements['#app'].version){endingVersion=elements['#app'].version;elements['.ending']=new Element();elements['#ending-observation']=new Element();}}return elements[s]||null},querySelectorAll(){return[]},addEventListener(n,f){(events[n]??=[]).push(f)}};
globalThis.window={matchMedia(){return {matches:process.env.COMMON_ESCAPE_MOTION!=='1'}}};
globalThis.localStorage={getItem(k){return saved.get(k)||null},setItem(k,v){saved.set(k,v)},removeItem(k){saved.delete(k)}};
globalThis.setTimeout=(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id};
globalThis.clearTimeout=id=>timers.delete(id);
if(process.env.COMMON_ESCAPE_OPENING){
 const {fresh}=await import('../public/labs/common-escape/engine.mjs');
 const resume=fresh();resume.started=true;resume.seen=['opening:door'];
 if(process.env.COMMON_ESCAPE_OPENING==='broadcast')resume.seen.push('opening:broadcast');
 saved.set('scilab-common-escape-solo-v2',JSON.stringify({state:resume}));
}
let previewAuthor;
if(!process.env.COMMON_ESCAPE_PREVIEW){const {Author}=await import('../public/labs/common-escape/author.mjs');const show=Author.prototype.show;Author.prototype.show=function(){previewAuthor=this;return show.call(this);};}
if(process.env.COMMON_ESCAPE_PREVIEW){
 const {readFileSync}=await import('node:fs'),{runInThisContext}=await import('node:vm');
 const source=readFileSync(process.env.COMMON_ESCAPE_PREVIEW,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
 runInThisContext(source,{filename:'common-escape-preview.js'});
 const parsed=await window.__commonEscapeImport(readFileSync(new URL('./fixtures/common-escape-filled.xlsx',import.meta.url)),'sample.xlsx');
 assert.equal(parsed.lesson.meta.subject,'수학');
}else await import('../public/labs/common-escape/app.mjs');
async function flush(){for(let n=0;n<12;n++){await Promise.resolve();const tasks=[...timers].filter(([,t])=>t.delay<=3000||t.delay===5400);if(!tasks.length)return;for(const[id,t]of tasks){timers.delete(id);t.fn()}}throw new Error('UI timers did not settle');}
async function click(action,id){
 const html=elements[elements['#dialog'].open?'#dialog-content':'#app'].innerHTML;
 const tags=html.match(/<button\b[^>]*>/g)||[];
 assert.ok(tags.some(t=>t.includes(`data-action="${action}"`)&&(!id||t.includes(`data-id="${id}"`))&&!/\sdisabled/.test(t)),`No enabled rendered action ${action} ${id||''}`);
 const target={dataset:{action,...(id?{id}:{} )}};
 for(const f of events.click||[])await f({target:{closest(){return target}}});
 await flush();
}
async function closeAll(){let count=0;while(elements['#dialog'].open){assert.ok(count++<5,'Modal queue did not settle');await click('close');}}
async function go(room){await click('map');await click('move',room)}
async function key(key){let handled=false;for(const f of events.keydown||[])await f({key,preventDefault(){handled=true}});await flush();assert.ok(handled,`Unhandled lock key ${key}`);}
async function digits(lock,value){for(const n of value)await click('lock-digit',`${lock}:${n}`);}

const {SAMPLE}=await import('../public/labs/common-escape/sample.mjs');
const html=()=>elements['#dialog-content'].innerHTML;
const getState=()=>JSON.parse(saved.get('scilab-common-escape-solo-v2')).state;
async function solve(n){
 const p=SAMPLE.puzzles[n-1];
 await click('puzzle-role','4');await click('puzzle-hint');
 assert.match(html(),/힌트 1/);
 if(p.type==='compare'){
   await click('puzzle-mark','C2');await click('puzzle-submit');assert.match(html(),/아직 맞지/);await click('puzzle-reset');
   for(const id of ['STORY1','STORY2',...p.items.filter(i=>i.answer==='수정').map(i=>i.id)])await click('puzzle-mark',id);
 }else if(p.type==='circuit'){
   await click('puzzle-flip','0');await click('puzzle-submit');assert.match(html(),/아직 맞지/);await click('puzzle-reset');
   const {circuitLamps}=await import('../public/labs/common-escape/expansion.mjs');
   const mask=Array.from({length:16},(_,n)=>n).find(n=>circuitLamps([0,1,2,3].map(i=>!!(n&(1<<i)))).every((on,i)=>on===(p.items[i].answer==='켜짐')));
   assert.notEqual(mask,undefined);for(let i=0;i<4;i++)if(mask&(1<<i))await click('puzzle-flip',String(i));
 }else{
   for(const i of p.items.filter(i=>i.answer!=='제외')){await click('puzzle-select',i.id);await click('puzzle-place',['order','select-order'].includes(p.type)?String(Number(i.answer)-1):i.answer);}
 }
 await click('puzzle-submit');assert.match(html(),n===1?/사물함의 잠금이 풀렸다/:/복구된 기록/);await closeAll();
}
await click(process.env.COMMON_ESCAPE_OPENING?'resume':'new');
assert.equal(getState().room,'entrance');
if(process.env.COMMON_ESCAPE_OPENING!=='broadcast'){
 assert.match(html(),/잠긴 현관문/);assert.doesNotMatch(html(),/교실로 이동해 주십시오/);
 assert.match(html(),/배경음·효과음 끄기/);assert.equal(getState().sound,true);await click('sound');assert.equal(getState().sound,false);assert.match(html(),/배경음·효과음 켜기/);await click('sound');assert.equal(getState().sound,true);
 await click('opening-next');
}
assert.match(html(),/현관 스피커에서 들린 방송/);assert.match(html(),/교실로 이동해 주십시오/);
await click('opening-next');assert.match(html(),/교실에 남겨진 기록을 찾으세요/);await closeAll();
await click('settings');assert.match(html(),/소리 확인/);for(const room of ['classroom','library','broadcast','entrance','ending'])await click('sound-scene',room);await click('sound-test');assert.equal(getState().sound,true);await closeAll();
assert.equal(getState().room,'entrance','broadcast does not teleport the player');
assert.ok(getState().seen.includes('opening:complete'));
assert.match(elements['#app'].innerHTML,/교실에 남겨진 기록을 찾으세요/);
await go('entrance');await click('inspect','terminal');assert.match(html(),/화면이 꺼져/);await closeAll();
await go('broadcast');await click('inspect','control');assert.match(html(),/덮개가 잠겨/);await closeAll();
await click('inspect','drawer');assert.match(html(),/data-id="drawer" disabled/);await closeAll();
await go('classroom');assert.match(elements['#app'].innerHTML,/data-scene-part="blood-trail"/);await click('inspect','blood');assert.match(html(),/scene-detail/);assert.match(html(),/손으로 끌고 간/);await closeAll();
for(const [spot,id]of [['board','board'],['desk','desk1'],['desk','desk2'],['notebook','notebook']]){await click('inspect',spot);await click('collect',id);await closeAll();}
await click('inspect','locker');
assert.ok((events.dragstart||[]).length===1);assert.ok((events.drop||[]).length===1);
await solve(1);
assert.equal(getState().flags.includes('locker-records'),false);assert.doesNotMatch(elements['#app'].innerHTML,/data-id="slip"|data-id="key"/);
await go('library');await click('inspect','returns');assert.doesNotMatch(html(),/data-action="puzzle-select"/);await closeAll();
await go('classroom');await click('inspect','locker');await click('locker-open');
assert.match(html(),/사물함 안의 봉투/);assert.match(html(),/도서관 반납함/);assert.match(elements['#app'].innerHTML,/data-scene-part="open-locker"/);
assert.doesNotMatch(elements['#app'].innerHTML,/data-id="slip"|data-id="key"/);await closeAll();
await click('home');await click('resume');await closeAll();await click('inspect','locker');assert.match(html(),/사물함 안의 봉투/);await click('locker-take');await closeAll();
assert.match(elements['#app'].innerHTML,/data-id="slip"/);assert.match(elements['#app'].innerHTML,/data-id="key"/);
await go('library');await click('inspect','returns');assert.match(html(),/모은 책 0\/4권/);assert.doesNotMatch(html(),/data-action="puzzle-select"/);await closeAll();
for(const [id,spot]of [['A','checkout'],['B','books'],['C','footprints'],['D','book']]){
 await click('inspect',spot);assert.match(html(),/반납하지 않은 책/);await click('library-book-take',id);assert.match(html(),/책 속의 기록/);await closeAll();
 assert.doesNotMatch(elements['#app'].innerHTML,new RegExp('data-scene-book="'+id+'"'));
}
assert.equal(getState().libraryBooks.length,4);await click('item','library-books');assert.match(html(),/찾아낸 반납 도서/);await closeAll();
await click('inspect','returns');await solve(2);
assert.ok(getState().seen.includes('event:box'));assert.match(elements['#app'].innerHTML,/data-scene-part="fallen-box"/);
await click('inspect','books');assert.match(html(),/열쇠는 보관 상자/);await closeAll();
await click('inspect','fallen-box');await click('box-open');await closeAll();
await click('home');await click('resume');await closeAll();assert.ok(getState().flags.includes('box-open'));
await click('inspect','fallen-box');await solve(8);
await click('inspect','books');await solve(3);
assert.match(elements['#app'].innerHTML,/방송실에서 화면에 남은 기록을 확인하세요/);
await click('item','script');assert.match(html(),/실제 방송은 <strong>방송실<\/strong>에 녹음됩니다/);await closeAll();
await go('broadcast');assert.ok(getState().seen.includes('event:monitor'));
await click('inspect','recorder');assert.match(html(),/기록 복원이 필요/);await closeAll();
await click('inspect','monitor');await solve(9);
await click('inspect','recorder');await solve(4);
await click('inspect','control');await solve(5);
await click('item','photos');assert.doesNotMatch(html(),/교실의 의자|뒤집힌 책|접힌 게시물/);await click('photo-detail','chair');assert.doesNotMatch(html(),/data-action="move"/);await closeAll();
for(const [room,id]of [['entrance','notice'],['library','book'],['classroom','chair']]){await go(room);await click('inspect',id);await click('photo-found',id);await closeAll();}
await go('broadcast');await click('inspect','drawer');
await digits('drawer','52');await click('lock-submit','drawer');assert.match(html(),/끝까지 입력/);await digits('drawer','7');await click('lock-submit','drawer');assert.match(html(),/잠금이 풀리지 않는다/);assert.equal(getState().flags.includes('order'),false);
for(let i=0;i<3;i++)await key('Backspace');for(const n of '257')await key(n);await key('Enter');await closeAll();
await go('entrance');assert.ok(getState().seen.includes('event:blackout'));
await click('inspect','terminal');assert.match(html(),/비상 회로 점검판/);await closeAll();
await click('inspect','relay');await solve(10);
await click('inspect','terminal');assert.doesNotMatch(html(),/68198/);assert.match(html(),/5자리/);assert.match(html(),/지나가되 적지 않는다/);
assert.match(html(),/board-exit left/);await click('rotate-grid','-1');assert.match(html(),/board-exit bottom/);assert.equal(getState().gridTurns,3);
await digits('exit','68128');await click('lock-submit','exit');assert.match(html(),/잠금이 풀리지 않는다/);assert.equal(getState().flags.includes('unlocked'),false);
for(let i=0;i<5;i++)await click('lock-erase','exit');await digits('exit','68198');await click('lock-submit','exit');await closeAll();
await click('inspect','door');await click('exit');assert.match(elements['#app'].innerHTML,/학교 밖으로/);
const ending=document.querySelector('.ending'),observation=document.querySelector('#ending-observation');
assert.equal(ending.classList.contains('visitor-visible'),false,'ending starts with an empty window');
assert.equal(observation.textContent,'');
assert.equal([...timers.values()].filter(t=>t.delay===4800).length,1,'the exit action schedules the reveal once');
assert.equal(getState().finished,true);assert.equal(getState().photos.length,3);assert.equal(getState().seen.filter(x=>x.startsWith('scare:')).length,4);
if(process.env.COMMON_ESCAPE_MOTION==='1'){
 assert.equal(worldEffects.length,3);assert.match(worldEffects[0],/event-box/);assert.match(worldEffects[1],/event-monitor/);assert.match(worldEffects[2],/event-blackout/);
 assert.equal(effects.length,4);
 assert.match(effects[0].html,/visitor-glass/);assert.equal(effects[0].pan,340);
 assert.match(effects[1].html,/visitor-shelf/);assert.equal(effects[1].pan,0);
 assert.match(effects[2].html,/visitor-monitor/);assert.equal(effects[2].pan,170);
 assert.match(effects[3].html,/visitor-hand-mask/);assert.equal(Math.round(effects[3].pan),296);
 assert.equal(elements['.scene-pan'].scrollLeft,0,'return to the previous scene position');
}else assert.equal(effects.length,0,'reduced motion omits apparitions');
await click('journal');assert.match(html(),/17:41/);
const [revealId,reveal]=[...timers].find(([,t])=>t.delay===4800);timers.delete(revealId);reveal.fn();
assert.equal(ending.classList.contains('visitor-visible'),false,'wait while the journal covers the ending');
await closeAll();assert.match(observation.textContent,/실루엣/);
assert.equal(ending.classList.contains('visitor-visible'),process.env.COMMON_ESCAPE_MOTION==='1');
assert.equal(observation.classList.contains('visible'),process.env.COMMON_ESCAPE_MOTION!=='1','reduced motion uses a visible text alternative');
if(process.env.COMMON_ESCAPE_MOTION==='1'){
 const [hideId,hide]=[...timers].find(([,t])=>t.delay===6200);timers.delete(hideId);hide.fn();
 assert.equal(ending.classList.contains('visitor-visible'),false,'the final silhouette disappears after its brief glimpse');
 assert.match(observation.textContent,/사라졌다/);
}
await click('home');assert.match(elements['#app'].innerHTML,/교사 · 수업 준비/);
await click('ending-replay');const replayEnding=document.querySelector('.ending');
const staleReveal=[...timers.values()].find(t=>t.delay===4800);assert.ok(staleReveal);
await click('home');assert.equal([...timers.values()].some(t=>t.delay===4800),false,'leaving cancels the reveal');
staleReveal.fn();assert.equal(replayEnding.classList.contains('visitor-visible'),false,'a stale callback cannot reveal or play audio after leaving');
await click('author');assert.match(elements['#app'].innerHTML,/방탈출 수업 준비/);
console.log('PASS: opening, sound controls, ten puzzles, three environmental events, four apparitions, delayed ending, journal pause, replay/cancel, reduced motion and teacher entry. DOM adapter only, not browser layout/audio.');

if(!process.env.COMMON_ESCAPE_PREVIEW){
 const {PLAY_ORDER,exitCode}=await import('../public/labs/common-escape/content.mjs');
 const {circuitLamps}=await import('../public/labs/common-escape/expansion.mjs');
 const unchanged=saved.get('scilab-common-escape-solo-v2'),scares=effects.length,world=worldEffects.length;
 const lesson=structuredClone(SAMPLE);lesson.meta.title='업로드한 교사 자료';previewAuthor.lesson=lesson;
 for(const pid of PLAY_ORDER){
  await previewAuthor.action('stage',pid);await flush();
  assert.match(html(),/수업 준비로 돌아가기/);assert.doesNotMatch(elements['#app'].innerHTML,/class="game"/);
  const p=lesson.puzzles.find(p=>p.id===pid);
  if(pid==='P6'||pid==='P7'){
   const lock=pid==='P6'?'drawer':'exit';
   if(pid==='P6'){await click('photo-detail','chair');assert.match(html(),/지금 눈앞의 모습/);await click('preview-problem');}
   else {await click('rotate-grid','1');}
   await click('device-hints',pid);assert.match(html(),/힌트 1/);await click('preview-problem');
   const answer=pid==='P6'?lesson.devices.photoOrder.map(id=>lesson.devices.photoDigits[id]).join(''):exitCode(lesson.devices);
   await digits(lock,answer);await click('lock-submit',lock);
  }else{
   await click('puzzle-role','4');await click('puzzle-hint');assert.match(html(),/힌트 1/);
   if(p.type==='compare'){for(const id of ['STORY1','STORY2',...p.items.filter(i=>i.answer==='수정').map(i=>i.id)])await click('puzzle-mark',id);}
   else if(p.type==='circuit'){
    const mask=Array.from({length:16},(_,n)=>n).find(n=>circuitLamps([0,1,2,3].map(i=>!!(n&(1<<i)))).every((on,i)=>on===(p.items[i].answer==='켜짐')));
    for(let i=0;i<4;i++)if(mask&(1<<i))await click('puzzle-flip',String(i));
   }else for(const i of p.items.filter(i=>i.answer!=='제외')){await click('puzzle-select',i.id);await click('puzzle-place',['order','select-order'].includes(p.type)?String(Number(i.answer)-1):i.answer);}
   await click('puzzle-submit');
  }
  assert.match(html(),/정답입니다/);assert.doesNotMatch(html(),/복구된 기록|열린 문/);
  await click('preview-exit');assert.match(elements['#app'].innerHTML,/방탈출 수업 준비/);
  assert.equal(previewAuthor.lesson.meta.title,lesson.meta.title);assert.equal(saved.get('scilab-common-escape-solo-v2'),unchanged);
 }
 await previewAuthor.action('stage','P1');await click('close');assert.match(elements['#app'].innerHTML,/방탈출 수업 준비/);
 await previewAuthor.action('stage','P7');elements['#dialog'].close();await flush();assert.match(elements['#app'].innerHTML,/방탈출 수업 준비/);
 assert.equal(effects.length,scares);assert.equal(worldEffects.length,world);assert.equal(saved.get('scilab-common-escape-solo-v2'),unchanged);
 console.log('PASS: all ten isolated previews, answer checks, hints, photo comparison, rotation, early back/close/Escape, uploaded lesson retention and unchanged saved progress; no horror or next-stage events.');
}
