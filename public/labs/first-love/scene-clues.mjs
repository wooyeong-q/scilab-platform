import {EXPLORE} from './exploration.mjs?v=19';
import {STAGES} from './content.mjs?v=19';
import {mechanismFor,discoveryKey} from './mechanism-ui.mjs?v=21';
import {esc,lines} from './puzzle-ui.mjs?v=19';
import {textPages} from './desk-ui.mjs?v=19';
const objects={classroom:['file','clock','plant','cubby'],library:['bookmark','notebook','lamp','shelves'],corridor:['locker','bench','umbrella','window'],club:['megaphone','ribbon','bag','memo']};
export function clueSource(id,role){
 const n=Number(id.slice(1))-1,stage=STAGES[n],ids=objects[stage?.room];
 return ids?EXPLORE[stage.room].find(o=>o.id===ids[(role-1+n)%4]):null;
}
export function clueUse(type){return ({choose:'조건에 맞지 않는 물건을 제외하고, 친구들의 조건도 모두 맞는 하나를 골라요.',order:'단서 속 앞뒤 관계를 찾아, 친구의 기록과 함께 네 물건의 순서를 정해요.',classify:'단서 속 실제 내용과 분류 기준을 비교해, 해당 물건을 맞는 칸에 넣어요.'})[type]||'친구의 단서와 함께 장치의 자료를 비교해요.';}
export function clueRecords(content,state,found){
 const past=(content.archive||[]).flatMap(p=>p.clues.filter(c=>found.includes(discoveryKey(p.id,c.role))).map(c=>({...c,id:p.id,type:p.type,status:'사용 완료'})));
 const p=content.puzzle;
 return [...past,...(p?.cooperative&&state.stage<8?p.clues.map(c=>({...c,id:p.id,type:p.type,status:found.includes(discoveryKey(p.id,c.role))?'발견':'미발견'})):[])];
}
export function clueRecordHTML(records,index,page=0){
 const n=Math.max(0,Math.min(index,records.length-1)),c=records[n];
 const header='<header class="modal-header"><h2 id="modal-title">내 단서함</h2><button data-action="close">장면 보기 ✕</button></header>';
 if(!c)return header+'<div class="clue-empty">아직 기록이 없어요. 장소의 사물을 조사해 보세요.</div>';
 const source=clueSource(c.id,c.role),m=mechanismFor(c.id),known=c.status!=='미발견';
 const pages=textPages(c.text,60),k=Math.max(0,Math.min(page,pages.length-1));
 return `${header}<nav class="clue-record-nav" aria-label="단서 기록 넘기기"><button data-action="clue-record" data-value="${n-1}" ${n===0?'disabled':''}>이전 단서</button><b>${n+1} / ${records.length}</b><button data-action="clue-record" data-value="${n+1}" ${n===records.length-1?'disabled':''}>다음 단서</button></nav><article class="scene-clue-record"><div class="clue-record-status"><b>${c.id} · ${c.role}번 기록</b><span>${c.status}</span></div><h3>${known?esc(c.title):'아직 찾지 못한 기록'}</h3><dl><div><dt>${known?'찾은 곳':'찾을 곳'}</dt><dd>${esc(source?.name||'탐색 장소')}</dd></div><div><dt>쓸 곳</dt><dd>${esc(m.name)}</dd></div></dl><div class="scene-clue-paper"><p>${known?lines(pages[k]):'표시된 사물을 직접 눌러 살펴보세요. 찾은 기록은 이곳에 자동 저장돼요.'}</p>${known&&pages.length>1?`<nav><button data-action="clue-text-page" data-value="${k-1}" ${k===0?'disabled':''}>앞쪽</button><small>${k+1}/${pages.length}</small><button data-action="clue-text-page" data-value="${k+1}" ${k===pages.length-1?'disabled':''}>뒤쪽</button></nav>`:''}</div><p class="clue-use"><b>이렇게 써요</b>${esc(clueUse(c.type))}</p></article><footer class="clue-record-footer">${c.status==='사용 완료'?'<span>이 장치에 사용한 기록이에요.</span>':`<button data-action="search-clues">장소에서 찾기</button>${known?'<button class="primary" data-action="use-clue">이 단서로 장치 보기 →</button>':''}`}</footer>`;
}
