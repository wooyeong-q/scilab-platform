import {ELEMENTS,atom,MATERIALS,PARTICLES,DISCOVERIES} from './data.mjs';
import {total,placeElectron,correctShells} from './core.mjs';
import {freshExplorer,restoreExplorer} from './exploration.mjs';
import {MODE_INFO,FAMILY_CASES,outerElectrons} from './levels.mjs';
import {normalizeMode,readContext,makeLessonLink,storageKey} from './session.mjs';

let context=readContext(location.search),activeKey=storageKey(context),state,storageOK=true,needsResume=false,createdLinks=[];
try{state=restoreExplorer(localStorage.getItem(activeKey),context.mode);needsResume=Boolean(state.material||state.records.length);}catch{state=freshExplorer(context.mode);storageOK=false;}
let busy=false,exploded=false,particle=null,toastTimer,drag=null,suppressClick=false;
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
function modePicker(){return `<div class="level-picker" role="group" aria-label="학습 수준 선택">${Object.entries(MODE_INFO).map(([mode,info])=>btn(`<b>${esc(info.label)}</b><small>${mode==='middle'?'물질에서 원자 내부까지 확대 관찰':'같은 확대 관찰 + 동위 원소·주기성 확장'}</small>`,'choose-mode',mode,`mode-card ${context.mode===mode?'selected':''}`,`aria-pressed="${context.mode===mode}"`)).join('')}</div>`;}
function scopeStrip(){return context.lessonId==='personal'?'':`<div class="scope-strip teacher-strip"><span><strong>${esc(context.classLabel||'반별 탐험')}</strong> · ${high()?'고등학교 확장':'중학교 2학년'}</span>${btn('새 학생으로 시작','reset-confirm','','text-button')}</div>`;}
function resumeScreen(){return `<section class="resume-card">${question('기기에 남아 있는 관찰 기록','이어서 관찰할까요?','본인의 기록이면 이어서, 다른 학생의 기록이면 새로 시작하세요.')}<div class="choice-row">${btn('내 관찰 이어서 보기','resume','','primary')}${btn('새 학생으로 시작','reset-confirm','','secondary')}</div></section>`;}
function learningSettings(){modal(`<h2>학습 수준</h2><p>두 수준 모두 물질을 확대하며 자유롭게 관찰합니다.</p>${modePicker()}${context.lessonId!=='personal'?note('반별 링크에는 수준이 지정되어 있어요. 다른 수준을 선택하면 개인 탐험으로 이동합니다.'):''}${note('중2는 구성 입자·원소·원자 번호·전하를 중심으로, 고등학교는 동위 원소와 최외각 전자도 펼쳐 볼 수 있어요.')}`);}
function switchMode(mode){
 mode=normalizeMode(mode);if(mode===context.mode){$('#dialog').close();return;}
 save();context={mode,lessonId:'personal',classLabel:''};activeKey=storageKey(context);
 try{state=restoreExplorer(localStorage.getItem(activeKey),mode);needsResume=Boolean(state.material||state.records.length);}catch{state=freshExplorer(mode);storageOK=false;needsResume=false;}
 const url=new URL(location.href);url.search='';url.searchParams.set('mode',mode);history.replaceState(null,'',url);$('#dialog').close();particle=null;exploded=false;render(true);
}
function render(focus=false){
 const expanded=new Set([...document.querySelectorAll('#app details[open]')].map(d=>d.querySelector('summary')?.textContent));
 const prior=document.activeElement,action=prior?.dataset?.action,value=prior?.dataset?.value,change=prior?.dataset?.change;
 $('#record-count').textContent=state.records.length;$('#mode-label').textContent=high()?'고등학교 · 확장':'중학교 · 중2';$('.brand').href=location.pathname+location.search;
 $('#app').innerHTML=scopeStrip()+(needsResume?resumeScreen():state.material?workspace():landing());
 document.querySelectorAll('#app details').forEach(d=>{if(expanded.has(d.querySelector('summary')?.textContent))d.open=true;});
 if(focus)$('h1')?.focus({preventScroll:true});
 else if(action)document.querySelector(`#app [data-action="${CSS.escape(action)}"][data-value="${CSS.escape(value||'')}"]`)?.focus({preventScroll:true});
 else if(change)document.querySelector(`[data-change="${CSS.escape(change)}"]`)?.focus({preventScroll:true});
 save();
}
function landing(){return `<section class="explorer-landing">${question('확대! 물질 탐험 연구소','물질을 확대하면 무엇이 보일까?','물질을 고르고, 원자 속까지 들어가 보세요.')}<div class="materials-choice">${Object.entries(MATERIALS).map(([id,m])=>btn(`${photo(id)}<div><small>${m.formula}</small><h2>${m.name}</h2><p>${m.kind==='array'?'금 원자들이 반복된 배열':'분자 속에 결합한 원자들'}</p><b>관찰 시작 ＋</b></div>`,'material',id,`material-choice ${id}`)).join('')}</div><p class="model-note-inline">원자와 전자는 맨눈으로 직접 볼 수 없어요. 확대 후에는 이해를 돕는 모형을 사용하며, 색·크기·간격은 실제와 다릅니다.</p></section>`;}
function workspace(){
 const m=MATERIALS[state.material],a=atom(state.z),l=state.level,isArray=m.kind==='array';
 const titles=[`${m.name}, 더 작게 들여다보기`,isArray?'금 원자들이 반복되어 있어요':`${m.name}을 이루는 분자들이 보여요`,isArray?'배열에서 고른 금 원자':`${m.formula} 분자 하나를 자세히 보면`,`${a.name} 원자의 안쪽에는?`,`${a.name} 원자의 내부`,`${a.name} 원자의 원자핵`];
 const tasks=['확대 버튼을 눌러 작은 입자들을 만나 보세요.',isArray?'금 원자 하나를 누르세요.':'분자 하나를 누르세요.',isArray?'금 원자 안쪽으로 들어가 보세요.':state.material==='water'?'H 또는 O 원자를 누르세요.':'수소 원자 하나를 누르세요.','원자를 더 확대해 내부를 살펴보세요.','+·0·− 입자를 눌러 이름과 위치를 알아보세요.','원자핵 안의 +·0 입자를 살펴보세요.'];
 let action='';
 if(l===0)action=btn('물질 확대 ＋','zoom',1,'primary next-action');
 if(l===1)action=btn(isArray?'금 원자 하나 확대 ＋':'분자 하나 확대 ＋','select-particle',0,'primary next-action');
 if(l===2)action=btn(`${a.name} ${a.symbol} 원자 확대 ＋`,'select-atom',a.z,'primary next-action');
 if(l===3)action=btn('원자 내부로 확대 ＋','zoom',4,'primary next-action');
 if(l>=4)action=particlePicker();
 const scene=l===0?`<div class="macro-photo">${photo(state.material)}<div class="reticle"></div><span class="macro-label">${m.name} <b>${m.formula}</b></span></div>`:l===1?fieldSVG():l===2?moleculeSVG():l===3?solidAtomSVG(state.z):atomSVG(state.z,{nucleus:l===5,exploded});
 const steps=[['실제 물질',0],[isArray?'원자 배열':'분자',1],['원자 하나',3],['원자 내부',4]];
 const group=l>=4?3:l>=3?2:l>=1?1:0,backLevel=isArray&&l===3?1:Math.max(0,l-1);
 return `<section class="explorer-workspace"><div class="explorer-topline">${btn('← 물질 선택','home','','text-button')}<span>${m.name} · ${m.formula}</span></div><ol class="breadcrumb" aria-label="확대 위치">${steps.map(([name,level],i)=>`<li>${btn(name,'zoom',level,i===group?'current':'',`${level>state.deepest?'disabled':''} ${i===group?'aria-current="step"':''}`)}</li>`).join('')}</ol>${question('확대 관찰',titles[l])}<div class="current-task"><div><small>지금 할 일</small><b>${tasks[l]}</b></div>${action}</div><div class="explorer-layout"><section class="lens-stage" aria-label="확대 관찰 화면"><div class="lens-caption"><span class="live-dot"></span>${l===0?'실제 물질을 표현한 일러스트':'이해를 돕는 모형'}<span class="zoom-depth">${l===5?'원자핵':steps[group][0]}</span></div><div class="lens-viewport"><div class="world">${scene}</div></div><div class="lens-controls">${btn('− 한 단계 밖으로','zoom',backLevel,'secondary',l===0?'disabled':'')}${l>=4?btn(l===5?'원자 전체 보기':'원자핵 확대 ＋','zoom',l===5?4:5,'secondary'):''}</div>${l>=4?`<p class="lens-model-note">${state.z===79?'금 원자의 입자는 일부만 그렸으며, 실제 수는 옆에 표시합니다.':'위치와 거리, 입자 크기는 실제 비율이 아닙니다.'} 전자의 원형 배치는 실제 궤도가 아니에요.</p>`:''}</section><aside class="explorer-guide">${guide()}</aside></div>${l>=4?conceptMenu()+drawer():''}</section>`;
}
function particlePicker(){return `<div class="particle-picker" role="group" aria-label="관찰할 입자">${['p','n','e'].map(k=>{const p=PARTICLES[k],known=state.seen.includes(`${state.z}:${k}`);return btn(`<span class="dot ${k}">${p.sign}</span>${known?p.name:p.sign+' 입자'}`,'particle',k,particle===k?'selected':'secondary',`aria-pressed="${particle===k}"`);}).join('')}</div>`;}
function counts(a,e=a.z){return `<dl class="particle-counts"><div><dt><span class="dot p">+</span> 양성자</dt><dd>${a.z}개</dd></div><div><dt><span class="dot n">0</span> 중성자 · 이 원자의 예</dt><dd>${a.n}개</dd></div><div><dt><span class="dot e">−</span> 전자</dt><dd>${e}개</dd></div></dl>`;}
function guide(){
 const m=MATERIALS[state.material],a=atom(state.z),l=state.level;
 if(l===0)return `<p class="step-label">우리 주변의 물질</p><h2>${m.name}</h2><p>${m.intro}</p>${note('확대할 때 실제 모습에서 모형으로 전환됩니다.')}`;
 if(l===1)return `<p class="step-label">물질을 이루는 입자</p><h2>${m.kind==='array'?'같은 원자가 이어져 있어요':'작은 묶음 하나가 분자예요'}</h2><p>${m.field}</p>${note(m.kind==='array'?'금속의 입체 배열을 평면에 단순화했습니다.':'연결된 구들은 같은 분자의 원자를 나타냅니다.')}`;
 if(l===2)return `<p class="step-label">${m.kind==='array'?'원자 배열에서 하나 선택':'분자 속 원자'}</p><h2>${m.formula}</h2><p>${m.detail}</p><div class="choice-row">${[...new Set(m.atoms)].map(z=>btn(`${atom(z).symbol} · ${atom(z).name} 원자`,'select-atom',z,'secondary')).join('')}</div>${m.kind==='molecule'?`<div class="identity-readout"><p>${state.material==='water'?'H와 O는 서로 다른 원자의 종류예요. 원자의 종류를 ‘원소’라고 합니다.':'두 원자는 모두 수소예요. 원자는 2개지만, 원소의 종류는 수소 한 가지입니다.'}</p></div>`:note('금은 작은 분자 묶음이 아니라 원자들이 반복된 구조를 이룹니다.')}`;
 if(l===3)return `<p class="step-label">지금 선택한 원자</p><h2>${a.symbol} · ${a.name}</h2><p>하나의 구처럼 보이는 원자 안에는 더 작은 입자들이 있어요.</p>${note('다음 화면은 독립된 중성 원자 모형입니다. 분자 속 공유 전자나 금속에서의 전자 이동은 생략합니다.')}`;
 const explanation=particle==='p'?`양성자는 원자핵에 있고, + 전하를 띠어요. 양성자가 ${a.z}개인 이 원소는 ${a.name}이고, 원자 번호도 ${a.z}입니다.`:particle==='n'?(a.n===0?'이 모형은 가장 흔한 수소 원자의 예예요. 원자핵에는 양성자 1개가 있고 중성자는 없어요.':'중성자는 원자핵에 있고, 전하를 띠지 않아요.'):particle==='e'?`전자는 원자핵 주변에 있고, − 전하를 띠어요. 이 모형은 양성자와 전자가 ${a.z}개씩이라 전체적으로 중성이에요.`:'';
 return `<p class="step-label">선택한 중성 원자의 예</p><h2>${a.symbol} · ${a.name}</h2>${counts(a)}<div class="particle-detail" aria-live="polite">${particle?`<h3>${PARTICLES[particle].sign} ${PARTICLES[particle].name}</h3><p>${explanation}</p>`:'<h3>가운데는 원자핵, 주변에는 전자</h3><p>원자핵에는 양성자와 중성자가 있어요. +·0·− 입자를 눌러 자세히 살펴보세요.</p>'}</div><div class="nucleus-tools">${btn(exploded?'원자핵 다시 모으기':'원자핵 펼쳐 보기','explode','','secondary')}</div>${m.kind==='molecule'?btn('분자로 돌아가 다른 원자 보기','zoom',2,'text-button back-action'):''}${note('중성자 수는 이 원자의 예이며, 원소마다 하나의 수로 고정되는 것은 아닙니다.')}`;
}
function conceptMenu(){return `<section class="concept-menu"><div><h2>관찰한 원자로 더 알아보기</h2><p>궁금한 것을 골라 열어 보세요.</p></div><div class="explorer-tools">${[['compare','왜 서로 다른 원소일까?','양성자 수 비교'],['number','양성자 수와 표의 숫자','원자 번호 · 주기율표'],['charge','+와 −인데 왜 중성일까?','전하 비교'],['shells','전자들은 어떻게 놓일까?','전자 배치']].map(([key,title,copy])=>btn(`<b>${title}</b><span>${copy}</span>`,'open-drawer',key,`concept-card ${state.drawer===key?'selected':''}`,`aria-expanded="${state.drawer===key}" aria-controls="concept-drawer"`)).join('')}</div></section>`;}
function drawer(){if(!state.drawer)return '';const titles={compare:'원자는 왜 서로 다른 원소일까?',number:'양성자 수가 원소의 번호가 돼요',charge:'전하를 한 쌍씩 짝지어 볼까요?',shells:'전자 배치를 직접 살펴보기'};return `<section class="concept-drawer" id="concept-drawer" aria-labelledby="drawer-title"><div class="drawer-heading"><h2 id="drawer-title" tabindex="-1">${titles[state.drawer]}</h2>${btn('닫고 원자 관찰로 ↑','close-drawer','','secondary drawer-close')}</div>${{compare:compareDrawer,number:numberDrawer,charge:chargeDrawer,shells:shellDrawer}[state.drawer]()}</section>`;}
function compareDrawer(){
 const a=atom(state.compareZ);
 return `<p>방금 본 ${atom(state.z).name} 원자를 다른 원자와 비교해 보세요.</p><div class="atom-compare-grid">${[1,8,79].map(z=>{const c=atom(z);return btn(`<strong>${c.symbol}</strong><b>${c.name}</b><span>양성자 ${c.z}개</span>`,'compare-atom',z,`compare-atom ${z===a.z?'selected':''}`,`aria-pressed="${z===a.z}"`);}).join('')}</div><div class="comparison-stage"><div class="lens-stage">${atomSVG(a.z,{nucleus:true,interactive:false})}</div><div class="identity-readout"><h3>${a.name} 원자의 원자핵</h3><p>양성자 <strong>${a.z}개</strong> → 원소 <strong>${a.name}</strong></p><p>수소는 1개, 산소는 8개, 금은 79개예요. 원소의 종류는 양성자 수로 결정됩니다.</p>${counts(a)}${note('그림은 서로 다른 원자의 예를 비교합니다. 원자핵을 바꾸는 과정을 나타내지 않습니다.')}</div></div><details class="extension-panel rule-demo"><summary>전자 수가 달라도 같은 원소일까?</summary><div class="same-element-note"><p><b>나트륨 원자 Na</b> · 양성자 11개 / 전자 11개</p><p><b>나트륨 이온 Na⁺</b> · 양성자 11개 / 전자 10개</p><p>전자는 하나 달라도 양성자 11개가 같아서 둘 다 나트륨이에요. 전하가 달라진 것은 ‘전하 비교’에서 볼 수 있어요.</p></div></details>${high()?`<details class="extension-panel"><summary>고등학교 확장 · 중성자 수가 다르다면?</summary><p>탄소-12: 양성자 6개 + 중성자 6개 · 질량수 12</p><p>탄소-13: 양성자 6개 + 중성자 7개 · 질량수 13</p><p>양성자 수가 같아 모두 탄소이며, 이러한 원자들을 동위 원소라고 해요.</p></details>`:''}`;
}
function numberDrawer(){
 const a=atom(state.numberZ),current=atom(state.z);
 const cells=ELEMENTS.map(e=>`<button class="element-cell ${e.z===a.z?'selected':''}" style="grid-row:${e.period+1};grid-column:${e.group}" data-action="number-atom" data-value="${e.z}" aria-label="원자 번호 ${e.z}, ${e.name}, ${e.symbol}"><small>${e.z}</small><strong>${e.symbol}</strong><span>${e.name}</span></button>`).join('');
 return `<p>방금 본 ${current.name}은 양성자가 ${current.z}개라서 원자 번호가 ${current.z}입니다.${current.z===79?' 금은 79번으로, 아래 1~20번 표의 범위 밖에 있어요.':''}</p><div class="number-link"><div><span>원자핵 속 양성자</span><b>+ ${a.z}개</b></div><div><span>주기율표의 원자 번호</span><b>${a.z}</b></div><div><span>원소의 이름과 기호</span><b>${a.name} · ${a.symbol}</b></div></div><div class="number-browser"><label for="proton-range">양성자가 적은 원자부터 순서대로 살펴보세요.<input id="proton-range" type="range" min="1" max="20" step="1" value="${a.z}" data-change="number-atom" aria-label="양성자 수로 원소 살펴보기" aria-valuetext="양성자 ${a.z}개, ${a.name}"></label><div class="choice-row">${btn('← 양성자가 1개 적은 원자','number-atom',a.z-1,'secondary',a.z===1?'disabled':'')}${btn('양성자가 1개 많은 원자 →','number-atom',a.z+1,'secondary',a.z===20?'disabled':'')}</div><p class="note">1개 → 수소, 2개 → 헬륨, 3개 → 리튬. 원자 번호는 양성자 수와 같아요. 다른 원자의 모형을 차례로 비교하는 활동입니다.</p></div><div class="periodic-layout"><section class="periodic-panel"><p class="scroll-hint">표의 원소 칸도 눌러 보세요. 작은 화면에서는 표 안을 좌우로 움직일 수 있어요.</p><div class="periodic-scroll" tabindex="0" role="region" aria-label="원자번호 1~20 주기율표"><div class="periodic-grid">${[1,2,13,14,15,16,17,18].map(n=>`<span class="group-label" style="grid-row:1;grid-column:${n}">${n}족</span>`).join('')}${cells}<div class="table-space">원자 번호 = 양성자 수<small>숫자와 원소 이름이 함께 바뀌어요.</small></div></div></div></section><div class="element-detail"><div class="element-stamp"><small>원자 번호</small><b>${a.z}</b><strong>${a.symbol}</strong><span>${a.name}</span></div>${counts(a)}${high()?`<p>${a.period}주기 · ${a.group}족</p>`:''}</div></div>`;
}
function chargePairs(p,e){const pairs=Math.min(p,e),net=p-e;return `<div class="charge-pairs"><p><b>+와 − ${pairs}쌍</b> · 서로 더하면 0</p><div aria-hidden="true">${Array.from({length:Math.min(pairs,20)},()=>'<span class="charge-pair">+ −</span>').join('')}</div>${pairs>20?'<p>그림은 20쌍만 표시합니다.</p>':''}<p class="remaining-charge">${net===0?'남는 전하 없음 → 전체적으로 중성':`${net>0?'+':'−'} 전하 1개가 남아요 → ${net>0?'양이온':'음이온'}`}</p></div>`;}
function chargeDrawer(){
 const current=atom(state.z),a=atom(state.chargeZ),e=a.z+(state.chargeVariant==='lost'?-1:state.chargeVariant==='gained'?1:0),shells=e===10?[2,8]:e===18?[2,8,8]:a.shells;
 return `<div class="charge-state"><h3>방금 본 ${current.name} 원자</h3><p>양성자 + ${current.z}개와 전자 − ${current.z}개가 있어요.</p>${chargePairs(current.z,current.z)}<p>양성자와 전자의 전하 크기는 같고 부호는 반대예요. 중성 원자에서는 양성자 수와 전자 수가 같습니다. 중성자의 전하는 0이에요.</p></div><details class="extension-panel"><summary>전자를 잃거나 얻으면? · 이온 살펴보기</summary><div class="choice-row">${btn('나트륨 Na','charge-atom',11,a.z===11?'selected':'secondary')}${btn('염소 Cl','charge-atom',17,a.z===17?'selected':'secondary')}</div><div class="charge-toggle choice-row">${btn('중성 원자','charge-variant','neutral',state.chargeVariant==='neutral'?'selected':'secondary')}${btn(a.z===11?'전자 1개를 잃은 상태':'전자 1개를 얻은 상태','charge-variant',a.z===11?'lost':'gained',state.chargeVariant!=='neutral'?'selected':'secondary')}</div><div class="comparison-stage"><div class="lens-stage">${atomSVG(a.z,{shellCounts:shells,interactive:false})}</div><div class="identity-readout"><h3>${a.z===17&&state.chargeVariant==='gained'?'염화 이온 Cl⁻':`${a.name} ${state.chargeVariant==='neutral'?'원자':`이온 ${a.symbol}⁺`}`}</h3>${counts(a,e)}${chargePairs(a.z,e)}<p>전자 수가 달라져도 양성자는 ${a.z}개 그대로예요. 원소는 여전히 ${a.name}, 원자 번호는 ${a.z}입니다.</p></div></div></details>`;
}
function shellDrawer(){
 const a=atom(state.shellZ),remaining=a.z-total(state.shells),complete=correctShells(state.shells,a.z);
 return `<p>중성 원자의 전자는 양성자와 같은 ${a.z}개예요. 안쪽 껍질부터 놓아 보거나, 배치 모형을 바로 볼 수 있어요.</p><div class="shell-quick choice-row">${[1,2,3,8,10,11,19,20].map(z=>btn(`${atom(z).symbol} · ${z}개`,'shell-atom',z,z===a.z?'selected':'secondary')).join('')}</div><div class="shell-workspace"><div class="lens-stage">${shellSVG()}</div><aside class="shell-tools"><label>관찰할 중성 원자<select data-change="shell-atom" aria-label="전자 배치할 원소">${ELEMENTS.map(c=>`<option value="${c.z}" ${c.z===a.z?'selected':''}>${c.name} ${c.symbol} · 전자 ${c.z}개</option>`).join('')}</select></label><button class="electron-source" data-action="electron-select" data-drag="electron" ${remaining===0?'disabled':''}><span class="dot e">−</span><span>전자를 껍질로 끌어 놓기<small>남은 전자 ${remaining}개 · 껍질 버튼으로도 놓을 수 있어요</small></span></button><div class="shell-buttons">${state.shells.map((n,i)=>`<div>${btn(`${i+1}번째 껍질 <b>${n}개</b> ＋`,'place',i,'secondary',remaining===0?'disabled':'')}${btn('−','remove',i,'remove',`aria-label="${i+1}번째 껍질 전자 빼기" ${!n?'disabled':''}`)}</div>`).join('')}</div><div class="configuration"><span>현재 전자 배치</span><strong>${state.shells.join(' · ')}</strong></div><div class="choice-row">${btn('배치 모형 바로 보기','show-arrangement','','primary')}${btn('다시 놓기','clear-shells','','secondary')}</div>${complete?`<p class="answer-note" aria-live="polite">${a.name}의 전자 배치: ${a.shells.join(', ')}</p>`:''}</aside></div><p class="note">첫 껍질에는 최대 2개, 두 번째에는 최대 8개를 놓아요. 이번 활동은 원자 번호 1~20의 바닥상태 중성 원자 모형으로, 세 번째는 8개까지 사용하고 K·Ca에서는 네 번째도 사용해요. 실제 전자의 궤도를 나타내지 않습니다.</p><div class="shell-patterns"><h3>하나 더 많아지면 다음 껍질이 열려요</h3><div class="charge-case-grid">${[2,3,10,11].map(z=>btn(`<b>${atom(z).symbol}</b><span>${atom(z).shells.join(', ')}</span>`,'shell-atom',z,'secondary')).join('')}</div></div>${high()?`<details class="extension-panel"><summary>고등학교 확장 · 최외각 전자와 족·주기</summary>${FAMILY_CASES.map(f=>`<h3>${esc(f.label)}</h3><p>${f.atoms.map(z=>`${atom(z).symbol}: ${atom(z).shells.join(', ')} (${atom(z).period}주기, ${atom(z).group}족, 최외각 ${outerElectrons(z)}개)`).join('<br>')}</p><p>${esc(f.note)}</p>`).join('')}</details>`:''}`;
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
 return svg(s,state.material==='gold'?'금 원자들이 반복된 배열. 원하는 금 원자를 선택하세요.':'여러 분자. 원하는 분자를 선택하세요.','particle-field');
}
function moleculeSVG(){
 if(state.material==='gold')return svg(`<g opacity=".2">${atomBall(79,170,250,80)}${atomBall(79,550,250,80)}${atomBall(79,270,95,80)}${atomBall(79,450,405,80)}</g>${atomBall(79,360,250,94,'select-atom',79)}<text x="360" y="440" class="svg-label">배열에서 고른 금 원자</text>`,'금 원자 배열에서 선택한 하나의 금 원자');
 let s='';if(state.material==='water')s=`<path d="M 203 330 L 360 210 L 517 330" stroke="#71899b" stroke-width="23" stroke-linecap="round"/>${atomBall(8,360,210,100,'select-atom',8)}${atomBall(1,203,330,65,'select-atom',1)}${atomBall(1,517,330,65,'select-atom',1)}<text x="360" y="74" class="svg-label">물 분자 H₂O</text><text x="360" y="444" class="svg-label">수소 H × 2　+　산소 O × 1</text>`;
 else s=`<path d="M 265 245 L 455 245" stroke="#71899b" stroke-width="23"/>${atomBall(1,265,245,92,'select-atom',1)}${atomBall(1,455,245,92,'select-atom',1)}<text x="360" y="80" class="svg-label">수소 분자 H₂</text><text x="360" y="427" class="svg-label">수소 H × 2</text>`;
 return svg(s,'분자 안의 원자를 선택하여 확대하세요.');
}
function solidAtomSVG(z){return svg(`<circle cx="360" cy="245" r="184" class="guide-ring"/>${atomBall(z,360,245,148,'zoom',4)}<path d="M360 36v27 M360 427v27 M151 245h27 M542 245h27" stroke="#8393a0"/><text x="360" y="470" class="svg-label">${atom(z).name} 원자 · 내부를 눌러 확대</text>`,'선택한 원자의 외형을 단순화한 구');}
function particleDot(type,x,y,r=20,interactive=true){const p=PARTICLES[type];return `<g ${interactive?`role="button" tabindex="0" class="svg-button" data-action="particle" data-value="${type}" aria-label="${p.sign} 입자 관찰"`:''}><circle cx="${x}" cy="${y}" r="${type==='e'?Math.max(23,r):r}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${r}" class="particle-${type}"/><text x="${x}" y="${y+1}" class="particle-sign" font-size="${r*1.2}">${p.sign}</text></g>`;}
function atomSVG(z,{nucleus=false,exploded=false,shellCounts=null,interactive=true}={}){
 const a=atom(z),cx=360,cy=242;let s=`<circle cx="360" cy="242" r="235" fill="url(#cloud)"/>`;
 const isGold=z===79;
 if(!nucleus){
  if(isGold){s+=`<ellipse cx="360" cy="242" rx="220" ry="178" fill="none" stroke="#548d99" stroke-dasharray="3 9"/><text x="360" y="456" class="svg-label">주변의 전자 79개 · 일부만 표시</text>`;for(let i=0;i<6;i++){const t=i*Math.PI/3;s+=particleDot('e',cx+205*Math.cos(t),cy+170*Math.sin(t),17,interactive);}}
  else{const counts=shellCounts||a.shells;counts.forEach((n,i)=>{const r=exploded?120+i*32:85+i*45;s+=`<circle cx="${cx}" cy="${cy}" r="${r}" class="shell-ring"/>`;for(let j=0;j<n;j++){const t=-Math.PI/2+j*2*Math.PI/Math.max(n,1)+(i%2)*.4;s+=particleDot('e',cx+r*Math.cos(t),cy+r*Math.sin(t),14,interactive);}});}
 }
 const pCount=isGold?6:a.z,nCount=isGold?6:a.n,count=pCount+nCount;
 const radius=nucleus?Math.min(31,150/Math.sqrt(count)):Math.min(18,38/Math.sqrt(count));
 let dots='';for(let i=0;i<count;i++){const type=i<pCount?'p':'n',j=i<pCount?i:i-pCount;let x,y;
  if(exploded){const rows=Math.ceil(Math.sqrt(type==='p'?pCount:nCount));x=(type==='p'?-65:65)+(j%rows-(rows-1)/2)*radius*2.15;y=(Math.floor(j/rows)-(rows-1)/2)*radius*2.15;}
  else {const t=i*2.39996,r=radius*1.68*Math.sqrt(i);x=Math.cos(t)*r;y=Math.sin(t)*r;}
  dots+=particleDot(type,cx+x,cy+y,radius,interactive);
 }
 s+=`<g class="nucleus-cluster">${dots}</g>`;
 if(nucleus||exploded||isGold)s+=`<text x="360" y="${nucleus?53:45}" class="svg-label">${nucleus?'원자핵 확대 · ':''}+ 양성자 ${a.z}개　 0 중성자 ${a.n}개${isGold?' (일부 표시)':''}</text>`;
 if(!nucleus&&!exploded&&!isGold)s+=`<path d="M385 224 L510 124h66" fill="none" stroke="#8ba3b2"/><text x="542" y="104" class="svg-label">원자핵</text>`;
 if(nucleus)s+=`<text x="360" y="458" class="svg-label">전자는 원자핵 바깥에 있어요.</text>`;
 return svg(s,`${a.name} ${shellCounts&&total(shellCounts)!==a.z?'이온':'원자'} 모형. 양성자 ${a.z}개, 중성자 ${a.n}개, 전자 ${shellCounts?total(shellCounts):a.z}개. ${isGold?'입자는 일부만 표시.':''}`);
}

