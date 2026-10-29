import {ContentError,COOP_SCHEMA,STAGES,finalAnswer,cabinetMarks,rotated,walk} from './content.mjs';
export const fresh=()=>({version:1,stage:0,solved:[],photos:[],cabinetSeen:false,hints:{},draft:{},draftVersion:0,wrong:0,receipts:[],lastSubmission:null,ending:null,finished:false});
export const branch=(wrong,limits)=>wrong<=limits.positiveMax?'smile':wrong<=limits.neutralMax?'surprise':'disgust';
const fail=(s,status=400)=>{throw new ContentError(s,status);};
export const canonical=v=>JSON.stringify(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v??null);
// Old saved games used one scalar reason. An explicit empty array clears it.
export const chosenReasons=v=>[...new Set((Array.isArray(v?.reasons)?v.reasons:[v?.reason]).map(Number).filter(n=>[1,2,3,4].includes(n)))].sort((a,b)=>a-b);
export function normalizeDraft(stage,p,d={}){
 const out={};if(!d||typeof d!=='object'||Array.isArray(d))return out;
 if(stage===9){out.turns=Number.isInteger(d.turns)&&d.turns>=0&&d.turns<4?d.turns:0;if(Array.isArray(d.sequence)){out.sequence=d.sequence.slice(0,13).map(x=>typeof x==='string'&&/^[A-I]$/.test(x)?x:'');return out;}out.start=typeof d.start==='string'?d.start.slice(0,4):'';out.moves=Array.isArray(d.moves)?d.moves.slice(0,12).filter(x=>['up','right','down','left'].includes(x)):[];out.drawer=/^[A-I]$/.test(d.drawer)?d.drawer:'';return out;}
 if(!p)return out;
 if(p.type==='choose'||(p.type==='deduce'&&Object.hasOwn(d,'picked'))){out.picked=p.items.some(i=>i.id===d.picked)?d.picked:'';return out;}
 if(['order','select-order'].includes(p.type)){out.order=Array.from({length:4},(_,n)=>p.items.some(i=>i.id===d.order?.[n])?d.order[n]:'');if(new Set(out.order.filter(Boolean)).size!==out.order.filter(Boolean).length)fail('같은 카드를 두 칸에 놓을 수 없습니다.');return out;}
 for(const i of p.items){const v=d[i.id];if(p.type==='route-match')out[i.id]={via:p.targets.some(t=>t.kind==='중간'&&t.id===v?.via)?v.via:'',to:p.targets.some(t=>t.kind==='도착'&&t.id===v?.to)?v.to:''};else if(p.type==='deduce'){const reasons=chosenReasons(v);out[i.id]={choice:['가능','제외'].includes(v?.choice)?v.choice:'',reasons,reason:reasons[0]||0};}else out[i.id]=['유지',...p.targets.map(t=>t.id)].includes(v)?v:'';}
 return out;
}
export function complete(stage,p,d,devices){
 if(stage===9){if(Array.isArray(d.sequence))return d.sequence.length===devices.route.length+1&&d.sequence.every(x=>typeof x==='string'&&/^[A-I]$/.test(x));return !!(d.start&&d.drawer&&Array.isArray(d.moves)&&d.moves.length===devices.route.length&&walk(rotated(devices.grid,d.turns),d.start,d.moves));}
 if(p.type==='choose'||(p.type==='deduce'&&Object.hasOwn(d,'picked')))return p.items.some(i=>i.id===d.picked);
 if(['order','select-order'].includes(p.type))return d.order?.length===4&&d.order.every(Boolean)&&new Set(d.order).size===4;
 if(p.type==='route-match')return p.items.every(i=>d[i.id]?.via&&d[i.id]?.to);
 if(p.type==='deduce')return p.items.every(i=>d[i.id]?.choice&&(d[i.id].choice==='가능'||chosenReasons(d[i.id]).length))&&p.items.filter(i=>d[i.id].choice==='가능').length===1;
 return p.items.every(i=>d[i.id]);
}
export function correct(stage,p,d,devices){
 // New clients submit every visited drawer, including the start. Existing open
 // clients retain their original full-path check; a lone drawer never suffices.
 if(stage===9){const a=finalAnswer(devices);if(Array.isArray(d.sequence))return canonical(d.sequence)===canonical(a.sequence);return d.turns===a.turns&&d.start===a.start&&canonical(d.moves)===canonical(devices.route)&&d.drawer===a.drawer;}
 if(p.type==='choose'||(p.type==='deduce'&&Object.hasOwn(d,'picked')))return p.items.find(i=>i.id===d.picked)?.answer===(p.type==='choose'?'선택':'가능');
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
 if(e.type==='inspect-cabinet'){
  if(s.stage!==9)fail('마지막 자료함에서 옆판을 살펴보세요.');
  s.cabinetSeen=true;return {state:s,outcome:'discovered'};
 }
 if(e.type==='hint'){const id=STAGES[s.stage].id;s.hints[id]=Math.min(3,(s.hints[id]||0)+1);return {state:s,outcome:'hint'};}
 if(e.type==='photo'){
  const photos=lesson.schema===COOP_SCHEMA?['desk','cubby','file','clock']:['desk','cubby','file'];
  if(s.stage!==8||!photos.includes(e.id))fail('사진 속 자리에서 확인하세요.');
  const owner=photos.indexOf(e.id)+1;if(!roles.includes(owner))fail('담당 모둠원이 확인하는 사진입니다.',403);
  if(!s.photos.includes(e.id))s.photos.push(e.id);
  if(photos.every(id=>s.photos.includes(id))){s.solved.push('P9');s.stage=9;s.draft={};s.draftVersion++;}return {state:s,outcome:s.stage===9?'correct':'photo'};
 }
 if(!['draft','submit'].includes(e.type))fail('지원하지 않는 동작입니다.');
 if(e.type==='submit'&&s.receipts.some(r=>r.id===e.attemptId))return {state:s,outcome:s.receipts.find(r=>r.id===e.attemptId).outcome,duplicate:true};
 if(e.draftVersion!==s.draftVersion)fail('다른 모둠원이 답안을 바꿨어요. 새 답안을 확인한 뒤 다시 제출하세요.',409);
 if(e.type==='draft'){const d=normalizeDraft(s.stage,p,e.draft);if(canonical(d)!==canonical(s.draft)){s.draft=d;s.draftVersion++;}return {state:s,outcome:'draft'};}
 if(typeof e.attemptId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(e.attemptId))fail('제출 번호를 확인해 주세요.');
 if(s.stage===8||!complete(s.stage,p,s.draft,lesson.devices))return {state:s,outcome:'incomplete'};
 const sequenceAnswer=s.stage===9&&Array.isArray(s.draft.sequence),signature=canonical(sequenceAnswer?{sequence:s.draft.sequence}:s.draft);if(s.lastSubmission?.stage===s.stage&&(sequenceAnswer||s.lastSubmission?.draftVersion===s.draftVersion)&&s.lastSubmission.signature===signature)return {state:s,outcome:s.lastSubmission.outcome,duplicate:true};
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
 if(s.stage>=5&&roles.includes(2))evidence.push({id:'delivery',title:'전달 기록의 메모',text:'이동 표시는 교실 뒤 수납장 옆판에 새겨 두었다.\n맨 아래 줄부터 위로, 각 줄은 왼쪽에서 오른쪽으로 읽는다. 화살표는 화면 기준으로 한 칸씩.'});
 if(s.stage>=8&&roles.includes(3))evidence.push({id:'direction',title:'위치표를 읽는 방향',text:`처음 위치표에서 시계 방향으로 ${d.turns*90}° 회전. 이후 화살표는 화면 기준으로 읽습니다.`});
 if(s.stage>=9&&roles.includes(4))evidence.push({id:'drawers',title:'교실에서 확인한 자료함',text:d.grid.map(symbol=>`${symbol} → ${d.drawers[symbol]}번 자료함`).join(' / ')});
 if(s.stage===8){for(const role of roles)clues.push({role,title:`${role}번의 사진`,text:['책상 위 붉은 끈으로 묶인 파일.','오른쪽 벽의 아홉 칸 자료함.','중앙 왼쪽 책상 위의 파란 파일.',lesson.schema===COOP_SCHEMA?'교실 위쪽 벽에 걸린 둥근 시계.':'세 사진은 같은 교실이다. 자료함의 글자와 표식은 서로 다르니 위치를 확인하자.'][role-1]});}
 if(s.stage===9)for(const role of roles)clues.push({role,title:`${role}번의 연결 기록`,text:['책갈피의 시작 표식도 첫 입력에 포함하자.','수납장 옆판의 표시를 전달 메모의 순서대로 읽자.','위치표 방향을 맞춘 뒤 시작한다.','시작 칸과 지나간 칸을 각각 실제 자료함 글자로 바꾸자.'][role-1]});
 const puzzle=p?{id:p.id,cooperative:!!p.cooperative,type:p.type,room:p.room,title:p.title,task:p.task,reference:p.reference,targets:p.targets,items:p.items.map(({answer,via,original,passes,...i})=>i.owner&&!roles.includes(i.owner)?{id:i.id,label:i.label,owner:i.owner,hidden:true}:{...i,hidden:false}),clues:p.clues.filter(c=>roles.includes(c.role)).map(({role,title,text})=>({role,title,text}))}:null;
 return {schema:lesson.schema,meta:lesson.meta,puzzle,clues,evidence,grid:s.stage>=9?d.grid:[],moveCount:d.route.length,cabinet:{found:s.stage>=9&&!!s.cabinetSeen,marks:s.stage>=9&&s.cabinetSeen?cabinetMarks(d.route):[]}};
}
export function hintsFor(lesson,s){const id=STAGES[s.stage]?.id;const finalHints=['수납장 오른쪽 옆판을 눌러 작은 표시를 살펴보세요.','2번 친구의 전달 메모로 표시를 읽는 순서를 정하고, 책갈피의 시작 표식과 위치표 회전을 함께 확인하세요.',`시작 칸도 포함해 ${lesson.devices.route.length+1}개의 표식을 실제 자료함 글자로 바꿔 순서대로 누르세요. 같은 칸을 다시 지나면 같은 수납함을 한 번 더 눌러요.`];return (lesson.puzzles[s.stage]?.hints||(s.stage===9?finalHints:['사진 속 큰 사물과 교실의 같은 사물을 비교하세요.','파일의 끈, 자료함 배치, 파일 색을 살펴보세요.','담당 사진과 같은 사물을 누르고 기록하세요. 빈자리의 사진은 함께 볼 수 있어요.'])).slice(0,s.hints[id]||0);}
