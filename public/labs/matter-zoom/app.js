import {ELEMENTS,atom,MATERIALS,PARTICLES,DISCOVERIES} from './data.mjs';
import {freshExplorer,restoreExplorer} from './exploration.mjs';
const MODE_INFO={middle:{label:'중학교 · 중2'},high:{label:'고등학교 · 확장'}};
import {normalizeMode,readContext,makeLessonLink,storageKey} from './session.mjs';

let context=readContext(location.search),activeKey=storageKey(context),state,storageOK=true,needsResume=false,createdLinks=[];
try{state=restoreExplorer(localStorage.getItem(activeKey),context.mode);needsResume=Boolean(state.material||state.records.length);}catch{state=freshExplorer(context.mode);storageOK=false;}
let busy=false,exploded=false,particle=null,toastTimer;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,value='',cls='',extra='')=>`<button class="${cls}" data-action="${action}" data-value="${esc(value)}" ${extra}>${label}</button>`;
const high=()=>context.mode==='high';
const add=(key,value)=>{if(!state[key].includes(value))state[key].push(value);};
function save(){try{localStorage.setItem(activeKey,JSON.stringify(state));}catch{storageOK=false;}}
function record(key){add('records',key);save();}
function say(message,success=false){const el=$('#feedback');el.textContent=message;el.className=success?'show success':'show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',5000);}
function modal(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal();}
const note=t=>`<p class="note">${t}</p>`;
const question=(eyebrow,title,copy='')=>`<div class="explorer-heading"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1>${copy?`<p>${copy}</p>`:''}</div>`;
function photo(id,cls=''){const m=MATERIALS[id];return `<img class="${cls}" src="./assets/${m.image}" alt="${m.alt}" width="800" height="800">`;}
function modePicker(){return `<div class="level-picker" role="group" aria-label="학습 수준 선택">${Object.entries(MODE_INFO).map(([mode,info])=>btn(`<b>${esc(info.label)}</b><small>${mode==='middle'?'물질에서 원자 내부까지 확대 관찰':'같은 확대 관찰 + 동위 원소 확장'}</small>`,'choose-mode',mode,`mode-card ${context.mode===mode?'selected':''}`,`aria-pressed="${context.mode===mode}"`)).join('')}</div>`;}
function scopeStrip(){return context.lessonId==='personal'?'':`<div class="scope-strip teacher-strip"><span><strong>${esc(context.classLabel||'반별 탐험')}</strong> · ${high()?'고등학교 확장':'중학교 2학년'}</span>${btn('새 학생으로 시작','reset-confirm','','text-button')}</div>`;}
function resumeScreen(){return `<section class="resume-card">${question('기기에 남아 있는 관찰 기록','이어서 관찰할까요?','본인의 기록이면 이어서, 다른 학생의 기록이면 새로 시작하세요.')}<div class="choice-row">${btn('내 관찰 이어서 보기','resume','','primary')}${btn('새 학생으로 시작','reset-confirm','','secondary')}</div></section>`;}
function learningSettings(){modal(`<h2>학습 수준</h2><p>두 수준 모두 물질을 확대하며 자유롭게 관찰합니다.</p>${modePicker()}${context.lessonId!=='personal'?note('반별 링크에는 수준이 지정되어 있어요. 다른 수준을 선택하면 개인 탐험으로 이동합니다.'):''}${note('중2는 구성 입자·원소·원자 번호·전하를 중심으로, 고등학교는 동위 원소도 펼쳐 볼 수 있어요.')}`);}
function switchMode(mode){
 mode=normalizeMode(mode);if(mode===context.mode){$('#dialog').close();return;}
 save();context={mode,lessonId:'personal',classLabel:''};activeKey=storageKey(context);
 try{state=restoreExplorer(localStorage.getItem(activeKey),mode);needsResume=Boolean(state.material||state.records.length);}catch{state=freshExplorer(mode);storageOK=false;needsResume=false;}
 const url=new URL(location.href);url.search='';url.searchParams.set('mode',mode);history.replaceState(null,'',url);$('#dialog').close();particle=null;exploded=false;render(true);
}
function render(focus=false){
 const expanded=new Set([...document.querySelectorAll('#app details[open]')].map(d=>d.querySelector('summary')?.textContent));
 const prior=document.activeElement,action=prior?.dataset?.action,value=prior?.dataset?.value,change=prior?.dataset?.change;
 $('#mode-label').textContent=high()?'고등학교 · 확장':'중학교 · 중2';$('.brand').href=location.pathname+location.search;
 $('#app').innerHTML=scopeStrip()+(needsResume?resumeScreen():state.material?workspace():landing());
 document.querySelectorAll('#app details').forEach(d=>{if(expanded.has(d.querySelector('summary')?.textContent))d.open=true;});
 if(focus)$('h1')?.focus({preventScroll:true});
 else if(action)document.querySelector(`#app ${prior?.tagName==='BUTTON'?'button':''}[data-action="${CSS.escape(action)}"][data-value="${CSS.escape(value||'')}"]`)?.focus({preventScroll:true});
 else if(change)document.querySelector(`[data-change="${CSS.escape(change)}"]`)?.focus({preventScroll:true});
 save();
}
function landing(){return `<section class="explorer-landing">${question('확대! 물질 탐험 연구소','물질을 확대하면 무엇이 보일까?','물질을 고르고, 원자 속까지 들어가 보세요.')}<div class="materials-choice">${Object.entries(MATERIALS).map(([id,m])=>btn(`${photo(id)}<div><small>${m.formula}</small><h2>${m.name}</h2><p>${m.kind==='array'?'금 원자들이 반복된 배열':'분자 속에 결합한 원자들'}</p><b>관찰 시작 ＋</b></div>`,'material',id,`material-choice ${id}`)).join('')}</div><p class="model-note-inline">원자와 전자는 맨눈으로 직접 볼 수 없어요. 확대 후에는 이해를 돕는 모형을 사용하며, 색·크기·간격은 실제와 다릅니다.</p></section>`;}
function workspace(){
 const m=MATERIALS[state.material],a=atom(state.z),l=state.level,array=m.kind==='array';
 const titles={0:`${m.name}을 눌러 확대해 보세요`,1:array?'금 원자 하나를 눌러 보세요':'분자 하나를 눌러 보세요',2:state.material==='water'?'H 또는 O를 눌러 안을 보세요':'H를 눌러 원자 안을 보세요',4:`${a.name} 원자 안에는 무엇이 있을까?`,5:'원자핵 속 입자를 눌러 보세요'};
 const steps=array?[['금',0],['원자 배열',1],['원자 내부',4]]:[[m.name,0],['분자들',1],['분자 하나',2],['원자 내부',4]];
 const back=l===5?4:l>=4?(array?1:2):Math.max(0,l-1);
 const scene=l===0?`<button class="macro-photo" data-action="zoom" data-value="1" aria-label="${m.name} 확대">${photo(state.material)}<span class="photo-zoom">${m.name} 확대 <b>＋</b></span></button>`:l===1?fieldSVG():l===2?moleculeSVG():atomSVG(a.z,{nucleus:l===5,exploded});
 const caption=l===0?m.intro:l===1?m.field:l===2?m.detail:l===5?(a.n===0?'이 수소 원자핵에는 양성자 1개만 있어요.':'원자핵 안에는 양성자와 중성자가 모여 있어요.'):'가운데는 원자핵, 그 주변에는 전자가 있어요.';
 return `<section class="explorer-workspace"><div class="workspace-bar">${btn('← 물질 선택','home','','text-button')}<div class="material-switch" aria-label="관찰할 물질">${Object.entries(MATERIALS).map(([id,v])=>btn(v.name,'material',id,id===state.material?'selected':'',`aria-pressed="${id===state.material}"`)).join('')}</div></div><ol class="breadcrumb" aria-label="확대 위치">${steps.map(([name,level])=>`<li>${btn(name,'zoom',level,(l===5?4:l)===level?'current':'',`${level>state.deepest?'disabled':''} ${(l===5?4:l)===level?'aria-current="step"':''}`)}</li>`).join('')}</ol>${l>=4?conceptMenu():''}${state.drawer?drawer():`<section class="observation-panel"><div class="observation-title"><h1 tabindex="-1">${titles[l]||titles[4]}</h1><p>${caption}</p></div><div class="explorer-layout"><div class="lens-stage"><div class="lens-viewport"><div class="world">${scene}</div></div>${l>=4?`<div class="particle-readout">${particlePicker()}<div class="particle-detail" aria-live="polite">${particleExplanation()}</div></div>`:''}</div></div><div class="lens-controls">${btn('− 한 단계 밖으로','zoom',back,'secondary',l===0?'disabled':'')}${l>=4?btn(l===5?'원자 전체 보기':'원자핵 확대 ＋','zoom',l===5?4:5,'secondary'):''}${l===5?btn(exploded?'다시 모으기':'입자 펼쳐 보기','explode','','secondary'):''}</div></section>`}<p class="model-caption">${l===0?'확대하면 실제 모습을 바탕으로 한 일러스트에서 입자 모형으로 바뀝니다.':l>=4?'선택한 원자를 중성 원자로 단순화한 모형입니다. 위치·크기·간격은 실제와 다르며, 전자의 위치는 고정되어 있지 않아요.' :'색·크기·간격은 이해를 돕기 위한 모형입니다.'}${l>=4&&a.z===79?' 금의 구성 입자는 일부만 그렸으며 수는 따로 표시합니다.':''}</p></section>`;
}
function particlePicker(){const a=atom(state.z);return `<div class="particle-picker" role="group" aria-label="입자를 누르면 위치와 성질을 볼 수 있어요">${['p','n','e'].map(k=>btn(`<span class="dot ${k}">${PARTICLES[k].sign}</span><span>${PARTICLES[k].name}<b>${k==='n'?a.n:a.z}개</b></span>`,'particle',k,particle===k?'selected':'',`aria-pressed="${particle===k}"`)).join('')}</div>`;}
function particleExplanation(){
 const a=atom(state.z);
 if(!particle)return '<p><b>+ · 0 · − 입자를 눌러 보세요.</b> 선택한 입자가 그림에서 강조됩니다.</p>';
 if(particle==='p')return `<p><b class="p-text">+ 양성자</b> · 원자핵에 있어요.</p><p>양성자가 <b>${a.z}개</b>인 원소는 <b>${a.name}</b>예요.</p>`;
 if(particle==='n')return a.n===0?'<p><b>0 중성자</b> · 이 수소 원자의 예에는 없어요.</p><p>가장 흔한 수소 원자핵에는 양성자 1개만 있어요.</p>':`<p><b>0 중성자</b> · 원자핵에 있고, 전하를 띠지 않아요.</p><p>이 원자의 예에는 ${a.n}개 있어요. 같은 원소라도 수가 다를 수 있어요.</p>`;
 return `<p><b class="e-text">− 전자</b> · 원자핵 주변에 있어요.</p><p>양성자와 전자가 <b>${a.z}개씩</b>이라 이 원자는 중성이에요.</p>`;
}
function counts(a,e=a.z){return `<dl class="particle-counts"><div><dt><span class="dot p">+</span> 양성자</dt><dd>${a.z}개</dd></div><div><dt><span class="dot n">0</span> 중성자 · 이 원자의 예</dt><dd>${a.n}개</dd></div><div><dt><span class="dot e">−</span> 전자</dt><dd>${e}개</dd></div></dl>`;}