function shellSVG(){
 const a=atom(state.shellZ);let s='';
 for(let i=3;i>=0;i--){const r=76+i*48;s+=`<g role="button" tabindex="0" class="shell-zone" data-action="place" data-value="${i}" data-drop="${i}" aria-label="${i+1}번째 껍질에 전자 놓기"><circle cx="360" cy="245" r="${r}" fill="none" stroke="transparent" stroke-width="38"/><circle cx="360" cy="245" r="${r}" class="shell-ring"/><text x="${360+r+6}" y="${245+13}" class="shell-name">${i+1}</text></g>`;}
 s+=`<circle cx="360" cy="245" r="40" fill="#354b5f"/><text x="360" y="238" class="svg-label">${a.symbol}</text><text x="360" y="263" class="svg-label small">+ ${a.z}</text>`;
 state.shells.forEach((n,i)=>{for(let j=0;j<n;j++){const t=-Math.PI/2+j*2*Math.PI/Math.max(n,1),r=76+i*48;s+=`<g data-drop="${i}" data-action="place" data-value="${i}">${particleDot('e',360+r*Math.cos(t),245+r*Math.sin(t),15,false)}</g>`;}});
 return svg(s,'전자 배치 모형. 전자를 끌어 껍질에 놓거나 껍질 버튼을 누르세요.','shell-model');
}

