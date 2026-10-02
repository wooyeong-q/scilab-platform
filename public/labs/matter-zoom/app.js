import {ELEMENTS,atom,MATERIALS,PARTICLES,DISCOVERIES,MOLECULE_LAYOUTS,ATOM_COLORS} from './data.mjs';
import {periodicExplorer} from './periodic-view.mjs';
import {SHOWN_GROUPS} from './element-features.mjs';
import {freshExplorer,restoreExplorer} from './exploration.mjs';
const MODE_INFO={middle:{label:'중학교 · 중2'},high:{label:'고등학교 · 확장'}};
import {normalizeMode,readContext,makeLessonLink,storageKey} from './session.mjs';

let context=readContext(location.search),activeKey=storageKey(context),state,storageOK=true,needsResume=false,createdLinks=[];
try{state=restoreExplorer(localStorage.getItem(activeKey),context.mode);needsResume=Boolean(state.material||state.records.length);}catch{state=freshExplorer(context.mode);storageOK=false;}
let busy=false,exploded=false,particle=null,toastTimer;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let motionPlaying=!reduceMotion(),motionEnded=false;
function resetMotion(){motionPlaying=!reduceMotion();motionEnded=false;}
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
 const tableScroll=$('.periodic-scroll')?.scrollLeft;
 const expanded=new Set([...document.querySelectorAll('#app details[open]')].map(d=>d.querySelector('summary')?.textContent));
 const prior=document.activeElement,action=prior?.dataset?.action,value=prior?.dataset?.value,change=prior?.dataset?.change;
 $('#mode-label').textContent=high()?'고등학교 · 확장':'중학교 · 중2';$('.brand').href=location.pathname+location.search;
 $('#app').innerHTML=scopeStrip()+(needsResume?resumeScreen():state.material?workspace():landing());
 if(tableScroll!==undefined&&$('.periodic-scroll'))$('.periodic-scroll').scrollLeft=tableScroll;
 document.querySelectorAll('#app details').forEach(d=>{if(expanded.has(d.querySelector('summary')?.textContent))d.open=true;});
 if(focus)$('h1')?.focus({preventScroll:true});
 else if(action)document.querySelector(`#app ${prior?.tagName==='BUTTON'?'button':''}[data-action="${CSS.escape(action)}"][data-value="${CSS.escape(value||'')}"]`)?.focus({preventScroll:true});
 else if(change)document.querySelector(`[data-change="${CSS.escape(change)}"]`)?.focus({preventScroll:true});
 save();
}
function landing(){return `<section class="explorer-landing">${question('확대! 물질 탐험 연구소','물질을 확대하면 무엇이 보일까?','물질을 고르고, 원자 속까지 들어가 보세요.')}<div class="materials-choice">${Object.entries(MATERIALS).map(([id,m])=>btn(`${photo(id)}<div><small>${m.formula}</small><h2>${m.name}</h2><p>${m.card}</p><b>관찰 시작 ＋</b></div>`,'material',id,`material-choice ${id}`)).join('')}</div><p class="model-note-inline">원자와 전자는 맨눈으로 직접 볼 수 없어요. 확대 후에는 이해를 돕는 모형을 사용하며, 색·크기·간격은 실제와 다릅니다.</p></section>`;}
function workspace(){
 const m=MATERIALS[state.material],a=atom(state.z),l=state.level,array=m.kind==='array',molecule=m.kind==='molecule';
 const titles={0:'그림을 눌러 확대해 보세요',1:molecule?'분자 하나를 눌러 보세요':`${atom(m.defaultZ).name} 원자 하나를 눌러 보세요`,2:`${[...new Set(m.atoms)].map(z=>atom(z).symbol).join(' 또는 ')}를 눌러 안을 보세요`,4:`${a.name} 원자 안에는 무엇이 있을까?`,5:'원자핵 속 입자를 눌러 보세요'};
 const steps=!molecule?[[m.name,0],[array?'원자 배열':'원자들',1],['원자 내부',4]]:[[m.name,0],['분자들',1],['분자 하나',2],['원자 내부',4]];
 const back=l===5?4:l>=4?(molecule?2:1):Math.max(0,l-1);
 const scene=l===0?`<button class="macro-photo ${state.material}" data-action="zoom" data-value="1" aria-label="${m.name} 확대">${photo(state.material)}<span class="photo-zoom">${m.name} 확대 <b>＋</b></span></button>`:l===1?fieldSVG():l===2?moleculeSVG():atomSVG(a.z,{nucleus:l===5,exploded});
 const caption=l===0?m.intro:l===1?m.field:l===2?m.detail:l===5?(a.n===0?'이 수소 원자핵에는 양성자 1개만 있어요.':'원자핵 안에는 양성자와 중성자가 모여 있어요.'):'가운데는 원자핵, 그 주변에는 전자가 있어요.';
 return `<section class="explorer-workspace"><div class="workspace-bar">${btn('← 물질 선택','home','','text-button')}<div class="material-switch"><select id="material-select" data-change="material" aria-label="다른 물질 선택">${Object.entries(MATERIALS).map(([id,v])=>`<option value="${id}" ${id===state.material?'selected':''}>${v.name} · ${v.formula}</option>`).join('')}</select></div></div><ol class="breadcrumb" aria-label="확대 위치">${steps.map(([name,level])=>`<li>${btn(name,'zoom',level,(l===5?4:l)===level?'current':'',`${level>state.deepest?'disabled':''} ${(l===5?4:l)===level?'aria-current="step"':''}`)}</li>`).join('')}</ol>${l>=4?conceptMenu():''}${state.drawer?drawer():`<section class="observation-panel"><div class="observation-title"><h1 tabindex="-1">${titles[l]||titles[4]}</h1><p>${caption}</p></div><div class="explorer-layout"><div class="lens-stage"><div class="lens-viewport"><div class="world">${scene}</div></div>${l>=4?`<div class="particle-readout">${particlePicker()}<div class="particle-detail" aria-live="polite">${particleExplanation()}</div></div>`:''}</div></div><div class="lens-controls">${btn('− 한 단계 밖으로','zoom',back,'secondary',l===0?'disabled':'')}${l>=4?btn(l===5?'원자 전체 보기':'원자핵 확대 ＋','zoom',l===5?4:5,'secondary'):''}${l===5?btn(exploded?'다시 모으기':'입자 펼쳐 보기','explode','','secondary'):''}</div></section>`}<p class="model-caption">${l===0?'확대하면 실제 모습을 바탕으로 한 일러스트에서 입자 모형으로 바뀝니다.':l>=4?'선택한 원자를 중성 원자로 단순화한 모형입니다. 위치·크기·간격은 실제와 다르며, 전자의 위치는 고정되어 있지 않아요.' :'색·크기·간격은 이해를 돕기 위한 모형입니다.'}${l>=4&&a.z>20?` ${a.name}의 구성 입자는 일부만 그렸으며 수는 따로 표시합니다.`:''}${l===1&&array?' 실제 입체 배열을 평면으로 단순화했습니다.':''}</p></section>`;
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

function conceptMenu(){return `<nav class="concept-menu" aria-label="관찰과 개념 선택">${btn('원자 관찰','close-drawer','',!state.drawer?'selected':'',`aria-pressed="${!state.drawer}"`)}${[['compare','원소 비교'],['number','주기율표'],['charge','전기적 중성']].map(([key,title])=>btn(title,'open-drawer',key,state.drawer===key?'selected':'',`aria-pressed="${state.drawer===key}"`)).join('')}</nav>`;}
function drawer(){const titles={compare:'원소가 다르면 무엇이 다를까?',number:'주기율표에서 원소의 특징을 찾아보세요',charge:'양성자는 +인데, 원자는 왜 중성일까?'};return `<section class="concept-drawer" id="concept-drawer" aria-labelledby="drawer-title"><div class="drawer-heading"><h1 id="drawer-title" tabindex="-1">${titles[state.drawer]}</h1>${btn('원자 관찰로 돌아가기','close-drawer','','text-button')}</div>${{compare:compareDrawer,number:numberDrawer,charge:chargeDrawer}[state.drawer]()}</section>`;}
function compareDrawer(){const zs=state.z===26?[8,26,79]:[...new Set([1,state.z,8,79])].slice(0,3).sort((a,b)=>a-b);return `<p>${zs.map(z=>atom(z).name).join('·')}의 원자핵을 나란히 살펴보세요.</p><div class="compare-three">${zs.map(z=>{const a=atom(z);return `<section class="compare-specimen"><h2>${a.symbol} <span>${a.name}</span></h2>${atomSVG(z,{nucleus:true,interactive:false})}<p class="proton-count"><span class="dot p">+</span> 양성자 <b>${a.z}개</b></p><p>원자 번호 <b>${a.z}</b></p>${z>20?'<small>그림에는 일부만 표시</small>':''}</section>`;}).join('')}</div><p class="finding"><b>양성자 수가 다르면 원소의 종류가 달라져요.</b> 원자 번호는 양성자 수와 같아요.</p><details class="extension-panel"><summary>전자 수가 달라도 같은 원소일까?</summary><p>나트륨 원자 Na: 양성자 11개 / 전자 11개</p><p>나트륨 이온 Na⁺: 양성자 11개 / 전자 10개</p><p>양성자가 모두 11개이므로 같은 나트륨이에요.</p></details>${high()?'<details class="extension-panel"><summary>고등학교 확장 · 중성자 수가 다르다면?</summary><p>탄소-12: 양성자 6개 + 중성자 6개 → 질량수 12</p><p>탄소-13: 양성자 6개 + 중성자 7개 → 질량수 13</p><p>양성자 수가 같아서 모두 탄소이며, 이러한 원자들을 동위 원소라고 해요.</p></details>':''}`;}
function numberDrawer(){return periodicExplorer({z:state.numberZ,observedZ:state.z,axis:state.tableAxis,playing:motionPlaying,reduced:reduceMotion()});}
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

function defs(){return `<defs>${Object.entries(ATOM_COLORS).map(([z,c])=>`<radialGradient id="sphere${atom(Number(z)).symbol}" cx="30%" cy="25%"><stop stop-color="${c[0]}"/><stop offset=".45" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`).join('')}<radialGradient id="cloud"><stop stop-color="#56bdc9" stop-opacity=".04"/><stop offset=".5" stop-color="#56bdc9" stop-opacity=".15"/><stop offset="1" stop-color="#56bdc9" stop-opacity="0"/></radialGradient></defs>`;}
function svg(content,label,cls=''){return `<svg class="science-svg ${cls}" viewBox="0 0 720 500" aria-label="${label}" role="group">${defs()}${content}</svg>`;}
function atomBall(z,x,y,r,action='',value=z){const a=atom(z);return `<g ${action?`class="svg-button" role="button" tabindex="0" data-action="${action}" data-value="${value}" aria-label="${a.name} 원자 선택"`:''}><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sphere${a.symbol})"/><text class="atom-symbol" x="${x}" y="${y+1}" font-size="${r*.72}" fill="${z===79?'#493408':z===6?'#f1f7ff':'#13252f'}">${a.symbol}</text></g>`;}
function smallMolecule(x,y,scale=1,rotation=0,action='',value=0){
 const layout=MOLECULE_LAYOUTS[state.material],m=MATERIALS[state.material];
 const dots=layout.atoms.map(a=>atomBall(a.z,(a.x-360)*.25,(a.y-250)*.25,a.r*.25)).join('');
 const bonds=layout.bonds.map(([i,j])=>{const a=layout.atoms[i],b=layout.atoms[j];return `<line x1="${(a.x-360)*.25}" y1="${(a.y-250)*.25}" x2="${(b.x-360)*.25}" y2="${(b.y-250)*.25}" stroke="#8ba3b2" stroke-width="8"/>`;}).join('');
 return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotation})" ${action?`class="svg-button" role="button" tabindex="0" data-action="${action}" data-value="${value}" aria-label="${m.name} 분자 ${value+1} 선택"`:''}><circle r="68" fill="transparent"/>${bonds}${dots}</g>`;
}
function fieldSVG(){
 const m=MATERIALS[state.material],array=m.kind==='array',molecule=m.kind==='molecule';let s='';
 if(array){for(let row=0;row<5;row++)for(let col=0;col<8;col++)s+=atomBall(m.defaultZ,65+col*82+(row%2)*30,70+row*83,37,'select-particle',row*8+col);}
 else{const positions=[[360,240],[135,90],[315,75],[500,80],[600,220],[150,240],[255,395],[470,393],[635,400],[60,399],[58,79],[550,300]];s=positions.map(([x,y],i)=>molecule?smallMolecule(x,y,i===0?1:.78,(i*57)%180,'select-particle',i):atomBall(m.defaultZ,x,y,i===0?35:28,'select-particle',i)).join('');}
 const x=array?311:360,y=array?236:240;s+=`<circle cx="${x}" cy="${y}" r="68" class="tap-halo"/><g class="svg-button zoom-tag" role="button" tabindex="0" data-action="select-particle" data-value="${array?19:0}" aria-label="${molecule?'분자':'원자'} 하나 확대"><rect x="${x-110}" y="${y+76}" width="220" height="48" rx="24"/><text x="${x}" y="${y+102}" class="svg-label">${molecule?'이 분자':'이 원자'} 확대 ＋</text></g>`;
 return svg(s,m.field+' 원하는 '+(molecule?'분자':'원자')+'를 선택하세요.','particle-field');
}
function moleculeSVG(){
 const layout=MOLECULE_LAYOUTS[state.material];
 const bonds=layout.bonds.map(([i,j])=>{const a=layout.atoms[i],b=layout.atoms[j];return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#71899b" stroke-width="23" stroke-linecap="round"/>`;}).join('');
 const dots=layout.atoms.map(a=>atomBall(a.z,a.x,a.y,a.r,'select-atom',a.z)+`<text x="${a.x}" y="${a.labelY}" class="svg-label">${atom(a.z).name} 원자 ${atom(a.z).symbol}</text>`).join('');
 return svg(bonds+dots,`${MATERIALS[state.material].name} 분자. 원자를 선택하여 확대하세요.`);
}
function particleDot(type,x,y,r=20,interactive=true,highlight=interactive){const p=PARTICLES[type],selected=highlight&&particle===type,dimmed=highlight&&particle&&particle!==type;return `<g class="${interactive?'svg-button ':''}particle-dot ${selected?'is-highlighted':''} ${dimmed?'is-dimmed':''}" data-particle="${type}" ${interactive?`role="button" tabindex="0" data-action="particle" data-value="${type}" aria-label="${p.name} ${p.sign} 입자 관찰"`:''}><circle cx="${x}" cy="${y}" r="${Math.max(24,r+3)}" fill="transparent"/>${selected?`<circle cx="${x}" cy="${y}" r="${r+5}" class="selection-halo"/>`:''}<circle cx="${x}" cy="${y}" r="${r}" class="particle-${type}"/><text x="${x}" y="${y+1}" class="particle-sign" font-size="${r*1.2}">${p.sign}</text></g>`;}
function atomSVG(z,{nucleus=false,exploded=false,electronCount=z,interactive=true}={}){
 const a=atom(z),cx=360,cy=250,partial=z>20;
 let s=nucleus?'':`<ellipse cx="360" cy="250" rx="275" ry="230" fill="url(#cloud)"/>`;
 if(!nucleus){
  const positions=[[174,135],[511,110],[580,260],[476,400],[285,435],[141,323],[342,69],[592,397],[116,227],[433,75],[570,164],[542,332],[386,423],[206,390],[132,74],[271,93],[620,317],[437,462],[76,319],[636,110]];
  const count=partial?10:electronCount;
  for(let i=0;i<count;i++){const [x,y]=positions[i];s+=particleDot('e',x,y,19,interactive);}

  s+=`<text x="${z===1?174:600}" y="${z===1?79:70}" class="svg-label electron-label">− 전자</text>`;
 }
 const pCount=partial?8:a.z,nCount=partial?8:a.n,count=pCount+nCount;
 const radius=nucleus?Math.min(44,125/Math.sqrt(count)):Math.min(25,54/Math.sqrt(count));
 let dots='';for(let i=0;i<count;i++){const type=i<pCount?'p':'n',j=i<pCount?i:i-pCount;let x,y;
  if(exploded){const rows=Math.ceil(Math.sqrt(type==='p'?pCount:nCount));x=(type==='p'?-120:120)+(j%rows-(rows-1)/2)*radius*2.2;y=(Math.floor(j/rows)-(rows-1)/2)*radius*2.2;}
  else{const t=i*2.39996,r=radius*1.7*Math.sqrt(i);x=Math.cos(t)*r;y=Math.sin(t)*r;}
  dots+=particleDot(type,cx+x,cy+y,radius,interactive&&nucleus,interactive);
 }
 s+=`<g class="nucleus-cluster ${!nucleus&&interactive?'svg-button nucleus-hit':''}" ${!nucleus&&interactive?'role="button" tabindex="0" data-action="zoom" data-value="5" aria-label="가운데 원자핵 확대"':''}>${!nucleus&&interactive?'<circle cx="360" cy="250" r="87" fill="transparent"/>':''}${dots}${!nucleus&&interactive?'<rect x="287" y="343" width="146" height="44" rx="22"/><text x="360" y="366" class="svg-label">원자핵 확대 ＋</text>':''}</g>`;
 if(!nucleus)s+=`<text x="360" y="137" class="svg-label nucleus-label">원자핵</text>`;
 if(nucleus&&interactive)s+=`<text x="360" y="460" class="svg-label">${a.n===0?'이 수소 원자에는 중성자가 없어요.':'양성자 + 와 중성자 0'}</text>`;
 return svg(s,`${a.name} ${electronCount!==a.z?'이온':'원자'} 모형. 양성자 ${a.z}개, 중성자 ${a.n}개, 전자 ${electronCount}개. ${partial?'그림에는 일부만 표시.':''}`);
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
function selectMaterial(id){if(busy||!Object.hasOwn(MATERIALS,id))return;state.material=id;state.level=0;state.deepest=0;state.z=MATERIALS[id].defaultZ;state.selected=0;state.drawer='';add('visited',id);particle=null;exploded=false;render(true);}
function openDrawer(key){if(!['compare','number','charge'].includes(key)||!state.material)return;state.drawer=key;if(key==='compare')record('compare');if(key==='number'){state.numberZ=state.z<=20?state.z:1;resetMotion();record('number');record('table');record('elementFeatures');}if(key==='charge')record('neutral');particle=null;render();$('#drawer-title')?.focus({preventScroll:true});document.querySelector('.concept-menu')?.scrollIntoView({block:'nearest'});}
function selectNumber(value,reveal=false){const z=Number(value);if(!Number.isInteger(z)||z<1||z>20)return;state.numberZ=z;state.tableZ=z;add('tableSeen',z);resetMotion();record('elementFeatures');render();if(reveal&&matchMedia('(max-width:960px)').matches){$('#feature-name')?.focus({preventScroll:true});$('.element-feature')?.scrollIntoView({block:'start',behavior:reduceMotion()?'auto':'smooth'});}}
function selectTableAxis(axis){if(!['group','period'].includes(axis))return;state.tableAxis=axis;record(axis==='group'?'groups':'periods');resetMotion();render();}
function selectTableLine(axis,value){
 const n=Number(value);if(axis==='group'?!SHOWN_GROUPS.includes(n):![1,2,3,4].includes(n))return;
 state.tableAxis=axis;record(axis==='group'?'groups':'periods');
 const current=atom(state.numberZ),next=current[axis]===n?current:ELEMENTS.find(e=>e[axis]===n&&(axis!=='group'||n!==1||e.z!==1));
 selectNumber(next.z);
}
function updateMotionControl(){
 const stage=$('.motion-stage'),control=$('.motion-toggle');
 if(stage){stage.style.setProperty('--motion-play',motionPlaying?'running':'paused');stage.classList.toggle('is-paused',!motionPlaying);}
 if(control){control.textContent=motionPlaying?'Ⅱ 일시정지':motionEnded?'▶ 다시 재생':'▶ 재생';control.setAttribute('aria-label','원소 특징 모션 '+(motionPlaying?'일시정지':'재생'));}
}
function toggleMotion(){if(reduceMotion())return;if(motionEnded){resetMotion();render();}else{motionPlaying=!motionPlaying;updateMotionControl();}}
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
 case 'select-particle':state.selected=Number(value);await zoom(MATERIALS[state.material].kind==='molecule'?2:4,el?.closest('svg')?el:null);break;
 case 'select-atom':if(MATERIALS[state.material]?.atoms.includes(Number(value))){state.z=Number(value);await zoom(4,el?.closest('svg')?el:null);}break;
 case 'particle':if(['p','n','e'].includes(value)){if(value==='e'&&state.level===5)await zoom(4);particle=value;add('seen',`${state.z}:${value}`);record('particles');render();}break;
 case 'explode':exploded=!exploded;render();break;
 case 'open-drawer':openDrawer(value);break;
 case 'close-drawer':state.drawer='';render();document.querySelector('.concept-menu')?.scrollIntoView({block:'nearest'});break;
 case 'compare-atom':if([1,8,79].includes(Number(value))){state.compareZ=Number(value);render();}break;
 case 'number-atom':selectNumber(value,true);break;
 case 'table-focus':$('.periodic-panel')?.scrollIntoView({block:'start',behavior:reduceMotion()?'auto':'smooth'});$('.element-cell.selected')?.focus({preventScroll:true});break;
 case 'table-axis':selectTableAxis(value);break;
 case 'table-group':selectTableLine('group',value);break;
 case 'table-period':selectTableLine('period',value);break;
 case 'motion-toggle':toggleMotion();break;
 case 'motion-replay':resetMotion();render();break;
 case 'charge-atom':if([11,17].includes(Number(value))){state.chargeZ=Number(value);state.chargeVariant='neutral';render();}break;
 case 'charge-variant':if(value==='neutral'||value==='lost'&&state.chargeZ===11||value==='gained'&&state.chargeZ===17){state.chargeVariant=value;render();}break;
 case 'journal':showJournal();break;
 case 'tools':modal(`<h2>학습 도구</h2><div class="tool-menu">${btn('반별 수업 링크 만들기','teacher-setup')}${btn('관찰 기록 보기','journal')}${btn('학습 수준 선택','learning-settings')}${btn('사용 방법','help')}</div>`);break;
 case 'help':modal('<h2>확대 관찰하는 방법</h2><p>일곱 가지 물질 중 하나를 고르고, 그림 속 대상을 누르세요. 선택한 분자나 원자를 중심으로 확대됩니다.</p><p>원자 내부에서는 +·0·− 입자를 누르면 이름과 위치를 확인할 수 있습니다. 관찰 화면 위에서 원소 비교·주기율표·전기적 중성을 선택할 수 있어요. 주기율표에서는 족과 주기를 누르고, 원소의 특징을 모션으로 볼 수 있어요.</p><p>정답을 맞혀야 넘어가는 단계는 없습니다. 한 단계 밖으로 돌아가거나 다른 물질을 언제든 선택할 수 있어요.</p><p>Tab과 Enter·Space로도 모형 속 대상을 선택할 수 있어요.</p><p>기록은 이 기기에 저장됩니다. 반별 링크와 수준마다 분리되며, 공용 기기에서는 새 학생으로 시작하세요.</p>');break;
 case 'reset-confirm':modal(`<h2>현재 관찰 기록을 새로 시작할까요?</h2><p>이 수업 링크와 수준의 이 기기 기록만 초기화됩니다.</p>${btn('새 학생으로 시작','reset','','danger')}`);break;
 case 'reset':state=freshExplorer(context.mode);needsResume=false;particle=null;exploded=false;$('#dialog').close();render(true);break;
 case 'close':$('#dialog').close();break;
 case 'print':{const html=`<section class="print-report"><h1>확대! 물질 탐험 연구소 · 관찰 기록</h1><p>${esc(context.classLabel||'개인 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'}</p><p>물질: ${state.visited.map(id=>MATERIALS[id].name).join(', ')}</p><ol>${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')}</ol></section>`;document.querySelector('.print-report')?.remove();document.body.insertAdjacentHTML('beforeend',html);window.print();break;}
 }
 save();
}
document.addEventListener('animationend',e=>{if(e.animationName==='motion-progress'&&e.target.matches('.motion-clock')){motionPlaying=false;motionEnded=true;updateMotionControl();}});
document.addEventListener('submit',e=>{if(e.target.id==='teacher-form'){e.preventDefault();createClassLinks();}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)handle(b.dataset.action,b.dataset.value||'',b);});
document.addEventListener('keydown',e=>{const b=e.target.closest('svg [role="button"]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handle(b.dataset.action,b.dataset.value,b);}});
document.addEventListener('change',e=>{if(e.target.dataset.change==='material')selectMaterial(e.target.value);});
document.addEventListener('input',e=>{if(e.target.dataset.change==='number-atom')selectNumber(e.target.value);});
render();if(!storageOK)say('관찰 기록을 저장할 수 없지만 확대 탐험은 계속할 수 있어요.');
