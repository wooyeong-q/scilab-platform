const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const mod={exports:{}};
const output=ts.transpileModule(fs.readFileSync('lib/program-catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','module',output)(mod.exports,mod);
const {programSubject,groupPrograms,selectPrograms,rememberProgram}=mod.exports;
function program(id,category,values={}){
 return {id,title:id,summary:'탐구 활동',category,grade:'중학교 2학년',tags:[],...values};
}

test('unit labels group into science subjects without changing saved categories or losing unfamiliar areas',()=>{
 const values=[program('chem','화학'),program('space','별과 우주'),program('rock','지질'),program('crust','지권의 변화'),program('new','환경 교육')];
 const before=structuredClone(values);
 const groups=groupPrograms(values);
 assert.deepEqual(groups.map(g=>[g.name,g.programs.length]),[['지구과학',3],['화학',1],['환경 교육',1]]);
 assert.deepEqual(values,before);
 assert.equal(programSubject(program('physics','빛과 파동')),'물리');
 assert.equal(programSubject(program('bio','생명과학')),'생명과학');
 assert.equal(programSubject(program('other','')),'기타');
 assert.equal(groups.flatMap(g=>g.programs).length,values.length);
});

test('search combines subject, unit, grade and tags while filters and empty results remain consistent',()=>{
 const values=[program('물질 확대','화학',{tags:['원자','분자']}),program('은하 탐사','별과 우주',{tags:['천체 분류']})];
 assert.deepEqual(selectPrograms(values,'지구과학 중학교','전체','recommended').map(p=>p.id),['은하 탐사']);
 assert.deepEqual(selectPrograms(values,'원자 중학교','화학','recommended').map(p=>p.id),['물질 확대']);
 assert.deepEqual(selectPrograms(values,'원자','지구과학','recommended'),[]);
 assert.deepEqual(selectPrograms(values,'없는 검색어','전체','recommended'),[]);
 assert.equal(selectPrograms(values,'   ','전체','recommended').length,2);
});

test('recommendation and popularity sorts are deterministic and do not mutate the input',()=>{
 const values=[program('가','화학',{likeCount:5,viewCount:10}),program('나','별과 우주',{featured:true,likeCount:1,viewCount:30}),program('다','화학',{likeCount:9,viewCount:20})];
 const before=structuredClone(values);
 assert.deepEqual(selectPrograms(values,'','전체','recommended').map(p=>p.id),['나','다','가']);
 assert.deepEqual(selectPrograms(values,'','전체','popular').map(p=>p.id),['다','가','나']);
 assert.deepEqual(selectPrograms(values,'','전체','views').map(p=>p.id),['나','다','가']);
 assert.deepEqual(values,before);
});

test('a malformed recent-program value cannot prevent navigation',()=>{
 let saved;
 global.localStorage={getItem:()=>JSON.stringify({wrong:'format'}),setItem:(_,value)=>saved=JSON.parse(value)};
 rememberProgram('chosen');assert.deepEqual(saved,['chosen']);
 global.localStorage={getItem:()=>JSON.stringify(['chosen','earlier',7]),setItem:(_,value)=>saved=JSON.parse(value)};
 rememberProgram('chosen');assert.deepEqual(saved,['chosen','earlier']);
 global.localStorage={getItem:()=>{throw new Error('storage denied')}};
 assert.doesNotThrow(()=>rememberProgram('chosen'));
 delete global.localStorage;
});
