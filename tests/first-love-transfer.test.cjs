const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test:test@localhost/test';

test('teacher progress responses omit unchanged lesson images, preserve live teams and require teacher authorization',async()=>{
 const h=await harness();
 try {
  const {createService}=await import('../lib/first-love/service.mjs');
  const {ESCAPE_SAMPLE}=await import('../public/labs/first-love/escape-sample.mjs');
  const service=createService(async(sql,params)=>(await h.pg.query(sql,params)).rows);
  const room=await service.create({lesson:ESCAPE_SAMPLE});
  const token=randomBytes(32).toString('hex');await service.join(room.code,token,{name:'학생',team:1,role:1});
  const full=await service.getTeacher(room.code,room.teacherKey),compact=await service.getTeacher(room.code,room.teacherKey,true);
  const {lesson,...progress}=full;assert.deepEqual(compact,progress);assert.ok(lesson.puzzles.some(p=>p.items.some(i=>i.image?.startsWith('data:image/'))));
  const fullBytes=Buffer.byteLength(JSON.stringify(full)),compactBytes=Buffer.byteLength(JSON.stringify(compact));
  assert.ok(compactBytes<fullBytes/10,`${compactBytes}/${fullBytes} bytes`);
  const started=await service.teacherAction(room.code,room.teacherKey,{action:'start'});assert.ok(started.lesson);
  assert.equal((await service.getTeacher(room.code,room.teacherKey,true)).status,'playing');
  await assert.rejects(service.getTeacher(room.code,randomBytes(32).toString('hex'),true),e=>e.status===403);
  await service.teacherAction(room.code,room.teacherKey,{action:'end'});
  const ended=await service.getTeacher(room.code,room.teacherKey,true);assert.equal(ended.status,'ended');assert.equal(ended.teams[0].members[0].name,'학생');assert.equal(ended.lesson,undefined);
  // The real HTTP route exposes compact progress only behind the same teacher key.
  const api=h.load('app/api/labs/first-love/sessions/[code]/route.ts'),context={params:Promise.resolve({code:room.code})};
  const response=await api.GET(new Request('http://localhost/session?compact=1',{headers:{'x-teacher-key':room.teacherKey}}),context);
  assert.equal(response.status,200);assert.deepEqual(await response.json(),ended);assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal((await api.GET(new Request('http://localhost/session?compact=1'),context)).status,401);
  console.log(`Teacher poll payload: ${fullBytes} -> ${compactBytes} bytes`);
 } finally {await h.close();}
});
