import {STORY_LINES} from './content.mjs';
import {CIRCUIT_LINKS,circuitLamps} from './expansion.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const lines=v=>esc(v).replace(/\n/g,'<br>');
export function freshDraft(type){return {selected:'',order:['order','select-order'].includes(type)?['','','','']:[],map:{},marked:[],switches:[false,false,false,false],touched:false};}
export function changeDraft(p,d,action,value){
 if(action==='select'){d.selected=d.selected===value?'':value;return;}
 if(action==='mark'){d.marked=d.marked.includes(value)?d.marked.filter(v=>v!==value):[...d.marked,value];return;}
 if(action==='flip'&&p.type==='circuit'){const n=Number(value);if(Number.isInteger(n)&&n>=0&&n<4){d.switches[n]=!d.switches[n];d.touched=true;}return;}
 if(action==='unplace'){if(['order','select-order'].includes(p.type))d.order=d.order.map(id=>id===value?'':id);else delete d.map[value];return;}
 if(action==='reset'){Object.assign(d,freshDraft(p.type));return;}
 if(action!=='place'||!p.items.some(i=>i.id===d.selected))return;
 if(['order','select-order'].includes(p.type)){
   const n=Number(value);if(!Number.isInteger(n)||n<0||n>3)return;
   const old=d.order.indexOf(d.selected),replaced=d.order[n];d.order[n]=d.selected;if(old>=0&&old!==n)d.order[old]=replaced||'';
 }else{
   if(!p.targets.some(t=>t.id===value))return;
   if(p.type!=='classify')for(const [key,t]of Object.entries(d.map))if(t===value)delete d.map[key];
   d.map[d.selected]=value;
 }
 d.selected='';
}
export const submission=(p,d)=>p.type==='circuit'?Object.fromEntries(p.items.map((i,n)=>[i.id,circuitLamps(d.switches)[n]?'켜짐':'꺼짐'])):['order','select-order'].includes(p.type)?d.order:p.type==='compare'?d.marked:d.map;
export function complete(p,d){return p.type==='circuit'?d.touched:['order','select-order'].includes(p.type)?d.order.every(Boolean):p.type==='compare'?d.marked.length>0:p.items.every(i=>d.map[i.id]);}
function material(i){return i.unfound?'<small class="private-material">아직 찾지 못한 도서</small>':i.hidden?`<small class="private-material">${i.owner}번 모둠원에게 확인</small>`:`<span class="material-text">${lines(i.text)}</span>${i.image?`<img class="material-image" src="${esc(i.image)}" alt="${esc(i.alt)}" referrerpolicy="no-referrer" loading="lazy">`:''}`;}
function card(i,d,placed=false){return `<button class="puzzle-card ${d.selected===i.id?'selected':''} ${placed?'placed':''}" data-action="puzzle-select" data-id="${esc(i.id)}" draggable="true" data-card-id="${esc(i.id)}" aria-pressed="${d.selected===i.id}"><small>${i.owner?i.owner+'번 자료':'공통 자료'}</small><strong>${esc(i.label)}</strong>${material(i)}</button>`;}
function cluePanel(p,role,roles,group){
 const c=p.clues.find(c=>c.role===role)||p.clues[0];
 return `<aside class="puzzle-clues"><div class="clue-tabs">${roles.map(r=>`<button class="${c?.role===r?'on':''}" data-action="puzzle-role" data-id="${r}">${r}번${group?(group.me.role===r?' 내 단서':' 빈자리'):''}</button>`).join('')}</div>${c?`<h3>${esc(c.title)}</h3><p>${lines(c.text)}</p>${c.original?`<div class="paper"><small>${esc(c.record)} · 원본 대본</small><p>${lines(c.original)}</p></div>`:''}`:'<p>아직 찾지 못한 단서입니다.</p>'}<p class="subtle">${group?'내 자료를 모둠원에게 설명하고 다른 기록과 대조하세요.':'개인 체험에서는 네 자리의 자료를 모두 확인할 수 있어요.'}</p></aside>`;
}
export function puzzleMarkup(p,d,{role=1,roles=[1,2,3,4],group=null,message=''}={}){
 let surface='';
 if(p.type==='matrix'){
  const axes=p.targets.map(t=>t.label.split('|'));
  surface=`<div class="monitor-workbench"><span class="monitor-status">기록 복원</span><div class="matrix-board"><div></div><b>${esc(axes[0][1])}</b><b>${esc(axes[1][1])}</b>${[0,1].map(row=>`<b class="matrix-row-label">${esc(axes[row*2][0])}</b>${p.targets.slice(row*2,row*2+2).map(t=>{const i=p.items.find(i=>d.map[i.id]===t.id);return `<div class="matrix-cell"><button class="matrix-target ${i?'filled':''}" data-action="puzzle-place" data-id="${t.id}" data-drop-target="${t.id}"><small>${esc(t.label.replace('|',' / '))}</small>${i?`<strong>${esc(i.label)}</strong>${material(i)}`:'<span>기록 없음<br>기록 놓기</span>'}</button>${i?`<button class="unplace" data-action="puzzle-unplace" data-id="${i.id}">꺼내기</button>`:''}</div>`;}).join('')}`).join('')}</div></div><div class="material-bank">${p.items.filter(i=>!d.map[i.id]).map(i=>card(i,d)).join('')}</div>`;
 }
 if(p.type==='circuit'){
  const lamps=circuitLamps(d.switches);
  surface=`<div class="circuit-panel"><div class="circuit-lamps">${p.items.map((i,n)=>`<section class="circuit-lamp ${lamps[n]?'lit':''}"><span class="lamp-bulb" aria-hidden="true"></span><strong>${esc(i.label)}</strong><small>현재 ${lamps[n]?'켜짐':'꺼짐'}</small>${material(i)}</section>`).join('')}</div><div class="circuit-switches">${CIRCUIT_LINKS.map((links,n)=>`<button class="relay-switch ${d.switches[n]?'raised':''}" data-action="puzzle-flip" data-id="${n}" aria-pressed="${!!d.switches[n]}"><span class="switch-lever" aria-hidden="true"></span><b>스위치 ${['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][n]}</b><small>표시등 ${links.map(i=>p.items[i].id).join(' · ')} 반전</small></button>`).join('')}</div><p>스위치를 한 번 누를 때마다 연결된 등이 모두 반전됩니다.</p></div>`;
 }
 if(['order','select-order'].includes(p.type))surface=`<div class="record-slots">${d.order.map((id,n)=>{const i=p.items.find(i=>i.id===id);return `<div class="record-slot"><button class="slot-target ${id?'filled':''}" data-action="puzzle-place" data-id="${n}" data-drop-target="${n}"><small>${n+1}번째</small>${i?`<strong>${esc(i.label)}</strong>${material(i)}`:'<span>기록 꽂기</span>'}</button>${id?`<button class="unplace" data-action="puzzle-unplace" data-id="${esc(id)}">꺼내기</button>`:''}</div>`;}).join('')}</div><div class="material-bank">${p.items.filter(i=>!d.order.includes(i.id)).map(i=>card(i,d)).join('')}</div>`;
 if(p.type==='match'||p.type==='classify')surface=`<div class="shelf-targets ${p.type==='classify'?'classification':''}">${p.targets.map(t=>`<section class="shelf"><button class="shelf-label" data-action="puzzle-place" data-id="${t.id}" data-drop-target="${t.id}"><b>${esc(t.label)}</b><span>${d.selected?'선택한 자료 넣기':'자료를 고른 뒤 누르세요'}</span></button><div>${p.items.filter(i=>d.map[i.id]===t.id).map(i=>`<div class="shelved-card">${card(i,d,true)}<button class="unplace" data-action="puzzle-unplace" data-id="${esc(i.id)}">꺼내기</button></div>`).join('')}</div></section>`).join('')}</div><div class="material-bank">${p.items.filter(i=>!d.map[i.id]).map(i=>card(i,d)).join('')}</div>`;
 if(p.type==='connect'){
   const wireColors=['#f2b375','#91cdb5','#a4b5eb','#d8a3ce'];
   const wires=p.items.map((i,n)=>{const target=p.targets.findIndex(t=>t.id===d.map[i.id]);return target<0?'':`<path d="M 8 ${12.5+n*25} C 42 ${12.5+n*25}, 58 ${12.5+target*25}, 92 ${12.5+target*25}" stroke="${wireColors[n]}"></path>`;}).join('');
   surface=`<div class="connection-board"><div class="wire-sources">${p.items.map((i,n)=>`<div style="--wire-color:${wireColors[n]}">${card(i,d,!!d.map[i.id])}</div>`).join('')}</div><svg class="connection-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${wires}</svg><div class="wire-targets">${p.targets.map(t=>{const item=p.items.find(i=>d.map[i.id]===t.id);return `<button class="terminal-target ${item?'wired':''}" data-action="puzzle-place" data-id="${t.id}" data-drop-target="${t.id}"><b>${esc(t.label)}</b><small>${item?esc(item.label)+' 연결됨':'선택한 선 연결'}</small></button>`;}).join('')}</div></div>`;
 }
 if(p.type==='compare')surface=`<div class="broadcast-reference"><small>도서관에서 가져온 하교 대본</small>${STORY_LINES.map(r=>`<p>${esc(r.original)}</p>`).join('')}</div><div class="broadcast-lines">${[...STORY_LINES,...p.items].map((r,n)=>`<button class="broadcast-line ${d.marked.includes(r.id)?'marked':''}" data-action="puzzle-mark" data-id="${esc(r.id)}" aria-pressed="${d.marked.includes(r.id)}"><span class="line-number">${n+1}</span><span><small>${esc(r.label)}</small><span>${lines(r.text)}</span></span><b>${d.marked.includes(r.id)?'수정 표시':'표시하기'}</b></button>`).join('')}</div>`;
 return `<div class="puzzle-task"><p>${lines(p.task)}</p>${p.reference?`<small>${lines(p.reference)}</small>`:''}</div><div class="curriculum-layout"><section class="puzzle-workbench ${p.type}">${surface}<p class="puzzle-instruction">${p.type==='circuit'?'담당 기록으로 각 표시등의 목표 상태를 판단하고 스위치를 조작하세요.':p.type==='select-order'?'8장 중 필요한 4장만 골라 순서대로 놓으세요. 나머지는 상자에 남습니다.':p.type==='compare'?'달라진 줄을 누르면 수정 표시가 남습니다. 다시 누르면 지워집니다.':'자료를 고른 뒤 넣을 자리를 누르세요. 마우스로 끌어 놓을 수도 있어요.'}</p></section>${cluePanel(p,role,roles,group)}</div><div class="puzzle-footer"><p id="puzzle-feedback" role="status">${esc(message||'자료를 서로 설명하며 장치를 맞춰 보세요.')}</p><div><button class="ghost-button" data-action="puzzle-reset">배치 초기화</button><button class="ghost-button" data-action="puzzle-hint">힌트 ${p.hints.length}/3</button><button class="primary" data-action="puzzle-submit" ${complete(p,d)?'':'disabled'}>${p.type==='compare'?'수정 내용 확인':'장치 확인'}</button></div></div>${p.hints.length?`<div class="puzzle-hints">${p.hints.map((h,i)=>`<p><b>힌트 ${i+1}</b> ${lines(h)}</p>`).join('')}</div>`:''}`;
}
