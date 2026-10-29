// Subject-independent finite constraints. These grading fields never go to players.
import {ContentError} from '../common-escape/content.mjs';
export const COOP_SCHEMA='TODAY-TO-YOU-2';
export const COOP_TYPES=['choose','order','classify'];
const fail=message=>{throw new ContentError(message);};
const short=(value,label,max,optional=false)=>{
 const text=String(value??'').trim();
 if((!optional&&!text)||text.length>max)fail(`${label}: ${max}자 이내로 작성하세요.`);
 return text;
};
const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,n)=>n!==i)).map(rest=>[x,...rest])):[[]];
export function answerSpace(p){
 if(p.type==='choose')return p.items.map(i=>i.id);
 if(p.type==='order')return permutations(p.items.map(i=>i.id));
 let rows=[{}];for(const item of p.items)rows=rows.flatMap(row=>p.targets.map(t=>({...row,[item.id]:t.id})));return rows;
}
export function constraint(p,rule){
 const ids=p.items.map(i=>i.id),targets=p.targets.map(t=>t.id);
 const alternatives=String(rule).split('|');
 if(!rule||alternatives.length>24)fail(`${p.id}: 검증조건을 확인하세요.`);
 const tests=alternatives.map(part=>{
  const atoms=part.split(';').map(a=>a.trim());if(atoms.length>12)fail(`${p.id}: 검증조건이 너무 복잡합니다.`);
  return atoms.map(atom=>{
   if(p.type==='choose'){
    if(!ids.includes(atom))fail(`${p.id}: 선택형 검증조건에는 자료ID를 |로 연결하세요.`);
    return answer=>answer===atom;
   }
   const m=atom.match(/^([A-F])\s*(!=|=|<|>|!~|~)\s*(T[1-4]|[A-F]|[1-4])$/);
   if(!m||!ids.includes(m[1]))fail(`${p.id}: 검증조건 '${atom}'을 읽을 수 없습니다.`);
   const [,left,op,right]=m;
   if(p.type==='classify'){
    if(!['=','!='].includes(op)||!targets.includes(right))fail(`${p.id}: 분류 검증조건은 A=T1 또는 A!=T1 형태입니다.`);
    return answer=>op==='='?answer[left]===right:answer[left]!==right;
   }
   if(['=','!='].includes(op)&&/^[1-4]$/.test(right))return answer=>op==='='?answer.indexOf(left)===Number(right)-1:answer.indexOf(left)!==Number(right)-1;
   if(!ids.includes(right)||left===right||!['<','>','~','!~'].includes(op))fail(`${p.id}: 순서 검증조건의 자료ID·관계를 확인하세요.`);
   return answer=>{const a=answer.indexOf(left),b=answer.indexOf(right);return op==='<'?a<b:op==='>'?a>b:op==='~'?Math.abs(a-b)===1:Math.abs(a-b)!==1;};
  });
 });
 return answer=>tests.some(and=>and.every(test=>test(answer)));
}
export function answerKey(p){
 if(p.type==='choose')return p.items.find(i=>i.answer==='선택')?.id;
 if(p.type==='order')return [...p.items].sort((a,b)=>Number(a.answer)-Number(b.answer)).map(i=>i.id);
 return Object.fromEntries(p.items.map(i=>[i.id,i.answer]));
}
export function cooperationProof(p){
 const space=answerSpace(p),tests=p.clues.map(c=>constraint(p,c.rule));
 const valid=space.filter(a=>tests.every(t=>t(a)));
 const without=p.clues.map((c,i)=>({role:c.role,count:space.filter(a=>tests.every((t,j)=>i===j||t(a))).length}));
 return {valid,without,total:space.length};
}
export function validateCooperativePuzzle(src,stage){
 const at=`퍼즐 ${stage.id}`;
 if(!COOP_TYPES.includes(src?.type)||src.room!==stage.room)fail(`${at}: 장소는 유지하고 형식은 choose·order·classify 중 선택하세요.`);
 if(!Array.isArray(src.hints)||!Array.isArray(src.clues)||!Array.isArray(src.targets))fail(`${at}: 힌트·단서·대상을 배열로 입력하세요.`);
 const p={...stage,type:src.type,cooperative:true,task:short(src.task,at+' 공동과제',48),reference:short(src.reference,at+' 공통자료',80,true),explanation:short(src.explanation,at+' 해설',2000),hints:(src.hints||[]).map((h,i)=>short(h,at+' 힌트'+(i+1),60))};
 if(p.hints.length!==3)fail(`${at}: 힌트 3개를 입력하세요.`);
 if(!Array.isArray(src.items)||src.items.length>(p.type==='choose'?6:4)||src.items.length<(p.type==='choose'?5:4))fail(`${at}: 선택형은 5~6장, 순서·분류형은 4장입니다.`);
 p.items=src.items.map((item,n)=>{
  if(item.id!=='ABCDEF'[n]||Number(item.owner)!==0)fail(`${at}: 공개 카드는 A부터 순서대로, 담당은 모두 0으로 입력하세요.`);
  if(item.via||item.original||item.passes?.length)fail(`${at}: 중간정답·기준자료·조건통과는 비우고 모둠단서의 검증조건을 사용하세요.`);
  const image=String(item.image||'');if(image&&(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image)||image.length>667000))fail(`${at}: 그림은 500KB 이하 PNG·JPG·WEBP만 가능합니다.`);
  return {id:item.id,label:short(item.label,at+' 카드 이름',12),text:short(item.text,at+' 카드 내용',36,true),owner:0,answer:short(item.answer,at+' 정답',8),via:'',original:'',passes:[],image,alt:short(item.alt,at+' 그림설명',80,true)};
 });
 p.targets=(src.targets||[]).map((t,n)=>{
  if(t.id!=='T'+(n+1)||t.kind!=='대상')fail(`${at}: 대상은 T1부터 순서대로, 종류는 대상입니다.`);
  return {id:t.id,kind:'대상',label:short(t.label,at+' 대상 이름',18)};
 });
 if(p.type==='classify'){
  if(p.targets.length<2||p.targets.length>4||p.items.some(i=>!p.targets.some(t=>t.id===i.answer)))fail(`${at}: 2~4개 대상과 카드의 정답 연결을 확인하세요. 같은 대상에 여러 장을 넣을 수 있습니다.`);
 }else if(p.targets.length)fail(`${at}: 선택·순서형은 대상 시트를 비우세요.`);
 if(p.type==='choose'&&(p.items.filter(i=>i.answer==='선택').length!==1||p.items.some(i=>!['선택','제외'].includes(i.answer))))fail(`${at}: 선택 정답은 하나, 나머지는 제외입니다.`);
 if(p.type==='order'&&p.items.map(i=>i.answer).sort().join('')!=='1234')fail(`${at}: 순서 정답 1~4를 한 번씩 사용하세요.`);
 p.clues=(src.clues||[]).map(c=>({role:Number(c.role),title:short(c.title,at+' 단서 제목',16),text:short(c.text,at+' 개인 단서',90),rule:short(c.rule,at+' 검증조건',500)}));
 if(p.clues.length!==4||p.clues.map(c=>c.role).sort().join('')!=='1234')fail(`${at}: 자리 1~4의 단서가 모두 필요합니다.`);
 if(new Set(p.clues.map(c=>c.text)).size!==4)fail(`${at}: 네 사람에게 서로 다른 관찰·기록·조건을 나누세요.`);
 const proof=cooperationProof(p);
 if(proof.valid.length!==1)fail(`${at}: 네 단서를 합친 정답은 하나여야 합니다. 현재 ${proof.valid.length}개입니다.`);
 if(JSON.stringify(proof.valid[0])!==JSON.stringify(answerKey(p)))fail(`${at}: 검증조건과 자료 시트의 정답이 다릅니다.`);
 for(const row of proof.without)if(row.count<2)fail(`${at}: ${row.role}번 단서 없이도 답이 정해집니다. 해당 단서가 필요한 자료로 수정하세요.`);
 return p;
}