function conceptMenu(){return `<nav class="concept-menu" aria-label="관찰과 개념 선택">${btn('원자 관찰','close-drawer','',!state.drawer?'selected':'',`aria-pressed="${!state.drawer}"`)}${[['compare','원소 비교'],['number','원자 번호'],['charge','전기적 중성']].map(([key,title])=>btn(title,'open-drawer',key,state.drawer===key?'selected':'',`aria-pressed="${state.drawer===key}"`)).join('')}</nav>`;}
function drawer(){const titles={compare:'원소가 다르면 무엇이 다를까?',number:'양성자 수가 주기율표의 번호예요',charge:'양성자는 +인데, 원자는 왜 중성일까?'};return `<section class="concept-drawer" id="concept-drawer" aria-labelledby="drawer-title"><div class="drawer-heading"><h1 id="drawer-title" tabindex="-1">${titles[state.drawer]}</h1>${btn('원자 관찰로 돌아가기','close-drawer','','text-button')}</div>${{compare:compareDrawer,number:numberDrawer,charge:chargeDrawer}[state.drawer]()}</section>`;}
function compareDrawer(){return `<p>수소·산소·금의 원자핵을 나란히 살펴보세요.</p><div class="compare-three">${[1,8,79].map(z=>{const a=atom(z);return `<section class="compare-specimen"><h2>${a.symbol} <span>${a.name}</span></h2>${atomSVG(z,{nucleus:true,interactive:false})}<p class="proton-count"><span class="dot p">+</span> 양성자 <b>${a.z}개</b></p><p>원자 번호 <b>${a.z}</b></p>${z===79?'<small>그림에는 일부만 표시</small>':''}</section>`;}).join('')}</div><p class="finding"><b>양성자 수가 다르면 원소의 종류가 달라져요.</b> 원자 번호는 양성자 수와 같아요.</p><details class="extension-panel"><summary>전자 수가 달라도 같은 원소일까?</summary><p>나트륨 원자 Na: 양성자 11개 / 전자 11개</p><p>나트륨 이온 Na⁺: 양성자 11개 / 전자 10개</p><p>양성자가 모두 11개이므로 같은 나트륨이에요.</p></details>${high()?'<details class="extension-panel"><summary>고등학교 확장 · 중성자 수가 다르다면?</summary><p>탄소-12: 양성자 6개 + 중성자 6개 → 질량수 12</p><p>탄소-13: 양성자 6개 + 중성자 7개 → 질량수 13</p><p>양성자 수가 같아서 모두 탄소이며, 이러한 원자들을 동위 원소라고 해요.</p></details>':''}`;}
function numberDrawer(){
 const a=atom(state.numberZ),current=atom(state.z);
 const cells=ELEMENTS.map(e=>`<button class="element-cell ${e.z===a.z?'selected':''}" style="grid-row:${e.period+1};grid-column:${e.group}" data-action="number-atom" data-value="${e.z}" aria-label="원자 번호 ${e.z}, ${e.name}, ${e.symbol}"><small>${e.z}</small><strong>${e.symbol}</strong><span>${e.name}</span></button>`).join('');
 return `<p>방금 본 ${current.name}은 양성자가 ${current.z}개라서 원자 번호가 ${current.z}입니다.${current.z===79?' 금은 79번으로, 아래 1~20번 표의 범위 밖에 있어요.':''}</p><div class="number-link"><div><span>원자핵 속 양성자</span><div class="proton-beads" aria-hidden="true">${Array.from({length:a.z},()=>'<i class="dot p">+</i>').join('')}</div><b>${a.z}개</b></div><div><span>주기율표의 원자 번호</span><b>${a.z}</b></div><div><span>원소의 이름과 기호</span><b>${a.name} · ${a.symbol}</b></div></div><div class="number-browser"><label for="proton-range">양성자가 적은 원자부터 순서대로 살펴보세요.<input id="proton-range" type="range" min="1" max="20" step="1" value="${a.z}" data-change="number-atom" aria-label="양성자 수로 원소 살펴보기" aria-valuetext="양성자 ${a.z}개, ${a.name}"></label><div class="choice-row">${btn('← 1개 적은 원자','number-atom',a.z-1,'secondary',a.z===1?'disabled':'')}${btn('1개 많은 원자 →','number-atom',a.z+1,'secondary',a.z===20?'disabled':'')}</div><p class="note">1개 → 수소, 2개 → 헬륨, 3개 → 리튬. 원자 번호는 양성자 수와 같아요. 다른 원자의 모형을 차례로 비교하는 활동입니다.</p></div><div class="periodic-layout"><section class="periodic-panel"><p class="scroll-hint">표의 원소 칸도 눌러 보세요. 작은 화면에서는 표 안을 좌우로 움직일 수 있어요.</p><div class="periodic-scroll" tabindex="0" role="region" aria-label="원자번호 1~20 주기율표"><div class="periodic-grid">${[1,2,13,14,15,16,17,18].map(n=>`<span class="group-label" style="grid-row:1;grid-column:${n}">${n}족</span>`).join('')}${cells}<div class="table-space">원자 번호 = 양성자 수<small>숫자와 원소 이름이 함께 바뀌어요.</small></div></div></div></section><div class="element-detail"><div class="element-stamp"><small>원자 번호</small><b>${a.z}</b><strong>${a.symbol}</strong><span>${a.name}</span></div>${counts(a)}${high()?`<p>${a.period}주기 · ${a.group}족</p>`:''}</div></div>`;
}
function chargePairs(p,e){const pairs=Math.min(p,e),net=p-e;return `<div class="charge-pairs"><p><b>+와 − ${pairs}쌍</b> · 서로 더하면 0</p><div aria-hidden="true">${Array.from({length:Math.min(pairs,20)},()=>'<span class="charge-pair">+ −</span>').join('')}</div>${pairs>20?'<p>그림은 20쌍만 표시합니다.</p>':''}<p class="remaining-charge">${net===0?'남는 전하 없음 → 전체적으로 중성':`${net>0?'+':'−'} 전하 1개가 남아요 → ${net>0?'양이온':'음이온'}`}</p></div>`;}
function chargeDrawer(){
 const current=atom(state.z),a=atom(state.chargeZ),e=a.z+(state.chargeVariant==='lost'?-1:state.chargeVariant==='gained'?1:0);
 return `<div class="charge-state"><h3>방금 본 ${current.name} 원자</h3><p>양성자 + ${current.z}개와 전자 − ${current.z}개가 있어요.</p>${chargePairs(current.z,current.z)}<p>양성자와 전자의 전하 크기는 같고 부호는 반대예요. 중성 원자에서는 양성자 수와 전자 수가 같습니다. 중성자의 전하는 0이에요.</p></div><details class="extension-panel"><summary>전자를 잃거나 얻으면? · 이온 살펴보기</summary><div class="choice-row">${btn('나트륨 Na','charge-atom',11,a.z===11?'selected':'secondary')}${btn('염소 Cl','charge-atom',17,a.z===17?'selected':'secondary')}</div><div class="charge-toggle choice-row">${btn('중성 원자','charge-variant','neutral',state.chargeVariant==='neutral'?'selected':'secondary')}${btn(a.z===11?'전자 1개를 잃은 상태':'전자 1개를 얻은 상태','charge-variant',a.z===11?'lost':'gained',state.chargeVariant!=='neutral'?'selected':'secondary')}</div><div class="comparison-stage"><div class="lens-stage">${atomSVG(a.z,{electronCount:e,interactive:false})}</div><div class="identity-readout"><h3>${a.z===17&&state.chargeVariant==='gained'?'염화 이온 Cl⁻':`${a.name} ${state.chargeVariant==='neutral'?'원자':`이온 ${a.symbol}⁺`}`}</h3>${counts(a,e)}${chargePairs(a.z,e)}<p>전자 수가 달라져도 양성자는 ${a.z}개 그대로예요. 원소는 여전히 ${a.name}, 원자 번호는 ${a.z}입니다.</p></div></div></details>`;
}

