const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {randomUUID,randomBytes}=require('node:crypto');
const {zipSync,strToU8,unzipSync}=require('fflate');
const {harness}=require('./helpers.cjs');
process.env.DATABASE_URL='postgres://test';
const student=()=>({role:'student',token:randomBytes(32).toString('base64url'),playerId:randomUUID()});
const action=(action,extra={})=>({action,requestId:randomUUID(),...extra});
const sample={prompt:'새 단원 문제',options:['가','나','다','라'],answer:1,explanation:'나가 정답인 이유입니다.',topic:'새 단원'};
async function setup(t){const h=await harness();t.after(()=>h.close());return {h,game:h.load('lib/quiz-rally.ts'),importer:h.load('lib/quiz-rally-import.ts')};}
test('actual Excel template imports cells and its anchored embedded PNG',async t=>{
 const {importer}=await setup(t),bytes=fs.readFileSync('public/labs/quiz-rally/question-template.xlsx');
 const got=await importer.importQuestionFile(bytes,'우리반.xlsx');assert.equal(got.questions.length,3);assert.equal(got.questions[1].answer,2);assert.equal(got.questions[2].image.mime,'image/png');assert.equal(got.questions[0].image,undefined);assert.equal(got.warnings.length,0);assert.equal(got.questions[2].row,4);
 const files=unzipSync(bytes);const media=Object.keys(files).find(n=>n.startsWith('xl/media/'));assert.ok(media);assert.equal(got.questions[2].image.data,Buffer.from(files[media]).toString('base64'));
});
test('CSV quotes/newlines, 500 questions, invalid rows and zip size guards',async t=>{
 const {importer}=await setup(t),header='문제,보기1,보기2,보기3,보기4,정답,해설,단원\r\n';
 const got=await importer.importQuestionFile(Buffer.from('\uFEFF'+header+'"두 줄,\n문제",가,나,다,라,2,"설명 ""인용""",단원'),'문제.csv');assert.equal(got.questions[0].prompt,'두 줄,\n문제');assert.equal(got.questions[0].explanation,'설명 "인용"');
 assert.equal(Object.keys(importer.validateQuestions(Array.from({length:500},()=>sample)).bank).length,500);
 assert.throws(()=>importer.validateQuestions(Array.from({length:501},()=>sample)),/500/);
 assert.throws(()=>importer.validateQuestions([{...sample,options:['가','가','다','라'],row:7}]),/7행/);
 assert.throws(()=>importer.validateQuestions([{...sample,answer:9}]),/정답/);
 await assert.rejects(importer.importQuestionFile(Buffer.alloc(3145729),'문제.xlsx'),/3MB/);
 await assert.rejects(importer.importQuestionFile(Buffer.from(header+'문제,가,나,다,라,0,해설,단원'),'문제.csv'),/2행/);
 const bomb=zipSync({'xl/big.xml':new Uint8Array(11*1024*1024)});await assert.rejects(importer.importQuestionFile(bomb,'bad.xlsx'),/용량/);
 await assert.rejects(importer.importQuestionFile(zipSync({'xl/richData/a.xml':strToU8('<x/>')}),'inside.xlsx'),/셀 내부/);
});
test('retries deduct exactly 20 each, rotate nonce and hide answers until reveal',async t=>{
 const {h,game}=await setup(t),made=await game.createQuizRoom({questions:[sample],durationSeconds:300}),teacher={role:'teacher',token:made.teacherKey,playerId:''},s=student();
 await game.joinQuizRoom(made.code,s,{nickname:'재도전'});await game.actQuizRoom(made.code,teacher,action('start'));
 const internal=async()=>(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[made.code])).rows[0].state.players[s.playerId];
 let p=await internal();const right=p.turn.order.indexOf(1),wrong=[0,1,2,3].filter(i=>i!==right);
 let snap=await game.actQuizRoom(made.code,s,action('answer',{nonce:p.turn.nonce,choice:wrong[0]}));assert.equal(snap.player.turn.feedback.explanation,undefined);assert.equal(snap.player.turn.feedback.correctOption,undefined);assert.equal(snap.player.turn.canRetry,true);
 const retry=action('retry-question',{nonce:p.turn.nonce});await Promise.all([game.actQuizRoom(made.code,s,retry),game.actQuizRoom(made.code,s,retry)]);snap=await game.getQuizSnapshot(made.code,s);assert.equal(snap.player.score,-20);assert.notEqual(snap.player.turn.nonce,p.turn.nonce);
 await assert.rejects(game.actQuizRoom(made.code,s,action('answer',{nonce:p.turn.nonce,choice:right})),/이미/);
 p=await internal();await game.actQuizRoom(made.code,s,action('answer',{nonce:p.turn.nonce,choice:wrong[1]}));snap=await game.actQuizRoom(made.code,s,action('retry-question',{nonce:p.turn.nonce}));assert.equal(snap.player.score,-40);assert.equal(snap.player.turn.retries,2);
 snap=await game.actQuizRoom(made.code,s,action('answer',{nonce:snap.player.turn.nonce,choice:right}));assert.equal(snap.player.score,60);assert.equal(snap.player.correct,1);assert.equal(snap.player.attempted,3);assert.equal(snap.player.turn.feedback.correctOption,right);
 await game.actQuizRoom(made.code,s,action('reward',{nonce:snap.player.turn.nonce,chest:0}));snap=await game.actQuizRoom(made.code,s,action('next',{nonce:snap.player.turn.nonce}));p=await internal();const wrongNow=p.turn.order.findIndex(i=>i!==1);snap=await game.actQuizRoom(made.code,s,action('answer',{nonce:p.turn.nonce,choice:wrongNow}));snap=await game.actQuizRoom(made.code,s,action('reveal',{nonce:p.turn.nonce}));assert.equal(snap.player.turn.feedback.explanation,sample.explanation);await assert.rejects(game.actQuizRoom(made.code,s,action('retry-question',{nonce:p.turn.nonce})),/오답/);
});
test('custom banks and pictures stay isolated; snapshots exclude stored image bytes and all answer keys',async t=>{
 const {h,game,importer}=await setup(t),imported=await importer.importQuestionFile(fs.readFileSync('public/labs/quiz-rally/question-template.xlsx'),'그림.xlsx');
 const a=await game.createQuizRoom({questions:[imported.questions[2]],durationSeconds:300}),b=await game.createQuizRoom({questions:[{...sample,prompt:'다른 반 문제'}],durationSeconds:300});const s=student();
 const snap=await game.joinQuizRoom(a.code,s,{nickname:'그림학생'});assert.equal(snap.questionCount,1);assert.equal(snap.player.turn.prompt,imported.questions[2].prompt);assert.equal(snap.player.turn.feedback,null);assert.equal(JSON.stringify(snap).includes('base64'),false);assert.equal(JSON.stringify(snap).includes('questionIds'),false);
 const imageId=snap.player.turn.imageUrl.split('/').pop();assert.equal((await game.getQuizImage(a.code,imageId)).mime,'image/png');await assert.rejects(game.getQuizImage(b.code,imageId),/그림/);
 await assert.rejects(game.getQuizSnapshot(b.code,s),/참여 정보/);
 const other=await game.joinQuizRoom(b.code,student(),{nickname:'다른반학생'});assert.equal(other.player.turn.prompt,'다른 반 문제');
 const teacher={role:'teacher',token:a.teacherKey,playerId:''};await game.actQuizRoom(a.code,teacher,action('start'));const row=(await h.pg.query('SELECT state FROM quiz_rally_sessions WHERE code=$1',[a.code])).rows[0].state,p=row.players[s.playerId];await game.actQuizRoom(a.code,s,action('answer',{nonce:p.turn.nonce,choice:p.turn.order.findIndex(i=>i!==1)}));await game.actQuizRoom(a.code,teacher,action('end'));const end=await game.getQuizSnapshot(a.code,s);assert.equal(end.player.review.length,1);assert.equal(end.player.review[0].answer,'3개');
});
test('image route returns bytes; upload route handles multipart and rejects cross-origin',async t=>{
 const {h}=await setup(t),route=h.load('app/api/labs/quiz-rally/import/route.ts');const fd=new FormData();fd.set('file',new File([fs.readFileSync('public/labs/quiz-rally/question-template.xlsx')],'template.xlsx'));
 let response=await route.POST(new Request('https://example.com/api/labs/quiz-rally/import',{method:'POST',body:fd}));assert.equal(response.status,200);assert.equal((await response.json()).questions.length,3);
 response=await route.POST(new Request('https://example.com/api/labs/quiz-rally/import',{method:'POST',headers:{origin:'https://other.com'},body:fd}));assert.equal(response.status,403);
});
