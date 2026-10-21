import {ContentError,STAGES,finalAnswer,rotated,walk} from './content.mjs';
export const fresh=()=>({version:1,stage:0,solved:[],photos:[],hints:{},draft:{},draftVersion:0,wrong:0,receipts:[],lastSubmission:null,ending:null,finished:false});
export const branch=(wrong,limits)=>wrong<=limits.positiveMax?'smile':wrong<=limits.neutralMax?'surprise':'disgust';
const fail=(s,status=400)=>{throw new ContentError(s,status);};
export const canonical=v=>JSON.stringify(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v??null);
// Old saved games used one scalar reason. An explicit empty array clears it.
export const chosenReasons=v=>[...new Set((Array.isArray(v?.reasons)?v.reasons:[v?.reason]).map(Number).filter(n=>[1,2,3,4].includes(n)))].sort((a,b)=>a-b);
export function normalizeDraft(stage,p,d={}){
 const out={};if(!d||typeof d!=='object'||Array.isArray(d))return out;
 if(stage===9){out.turns=Number.isInteger(d.turns)&&d.turns>=0&&d.turns<4?d.turns:0;out.start=typeof d.start==='string'?d.start.slice(0,4):'';out.moves=Array.isArray(d.moves)?d.moves.slice(0,12).filter(x=>['up','right','down','left'].includes(x)):[];out.drawer=/^[A-I]$/.test(d.drawer)?d.drawer:'';return out;}
 if(!p)return out;
 if(['order','select-order'].includes(p.type)){out.order=Array.from({length:4},(_,n)=>p.items.some(i=>i.id===d.order?.[n])?d.order[n]:'');if(new Set(out.order.filter(Boolean)).size!==out.order.filter(Boolean).length)fail('같은 카드를 두 칸에 놓을 수 없습니다.');return out;}
 for(const i of p.items){const v=d[i.id];if(p.type==='route-match')out[i.id]={via:p.targets.some(t=>t.kind==='중간'&&t.id===v?.via)?v.via:'',to:p.targets.some(t=>t.kind==='도착'&&t.id===v?.to)?v.to:''};else if(p.type==='deduce'){const reasons=chosenReasons(v);out[i.id]={choice:['가능','제외'].includes(v?.choice)?v.choice:'',reasons,reason:reasons[0]||0};}else out[i.id]=['유지',...p.targets.map(t=>t.id)].includes(v)?v:'';}
 return out;
}
export function complete(stage,p,d,devices){
 if(stage===9)return !!(d.start&&d.drawer&&Array.isArray(d.moves)&&d.moves.length===devices.route.length&&walk(rotated(devices.grid,d.turns),d.start,d.moves));
 if(['order','select-order'].includes(p.type))return d.order?.length===4&&d.order.every(Boolean)&&new Set(d.order).size===4;
 if(p.type==='route-match')return p.items.every(i=>d[i.id]?.via&&d[i.id]?.to);
 if(p.type==='deduce')return p.items.every(i=>d[i.id]?.choice&&(d[i.id].choice==='가능'||chosenReasons(d[i.id]).length))&&p.items.filter(i=>d[i.id].choice==='가능').length===1;
 return p.items.every(i=>d[i.id]);
}
export function correct(stage,p,d,devices){
 if(stage===9){const a=finalAnswer(devices);return d.turns===a.turns&&d.start===a.start&&canonical(d.moves)===canonical(devices.route)&&d.drawer===a.drawer;}
 if(['order','select-order'].includes(p.type))return d.order.every((id,n)=>p.items.find(i=>i.id===id)?.answer===String(n+1));
 if(p.type==='route-match')return p.items.every(i=>d[i.id].via===i.via&&d[i.id].to===i.answer);
 if(p.type==='deduce')return p.items.every(i=>d[i.id]?.choice===i.answer&&(i.answer==='가능'||(chosenReasons(d[i.id]).length>0&&chosenReasons(d[i.id]).every(n=>!i.passes.includes(n)))));
 return p.items.every(i=>d[i.id]===i.answer);
}
export function transition(state,e,lesson,roles=[1,2,3,4]){
 const s=structuredClone(state),p=lesson.puzzles[s.stage];
 if(e.type==='confess'){if(s.stage!==10)fail('먼저 편지 봉투를 찾아 주세요.',409);if(!s.ending)s.ending=branch(s.wrong,lesson.endings);s.finished=true;return {state:s,outcome:'ending'};}
 if(s.stage>=10)fail('퍼즐 구간이 끝났습니다.',409);
 if(e.stage!==s.stage)fail('모둠이 다음 단계로 이동했습니다. 화면을 확인하세요.',409);
 if(e.type==='hint'){const id=STAGES[s.stage].id;s.hints[id]=Math.min(3,(s.hints[id]||0)+1);return {state:s,outcome:'hint'};}
 if(e.type==='photo'){
  if(s.stage!==8||!['desk','cubby','file'].includes(e.id))fail('사진 속 자리에서 확인하세요.');
  const owner=['desk','cubby','file'].indexOf(e.id)+1;if(!roles.includes(owner))fail('담당 모둠원이 확인하는 사진입니다.',403);
  if(!s.photos.includes(e.id))s.photos.push(e.id);
  if(s.photos.length===3){s.solved.push('P9');s.stage=9;s.draft={};s.draftVersion++;}return {state:s,outcome:s.stage===9?'correct':'photo'};
 }
 if(!['draft','submit'].includes(e.type))fail('지원하지 않는 동작입니다.');
 if(e.type==='submit'&&s.receipts.some(r=>r.id===e.attemptId))return {state:s,outcome:s.receipts.find(r=>r.id===e.attemptId).outcome,duplicate:true};
 if(e.draftVersion!==s.draftVersion)fail('다른 모둠원이 답안을 바꿨어요. 새 답안을 확인한 뒤 다시 제출하세요.',409);
 if(e.type==='draft'){const d=normalizeDraft(s.stage,p,e.draft);if(canonical(d)!==canonical(s.draft)){s.draft=d;s.draftVersion++;}return {state:s,outcome:'draft'};}
 if(typeof e.attemptId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(e.attemptId))fail('제출 번호를 확인해 주세요.');
 if(s.stage===8||!complete(s.stage,p,s.draft,lesson.devices))return {state:s,outcome:'incomplete'};
 const signature=canonical(s.draft);if(s.lastSubmission?.stage===s.stage&&s.lastSubmission?.draftVersion===s.draftVersion&&s.lastSubmission.signature===signature)return {state:s,outcome:s.lastSubmission.outcome,duplicate:true};
 const good=correct(s.stage,p,s.draft,lesson.devices),outcome=good?'correct':'wrong';
 s.lastSubmission={stage:s.stage,draftVersion:s.draftVersion,signature,outcome};s.receipts.push({id:e.attemptId,outcome});s.receipts=s.receipts.slice(-256);
 if(good){s.solved.push(STAGES[s.stage].id);s.stage++;s.draft={};s.draftVersion++;if(s.stage===10&&!s.ending)s.ending=branch(s.wrong,lesson.endings);}else s.wrong++;
 return {state:s,outcome};
}
export function previewState(stage){const s=fresh();s.stage=stage;s.solved=STAGES.slice(0,stage).map(p=>p.id);if(stage>=9)s.photos=['desk','cubby','file'];return s;}
export function publicState(s){const {wrong,receipts,lastSubmission,ending,...rest}=s;return {...rest,ending:s.finished?ending:null};}
export function playerContent(lesson,roles,s){
 const p=lesson.puzzles[s.stage],d=lesson.devices,clues=[];
 const evidence=[];
 if(s.stage>=2&&roles.includes(1))evidence.push({id:'bookmark',title:'둘이 쓰던 책갈피',text:`이 부분 알려 줘서 고마워.\n시작 표식: ${d.start}`});
 if(s.stage>=5&&roles.includes(2))evidence.push({id:'delivery',title:'전달 순서 기록',text:'화면 기준으로 '+d.route.map(x=>({up:'↑',right:'→',down:'↓',left:'←'})[x]).join(' ')+'\n화살표마다 한 칸. 시작 칸에서는 이동하지 않습니다.'});
 if(s.stage>=8&&roles.includes(3))evidence.push({id:'direction',title:'위치표를 읽는 방향',text:`처음 위치표에서 시계 방향으로 ${d.turns*90}° 회전. 이후 화살표는 화면 기준으로 읽습니다.`});
 if(s.stage>=9&&roles.includes(4))evidence.push({id:'drawers',title:'교실에서 확인한 자료함',text:d.grid.map(symbol=>`${symbol} → ${d.drawers[symbol]}번 자료함`).join(' / ')});
 if(s.stage===8){for(const role of roles)clues.push({role,title:`${role}번의 사진`,text:['책상 위 붉은 끈으로 묶인 파일.','오른쪽 벽의 아홉 칸 자료함.','중앙 왼쪽 책상 위의 파란 파일.','세 사진은 같은 교실이다. 자료함의 글자와 표식은 서로 다르니 위치를 확인하자.'][role-1]});}
 if(s.stage===9)for(const role of roles)clues.push({role,title:`${role}번의 연결 기록`,text:['책갈피의 시작 표식을 확인하자.','전달 기록의 화살표는 화면 기준이다.','위치표 방향을 맞춘 뒤 시작한다.','마지막 표식을 실제 자료함 글자와 대응한다.'][role-1]});
 const puzzle=p?{id:p.id,type:p.type,room:p.room,title:p.title,task:p.task,reference:p.reference,targets:p.targets,items:p.items.map(({answer,via,original,passes,...i})=>i.owner&&!roles.includes(i.owner)?{id:i.id,label:i.label,owner:i.owner,hidden:true}:{...i,hidden:false}),clues:p.clues.filter(c=>roles.includes(c.role))}:null;
 return {meta:lesson.meta,puzzle,clues,evidence,grid:s.stage>=9?d.grid:[],moveCount:d.route.length};
}
export function hintsFor(lesson,s){const id=STAGES[s.stage]?.id;return (lesson.puzzles[s.stage]?.hints||['사진 속 큰 사물과 교실의 같은 사물을 비교하세요.','단서함의 책갈피·전달 기록·방향·자료함을 함께 읽으세요.','방향 맞추기 → 시작 표식 선택 → 한 칸씩 이동 → 자료함 선택 순서입니다.']).slice(0,s.hints[id]||0);}