function teacherSetup(){modal(`<h2>반별 수업 링크 만들기</h2><p>수준과 반을 정한 링크를 학생에게 보내세요. 교사마다 새 링크를 만들며, 학생은 각자 자신의 속도로 탐험합니다.</p><form id="teacher-form" class="teacher-form"><label>학습 수준<select id="teacher-mode"><option value="middle" ${high()?'':'selected'}>중학교 · 중2 물질의 구성</option><option value="high" ${high()?'selected':''}>고등학교 · 통합과학 / 화학 확장</option></select></label><label>반 이름 · 한 줄에 한 반, 최대 12반<textarea id="teacher-classes" rows="3" maxlength="600" placeholder="2학년 1반&#10;2학년 2반">${esc(context.classLabel)}</textarea></label><button type="submit" class="primary">반별 링크 만들기</button></form><p class="note">같은 반 이름을 입력해도 각각 독립된 링크를 만듭니다. 다음 수업을 새로 시작할 때는 새 링크를 만들고, 이어서 할 때는 이전 링크를 사용하세요.</p><div id="teacher-results" class="teacher-links-list">${teacherResults()}</div>`);}
function teacherResults(){return createdLinks.map((item,i)=>`<section class="share-result"><h3>${esc(item.label)} · ${item.mode==='high'?'고등학교':'중학교'}</h3><label>학생에게 보낼 링크<textarea readonly rows="3" id="class-link-${i}">${esc(item.url)}</textarea></label><div class="choice-row">${btn('링크 복사','copy-class-link',i,'secondary')}<a class="secondary" href="${esc(item.url)}" target="_blank" rel="noopener">학생 화면 열기 ↗</a></div></section>`).join('');}
function createClassLinks(){
 const mode=normalizeMode($('#teacher-mode').value),labels=$('#teacher-classes').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(labels.length>12){say('한 번에 최대 12반까지 만들 수 있어요.');return;}
 const base=new URL('./index.html',location.href).href;
 try{createdLinks=(labels.length?labels:['반별 탐험']).map(label=>{const url=makeLessonLink(base,{mode,classLabel:label});return {label:readContext(new URL(url).search).classLabel,mode,url};});$('#teacher-results').innerHTML=teacherResults();$('#teacher-results h3')?.scrollIntoView({block:'nearest'});say(`${createdLinks.length}개 반의 독립된 링크를 만들었어요.`,true);}catch{say('링크를 만들지 못했어요. https 주소에서 다시 시도해 주세요.');}
}
async function copyClassLink(index){const item=createdLinks[Number(index)];if(!item)return;try{await navigator.clipboard.writeText(item.url);say(`${item.label} 링크를 복사했어요.`,true);}catch{const field=$('#class-link-'+Number(index));field?.focus();field?.select();say('선택된 링크를 복사해 학생에게 보내 주세요.');}}

