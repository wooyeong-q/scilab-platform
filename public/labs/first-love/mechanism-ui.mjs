import {esc,lines,progress} from './puzzle-ui.mjs?v=19';
import {clueDeck,notesHTML,overlayHTML} from './desk-ui.mjs?v=19';

// These props belong to the story, not a subject or an answer. The workbook
// supplies the interpretation; the shared draft remains the only answer state.
export const MECHANISMS=[
 {id:'file',name:'붉은 끈 정리 파일',prop:'paper',unit:'메모',verb:'끈 풀고 파일 열기',sources:['접힌 왼쪽 귀퉁이','파일 속 주머니','뒤표지 메모','오른쪽 접힌 쪽지'],reward:'반납 메모',found:'붉은 끈이 풀렸다. 안쪽 주머니에서 반납 메모가 나왔다.',next:'반납대에 이 메모를 가져가자.'},
 {id:'books',name:'책갈피가 숨은 반납 서가',prop:'book',unit:'책',verb:'선택한 책 꺼내기',sources:['책 덮개 안쪽','반납함 뚜껑','서가 옆 주머니','책등 뒤쪽'],reward:'서아의 책갈피',found:'책을 당기자 페이지 사이에서 책갈피가 미끄러져 나왔다.',next:'책갈피 뒷면에 서아의 글씨가 남아 있다.'},
 {id:'drawers',name:'대여표 보관 서랍',prop:'envelope',unit:'봉투',verb:'서랍 손잡이 당기기',sources:['서랍 밑 종이','왼쪽 봉투 덮개','손잡이 뒤 쪽지','정리대 옆 메모'],reward:'도하의 대여표',found:'잠긴 서랍이 열렸다. 도하가 빌린 상자의 대여표가 들어 있다.',next:'대여표 뒤에 붙은 보관 기록도 살펴보자.'},
 {id:'ledger',name:'보관표 확인 장치',prop:'tag',unit:'기록표',verb:'확인 도장 누르기',sources:['접힌 원본 기록','덧붙인 쪽지','표 아래 메모','뒷면의 기록'],reward:'상자 표식',found:'확인 도장을 누르자 덮개가 풀렸다. 아래에 상자 표식이 찍혀 있다.',next:'복도 게시판에서 같은 표식을 찾아보자.'},
 {id:'mailbox',name:'행사 물품 반납함',prop:'parcel',unit:'반납함',verb:'반납함 걸쇠 열기',sources:['게시판 종이 뒤','반납함 옆 라벨','접힌 전달 쪽지','투입구 안 메모'],reward:'전달 메모',found:'걸쇠가 풀리며 전달 메모가 나왔다. 수납장 표시를 읽는 방법이다.',next:'보관표가 있는 동아리실로 가자.'},
 {id:'patch',name:'준비대 연결 장치',prop:'plug',unit:'연결표',verb:'레버 내려 작동하기',sources:['왼쪽 점검 덮개','케이블에 묶인 쪽지','안내판 뒤 메모','전원 덮개 안쪽'],reward:'보관표',found:'연결 장치가 켜졌다. 준비대 아래 얇은 서랍이 열렸다.',next:'꺼낸 보관표를 뒤쪽 보관함과 맞춰 보자.'},
 {id:'lockers',name:'상자 표식 보관함',prop:'parcel',unit:'상자',verb:'보관함 잠금 풀기',sources:['뚜껑 안쪽 라벨','상자 바닥 기록','옆면 접힌 쪽지','손잡이 아래 메모'],reward:'인수 표식',found:'보관함의 잠금이 풀렸다. 상자에 붙었던 인수 표식이 보인다.',next:'복도 인수 기록과 마지막으로 대조하자.'},
 {id:'inbox',name:'마지막 인수 기록함',prop:'envelope',unit:'기록 봉투',verb:'인수함 열기',sources:['접힌 인수증','게시판 오른쪽 쪽지','봉투 안 메모','서명란 뒷면'],reward:'교실 사진과 위치표',found:'인수함 안에서 교실 사진과 자료함 위치표를 찾았다.',next:'사진 속 장소를 교실에서 직접 찾아보자.'}
];
const button=(label,action,value='',attrs='')=>`<button data-action="${action}" data-value="${esc(value)}" ${attrs}>${label}</button>`;
const index=i=>'ABCDEFGH'[i];
const short=(s,n=12)=>s.length>n?s.slice(0,n)+'…':s;
export const mechanismFor=id=>MECHANISMS[Number(String(id).replace('P',''))-1];
export const isPhysical=p=>!!p?.cooperative&&!!mechanismFor(p.id);
export function discoveryKey(stage,role){return `prop:${stage}:${role}`;}
export function discoveryNotes(p,view){
 const deck=clueDeck(p,view.compact),found=view.discovered||[];
 return deck.filter(c=>found.includes(discoveryKey(p.id,c.role)));
}
function propHTML(p,i,n,d,selected,m,tight){
 const choice=p.type==='choose',active=choice?d.picked===i.id:selected===i.id;
 const placed=p.type==='order'?d.order?.includes(i.id):p.type==='classify'?!!d[i.id]:false;
 const detailed=(tight&&i.text.length>0)||!!i.image||i.text.length>36;
 return `<article class="physical-prop prop-${m.prop} ${active?'held':''} ${placed?'inserted':''}" style="--prop:${n}" data-piece="${esc(i.id)}">${button(`<span class="prop-heading"><span class="prop-mark">${index(n)}</span><strong>${esc(short(i.label))}</strong></span>${!detailed&&i.text?`<span class="prop-text">${lines(i.text)}</span>`:''}<span class="prop-grip" aria-hidden="true"></span>${placed?'<small>배치됨</small>':''}`,choice?'pick':'select',i.id,`aria-label="${esc(i.label)} ${choice?'선택':'집기'}" aria-pressed="${!!active}"`)}${detailed?button('펼쳐 보기','detail',i.id,`class="prop-detail" aria-label="${esc(i.label)} 펼쳐 보기"`):''}</article>`;
}
export function physicalBoardHTML(p,d,selected,m,view){
 const order=p.type==='order',choice=p.type==='choose';
 const targets=order?[0,1,2,3].map(n=>({id:n,label:`${n+1}번째`})):p.targets;
 const objects=`<div class="prop-rack rack-${m.prop} ${choice?'choice-rack':''} count-${p.items.length}" aria-label="모두에게 보이는 ${m.unit}">${p.items.map((i,n)=>propHTML(p,i,n,d,selected,m,view.tight)).join('')}</div>`;
 const slots=choice?'':`<div class="mechanism-slots slots-${m.id} count-${targets.length}" aria-label="${order?'왼쪽부터 놓는 자리':'보관할 곳'}">${targets.map(t=>{const placed=p.items.filter(i=>order?d.order?.[t.id]===i.id:d[i.id]===t.id);return `<div class="physical-slot ${placed.length?'occupied':''}">${button(`<span class="socket-label">${esc(short(t.label,10))}</span><span class="socket-content">${placed.length?placed.map(i=>`<i class="mini-prop mini-${m.prop}">${index(p.items.indexOf(i))}</i>`).join(''):'<span class="socket-empty">＋</span>'}</span><span class="slot-handle" aria-hidden="true"></span>`,'place',t.id,`data-drop="${esc(t.id)}" aria-label="${esc(t.label)}에 ${m.prop==='plug'?'연결':'넣기'}"`)}<div class="slot-tools">${t.label.length>10?button('이름 보기','target-detail',t.id):''}${placed.length?button('꺼내기','unplace',t.id,`aria-label="${esc(t.label)}에서 꺼내기"`):''}</div></div>`;}).join('')}</div>`;
 return `${objects}${slots}`;
}
export function mechanismHTML(p,d,selected,view,{stage,role,busy,dirty,feedback}){
 const m=mechanismFor(p.id),choice=p.type==='choose',g=choice?{count:d.picked?1:0,total:1}:progress(p,d,{});
 const notes=discoveryNotes(p,view),found=view.discovered||[];
 const instruction=choice?`${m.unit} 선택 → ${m.verb}`:selected?`${m.unit}을 놓을 자리를 누르세요`:`${m.unit} 집기 → ${m.prop==='plug'?'소켓에 연결':'빈자리에 넣기'}`;
 return `<header class="modal-header"><div><small>${esc(stage.id)} · ${esc(stage.object)}</small><h2 id="modal-title">${esc(m.name)}</h2></div>${button('장면 보기 ✕','close')}</header><div class="desk-layout mechanism-layout" ${view.overlay?'inert':''}><aside class="desk-clues"><div class="desk-clue-heading"><b>${role?role+'번 · 찾아낸 기록':'찾아낸 기록'}</b><small>친구에게 발견한 내용을 알려 주세요</small></div>${notes.length?notesHTML(notes,view):'<div class="undiscovered-note"><span aria-hidden="true">⌕</span><b>숨은 기록이 있어요</b><p>장치의 쪽지나 덮개를<br>눌러 살펴보세요.</p></div>'}</aside><section class="desk-work mechanism-work"><div class="desk-task"><p>${esc(p.task)}</p><div><span>${esc(instruction)}</span><b aria-live="polite">${g.count} / ${g.total}</b></div></div><div class="mechanism-machine machine-${m.id}" data-jammed="${feedback?.kind==='wrong'}"><div class="machine-label"><span class="lock-light ${g.count===g.total?'ready':''}" aria-hidden="true"></span><span>${g.count===g.total?'조작할 준비가 됐어요':'기록을 맞춰 잠금을 풀어 보세요'}</span></div><div class="mechanism-board">${physicalBoardHTML(p,d,selected,m,view)}</div><nav class="mechanism-inspections" aria-label="숨은 기록 찾기">${p.clues.map(c=>{const seen=found.includes(discoveryKey(p.id,c.role));return button(`<span class="fold-mark" aria-hidden="true">${seen?'✓':'↗'}</span><span>${esc(m.sources[c.role-1])}</span>`,'discover',c.role,`aria-label="${c.role}번 ${esc(m.sources[c.role-1])} 살펴보기" class="${seen?'discovered':''}"`);}).join('')}</nav></div></section></div><div class="desk-feedback submission-feedback ${feedback?.kind||''}" role="status">${esc(feedback?.text||'')}</div><footer class="puzzle-footer" ${view.overlay?'inert':''}><div>${button('기준','reference')}${button('힌트','desk-hint')}${button('원위치','reset-draft')}</div><span id="draft-status">${dirty?'조작 저장 중…':'친구와 같은 장치를 보고 있어요'}</span>${button(esc(m.verb),'submit','','class="primary mechanism-handle" '+(busy?'disabled':''))}</footer>${overlayHTML(p,view)}`;
}
export function discoveryHTML(old){
 const m=MECHANISMS[old];
 return `<header class="modal-header"><div><small>잠금이 풀렸어요</small><h2 id="modal-title">${esc(m.reward)} 발견</h2></div></header><section class="found-object"><div class="opened-compartment machine-${m.id}" aria-hidden="true"><div class="open-lid"></div><div class="found-paper"><span>발견한 물건</span><strong>${esc(m.reward)}</strong><i></i><i></i><i></i></div><div class="open-front"><span></span></div></div><p>${esc(m.found)}</p><small>${esc(m.next)}</small>${button(`${esc(m.reward)} 챙기기 →`,'collect-find',old,'class="primary"')}</section>`;
}
