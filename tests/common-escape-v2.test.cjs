const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomBytes}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
let pg,service,SAMPLE,contract,engine,importWorkbook;
const token=()=>randomBytes(32).toString('hex');
before(async()=>{
 contract=await import('../public/labs/common-escape/content.mjs');engine=await import('../public/labs/common-escape/engine.mjs');({SAMPLE}=await import('../public/labs/common-escape/sample.mjs'));({importWorkbook}=await import('../lib/common-escape/import.mjs'));
 pg=await PGlite.create();await pg.exec(fs.readFileSync('scripts/schema.sql','utf8'));
 const {createService}=await import('../lib/common-escape/service.mjs');service=createService(async(sql,params)=>(await pg.query(sql,params)).rows);
});
after(async()=>pg.close());
function solution(p){if(['order','select-order'].includes(p.type))return p.items.filter(i=>i.answer!=='제외').sort((a,b)=>Number(a.answer)-Number(b.answer)).map(i=>i.id);if(p.type==='compare')return ['STORY1','STORY2',...p.items.filter(i=>i.answer==='수정').map(i=>i.id)];return Object.fromEntries(p.items.map(i=>[i.id,i.answer]));}
function otherLesson(){const l=structuredClone(SAMPLE);l.meta={title:'과학 자료 교체 검사',subject:'과학',unit:'물질의 상태',grade:'중학교'};
 const descriptions=['얼음이 녹기 전','물 일부가 수증기가 된 뒤','얼음이 모두 녹은 뒤','수증기를 냉각한 뒤'];
 l.puzzles[0].task='제시된 가열·냉각 과정의 순서로 기록을 배치하세요.';
 const ranks=['1','3','2','4'];l.puzzles[0].items.forEach((i,n)=>{i.text=descriptions[n];i.answer=ranks[n];});
 l.puzzles[0].clues.forEach((c,n)=>{c.text=['처음에는 얼음을 가열한다.','녹은 물을 계속 가열하면 일부가 기체가 된다.','얼음이 모두 녹는 과정은 기화보다 먼저이다.','마지막에는 수증기를 냉각한다.'][n];});
 // The remaining records are deliberately test fixtures, not a published science lesson.
 l.devices.photoDigits={chair:'0',book:'9',notice:'4'};l.devices.photoOrder=['notice','chair','book'];l.devices.key={'○':'3','△':'0','□':'7','☆':'2','◇':'5','＋':'4'};
 return contract.validateLesson(l);
}
test('same contract round-trips all six sheets; changed curriculum and device answers replace old answers',()=>{
 assert.deepEqual(contract.fromSheets(contract.toSheets(SAMPLE)),SAMPLE);
 const other=otherLesson();assert.equal(contract.answerMatches(other.puzzles[0],solution(SAMPLE.puzzles[0])),false);assert.equal(contract.answerMatches(other.puzzles[0],solution(other.puzzles[0])),true);
 assert.notEqual(contract.exitCode(other.devices),contract.exitCode(SAMPLE.devices));assert.equal(other.devices.photoOrder.map(id=>other.devices.photoDigits[id]).join(''),'409');
 const bad=structuredClone(SAMPLE);bad.puzzles[2].items[0].answer='missing';assert.throws(()=>contract.validateLesson(bad),/P3/);
 const absent=structuredClone(SAMPLE);absent.puzzles[4].clues.pop();assert.throws(()=>contract.validateLesson(absent),/P5/);
 const mismatch=structuredClone(SAMPLE);mismatch.puzzles[3].items[0].answer='일치';assert.throws(()=>contract.validateLesson(mismatch),/정답과 다릅니다/);
 const route=structuredClone(SAMPLE);route.devices.route=['up','up','up','up','up','up'];assert.throws(()=>contract.validateLesson(route),/배치표 밖/);
 const duplicate=contract.toSheets(SAMPLE);duplicate.자료.push(duplicate.자료[1]);assert.throws(()=>contract.fromSheets(duplicate),/중복/);
});
test('new puzzles require selection, two-axis placement and a unique reachable circuit pattern',async()=>{
 const box=SAMPLE.puzzles.find(p=>p.id==='P8'),matrix=SAMPLE.puzzles.find(p=>p.id==='P9'),circuit=SAMPLE.puzzles.find(p=>p.id==='P10');
 assert.equal(contract.answerMatches(box,['B','D','E','H']),false);
 assert.equal(contract.answerMatches(box,['D','E','A','H']),false);
 assert.equal(contract.answerMatches(box,['D','E','H','A']),true);
 const invalid=structuredClone(SAMPLE);invalid.puzzles.find(p=>p.id==='P8').items[1].answer='1';assert.throws(()=>contract.validateLesson(invalid),/P8/);
 const axes=structuredClone(SAMPLE);axes.puzzles.find(p=>p.id==='P9').targets[3].label='다른 행|다른 열';assert.throws(()=>contract.validateLesson(axes),/행1/);
 const {circuitLamps}=await import('../public/labs/common-escape/expansion.mjs');
 const patterns=Array.from({length:16},(_,mask)=>circuitLamps([0,1,2,3].map(n=>!!(mask&(1<<n)))));
 assert.equal(new Set(patterns.map(p=>p.join(','))).size,16,'all target states are reachable without multiple switch solutions');
 assert.equal(patterns.filter(bits=>contract.answerMatches(circuit,Object.fromEntries(bits.map((on,n)=>[circuit.items[n].id,on?'켜짐':'꺼짐'])))).length,1);
 for(const id of contract.PLAY_ORDER){const s=engine.previewState(id);assert.ok(contract.unlockedPuzzles(s).includes(id),id+' preview must have its required evidence');}
 for(const p of [box,matrix,circuit]){
  const state=engine.previewState(p.id),view=contract.playerContent(SAMPLE,[1,3,4],state).puzzles.find(v=>v.id===p.id);
  assert.ok(view.items.filter(i=>i.owner===2).every(i=>i.hidden&&i.text===undefined&&i.answer===undefined));
  assert.equal(view.clues.some(c=>c.role===2),false);
  assert.ok(contract.playerContent(SAMPLE,[1,2,3,4],state).puzzles.find(v=>v.id===p.id).items.every(i=>!i.hidden));
 }
});
test('older seven-puzzle lessons and saved progress upgrade without losing curriculum or completion',()=>{
 const old=structuredClone(SAMPLE);old.schema='LAST-BROADCAST-2';old.puzzles=old.puzzles.slice(0,7);
 const upgraded=contract.validateLesson(old);assert.equal(upgraded.puzzles.length,10);assert.deepEqual(upgraded.puzzles[0],old.puzzles[0]);
 assert.match(upgraded.puzzles.find(p=>p.id==='P8').task,/오늘 보관한 기록/);
 const saved=engine.restore({...engine.fresh(),version:5,flags:['locker','locker-open','locker-records','returns','script','compared','power','order','unlocked'],finished:true});
 assert.ok(saved.flags.includes('archive')&&saved.flags.includes('monitor')&&saved.flags.includes('relay'));assert.equal(saved.finished,true);
});
test('world events are tied to progress and place, and never repeat after being seen',async()=>{
 const {WORLD_EVENTS,nextWorldEvent}=await import('../public/labs/common-escape/world-events.mjs');
 for(const e of WORLD_EVENTS){const s=engine.fresh();s.room=e.room;assert.equal(nextWorldEvent(s),undefined);s.flags.push(e.flag);assert.equal(nextWorldEvent(s)?.id,e.id);s.room='classroom';assert.equal(nextWorldEvent(s),undefined);s.room=e.room;s.seen.push('event:'+e.id);assert.equal(nextWorldEvent(s),undefined);}
});
async function fullGame(lesson,roles){
 const session=await service.create({lesson}),players=[];
 for(const role of roles){const key=token();players.push({key,role,state:await service.join(session.code,key,{name:'학생 '+role,team:1,role})});}
 assert.equal(players[0].state.state.started,false);
 await assert.rejects(service.event(session.code,players[0].key,{type:'collect',id:'desk1',room:'classroom'}),/선생님이/);
 await service.teacherAction(session.code,session.teacherKey,{action:'start'});
 const send=(player,event)=>service.event(session.code,player.key,event);
 const caller=role=>players.find(p=>p.role===role)||players[0];
 if(roles.length===4)await assert.rejects(send(players[0],{type:'collect',id:'desk2',room:'classroom'}),e=>e.status===403);
 await Promise.all(engine.CARDS.map((id,n)=>send(caller(n+1),{type:'collect',id,room:'classroom'})));
 let current=await service.state(session.code,players[0].key);
 assert.equal(current.state.cards.length,4);assert.equal(current.state.flags.includes('locker'),false);
 assert.equal(await service.state(session.code,players[0].key,current.group.revision),null);
 const own=current.content.puzzles[0];assert.equal('answer' in own.items[0],false);
 for(const item of own.items)if(!current.allowedRoles.includes(item.owner)){assert.equal(item.hidden,true);assert.equal(item.text,undefined);}
 for(let n=0;n<5;n++){
   const p=lesson.puzzles[n],type=engine.PUZZLE_EVENTS[p.id],room=engine.ROOM_FOR[type];
   if(n===2){
     let early=await send(players[0],{type:'script',room:'library',answer:solution(p)});assert.equal(early.accepted,false);
     const box=lesson.puzzles.find(p=>p.id==='P8');
     early=await send(players[0],{type:'archive',room:'library',answer:solution(box)});assert.equal(early.accepted,false);
     current=await send(players[0],{type:'box-open',room:'library'});assert.equal(current.accepted,true);
     current=await send(players[0],{type:'archive',room:'library',answer:solution(box)});assert.equal(current.accepted,true);
   }
   if(n===3){
     let early=await send(players[0],{type:'transcript',room:'broadcast'});assert.equal(early.accepted,false);
     const monitor=lesson.puzzles.find(p=>p.id==='P9');
     current=await send(players[0],{type:'monitor',room:'broadcast',answer:solution(monitor)});assert.equal(current.accepted,true);
     await send(players[0],{type:'transcript',room:'broadcast'});
   }
   current=await send(players[0],{type,room,answer:[]});assert.equal(current.accepted,false);
   current=await send(players[n%players.length],{type,room,answer:solution(p)});assert.equal(current.accepted,true,p.id);
   if(n===0){
     assert.equal(engine.inventory(current.state).some(i=>i.id==='slip'||i.id==='key'),false);
     assert.equal(current.content.puzzles.some(p=>p.id==='P2'),false);
     assert.equal(current.evidence.some(e=>e.key),false);
     let early=await send(players[0],{type:'locker-records',room:'classroom'});assert.equal(early.accepted,false,'closed locker cannot grant records');
     early=await send(players[0],{type:'returns',room:'library',answer:solution(lesson.puzzles[1])});assert.equal(early.accepted,false,'solving P1 does not unlock P2');
     current=await send(players[0],{type:'locker-open',room:'classroom'});assert.equal(current.accepted,true);
     assert.equal(engine.inventory(current.state).some(i=>i.id==='slip'),false);
     const restored=await service.state(session.code,players[0].key);assert.equal(restored.state.flags.includes('locker-open'),true);assert.equal(restored.state.flags.includes('locker-records'),false);
     current=await send(players[0],{type:'locker-records',room:'classroom'});assert.equal(current.accepted,true);
     assert.ok(engine.inventory(current.state).some(i=>i.id==='slip'));assert.ok(current.content.puzzles.find(p=>p.id==='P2').items.every(i=>i.hidden&&i.unfound&&!i.text));
     early=await send(players[0],{type:'returns',room:'library',answer:solution(lesson.puzzles[1])});assert.equal(early.accepted,false,'unfound common books cannot be used');
     for(const [i,id]of Object.keys(engine.LIBRARY_BOOKS).entries()){
       current=await send(players[i%players.length],{type:'library-book',id,room:'library'});assert.equal(current.accepted,true);
       assert.equal(current.content.puzzles.find(p=>p.id==='P2').items.filter(i=>!i.hidden).length,i+1);
       const peer=await service.state(session.code,players.at(-1).key);assert.equal(peer.content.puzzles.find(p=>p.id==='P2').items.find(i=>i.id===id).text,lesson.puzzles[1].items.find(i=>i.id===id).text);
     }
     current=await send(players[0],{type:'library-book',id:'A',room:'library'});assert.equal(current.state.libraryBooks.length,4);
   }
   if(n===3){const visible=(await service.state(session.code,players[0].key)).content.puzzles.find(p=>p.id==='P4');assert.equal(visible.items[0].original,undefined);assert.equal(visible.clues.length,current.allowedRoles.length);}
 }
 await Promise.all(engine.PHOTOS.map((id,n)=>send(caller(n+1),{type:'photo',id,room:({chair:'classroom',book:'library',notice:'entrance'})[id]})));
 const drawer=lesson.devices.photoOrder.map(id=>lesson.devices.photoDigits[id]).join('');
 current=await send(players[0],{type:'order',room:'broadcast',code:drawer});assert.equal(current.accepted,true);
 current=await send(players[0],{type:'unlock',room:'entrance',code:contract.exitCode(lesson.devices)});assert.equal(current.accepted,false,'relay check is required');
 current=await send(players[0],{type:'relay',room:'entrance',answer:solution(lesson.puzzles.find(p=>p.id==='P10'))});assert.equal(current.accepted,true);
 current=await send(players[0],{type:'unlock',room:'entrance',code:contract.exitCode(lesson.devices)});assert.equal(current.accepted,true);
 current=await send(players[0],{type:'exit',room:'entrance'});assert.equal(current.state.finished,true);
 for(const p of players){const v=await service.state(session.code,p.key);assert.equal(v.state.finished,true);assert.equal(v.evidence.length,v.allowedRoles.length);}
 return {session,players};
}
test('four players solve the ten-stage story through actual private materials and server answer checks',async()=>{await fullGame(SAMPLE,[1,2,3,4]);});
test('one, two and three players can finish; a replaced lesson requires its own order and lock codes',async()=>{for(const roles of [[1],[1,2],[1,2,3]])await fullGame(otherLesson(),roles);});
test('resume distinguishes unlocked, inspected and collected records while preserving version 4 progress',()=>{
 const pending={...engine.fresh(),started:true,flags:['locker','locker-open']};
 const restored=engine.restore(JSON.parse(JSON.stringify(pending)));assert.equal(restored.flags.includes('locker-records'),false);assert.equal(engine.inventory(restored).length,0);
 const legacy=engine.restore({...pending,version:4,flags:['locker','returns']});assert.ok(legacy.flags.includes('locker-records'));assert.equal(legacy.libraryBooks.length,4);assert.equal(legacy.version,6);
 const waiting=engine.restore({...pending,version:4,flags:['locker']});assert.ok(waiting.flags.includes('locker-records'));assert.equal(waiting.libraryBooks.length,0);
});
test('concurrent seat claim, vacant role loss/recovery, isolation, removal and ended sessions',async()=>{
 const s=await service.create({lesson:SAMPLE}),key=token();let a=await service.join(s.code,key,{name:'첫 학생',team:1,role:1});assert.deepEqual(a.allowedRoles,[1,2,3,4]);
 const k2=token(),k3=token();const joined=await Promise.allSettled([service.join(s.code,k2,{name:'둘째',team:1,role:2}),service.join(s.code,k3,{name:'다른 학생',team:1,role:2})]);assert.equal(joined.filter(v=>v.status==='fulfilled').length,1);
 const otherKey=joined[0].status==='fulfilled'?k2:k3;const other=joined.find(v=>v.status==='fulfilled').value;
 a=await service.state(s.code,key);assert.deepEqual(a.allowedRoles,[1,3,4]);
 assert.equal((await service.join(s.code,key,{name:'첫 학생',team:1,role:1})).me.id,a.me.id);
 await service.teacherAction(s.code,s.teacherKey,{action:'start'});
 const sameRoleOtherTeam=token();const otherTeam=await service.join(s.code,sameRoleOtherTeam,{name:'다른 모둠',team:2,role:1});assert.equal(otherTeam.state.cards.length,0);
 await service.event(s.code,key,{type:'collect',id:'desk1',room:'classroom'});
 assert.equal((await service.state(s.code,sameRoleOtherTeam)).state.cards.length,0);
 await assert.rejects(service.teacherAction(s.code,token(),{action:'remove',playerId:other.me.id}),e=>e.status===403);
 await service.teacherAction(s.code,s.teacherKey,{action:'remove',playerId:other.me.id});a=await service.state(s.code,key);assert.deepEqual(a.allowedRoles,[1,2,3,4]);
 await assert.rejects(service.state(s.code,otherKey),e=>e.status===401);
 await assert.rejects(service.event(s.code,key,{type:'unlock',room:'classroom',code:'0'}),/해당 장소/);
 await assert.rejects(service.event(s.code,key,{type:'hint',room:'classroom',id:'P7'}),/아직 찾지/);
 await assert.rejects(service.event(s.code,key,{type:'patch-state',finished:true}),/지원하지/);
 const separate=await service.create({lesson:SAMPLE});await assert.rejects(service.state(separate.code,key),e=>e.status===401);
 await service.teacherAction(s.code,s.teacherKey,{action:'end'});await assert.rejects(service.event(s.code,key,{type:'collect',id:'desk2',room:'classroom'}),/종료/);
 assert.equal((await service.state(s.code,key)).group.status,'ended');
});
test('real exported .xlsx imports as the exact authoring contract; blank teacher template names required input',async()=>{
 const file=process.env.ESCAPE_FIXTURE_XLSX||'tests/fixtures/common-escape-filled.xlsx';
 const result=await importWorkbook(fs.readFileSync(file),'fixture.xlsx');assert.deepEqual(result.lesson,SAMPLE);assert.deepEqual(result.warnings,[]);
 await assert.rejects(importWorkbook(fs.readFileSync('public/labs/common-escape/common-escape-template.xlsx'),'blank.xlsx'),/설정 · 과목/);
 await assert.rejects(importWorkbook(new Uint8Array(3*1024*1024+1),'big.xlsx'),/3MB/);
 await assert.rejects(importWorkbook(new Uint8Array([1,2,3]),'bad.xlsx'),/읽지 못/);
 await assert.rejects(importWorkbook(new Uint8Array([1]),'old.csv'),/지원하지/);
});