function defs(){return `<defs><radialGradient id="sphereH" cx="30%" cy="25%"><stop stop-color="#effaff"/><stop offset=".45" stop-color="#a6d8df"/><stop offset="1" stop-color="#497b93"/></radialGradient><radialGradient id="sphereO" cx="30%" cy="25%"><stop stop-color="#ffc3a9"/><stop offset=".45" stop-color="#f38673"/><stop offset="1" stop-color="#9c444f"/></radialGradient><radialGradient id="sphereAu" cx="30%" cy="25%"><stop stop-color="#fff0bb"/><stop offset=".45" stop-color="#eac465"/><stop offset="1" stop-color="#987032"/></radialGradient><radialGradient id="cloud"><stop stop-color="#56bdc9" stop-opacity=".04"/><stop offset=".5" stop-color="#56bdc9" stop-opacity=".15"/><stop offset="1" stop-color="#56bdc9" stop-opacity="0"/></radialGradient></defs>`;}
function svg(content,label,cls=''){return `<svg class="science-svg ${cls}" viewBox="0 0 720 500" aria-label="${label}" role="group">${defs()}${content}</svg>`;}
function atomBall(z,x,y,r,action='',value=z){const a=atom(z);return `<g ${action?`class="svg-button" role="button" tabindex="0" data-action="${action}" data-value="${value}" aria-label="${a.name} 원자 선택"`:''}><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sphere${a.symbol})"/><text class="atom-symbol" x="${x}" y="${y+1}" font-size="${r*.72}" fill="${z===79?'#493408':'#13252f'}">${a.symbol}</text></g>`;}
function smallMolecule(x,y,scale=1,rotation=0,action='',value=0){
 const water=state.material==='water';return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotation})" ${action?`class="svg-button" role="button" tabindex="0" data-action="${action}" data-value="${value}" aria-label="${water?'물':'수소'} 분자 ${value+1} 선택"`:''}><circle r="58" fill="transparent"/><path d="${water?'M -35 23 L 0 -4 L 35 23':'M -24 0 L 24 0'}" stroke="#8ba3b2" stroke-width="9" stroke-linecap="round"/>${water?atomBall(8,0,-4,25)+atomBall(1,-35,23,17)+atomBall(1,35,23,17):atomBall(1,-24,0,23)+atomBall(1,24,0,23)}</g>`;
}
function fieldSVG(){
 let s='';if(state.material==='gold'){for(let row=0;row<5;row++)for(let col=0;col<8;col++){const idx=row*8+col;s+=atomBall(79,65+col*82+(row%2)*30,70+row*83,37,'select-particle',idx);}}
 else{const positions=[[360,240],[135,90],[315,75],[500,80],[600,220],[150,240],[255,395],[470,393],[635,400],[60,399],[58,79],[550,300]];s=positions.map(([x,y],i)=>smallMolecule(x,y,i===0?1:.78,(i*57)%180,'select-particle',i)).join('');}
 const x=state.material==='gold'?311:360,y=state.material==='gold'?236:240;s+=`<circle cx="${x}" cy="${y}" r="68" class="tap-halo"/><g class="svg-button zoom-tag" role="button" tabindex="0" data-action="select-particle" data-value="${state.material==='gold'?19:0}" aria-label="${state.material==='gold'?'금 원자':'분자'} 하나 확대"><rect x="${x-110}" y="${y+76}" width="220" height="48" rx="24"/><text x="${x}" y="${y+102}" class="svg-label">${state.material==='gold'?'이 원자':'이 분자'} 확대 ＋</text></g>`;return svg(s,state.material==='gold'?'금 원자들이 반복된 배열. 원하는 금 원자를 선택하세요.':'여러 분자. 원하는 분자를 선택하세요.','particle-field');
}
function moleculeSVG(){
 if(state.material==='gold')return svg(`<g opacity=".2">${atomBall(79,170,250,80)}${atomBall(79,550,250,80)}${atomBall(79,270,95,80)}${atomBall(79,450,405,80)}</g>${atomBall(79,360,250,94,'select-atom',79)}<text x="360" y="440" class="svg-label">배열에서 고른 금 원자</text>`,'금 원자 배열에서 선택한 하나의 금 원자');
 let s='';if(state.material==='water')s=`<path d="M 203 330 L 360 210 L 517 330" stroke="#71899b" stroke-width="23" stroke-linecap="round"/>${atomBall(8,360,210,100,'select-atom',8)}${atomBall(1,203,330,65,'select-atom',1)}${atomBall(1,517,330,65,'select-atom',1)}<text x="360" y="74" class="svg-label">산소 원자 O</text><text x="203" y="433" class="svg-label">수소 원자 H</text><text x="517" y="433" class="svg-label">수소 원자 H</text>`;
 else s=`<path d="M 265 245 L 455 245" stroke="#71899b" stroke-width="23"/>${atomBall(1,265,245,92,'select-atom',1)}${atomBall(1,455,245,92,'select-atom',1)}<text x="265" y="390" class="svg-label">수소 원자 H</text><text x="455" y="390" class="svg-label">수소 원자 H</text>`;
 return svg(s,'분자 안의 원자를 선택하여 확대하세요.');
}