function showJournal(){modal(`<h2>나의 관찰 기록</h2><p>${esc(context.classLabel||'개인 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'}</p><p>관찰한 물질: ${state.visited.map(id=>MATERIALS[id].name).join(', ')||'아직 선택하지 않았어요.'}</p><ol class="journal">${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')||'<li>물질을 선택해 확대하면 관찰 기록이 쌓입니다.</li>'}</ol>${note('현재 수업 링크와 수준의 기록이 이 브라우저에 저장됩니다. 정답이나 점수로 진행을 제한하지 않습니다.')}<div class="choice-row">${btn('관찰 기록 인쇄','print','','secondary')}${btn('새 학생으로 시작','reset-confirm','','text-button')}</div>`);}
async function zoom(level,origin){
 if(busy||!state.material)return;
 level=Number(level);if(!Number.isInteger(level)||level<0||level>5||level===state.level)return;
 const inward=level>state.level,world=$('.explorer-layout .world'),animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;busy=true;
 try{
  if(world&&animate){const box=world.getBoundingClientRect();let x=50,y=50;if(origin){const r=origin.getBoundingClientRect();x=(r.x+r.width/2-box.x)/box.width*100;y=(r.y+r.height/2-box.y)/box.height*100;}world.style.transformOrigin=`${x}% ${y}%`;await world.animate([{transform:'scale(1)',opacity:1},{transform:`scale(${inward?2.9:.45})`,opacity:0}],{duration:340,easing:'cubic-bezier(.55,0,.3,1)',fill:'forwards'}).finished.catch(()=>{});}
  state.level=level;state.deepest=Math.max(state.deepest,level);state.drawer='';particle=null;exploded=false;
  if(level>=2)record(state.material);if(level>=4)record('structure');render(true);
  const next=$('.explorer-layout .world');if(next&&animate)await next.animate([{transform:`scale(${inward?.65:1.5})`,opacity:.1},{transform:'scale(1)',opacity:1}],{duration:400,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});
 }finally{busy=false;}
}
function selectMaterial(id){if(busy||!Object.hasOwn(MATERIALS,id))return;state.material=id;state.level=0;state.deepest=0;state.z=id==='gold'?79:id==='hydrogen'?1:8;state.selected=0;state.drawer='';add('visited',id);particle=null;exploded=false;render(true);}
function openDrawer(key){if(!['compare','number','charge','shells'].includes(key)||!state.material)return;const closing=state.drawer===key;state.drawer=closing?'':key;if(!closing){if(key==='compare'){state.compareZ=state.z;record('compare');}if(key==='number'){state.numberZ=state.z<=20?state.z:1;record('number');record('table');}if(key==='charge')record('neutral');if(key==='shells'){const z=state.z<=20?state.z:1;if(z!==state.shellZ){state.shellZ=z;state.shells=[0,0,0,0];}}}render();if(!closing){$('#drawer-title')?.focus({preventScroll:true});$('#concept-drawer')?.scrollIntoView({block:'start',behavior:'auto'});}}
function selectNumber(value){const z=Number(value);if(!Number.isInteger(z)||z<1||z>20)return;state.numberZ=z;state.tableZ=z;add('tableSeen',z);render();}
function doPlace(index){const r=placeElectron(state.shells,Number(index),state.shellZ);if(!r.ok){say(r.message);return;}state.shells=r.shells;if(correctShells(state.shells,state.shellZ)){add('shellDone',state.shellZ);record('shells');}render();}
async function handle(action,value,el){
 if(busy)return;
 if(needsResume&&!['resume','reset-confirm','reset','close','help','teacher-setup','learning-settings','choose-mode','switch-mode','copy-class-link'].includes(action)){say('본인의 관찰 기록인지 선택해 주세요.');return;}
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
 case 'select-particle':state.selected=Number(value);await zoom(state.material==='gold'?3:2,el?.closest('svg')?el:null);break;
 case 'select-atom':if(MATERIALS[state.material]?.atoms.includes(Number(value))){state.z=Number(value);await zoom(3,el?.closest('svg')?el:null);}break;
 case 'particle':if(['p','n','e'].includes(value)){particle=value;add('seen',`${state.z}:${value}`);record('particles');render();}break;
 case 'explode':exploded=!exploded;render();break;
 case 'open-drawer':openDrawer(value);break;
 case 'close-drawer':state.drawer='';render();document.querySelector('.concept-menu')?.scrollIntoView({block:'nearest'});break;
 case 'compare-atom':if([1,8,79].includes(Number(value))){state.compareZ=Number(value);render();}break;
 case 'number-atom':selectNumber(value);break;
 case 'charge-atom':if([11,17].includes(Number(value))){state.chargeZ=Number(value);state.chargeVariant='neutral';render();}break;
 case 'charge-variant':if(value==='neutral'||value==='lost'&&state.chargeZ===11||value==='gained'&&state.chargeZ===17){state.chargeVariant=value;render();}break;
 case 'shell-atom':if(Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=20){state.shellZ=Number(value);state.shells=[0,0,0,0];render();}break;
 case 'electron-select':say('전자 하나를 원형 껍질로 끌어 놓거나, 껍질 옆 ＋ 버튼을 누르세요.');break;
 case 'place':doPlace(value);break;
 case 'remove':{const i=Number(value);if(!Number.isInteger(i)||i<0||i>3)break;if(state.shells.slice(i+1).some(Boolean)){say('바깥쪽 껍질의 전자부터 빼 보세요.');break;}state.shells[i]=Math.max(0,state.shells[i]-1);render();break;}
 case 'show-arrangement':state.shells=[...atom(state.shellZ).shells];while(state.shells.length<4)state.shells.push(0);add('shellDone',state.shellZ);record('shells');render();break;
 case 'clear-shells':state.shells=[0,0,0,0];render();break;
 case 'journal':showJournal();break;
 case 'help':modal('<h2>확대 관찰하는 방법</h2><p>물·수소·금 중 하나를 고르고, 화면 위의 확대 버튼을 누르세요. 모형 속 분자나 원자도 직접 누를 수 있어요.</p><p>원자 내부에서는 +·0·− 입자를 누르면 이름과 위치를 확인할 수 있습니다. 아래의 궁금한 질문을 열어 비교·원자 번호·전하·전자 배치를 살펴보세요.</p><p>정답을 맞혀야 넘어가는 단계는 없습니다. 한 단계 밖으로 돌아가거나 다른 물질을 언제든 선택할 수 있어요.</p><p>Tab과 Enter·Space로도 모형을 선택할 수 있고, 전자 끌기 대신 껍질 버튼을 사용할 수 있어요.</p><p>기록은 이 기기에 저장됩니다. 반별 링크와 수준마다 분리되며, 공용 기기에서는 새 학생으로 시작하세요.</p>');break;
 case 'reset-confirm':modal(`<h2>현재 관찰 기록을 새로 시작할까요?</h2><p>이 수업 링크와 수준의 이 기기 기록만 초기화됩니다.</p>${btn('새 학생으로 시작','reset','','danger')}`);break;
 case 'reset':state=freshExplorer(context.mode);needsResume=false;particle=null;exploded=false;$('#dialog').close();render(true);break;
 case 'close':$('#dialog').close();break;
 case 'print':{const html=`<section class="print-report"><h1>확대! 물질 탐험 연구소 · 관찰 기록</h1><p>${esc(context.classLabel||'개인 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'}</p><p>물질: ${state.visited.map(id=>MATERIALS[id].name).join(', ')}</p><ol>${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')}</ol><p>관찰한 전자 배치: ${state.shellDone.map(z=>`${atom(z).name} ${atom(z).shells.join(', ')}`).join(' / ')||'아직 없음'}</p></section>`;document.querySelector('.print-report')?.remove();document.body.insertAdjacentHTML('beforeend',html);window.print();break;}
 }
 save();
}
document.addEventListener('submit',e=>{if(e.target.id==='teacher-form'){e.preventDefault();createClassLinks();}});
document.addEventListener('click',e=>{if(suppressClick&&e.target.closest('[data-drag]')){suppressClick=false;return;}const b=e.target.closest('[data-action]');if(b&&!b.disabled)handle(b.dataset.action,b.dataset.value||'',b);});
document.addEventListener('keydown',e=>{const b=e.target.closest('svg [role="button"]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handle(b.dataset.action,b.dataset.value,b);}});
document.addEventListener('input',e=>{if(e.target.dataset.change==='number-atom')selectNumber(e.target.value);});
document.addEventListener('change',e=>{if(e.target.dataset.change==='shell-atom')handle('shell-atom',e.target.value);});
document.addEventListener('pointerdown',e=>{const source=e.target.closest('[data-drag]');if(!source||source.disabled||e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,source};source.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;if(drag.moved){e.preventDefault();const ghost=$('#drag-ghost');ghost.hidden=false;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]')?.classList.add('drop-hover');}},{passive:false});
function endDrag(e,cancel=false){if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;drag=null;$('#drag-ghost').hidden=true;document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));if(moved){suppressClick=true;setTimeout(()=>suppressClick=false,100);if(!cancel){const drop=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]');if(drop)doPlace(drop.dataset.drop);else say('원형 껍질 위에 놓아 보세요. 껍질 옆 ＋ 버튼으로도 놓을 수 있어요.');}}}
document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));
render();if(!storageOK)say('관찰 기록을 저장할 수 없지만 확대 탐험은 계속할 수 있어요.');
