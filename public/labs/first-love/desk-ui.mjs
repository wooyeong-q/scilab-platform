import {esc,lines,progress} from './puzzle-ui.mjs?v=19';
const btn=(label,action,value='',extra='')=>`<button data-action="${action}" data-value="${esc(value)}" ${extra}>${label}</button>`;
// Legacy paragraphs remain fully reachable via explicit pages, never ellipsis
// or tiny type. The new authoring limits fit one card without paging.
export function textPages(text,limit=88){
 const chars=Array.from(String(text||'')),pages=[];
 while(chars.length){let n=Math.min(limit,chars.length);if(n<chars.length){const chunk=chars.slice(0,n).join(''),breaks=[...chunk.matchAll(/\n/g)];if(breaks.length>3)n=breaks[3].index+1;const cut=chars.slice(0,n).join('').search(/[\s.,。!?][^\s.,。!?]{0,18}$/);if(cut>limit/2)n=cut+1;}pages.push(chars.splice(0,n).join(''));}
 return pages.length?pages:[''];
}
export function clueDeck(p,compact=false){
 return p.clues.map(c=>({role:c.role,title:c.title,pages:textPages([c.text,...(!p.cooperative?p.items.filter(i=>i.owner===c.role&&!i.hidden).map(i=>`${i.label}\n${i.text}`):[])].join('\n\n'),compact?56:88)}));
}
export function notesHTML(notes,view){
 const index=Math.min(view.note||0,Math.max(0,notes.length-1)),note=notes[index];if(!note)return '<p>이번 장면의 단서를 확인하세요.</p>';
 const page=Math.min(view.page||0,note.pages.length-1);
 return `<div class="note-tabs" role="group" aria-label="볼 수 있는 단서">${notes.map((n,i)=>btn(`${n.role}번 단서`,'note',i,`aria-pressed="${i===index}"`)).join('')}</div><article class="desk-note"><h3>${esc(note.title)}</h3><p>${lines(note.pages[page])}</p></article>${note.pages.length>1?`<nav class="note-pages" aria-label="단서 내용 페이지">${btn('이전','note-page',page-1,page===0?'disabled':'')}<span>${page+1} / ${note.pages.length}</span>${btn('다음','note-page',page+1,page===note.pages.length-1?'disabled':'')}</nav>`:''}${btn('단서 크게 보기','note-open','','class="note-expand"')}`;
}
const labelText=i=>i.hidden?'친구 단서':i.text?.length>36||i.text?.split('\n').length>2?'내용 보기에서 확인':i.text||'';
function publicCard(i,action,active,placed,compact=false,badge=''){compact=compact&&((i.text||'').length>8||!!i.image||i.label.length>8);return `<article class="desk-card ${active?'chosen':''} ${placed?'is-placed':''}">${btn(`<strong><em class="card-index">${badge}</em>${esc(shortLabel(i.label,compact?4:12))}</strong>${i.image&&!i.hidden?`<img src="${esc(i.image)}" alt="${esc(i.alt)}">`:''}<span>${lines(compact&&!i.hidden?'':labelText(i))}</span>${placed?'<small>배치됨</small>':''}`,action,i.id,`aria-label="${esc(i.label)} ${action==='pick'?'선택':'카드'}" aria-pressed="${!!active}"`)}${!i.hidden&&(i.text?.length>36||i.text?.split('\n').length>2||i.label.length>12||i.image||compact)?btn('내용 보기','detail',i.id,'class="card-detail"'):''}</article>`;}
function shortLabel(s,max=18){return s.length>max?s.slice(0,max)+'…':s;}
export function boardHTML(p,d,selected,tight=false){
 if(['choose','deduce'].includes(p.type))return `<div class="desk-cards choose-cards count-${p.items.length}">${p.items.map((i,n)=>publicCard(i,'pick',d.picked===i.id,false,tight||p.items.length>6,'ABCDEFGH'[n])).join('')}</div>`;
 if(['compare','route-match'].includes(p.type))return `<div class="desk-rows">${p.items.map(i=>`<article><div>${!i.hidden?btn(esc(shortLabel(i.label,8))+' ↗','detail',i.id,'aria-label="'+esc(i.label)+' 내용 보기"'):`<b>${esc(shortLabel(i.label,8))}</b><small>친구 단서</small>`}</div>${p.type==='compare'?btn(esc(d[i.id]==='유지'?'그대로 유지':shortLabel(p.targets.find(t=>t.id===d[i.id])?.label||'판단 고르기',8)),'field-menu',i.id):['via','to'].map((part,n)=>btn(`${n+1}. ${esc(shortLabel(p.targets.find(t=>t.id===d[i.id]?.[part])?.label||(part==='via'?'중간 선택':'도착 선택'),6))}`,'field-menu',i.id+':'+part)).join('')}</article>`).join('')}</div>`;
 const order=['order','select-order'].includes(p.type),assigned=id=>order?d.order?.includes(id):!!d[id];
 const cards=`<div class="desk-cards count-${p.items.length}">${p.items.map((i,n)=>publicCard(i,'select',selected===i.id,assigned(i.id),tight||p.items.length>6,'ABCDEFGH'[n])).join('')}</div>`;
 const targets=order?[1,2,3,4].map((n)=>({id:n-1,label:n+'번째'})):p.targets;
 return `${cards}<div class="desk-targets ${order?'order-targets':''} count-${targets.length}" aria-label="답안 놓는 곳">${targets.map(t=>{const placed=p.items.filter(i=>order?d.order?.[t.id]===i.id:d[i.id]===t.id);return `<div>${btn(`<b>${esc(shortLabel(t.label.replace('|',' · '),10))}</b><span>${placed.length?placed.map(i=>'ABCDEFGH'[p.items.indexOf(i)]).join(' · '):'＋ 놓기'}</span>`,'place',t.id,`data-drop="${esc(t.id)}" class="${placed.length?'filled':''}" aria-label="${esc(t.label)}에 놓기"`)}${t.label.length>10?btn('기준 보기','target-detail',t.id,'class="desk-unplace"'):''}${placed.length?btn('취소','unplace',t.id,'class="desk-unplace" aria-label="'+esc(t.label)+' 배치 취소"'):''}</div>`;}).join('')}</div>`;
}
export function overlayHTML(p,view){
 const o=view.overlay;if(!o)return '';
 let title='',text='',options=[];
 if(o.kind==='detail'){const i=p.items.find(i=>i.id===o.id);if(!i||i.hidden)return '';title='카드 내용';text=i.label+'\n'+i.text;}
 if(o.kind==='reference'){title='풀이 기준';text=[p.task,p.reference].filter(Boolean).join('\n\n');}
 if(o.kind==='hint'){title='풀이 힌트';text=o.text;}
 if(o.kind==='note'){title=o.title;text=o.text;}
 if(o.kind==='target'){title='분류 기준';text=p.targets.find(t=>t.id===o.id)?.label||'';}
 if(o.kind==='field'){
  const [id,part]=o.id.split(':');title=p.items.find(i=>i.id===id)?.label||'답 고르기';
  options=[...(!part?[{id:'유지',label:'원본과 같음 · 유지'}]:[]),...p.targets.filter(t=>!part||t.kind===(part==='via'?'중간':'도착'))];
 }
 const pages=options.length?options.flatMap(t=>textPages(t.label,view.compact?90:130).map((text,n,pages)=>({text,value:o.id+':'+t.id,part:pages.length>1?`${n+1}/${pages.length}`:''}))):textPages(text,view.compact?90:130).map(text=>({text}));const page=Math.min(view.overlayPage||0,Math.max(0,pages.length-1)),current=pages[page];
 return `<section class="desk-overlay" aria-label="${esc(title)}"><header><b>${esc(title)}</b>${btn('닫기','overlay-close')}</header><p>${lines(current?.text||'')}</p>${o.kind==='detail'&&p.items.find(i=>i.id===o.id)?.image?`<img src="${esc(p.items.find(i=>i.id===o.id).image)}" alt="${esc(p.items.find(i=>i.id===o.id).alt)}">`:''}<nav>${btn('이전','overlay-page',page-1,page===0?'disabled':'')}<span>${page+1} / ${pages.length}</span>${btn('다음','overlay-page',page+1,page===pages.length-1?'disabled':'')}</nav>${current?.value?btn('이 답 선택','field-value',current.value,'class="primary"'):''}</section>`;
}
export function deskHTML(p,d,selected,view,{stage,role,busy,dirty,feedback,hints}){
 const choice=['choose','deduce'].includes(p.type),g=choice?{count:d.picked?1:0,total:1}:progress(p,d,{}),task=p.type==='deduce'?'네 친구의 조건을 모아 후보 한 장을 고르세요.':p.task.length<=80?p.task:choice?'단서를 모아 알맞은 카드 한 장을 고르세요.':['order','select-order'].includes(p.type)?'단서를 모아 카드를 순서대로 놓으세요.':'단서를 모아 카드에 맞는 답을 고르세요.';
 const instruction=choice?'카드 한 장 선택':['compare','route-match'].includes(p.type)?'각 행의 답을 눌러 고르세요':selected?'선택한 카드를 놓을 칸을 누르세요':'카드 → 놓을 칸';
 return `<header class="modal-header"><div><small>${esc(stage.id)} · ${esc(stage.object)}</small><h2 id="modal-title">${esc(stage.title)}</h2></div>${btn('장면 보기 ✕','close')}</header><div class="desk-layout" ${view.overlay?'inert':''}><aside class="desk-clues"><div class="desk-clue-heading"><b>${role?role+'번 · 내 단서':'단서 확인'}</b><small>친구에게 알려 주세요</small></div>${notesHTML(clueDeck(p,view.compact),view)}</aside><section class="desk-work"><div class="desk-task"><p>${esc(task)}</p><div><span>${esc(instruction)}</span><b aria-live="polite">${g.count} / ${g.total}</b></div></div><div class="desk-board type-${esc(p.type)}">${boardHTML(p,d,selected,view.tight)}</div></section></div><div class="desk-feedback submission-feedback ${feedback?.kind||''}" role="status">${esc(feedback?.text||'')}</div><footer class="puzzle-footer" ${view.overlay?'inert':''}><div>${btn('기준','reference')}${btn('힌트','desk-hint')}${btn('비우기','reset-draft')}</div><span id="draft-status">${dirty?'저장 중…':'함께 푸는 답안'}</span>${btn('정답 확인','submit','','class="primary" '+(busy?'disabled':''))}</footer>${overlayHTML(p,view)}`;
}