function particleDot(type,x,y,r=20,interactive=true,highlight=interactive){const p=PARTICLES[type],selected=highlight&&particle===type,dimmed=highlight&&particle&&particle!==type;return `<g class="${interactive?'svg-button ':''}particle-dot ${selected?'is-highlighted':''} ${dimmed?'is-dimmed':''}" data-particle="${type}" ${interactive?`role="button" tabindex="0" data-action="particle" data-value="${type}" aria-label="${p.name} ${p.sign} 입자 관찰"`:''}><circle cx="${x}" cy="${y}" r="${Math.max(24,r+3)}" fill="transparent"/>${selected?`<circle cx="${x}" cy="${y}" r="${r+5}" class="selection-halo"/>`:''}<circle cx="${x}" cy="${y}" r="${r}" class="particle-${type}"/><text x="${x}" y="${y+1}" class="particle-sign" font-size="${r*1.2}">${p.sign}</text></g>`;}
function atomSVG(z,{nucleus=false,exploded=false,electronCount=z,interactive=true}={}){
 const a=atom(z),cx=360,cy=250,isGold=z===79;
 let s=nucleus?'':`<ellipse cx="360" cy="250" rx="275" ry="230" fill="url(#cloud)"/>`;
 if(!nucleus){
  const positions=[[174,135],[511,110],[580,260],[476,400],[285,435],[141,323],[342,69],[592,397],[116,227],[433,75],[570,164],[542,332],[386,423],[206,390],[132,74],[271,93],[620,317],[437,462],[76,319],[636,110]];
  const count=isGold?10:electronCount;
  for(let i=0;i<count;i++){const [x,y]=positions[i];s+=particleDot('e',x,y,19,interactive);}

  s+=`<text x="${z===1?174:600}" y="${z===1?79:70}" class="svg-label electron-label">− 전자</text>`;
 }
 const pCount=isGold?8:a.z,nCount=isGold?8:a.n,count=pCount+nCount;
 const radius=nucleus?Math.min(44,125/Math.sqrt(count)):Math.min(25,54/Math.sqrt(count));
 let dots='';for(let i=0;i<count;i++){const type=i<pCount?'p':'n',j=i<pCount?i:i-pCount;let x,y;
  if(exploded){const rows=Math.ceil(Math.sqrt(type==='p'?pCount:nCount));x=(type==='p'?-120:120)+(j%rows-(rows-1)/2)*radius*2.2;y=(Math.floor(j/rows)-(rows-1)/2)*radius*2.2;}
  else{const t=i*2.39996,r=radius*1.7*Math.sqrt(i);x=Math.cos(t)*r;y=Math.sin(t)*r;}
  dots+=particleDot(type,cx+x,cy+y,radius,interactive&&nucleus,interactive);
 }
 s+=`<g class="nucleus-cluster ${!nucleus&&interactive?'svg-button nucleus-hit':''}" ${!nucleus&&interactive?'role="button" tabindex="0" data-action="zoom" data-value="5" aria-label="가운데 원자핵 확대"':''}>${!nucleus&&interactive?'<circle cx="360" cy="250" r="87" fill="transparent"/>':''}${dots}${!nucleus&&interactive?'<rect x="287" y="343" width="146" height="44" rx="22"/><text x="360" y="366" class="svg-label">원자핵 확대 ＋</text>':''}</g>`;
 if(!nucleus)s+=`<text x="360" y="137" class="svg-label nucleus-label">원자핵</text>`;
 if(nucleus&&interactive)s+=`<text x="360" y="460" class="svg-label">${a.n===0?'이 수소 원자에는 중성자가 없어요.':'양성자 + 와 중성자 0'}</text>`;
 return svg(s,`${a.name} ${electronCount!==a.z?'이온':'원자'} 모형. 양성자 ${a.z}개, 중성자 ${a.n}개, 전자 ${electronCount}개. ${isGold?'그림에는 일부만 표시.':''}`);
}
function showJournal(){modal(`<h2>나의 관찰 기록</h2><p>${esc(context.classLabel||'개인 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'}</p><p>관찰한 물질: ${state.visited.map(id=>MATERIALS[id].name).join(', ')||'아직 선택하지 않았어요.'}</p><ol class="journal">${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')||'<li>물질을 선택해 확대하면 관찰 기록이 쌓입니다.</li>'}</ol>${note('현재 수업 링크와 수준의 기록이 이 브라우저에 저장됩니다. 정답이나 점수로 진행을 제한하지 않습니다.')}<div class="choice-row">${btn('관찰 기록 인쇄','print','','secondary')}${btn('새 학생으로 시작','reset-confirm','','text-button')}</div>`);}
async function zoom(level,origin){
 if(busy||!state.material)return;
 level=Number(level);if(level===3)level=4;if(!Number.isInteger(level)||level<0||level>5||level===state.level)return;
 const inward=level>state.level,world=$('.explorer-layout .world'),animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;busy=true;
 try{
  if(world&&animate){const box=world.getBoundingClientRect();let x=50,y=50;if(origin){const r=origin.getBoundingClientRect();x=(r.x+r.width/2-box.x)/box.width*100;y=(r.y+r.height/2-box.y)/box.height*100;}world.style.transformOrigin=`${x}% ${y}%`;await world.animate([{transform:'scale(1)',opacity:1},{transform:`scale(${inward?2.9:.45})`,opacity:0}],{duration:340,easing:'cubic-bezier(.55,0,.3,1)',fill:'forwards'}).finished.catch(()=>{});}
  state.level=level;state.deepest=Math.max(state.deepest,level);state.drawer='';particle=null;exploded=false;
  if(level>=2)record(state.material);if(level>=4)record('structure');render(true);
  const next=$('.explorer-layout .world');if(next&&animate)await next.animate([{transform:`scale(${inward?.65:1.5})`,opacity:.1},{transform:'scale(1)',opacity:1}],{duration:400,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});
 }finally{busy=false;}
}
function selectMaterial(id){if(busy||!Object.hasOwn(MATERIALS,id))return;state.material=id;state.level=0;state.deepest=0;state.z=id==='gold'?79:id==='hydrogen'?1:8;state.selected=0;state.drawer='';add('visited',id);particle=null;exploded=false;render(true);}
function openDrawer(key){if(!['compare','number','charge'].includes(key)||!state.material)return;state.drawer=key;if(key==='compare')record('compare');if(key==='number'){state.numberZ=state.z<=20?state.z:1;record('number');record('table');}if(key==='charge')record('neutral');particle=null;render();$('#drawer-title')?.focus({preventScroll:true});document.querySelector('.concept-menu')?.scrollIntoView({block:'nearest'});}
function selectNumber(value){const z=Number(value);if(!Number.isInteger(z)||z<1||z>20)return;state.numberZ=z;state.tableZ=z;add('tableSeen',z);render();}
async function handle(action,value,el){
 if(busy)return;
 if(needsResume&&!['tools','resume','reset-confirm','reset','close','help','teacher-setup','learning-settings','choose-mode','switch-mode','copy-class-link'].includes(action)){say('본인의 관찰 기록인지 선택해 주세요.');return;}
 switch(action){
 case 'resume':needsResume=false;state.upgraded=false;render(true);break;
 case 'learning-settings':learningSettings();break;
 case 'choose-mode':if(normalizeMode(value)===context.mode)$('#dialog').close();else modal(`<h2>${value==='high'?'고등학교 확장':'중학교 2학년'}으로 관찰할까요?</h2>${context.lessonId!=='personal'?note('지금 반의 기록은 보관하고, 선택한 수준의 개인 탐험을 엽니다.'):''}${btn('이 수준으로 열기','switch-mode',value,'primary')}`);break;
 case 'switch-mode':switchMode(value);break;
 case 'teacher-setup':teacherSetup();break;
 case 'copy-class-link':await copyClassLink(value);break;
 case 'material':selectMaterial(value);break;
 case 'home':state.material=null;state.level=0;state.deepest=0;state.drawer='';particle=null;render(true);break;
 case 'zoom':await zoom(value,el?.closest('svg')?el:null);break;
 case 'select-particle':state.selected=Number(value);await zoom(state.material==='gold'?4:2,el?.closest('svg')?el:null);break;
 case 'select-atom':if(MATERIALS[state.material]?.atoms.includes(Number(value))){state.z=Number(value);await zoom(4,el?.closest('svg')?el:null);}break;
 case 'particle':if(['p','n','e'].includes(value)){if(value==='e'&&state.level===5)await zoom(4);particle=value;add('seen',`${state.z}:${value}`);record('particles');render();}break;
 case 'explode':exploded=!exploded;render();break;
 case 'open-drawer':openDrawer(value);break;
 case 'close-drawer':state.drawer='';render();document.querySelector('.concept-menu')?.scrollIntoView({block:'nearest'});break;
 case 'compare-atom':if([1,8,79].includes(Number(value))){state.compareZ=Number(value);render();}break;
 case 'number-atom':selectNumber(value);break;
 case 'charge-atom':if([11,17].includes(Number(value))){state.chargeZ=Number(value);state.chargeVariant='neutral';render();}break;
 case 'charge-variant':if(value==='neutral'||value==='lost'&&state.chargeZ===11||value==='gained'&&state.chargeZ===17){state.chargeVariant=value;render();}break;
 case 'journal':showJournal();break;
 case 'tools':modal(`<h2>학습 도구</h2><div class="tool-menu">${btn('반별 수업 링크 만들기','teacher-setup')}${btn('관찰 기록 보기','journal')}${btn('학습 수준 선택','learning-settings')}${btn('사용 방법','help')}</div>`);break;
 case 'help':modal('<h2>확대 관찰하는 방법</h2><p>물·수소·금 중 하나를 고르고, 그림 속 대상을 누르세요. 선택한 분자나 원자를 중심으로 확대됩니다.</p><p>원자 내부에서는 +·0·− 입자를 누르면 이름과 위치를 확인할 수 있습니다. 관찰 화면 위에서 원소 비교·원자 번호·전기적 중성을 선택할 수 있어요.</p><p>정답을 맞혀야 넘어가는 단계는 없습니다. 한 단계 밖으로 돌아가거나 다른 물질을 언제든 선택할 수 있어요.</p><p>Tab과 Enter·Space로도 모형 속 대상을 선택할 수 있어요.</p><p>기록은 이 기기에 저장됩니다. 반별 링크와 수준마다 분리되며, 공용 기기에서는 새 학생으로 시작하세요.</p>');break;
 case 'reset-confirm':modal(`<h2>현재 관찰 기록을 새로 시작할까요?</h2><p>이 수업 링크와 수준의 이 기기 기록만 초기화됩니다.</p>${btn('새 학생으로 시작','reset','','danger')}`);break;
 case 'reset':state=freshExplorer(context.mode);needsResume=false;particle=null;exploded=false;$('#dialog').close();render(true);break;
 case 'close':$('#dialog').close();break;
 case 'print':{const html=`<section class="print-report"><h1>확대! 물질 탐험 연구소 · 관찰 기록</h1><p>${esc(context.classLabel||'개인 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'}</p><p>물질: ${state.visited.map(id=>MATERIALS[id].name).join(', ')}</p><ol>${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')}</ol></section>`;document.querySelector('.print-report')?.remove();document.body.insertAdjacentHTML('beforeend',html);window.print();break;}
 }
 save();
}
document.addEventListener('submit',e=>{if(e.target.id==='teacher-form'){e.preventDefault();createClassLinks();}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)handle(b.dataset.action,b.dataset.value||'',b);});
document.addEventListener('keydown',e=>{const b=e.target.closest('svg [role="button"]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handle(b.dataset.action,b.dataset.value,b);}});
document.addEventListener('input',e=>{if(e.target.dataset.change==='number-atom')selectNumber(e.target.value);});
render();if(!storageOK)say('관찰 기록을 저장할 수 없지만 확대 탐험은 계속할 수 있어요.');
