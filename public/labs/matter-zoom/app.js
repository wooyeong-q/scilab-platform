import {ELEMENTS,atom,MATERIALS,PARTICLES,CHAPTERS,DISCOVERIES} from './data.mjs';
import {fresh,restore,total,placeElectron,correctShells} from './core.mjs';
import {MODE_INFO,FAMILY_CASES,missionFor,evaluateMission,outerElectrons} from './levels.mjs';
import {normalizeMode,readContext,makeLessonLink,storageKey} from './session.mjs';
import {groupCases,groupingWorks,ORDER_ZS,validOrder,NUMBER_EXAMPLES,testNumber,MAP_TARGETS,CHARGE_TASKS,chargeRuleWorks} from './inquiry.mjs';

let context=readContext(location.search),activeKey=storageKey(context),state,storageOK=true,needsResume=false,createdLinks=[];
try{state=restore(localStorage.getItem(activeKey),context.mode);needsResume=state.records.length>0||state.material!==null||state.unlocked>0;}catch{state=fresh(context.mode);storageOK=false;}
let busy=false,exploded=false,particle=null,toastTimer,drag=null,suppressClick=false;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,value='',cls='',extra='')=>`<button class="${cls}" data-action="${action}" data-value="${esc(value)}" ${extra}>${label}</button>`;
const add=(key,value)=>{if(!state[key].includes(value))state[key].push(value);};
function save(){try{localStorage.setItem(activeKey,JSON.stringify(state));}catch{storageOK=false;}}
function record(key){add('records',key);save();}
function say(message,success=false){const el=$('#feedback');el.textContent=message;el.className=success?'show success':'show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',5500);}
function modal(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal();}
const question=(eyebrow,title,copy='')=>`<div class="question"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1>${copy?`<p class="intro-copy">${copy}</p>`:''}</div>`;
const note=t=>`<p class="note">${t}</p>`;
const checkMark=done=>done?'✓':'○';
const high=()=>context.mode==='high';
function modePicker(){return `<div class="level-picker" role="group" aria-label="학습 수준 선택">${Object.entries(MODE_INFO).map(([mode,info])=>btn(`<b>${esc(info.label)}</b><small>${esc(info.description)}</small>`,'choose-mode',mode,`mode-card ${context.mode===mode?'selected':''}`,`aria-pressed="${context.mode===mode}"`)).join('')}</div>`;}
function scopeStrip(){return `<div class="scope-strip class-banner"><span><strong>${context.lessonId==='personal'?'개인 탐험':esc(context.classLabel||'반별 탐험')}</strong> · ${high()?'고등학교 확장':'중학교 2학년'}</span><div class="scope-actions">${btn('수준 안내','learning-settings','','text-button')}${btn('새 학생으로 시작','reset-confirm','','text-button')}</div></div>`;}
function resumeScreen(){return `<section class="resume-card">${question('지난 탐험 기록','이 기기에 진행 중인 탐험이 있어요.','본인의 기록이면 이어서 탐험하고, 다른 학생의 기록이면 새로 시작하세요.')}<p>${esc(context.classLabel||'개인 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'} · ${state.visited.length}개 물질 관찰</p><div class="choice-row">${btn('내 기록 이어서 탐험','resume','','primary')}${btn('새 학생으로 시작','reset-confirm','','secondary')}</div><p class="note">새로 시작하면 현재 수업의 이 기기 기록만 초기화됩니다.</p></section>`;}
function learningSettings(){modal(`<h2>학습 수준 선택</h2><p>실제 물질에서 원자 내부로 들어가는 확대 탐험은 두 수준에서 함께 사용해요.</p>${modePicker()}${context.lessonId!=='personal'?'<p class="note">이 수업 링크에는 학습 수준이 지정되어 있어요. 다른 수준을 선택하면 개인 탐험으로 이동합니다.</p>':''}<p>${esc(MODE_INFO[context.mode].focus.join(' · '))}</p>${high()?'<p class="note">최외각 전자·주기율표 연결은 통합과학 탐구, 질량수·동위 원소는 화학 선택과목 추가 탐구입니다.</p>':'<p class="note">중2 기본 개념을 먼저 탐구해요. 전자 배치와 원소 1~20은 이어서 자유롭게 탐색할 수 있어요.</p>'}`);}
function switchMode(mode){
 mode=normalizeMode(mode);if(mode===context.mode){$('#dialog').close();return;}
 save();context={mode,lessonId:'personal',classLabel:''};activeKey=storageKey(context);
 try{state=restore(localStorage.getItem(activeKey),mode);needsResume=state.records.length>0||state.material!==null||state.unlocked>0;}catch{state=fresh(mode);storageOK=false;needsResume=false;}
 const url=new URL(location.href);url.search='';url.searchParams.set('mode',mode);history.replaceState(null,'',url);$('#dialog').close();particle=null;exploded=false;render(true);
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
function conceptCheck(){
 if(state.material==='gold')return `<div class="concept-check"><b>금에는 작은 분자 묶음이 보이나요?</b><p>금은 Au 원자들이 반복된 배열을 이루어요. 원자 여러 개가 이어졌다고 모두 분자는 아닙니다.</p></div>`;
 const id=state.material,answer=state.conceptAnswers[id]||{},expected=id==='water'?{atoms:'3',types:'2'}:{atoms:'2',types:'1'},done=answer.atoms===expected.atoms&&answer.types===expected.types;
 return `<div class="concept-check"><h3>이 분자 하나를 읽어 볼까요?</h3>${[['atoms','원자는 모두 몇 개?'],['types','원소의 종류는 몇 가지?']].map(([key,label])=>`<fieldset><legend>${label}</legend><div class="choice-row">${[1,2,3].map(n=>btn(n,'concept',`${id}:${key}:${n}`,String(answer[key])===String(n)?'selected':'secondary')).join('')}</div></fieldset>`).join('')}${done?'<p class="answer-note">✓ 원자는 하나하나의 입자, 원소는 원자의 종류예요. 분자는 원자들이 결합한 독립된 입자예요.</p>':'<p class="note">구의 개수와 H·O의 종류를 각각 살펴보세요.</p>'}</div>`;
}
function navigation(){
 $('#navigation').innerHTML=needsResume?'':CHAPTERS.map((name,i)=>btn(`<span>${String(i+1).padStart(2,'0')}</span>${i===4&&high()?'전자 배치·주기성':name}`,'chapter',i,i===state.chapter?'active':'',`${i>state.unlocked?'disabled':''} ${i===state.chapter?'aria-current="step"':''}`)).join('');
 $('#record-count').textContent=state.records.length;
 $('#mode-label').textContent=context.mode==='high'?'고등학교 · 확장':'중학교 · 중2';
 $('.brand').href=location.pathname+location.search;
}
function render(focus=false){
 const previous=document.activeElement;const action=previous?.dataset?.action;const value=previous?.dataset?.value;const change=previous?.dataset?.change;
 navigation();$('#app').innerHTML=scopeStrip()+(state.upgraded?'<p class="flow-note">규칙 발견 활동이 새로 구성되었습니다. 이전 관찰 기록은 보관했고, 새 탐구는 처음부터 이어집니다.</p>':'')+(needsResume?resumeScreen():[introOrZoom,comparison,numbers,neutral,shells,final][state.chapter]());
 if(focus)$('h1')?.focus({preventScroll:true});
 else if(action){const target=document.querySelector(`#app [data-action="${CSS.escape(action)}"][data-value="${CSS.escape(value||'')}"]`);target?.focus({preventScroll:true});}
 else if(change)document.querySelector(`[data-change="${CSS.escape(change)}"]`)?.focus({preventScroll:true});
 save();
}
function frame(scene,panel,caption='',classes=''){
 return `<div class="lab-grid ${classes}"><section class="observation" aria-label="관찰 화면"><div class="scene-top"><span class="live-dot"></span> OBSERVATION <span class="model-badge">이해를 돕는 모형</span></div><div id="viewport"><div class="world">${scene}</div></div><div class="scene-caption">${caption}</div></section><aside class="inquiry">${panel}</aside></div>`;
}
function footer(text,next,action='advance',value=''){
 return `<footer class="lesson-footer"><p>${text}</p>${btn(next,action,value,'primary')}</footer>`;
}
function photo(id,cls=''){const m=MATERIALS[id];return `<img class="${cls}" src="./assets/${m.image}" alt="${m.alt}" width="800" height="800">`;}
function materialButtons(){return `<div class="material-mini">${Object.entries(MATERIALS).map(([id,m])=>btn(`${photo(id)}<span>${m.name}</span><small>${checkMark(state.visited.includes(id))}</small>`,'material',id,state.material===id?'selected':'')).join('')}</div>`;}
function introOrZoom(){
 if(!state.material)return `<section class="landing">${modePicker()}${question('작은 세계로 떠나는 과학 탐험','눈에 보이는 물질,<br>그 안에는 무엇이 있을까?','물질 하나를 선택하고, 더 작은 세계로 들어가 보세요.')}<div class="material-grid">${Object.entries(MATERIALS).map(([id,m],i)=>`<button class="material-card ${id}" data-action="material" data-value="${id}"><div class="material-photo">${photo(id)}<span class="specimen">SPECIMEN 0${i+1}</span><span class="lens-icon" aria-hidden="true">＋</span></div><div class="material-copy"><small>${m.tag}</small><h2>${m.name}<span>${m.formula}</span></h2><p>${m.intro}</p><b>선택하여 확대 <span aria-hidden="true">↗</span></b></div></button>`).join('')}</div><p class="model-notice"><span>ⓘ</span> 원자와 전자는 맨눈으로 직접 볼 수 없어요. 이 프로그램은 이해를 돕는 확대 모형을 사용합니다.<br>입자의 색·크기·간격과 확대 비율은 실제와 다릅니다. 실물 화면은 사실적인 일러스트입니다.</p></section>`;
 const m=MATERIALS[state.material],a=atom(state.z),l=state.level;
 const titles=[m.intro,'더 작은 세계에는 어떤 입자들이 있을까?',m.kind==='array'?'배열 속 원자 하나를 골라 볼까?':'분자 하나는 무엇으로 이루어져 있을까?','원자는 더 작은 입자로 이루어져 있을까?','가운데 뭉친 입자와 주변 입자는 어떻게 다를까?','가운데 뭉친 입자들의 정체는 무엇일까?'];
 const levels=['실제 물질',m.kind==='array'?'원자 배열':'여러 분자',m.kind==='array'?'원자 선택':'한 분자','원자 하나','원자 내부','원자핵'];
 const path=`${m.name} <span>›</span> ${l>=2?(m.kind==='array'?'Au 배열':m.formula):levels[l]} ${l>=3?`<span>›</span> ${a.name} 원자`:''} ${l>=4?'<span>›</span> 내부 구조':''}`;
 let scene='',panel='';
 if(l===0){scene=`<div class="macro-photo">${photo(state.material)}<div class="reticle"></div><span class="macro-label">${m.name} <b>${m.formula}</b></span></div>`;panel=`<p class="eyebrow">탐험 준비</p><h2>지금 보이는 물질 속으로</h2><p>${m.name}을 이루는 아주 작은 입자들을 찾아봅시다.</p>${btn('입자 수준으로 확대 ＋','zoom',1,'primary wide')}${note('확대하면서 실제 모습에서 학습 모형으로 전환합니다.')}`;}
 if(l===1){scene=fieldSVG();panel=`<p class="eyebrow">발견 01 · 물질을 이루는 입자</p><h2>${m.kind==='array'?'같은 원자가 반복돼요':'작은 묶음들이 보여요'}</h2><p>${m.field}</p><div class="instruction">${m.kind==='array'?'금 원자 하나':'분자 하나'}를 눌러 더 확대하세요.</div>${note(m.kind==='array'?'금속의 3차원 원자 배열을 평면에 단순화했어요.':'선으로 연결된 구들은 같은 분자를 나타내요. 분자의 이동은 생략했어요.')}${btn(m.kind==='array'?'가운데 원자 선택':'가운데 분자 선택','select-particle',0,'secondary wide')}`;}
 if(l===2){scene=moleculeSVG();panel=`<p class="eyebrow">발견 02 · ${m.kind==='array'?'원자':'분자를 이루는 원자'}</p><h2>${m.kind==='array'?'금 원자 하나, Au':m.formula+'를 자세히 보면'}</h2><p>${m.detail}</p><div class="instruction">${m.kind==='array'?'Au':'H'+(state.material==='water'?' 또는 O':'')} 표시가 있는 원자를 눌러 보세요.</div><div class="choice-row">${[...new Set(m.atoms)].map(z=>btn(`${atom(z).symbol} · ${atom(z).name} 원자`,'select-atom',z,'secondary')).join('')}</div>${note('구의 색과 크기는 원자를 구분하기 위한 표현이에요.')}${conceptCheck()}`;}
 if(l===3){scene=solidAtomSVG(state.z);panel=`<p class="eyebrow">관찰 대상 · ${a.symbol}</p><h2>${a.name} 원자의 안쪽으로</h2><p>겉으로는 하나의 구처럼 보이지만, 안에는 더 작은 입자들이 있어요.</p>${btn('원자 내부로 확대 ＋','zoom',4,'primary wide')}<div class="model-note"><b>모형 전환 안내</b><p>이제 ${a.name} 원소의 <strong>독립된 중성 원자</strong> 모형을 살펴봐요. ${m.kind==='array'?'금속에서 전자가 여러 원자에 걸쳐 움직이는 모습은 생략합니다.':'분자 속 원자들이 전자를 함께 사용하는 결합 모습은 생략합니다.'}</p></div>`;}
 if(l>=4){scene=atomSVG(state.z,{nucleus:l===5,exploded});panel=particlePanel();}
 return `${question(`확대 탐험 · ${m.name}`,titles[l])}<div class="path-bar"><span>${path}</span>${btn('물질 다시 선택','home','','text-button')}</div>${frame(scene,panel,l===0?'실제 물질을 표현한 일러스트 · 확대하면 모형으로 전환':l>=4?(state.z===79?(high()?'금-197 중성 원자 · 양성자 79 / 중성자 118 / 전자 79 · 일부 표시':'금 중성 원자의 예 · 양성자 79 / 중성자 118 / 전자 79 · 일부 표시'):'입자 수는 선택한 원자의 예 · 크기·거리·전자 위치는 실제 비율이 아님'):'선택한 입자를 중심으로 더 작은 세계를 관찰하세요.')}<div class="zoom-controls">${btn('− 한 단계 밖으로','zoom',Math.max(0,l-1),'secondary',l===0?'disabled':'')}<ol class="scale-track">${levels.map((label,i)=>`<li>${btn(`<span>${i<=l?'●':'○'}</span>${label}`,'zoom',i,i===l?'current':'',i>state.deepest?'disabled':'')}</li>`).join('')}</ol>${btn('＋ 더 안으로','zoom',Math.min(5,l+1),'secondary',l===5?'disabled':'')}</div>${l>=4?footer('관찰한 입자의 수로 원소를 구별할 기준을 찾아 볼까요? 다른 물질도 자유롭게 선택할 수 있어요.','원소 분류 실험으로 →'):''}`;
}
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
  else{const counts=shellCounts||a.shells;counts.forEach((n,i)=>{const r=exploded?168+i*40:115+i*55;s+=`<circle cx="${cx}" cy="${cy}" r="${r}" class="shell-ring"/>`;for(let j=0;j<n;j++){const t=-Math.PI/2+j*2*Math.PI/Math.max(n,1)+(i%2)*.4;s+=particleDot('e',cx+r*Math.cos(t),cy+r*Math.sin(t),14,interactive);}});}
 }
 const pCount=isGold?6:a.z,nCount=isGold?6:a.n,count=pCount+nCount;
 const radius=nucleus?Math.min(31,150/Math.sqrt(count)):Math.min(16,29/Math.sqrt(count));
 let dots='';for(let i=0;i<count;i++){const type=i<pCount?'p':'n',j=i<pCount?i:i-pCount;let x,y;
  if(exploded){const rows=Math.ceil(Math.sqrt(type==='p'?pCount:nCount));x=(type==='p'?-65:65)+(j%rows-(rows-1)/2)*radius*2.15;y=(Math.floor(j/rows)-(rows-1)/2)*radius*2.15;}
  else {const t=i*2.39996,r=radius*1.68*Math.sqrt(i);x=Math.cos(t)*r;y=Math.sin(t)*r;}
  dots+=particleDot(type,cx+x,cy+y,radius,interactive);
 }
 s+=`<g class="nucleus-cluster">${dots}</g>`;
 if(nucleus||exploded||isGold)s+=`<text x="360" y="${nucleus?53:45}" class="svg-label">${nucleus?'원자핵 확대 · ':''}+ 양성자 ${a.z}개　 0 중성자 ${a.n}개${isGold?' (일부 표시)':''}</text>`;
 if(!nucleus&&!exploded&&!isGold)s+=`<path d="M385 224 L510 124h66" fill="none" stroke="#8ba3b2"/><text x="542" y="104" class="svg-label">원자핵</text>`;
 if(nucleus)s+=`<text x="360" y="458" class="svg-label">전자는 원자핵 바깥에 있어요.</text>`;
 return svg(s,`${a.name} 원자 모형. 양성자 ${a.z}개, 중성자 ${a.n}개, 전자 ${a.z}개. ${isGold?'입자는 일부만 표시.':''}`);
}
function particlePanel(){
 const a=atom(state.z),m=MATERIALS[state.material],seen=k=>state.seen.includes(`${state.z}:${k}`);
 return `<p class="eyebrow">발견 03 · 원자 내부</p><h2>입자를 눌러 정체를 확인해요</h2><div class="particle-keys">${Object.entries(PARTICLES).map(([k,p])=>btn(`<span class="dot ${k}">${p.sign}</span><span>${seen(k)?p.name:p.sign+' 입자 알아보기'}<small>${seen(k)?p.location:'선택하여 관찰'}</small></span><b>${a[k==='e'?'z':k==='p'?'z':'n']}개</b>`,'particle',k,particle===k?'selected':'')).join('')}</div>${particle?`<div class="discovery"><b>${PARTICLES[particle].name} · ${PARTICLES[particle].sign}</b><p>${state.z===1&&particle==='n'?'지금 보는 가장 흔한 수소 원자에는 중성자가 없어요.':`위치: ${PARTICLES[particle].location}. ${particle==='p'&&!state.identityConfirmed?'양의 전하를 띠는 입자예요.':particle==='n'?'전하를 띠지 않는 입자예요. 표시된 수는 이 원자의 예입니다.':PARTICLES[particle].description}`}</p></div>`:'<p class="hint">모형 속 +, 0, − 입자나 위의 버튼을 눌러 보세요.</p>'}<div class="choice-row">${btn(exploded?'다시 모아 보기':'원자핵 펼쳐 보기','explode','','secondary')}${btn(state.level===5?'원자 전체로':'원자핵 더 확대','zoom',state.level===5?4:5,'secondary')}</div>${note('원자핵은 양성자와 중성자로 이루어져 있어요. 가장 흔한 수소의 원자핵에는 중성자가 없어요.')}${note(state.z===79?'금의 전자는 79개예요. 이 그림은 일부 입자만 보여주며, 1~20번의 전자 배치 규칙을 금에 적용하지 않아요.':'원은 전자 배치를 돕는 껍질 모형이에요. 전자가 행성처럼 이 선을 따라 돈다는 뜻이 아니에요.')}<div class="mini-heading">처음 물질과 연결하기</div>${materialButtons()}${m.kind==='molecule'?btn('분자로 돌아가 다른 원자 선택','zoom',2,'text-button wide'):''}`;
}

function sampleCard(c,revealed=false){
 return `<article class="sample-card"><span class="sample-code">${c.id.toUpperCase()}</span><h3>${revealed?`원소: ${esc(c.element)}`:'이름이 가려진 입자'}</h3><p>${revealed?`${esc(c.name)} · ${esc(c.symbol)}`:'입자 수를 보고 분류 기준을 정해 보세요.'}</p><dl class="particle-tally"><div class="tally-item"><dt>+ 양성자 · 핵 안</dt><dd>${c.p}개</dd></div><div class="tally-item"><dt>0 중성자 · 핵 안</dt><dd>${c.n}개</dd></div><div class="tally-item"><dt>− 전자 · 핵 주변</dt><dd>${c.e}개</dd></div></dl></article>`;
}

function isotopeExtension(){
 if(!high())return '';
 return `<details class="extension-panel"><summary>화학 선택 탐구 · 양성자가 같고 중성자가 다르다면?</summary><div class="charge-case-grid">${[6,7].map(n=>`<section class="charge-card"><h3>탄소-${6+n}</h3><p>양성자 6개 · 중성자 ${n}개</p><p>질량수 = 양성자 수 + 중성자 수 = ${6+n}</p></section>`).join('')}</div><p>양성자 수는 같고 중성자 수가 다른 원자를 동위 원소라고 해요. 실제 두 원자의 예를 비교하며, 핵을 바꾸는 과정을 재현하는 활동은 아닙니다.</p><div class="choice-row">${btn('같은 원소다','isotope-high','same',state.isotopeAnswer==='same'?'selected':'secondary')}${btn('다른 원소다','isotope-high','different',state.isotopeAnswer==='different'?'selected':'secondary')}</div>${state.isotopeAnswer==='same'?'<p class="answer-note">양성자가 모두 6개이므로 같은 탄소 원소입니다.</p>':''}</details>`;
}

function comparison(){
 const key=state.groupCriterion,revealed=state.groupChecked.includes(key),allTested=['p','e','n'].every(k=>state.groupChecked.includes(k)),names={p:'양성자',e:'전자',n:'중성자'};
 const board=groupCases(key).map(g=>`<section class="group-bin"><h2 class="group-title">${names[key]} ${g.value}개인 그룹</h2><div class="group-samples">${g.cases.map(c=>sampleCard(c,revealed)).join('')}</div></section>`).join('');
 const result=!revealed?`<p class="note">먼저 묶음의 모습을 살펴보세요. 원소 이름을 공개하면 이 기준이 맞는지 검증할 수 있어요.</p>`:groupingWorks(key)?`<div class="group-result success"><b>같은 원소가 함께 모였어요.</b><p>A와 B는 전자 수가 달라도 나트륨이에요. C는 네온이며, A·B와 양성자 수가 달라요.</p></div>`:key==='e'?`<div class="group-result"><b>전자 수가 같은데 원소가 달라요.</b><p>B와 C는 전자가 모두 10개지만 나트륨과 네온이에요. A와 B는 같은 나트륨인데 서로 다른 그룹에 놓였어요.</p></div>`:`<div class="group-result"><b>중성자 수가 같아도 서로 다른 원소예요.</b><p>세 입자 모두 중성자가 12개지만, 나트륨과 네온이 함께 들어 있어요.</p></div>`;
 return `${question('규칙 탐구 · 먼저 기준을 시험하기','어떤 수로 묶어야 같은 원소가 모일까?','확대해서 본 입자들을 구별할 기준이 필요해요. 세 가지 기준으로 묶은 뒤 실제 원소 이름과 맞대어 보세요.')}<p class="lab-connection">앞에서 +·0·− 입자의 위치와 성질을 관찰했어요. 이제 어떤 입자의 <strong>수</strong>가 원소를 구분하는지 찾습니다. A·B와 B·C는 각각 한 종류의 입자 수만 다른 사례예요.</p><section class="experiment-toolbar"><h2>나의 분류 기준</h2><div class="choice-row">${['e','n','p'].map(k=>btn(`${names[k]} 수로 묶기 ${checkMark(state.groupChecked.includes(k))}`,'group-criterion',k,key===k?'selected':'secondary',`aria-pressed="${key===k}"`)).join('')}</div><p>같은 수를 가진 입자는 자동으로 같은 그룹에 놓입니다. 기준을 바꾸어 결과를 비교하세요.</p></section><div class="grouping-board">${board}</div><div class="choice-row">${btn(revealed?'이 기준 다시 살펴보기':'원소 이름 공개하고 검증','reveal-group','','primary')}</div>${result}<div class="evidence-trail" aria-label="시험한 기준">${['e','n','p'].map(k=>`<span>${state.groupChecked.includes(k)?'✓':'○'} ${names[k]} 수 ${state.groupChecked.includes(k)?(groupingWorks(k)?'같은 원소끼리 모임':'분류 기준으로 부족'):'아직 확인 전'}</span>`).join('')}</div>${allTested?`<section class="rule-builder"><h2>세 번의 비교를 하나의 규칙으로 설명해 볼까요?</h2><p>원소의 종류를 구분하는 기준은 ______ 입니다.</p><div class="choice-row">${['p','e','n'].map(k=>btn(`${names[k]} 수`,'identity-rule',k,state.identityRule===k?'selected':'secondary',`aria-pressed="${state.identityRule===k}"`)).join('')}</div>${btn('내 규칙 확인','check-identity','','primary')}${state.identityConfirmed?'<div class="discovery"><b>양성자 수가 같으면 같은 원소</b><p>A·B의 전자는 11개와 10개로 다르지만, 양성자는 모두 11개예요. B·C는 전자와 중성자 수가 같아도 양성자가 11개와 10개로 달라 다른 원소입니다.</p></div>':''}</section>`:'<p class="flow-note">나머지 기준도 시험해 보세요. 원소 이름으로 확인한 관찰이 다음 규칙의 근거가 됩니다.</p>'}${note('실제로 존재하는 원자·이온의 예를 비교합니다. C는 중성자가 12개인 네온 원자의 예이며, 중성자 수를 외울 필요는 없어요. 핵을 바꾸는 실험은 아닙니다.')}${state.identityConfirmed?isotopeExtension():''}${footer(state.identityConfirmed?'찾아낸 기준으로 원소들을 지도에 놓아 볼까요?':'세 기준을 검증한 뒤 내 규칙을 확인해 주세요.','원소의 번호 찾아보기 →')}`;
}

function bridgeSteps(){
 const max=state.numberConfirmed?2:state.orderChecked?1:0;
 return `<div class="bridge-steps" role="group" aria-label="원소 지도 탐구 순서">${['1 · 입자 수로 정렬','2 · 표와 대조하고 예측','3 · 원소 지도에 적용'].map((name,i)=>btn(name,'number-stage',i,state.numberStage===i?'selected':'secondary',`${i>max?'disabled':''} aria-pressed="${state.numberStage===i}"`)).join('')}</div>`;
}

function protonBeads(count){
 return `<span class="proton-beads" aria-hidden="true">${Array.from({length:count},()=>'<span>+</span>').join('')}</span>`;
}

function numbers(){
 const title=question('찾아낸 규칙을 원소 지도로','원소를 찾는 번호는 무엇을 세는 걸까?','같은 원소를 묶었던 기준을 실제 주기율표의 숫자와 맞대어 보세요.');
 if(state.numberStage===0){
  const pool=ORDER_ZS.map(z=>{const a=atom(z);return btn(`<strong>${a.symbol} · ${a.name}</strong>${protonBeads(z)}<span>양성자 ${z}개</span>`,'order-add',z,'sample-card',state.order.includes(z)?'disabled':'');}).join('');
  const strip=[0,1,2,3].map((i)=>{const z=state.order[i],a=z?atom(z):null;return `<div class="order-slot"><small>${i+1}번째 자리</small>${a?`<strong>${a.symbol} · ${a.name}</strong><b>양성자 ${z}개</b>`:'<span>입자 카드 선택</span>'}</div>`;}).join('');
  return `${title}${bridgeSteps()}<section class="order-bench"><div><h2>양성자가 적은 것부터 선택하세요.</h2><p>아래 네 카드를 순서대로 누르면 오른쪽 탐구 줄에 놓입니다.</p><div class="order-pool">${pool}</div></div><div><h2>내가 만든 순서</h2><div class="order-strip">${strip}</div><div class="choice-row">${btn('마지막 카드 되돌리기','order-undo','','secondary',!state.order.length?'disabled':'')}${btn('다시 정렬','order-clear','','secondary')}${btn('이 순서로 표와 비교','check-order','','primary')}</div></div></section><p class="flow-note">자리의 순서 1·2·3·4와 양성자 수는 다를 수 있어요. 주기율표의 숫자는 어떤 쪽과 같을까요?</p>`;
 }
 if(state.numberStage===1){
  const rows=NUMBER_EXAMPLES.map(c=>`<tr><th scope="row">${c.symbol} · ${atom(c.z).name}</th><td>${c.p}</td><td>${c.e}</td><td><b>${c.number}</b></td></tr>`).join('');
  return `${title}${bridgeSteps()}<p class="lab-connection">양성자 수로 정렬한 뒤 실제 표를 확인했어요. <strong>Na⁺</strong>는 앞에서 본 B 입자입니다.</p><div class="pattern-grid"><section><h2>실제 주기율표와 맞대어 보기</h2><div class="pattern-table"><table><thead><tr><th scope="col">입자</th><th scope="col">양성자 수 +</th><th scope="col">전자 수 −</th><th scope="col">원소 칸의 작은 숫자</th></tr></thead><tbody>${rows}</tbody></table></div><p class="note">Na⁺의 전자는 10개지만 나트륨 칸의 숫자는 11입니다. 원소의 종류를 정하는 기준과 함께 비교하세요.</p></section><section class="prediction-card"><p class="eyebrow">아직 대조하지 않은 입자</p><h2>이 입자가 속할 칸의 숫자를 예측해 보세요.</h2><dl class="particle-tally"><div><dt>+ 양성자</dt><dd>7개</dd></div><div><dt>0 중성자 · 예</dt><dd>8개</dd></div><div><dt>− 전자</dt><dd>7개</dd></div></dl><label>원소 칸의 작은 숫자<input type="number" min="1" max="20" inputmode="numeric" data-change="number-prediction" value="${esc(state.numberPrediction)}" aria-label="새 입자의 원소 칸 숫자 예측"></label><fieldset><legend>내 예측에 사용한 규칙</legend><div class="choice-row">${[['p','양성자 수와 같다'],['e','전자 수와 같다'],['mass','양성자와 중성자를 더한다']].map(([key,label])=>btn(label,'number-rule',key,state.numberRule===key?'selected':'secondary',`aria-pressed="${state.numberRule===key}"`)).join('')}</div></fieldset>${btn('예측과 규칙 확인','check-number-rule','','primary')}<div id="number-feedback" aria-live="polite"></div></section></div>`;
 }
 return `${title}${bridgeSteps()}<div class="discovery full"><b>이 숫자를 ‘원자 번호’라고 불러요.</b><p>원자 번호 = 양성자 수. 새 입자의 양성자가 7개이므로 원자 번호는 7, 질소 N입니다. 나트륨이 전자를 잃어도 양성자 11개와 원자 번호 11은 그대로예요.</p></div>${numberMap()}`;
}

function numberMap(){
 const target=MAP_TARGETS.find(z=>!state.mapFound.includes(z)),a=atom(state.tableZ);
 const cells=ELEMENTS.map(e=>`<button class="element-cell ${e.z===a.z?'selected':''} ${state.mapFound.includes(e.z)?'visited':''}" style="grid-row:${e.period+1};grid-column:${e.group}" data-action="map-element" data-value="${e.z}" aria-label="원자 번호 ${e.z}, ${e.name}, ${e.symbol}"><small>${e.z}</small><strong>${e.symbol}</strong><span>${e.name}</span></button>`).join('');
 return `<section class="map-target">${target?`<h2>양성자가 ${target}개인 원소를 찾아 칸을 누르세요.</h2><p>${state.mapFound.length+1}/2 · 방금 찾은 규칙을 지도에서 사용해 봅시다.</p>`:'<h2>두 원소를 규칙으로 찾았어요.</h2><p>Mg는 양성자 12개, Ca는 20개. 숫자는 원소를 찾는 기준입니다. 다른 칸도 자유롭게 탐색하세요.</p>'}</section><div class="periodic-layout"><section class="periodic-panel"><p class="scroll-hint">↔ 작은 화면에서는 표 안에서 좌우로 움직여 보세요.</p><div class="periodic-scroll" tabindex="0" role="region" aria-label="원자번호 1~20 주기율표"><div class="periodic-grid">${[1,2,13,14,15,16,17,18].map(n=>`<span class="group-label" style="grid-row:1;grid-column:${n}">${n}족</span>`).join('')}${cells}<div class="table-space">원자 번호로 원소 찾기<small>같은 번호는 같은 양성자 수를 뜻해요.</small></div></div></div><div class="periodic-legend"><span>• 과제에서 찾은 원소 ${state.mapFound.length}/2</span><span>금 Au는 79번 · 이 표의 범위 밖</span></div></section><aside class="element-detail"><div class="element-stamp"><small>원자 번호</small><b>${a.z}</b><strong>${a.symbol}</strong><span>${a.name}</span></div><p>이 칸의 원소는 양성자가 ${a.z}개예요.</p><p class="note">전자가 달라져 이온이 되어도 양성자 수와 원소 칸은 그대로입니다.</p></aside></div>${footer(target?'관찰한 규칙으로 제시된 두 원소를 찾아 주세요.':'원소 이름은 같았던 A·B가 왜 서로 다른 전하를 띠었을까요?','전하의 규칙 알아보기 →')}`;
}

function chargePairs(p,e){
 const cancelled=Math.min(p,e),net=p-e;
 return `<div class="charge-pairs" aria-label="양성자와 전자의 전하 짝짓기"><p><b>+와 − ${cancelled}쌍</b> → 전하의 합 0</p><div aria-hidden="true">${Array.from({length:Math.min(cancelled,18)},()=>'<span class="charge-pair">+ −</span>').join('')}</div><p class="remaining-charge">${net===0?'남는 전하 없음':`${net>0?'+':'−'} ${Math.abs(net)}개가 남음`} · <strong>전하의 합 ${net>0?'+':''}${net}</strong></p></div>`;
}

function neutral(){
 const cards=CHARGE_TASKS.map(c=>`<section class="charge-task"><h2>${c.symbol} · ${c.name}</h2><p>${c.id==='na'?'앞에서 비교한 A 입자':c.id==='na-plus'?'A보다 전자가 하나 적은 B 입자':'전자 하나를 얻은 염화 이온의 예'}</p><dl class="particle-tally"><div><dt>+ 양성자</dt><dd>${c.p}개</dd></div><div><dt>− 전자</dt><dd>${c.e}개</dd></div><div><dt>0 중성자 · 예</dt><dd>${c.n}개</dd></div></dl>${state.chargeAnswers[c.id]?chargePairs(c.p,c.e):'<p class="note">먼저 전기적 상태를 예상해 보세요. 선택하면 +와 −를 짝지어 확인합니다.</p>'}<fieldset><legend>이 입자의 전기적 상태는?</legend><div class="choice-row">${[['neutral','중성'],['positive','양전하 +'],['negative','음전하 −']].map(([key,label])=>btn(label,'charge-answer',`${c.id}:${key}`,state.chargeAnswers[c.id]===key?'selected':'secondary',`aria-pressed="${state.chargeAnswers[c.id]===key}"`)).join('')}</div></fieldset></section>`).join('');
 return `${question('전하 탐구 · 원소 이름과 따로 읽기','같은 나트륨인데 왜 전하가 다를까?','원소 이름은 양성자가 정했어요. 전하의 합은 +와 −를 한 쌍씩 짝지어 알아봅시다.')}<p class="lab-connection">A와 B는 원자 번호가 모두 11입니다. 서로 다른 것은 <strong>전자 수</strong>였어요. 이번에는 그 차이가 전하에 미치는 영향을 확인합니다.</p><div class="charge-task-grid">${cards}</div><section class="charge-rule"><h2>세 입자에서 찾은 전하의 규칙</h2>${btn('내 판단 확인','check-charge','','primary')}${state.chargeConfirmed?'<div class="discovery"><b>양성자 수 = 전자 수 → 중성</b><p>양성자와 전자는 전하의 크기가 같고 부호가 반대예요. 전자가 적으면 +, 많으면 − 전하를 띱니다. 중성자는 전하의 합에 영향을 주지 않아요.</p></div>':'<p class="note">남는 + 또는 −가 있는지 보고 세 입자의 상태를 선택하세요.</p>'}</section><p class="note">그림은 무게를 비교하는 저울이 아니라 전하의 합을 정리하는 모형입니다. 실제 입자가 정지해 나란히 놓여 있다는 뜻은 아닙니다.</p>${footer(state.chargeConfirmed?'전자 수를 알았어요. 전자들이 놓일 자리는 더 탐구할 수 있습니다.':'세 입자의 전하를 판단하고 규칙을 확인하세요.',high()?'전자 배치와 주기성 탐구 →':'전자 배치 선택 탐험 →')}`;
}

function shellSVG(){
 const a=atom(state.shellZ);let s='';
 for(let i=3;i>=0;i--){const r=76+i*48;s+=`<g role="button" tabindex="0" class="shell-zone" data-action="place" data-value="${i}" data-drop="${i}" aria-label="${i+1}번째 껍질에 전자 놓기"><circle cx="360" cy="245" r="${r}" fill="none" stroke="transparent" stroke-width="38"/><circle cx="360" cy="245" r="${r}" class="shell-ring"/><text x="${360+r+6}" y="${245+13}" class="shell-name">${i+1}</text></g>`;}
 s+=`<circle cx="360" cy="245" r="40" fill="#354b5f"/><text x="360" y="238" class="svg-label">${a.symbol}</text><text x="360" y="263" class="svg-label small">+ ${a.z}</text>`;
 state.shells.forEach((n,i)=>{for(let j=0;j<n;j++){const t=-Math.PI/2+j*2*Math.PI/Math.max(n,1),r=76+i*48;s+=`<g data-drop="${i}" data-action="place" data-value="${i}">${particleDot('e',360+r*Math.cos(t),245+r*Math.sin(t),15,false)}</g>`;}});
 return svg(s,'전자 배치 모형. 전자를 끌어 껍질에 놓거나 껍질 버튼을 누르세요.','shell-model');
}
function shells(){
 if(!high()&&state.shellTrack==='undecided')return extensionChoice();
 const a=atom(state.shellZ),remaining=a.z-total(state.shells),complete=correctShells(state.shells,a.z);
 const panel=`<p class="eyebrow">전자 배치 실험대</p><label class="select-label">중성 원자 선택<select data-change="shell-atom" aria-label="전자 배치할 원소">${ELEMENTS.map(e=>`<option value="${e.z}" ${e.z===a.z?'selected':''}>${e.z}. ${e.name} (${e.symbol})${state.shellDone.includes(e.z)?' ✓':''}</option>`).join('')}</select></label><p><strong>양성자 ${a.z}개 → 전자 ${a.z}개</strong></p><button class="electron-source" data-action="electron-select" data-drag="electron" ${remaining===0?'disabled':''}><span class="dot e">−</span><span>전자를 껍질로 끌어 놓기<small>남은 전자 ${remaining}개 · 버튼으로도 배치 가능</small></span></button><div class="shell-buttons">${state.shells.map((n,i)=>`<div>${btn(`${i+1}번째 껍질 <b>${n}개</b> ＋`,'place',i,'secondary')}${btn('−','remove',i,'remove','aria-label="'+(i+1)+'번째 껍질 전자 빼기" '+(!n?'disabled':''))}</div>`).join('')}</div><div class="configuration"><span>지금의 전자 배치</span><strong>${state.shells.join(' · ')}</strong></div><div class="choice-row">${btn('배치 확인','check-shells','','primary')}${btn('다시 놓기','clear-shells','','secondary')}</div>${complete&&state.shellDone.includes(a.z)?`<p class="answer-note">✓ ${a.name}: ${a.shells.join(', ')} — 중성 원자의 전자를 모두 배치했어요.</p>`:''}`;
 return `${question('탐구 04 · 전자를 놓는 자리','전자들은 원자 안에서 어떻게 배치될까?','안쪽 껍질부터 채워 보세요. 원은 전자 수를 정리하는 모형이며, 전자의 실제 궤도가 아닙니다.')}<div class="rule-strip"><span>1번째 <b>최대 2개</b></span><span>2번째 <b>최대 8개</b></span><span>3번째 <b>이번 활동에서는 8개까지</b></span><span>4번째 <b>K·Ca에서 사용</b></span></div>${frame(shellSVG(),panel,'원자번호 1~20의 바닥상태 중성 원자만 다룹니다. 세 번째 껍질의 일반적인 최대 수용량이 8이라는 뜻은 아닙니다.')}<div class="quick-elements"><span>추천 원자</span>${[1,2,3,8,10,11,19,20].map(z=>btn(`${atom(z).symbol}${state.shellDone.includes(z)?' ✓':''}`,'shell-atom',z,z===a.z?'selected':'secondary')).join('')}</div>${shellPatterns()}${shellRepair()}${highTableExtension()}${!high()?btn('전자 배치 확장을 건너뛰고 기본 종합으로','shell-track','skip','text-button wide'):''}${footer(`${state.shellDone.length}종의 원자를 배치했어요. 관찰한 배치와 판단 근거를 확인한 뒤 새 입자를 분석하세요.`,'새 입자 분석하기 →')}`;
}

function shellRepair(){return `<section class="evidence-card"><h2>배치 판단 · 이 모형을 고쳐 볼까요?</h2><p>마그네슘 중성 원자는 전자가 12개예요. 한 학생이 <strong>2, 10</strong>으로 예상했어요. 이 활동의 배치 모형에 맞게 고친다면?</p><div class="choice-row">${btn('2, 10','shell-prediction','2,10',state.shellPrediction==='2,10'?'selected':'secondary')}${btn('2, 8, 2','shell-prediction','2,8,2',state.shellPrediction==='2,8,2'?'selected':'secondary')}</div><p>어떤 규칙을 근거로 판단했나요?</p><div class="choice-row">${btn('두 번째 껍질에는 최대 8개','evidence','shells:second-shell',state.evidence.shells==='second-shell'?'selected':'secondary')}${btn('전자 전체가 10개이기 때문','evidence','shells:total-ten',state.evidence.shells==='total-ten'?'selected':'secondary')}</div>${btn('예상과 근거 확인','check-prediction','','primary')}${state.shellPredictionChecked?'<p class="answer-note">✓ 두 번째 껍질에는 8개까지 놓으므로 나머지 2개는 세 번째 껍질에 놓아요. 전자 전체는 12개입니다.</p>':''}<p class="note">위의 2, 10은 학생의 예상이며 실제 바닥상태 전자 배치가 아닙니다.</p></section>`;}
function highTableExtension(){if(!high())return '';return `<section class="extension-panel"><h2>고등학교 탐구 · 같은 족에는 어떤 공통점이 있을까?</h2><p>중성 원자의 가장 바깥쪽 껍질에 있는 전자를 최외각 전자라고 해요. 원자번호 1~20에서 비교합니다.</p>${FAMILY_CASES.map(f=>`<h3>${esc(f.label)}</h3><div class="charge-case-grid">${f.atoms.map(z=>{const a=atom(z);return `<section class="charge-card"><h3>${a.symbol} · ${a.name}</h3><p>${a.period}주기 · ${a.group}족</p><p>전자 배치 ${a.shells.join(', ')}</p><p>껍질 ${a.shells.length}개 · 최외각 전자 ${outerElectrons(z)}개</p></section>`;}).join('')}</div><p class="note">${esc(f.note)}</p>`).join('')}<h3>Li·Na·K에서 같은 것은?</h3><div class="choice-row">${btn('최외각 전자 수','family-answer','outer',state.familyAnswer==='outer'?'selected':'secondary')}${btn('전자 전체의 수','family-answer','total',state.familyAnswer==='total'?'selected':'secondary')}${btn('양성자 수','family-answer','protons',state.familyAnswer==='protons'?'selected':'secondary')}</div>${state.familyAnswer==='outer'?'<p class="answer-note">✓ 세 원소는 1족이며 최외각 전자가 1개예요. 껍질 수는 각각 2, 3, 4개로 주기와 연결됩니다.</p>':''}<p class="note">같은 족의 전자 배치와 유사한 성질을 연결해 볼 수 있어요. 헬륨은 첫 껍질이 2개로 채워진 18족 원소이며, 18족의 최외각 전자가 모두 8개인 것은 아닙니다.</p></section>`;}
function final(){
 const m=missionFor(context.mode,state.missionIndex),a=atom(m.z),done=state.done,charge=m.z-m.e,chargeText=charge===0?'':`${Math.abs(charge)===1?'':Math.abs(charge)}${charge>0?'+':'−'}`,symbol=`${a.symbol}${chargeText?`<sup>${chargeText}</sup>`:''}`,particleName=charge===0?`${a.name} 원자`:m.z===17?'염화 이온':`${a.name} 이온`;
 const field=(key,title,options)=>`<fieldset class="mission-field"><legend>${title}</legend><div class="choice-row">${options.map(([value,label])=>btn(esc(label),'mission',`${key}:${value}`,String(state.mission[key])===String(value)?'selected':'secondary',`aria-pressed="${String(state.mission[key])===String(value)}"`)).join('')}</div></fieldset>`;
 const numbers=[...new Set([m.z,m.n,m.e,m.z+1])];
 const shellOptions=[...new Set([m.shells.join(','),`2,${m.e-2}`,'2,8,8'])];
 const evidenceCorrect=state.evidence.final==='protons';
 return `${question('종합 탐험 · 새로운 입자 분석',done?'관찰한 근거로 입자의 정체를 찾았어요!':'이 입자의 정체를 밝혀 볼까?',m.title)}<div class="mission-layout"><section class="mystery-specimen"><p class="eyebrow">새로운 원자 또는 이온</p><div class="mystery-symbol">${done?symbol:'?'}</div><h2>${done?particleName:'이름이 가려진 입자'}</h2><dl><div><dt>+ 양성자</dt><dd>${m.z}개</dd></div><div><dt>− 전자</dt><dd>${m.e}개</dd></div><div><dt>0 중성자 · 예시</dt><dd>${m.n}개</dd></div></dl><p>${high()?'질량수는 양성자 수와 중성자 수를 더해 구해요. 화학 추가 탐구 문항은 선택하지 않아도 완료할 수 있습니다.':'중성자 수는 참고 정보예요. 외우지 않고 주어진 입자 수로 판단하세요.'}</p>${btn('주기율표 참고','reference-table','','secondary wide')}</section><section class="mission-questions">${field('neutral','전기적으로 중성일까?',[['yes','중성이다'],['no','중성이 아니다']])}${field('number','원자 번호는?',numbers.map(n=>[n,n]))}${field('element','어떤 원소일까?',[m.z-1,m.z,m.z+1].filter(z=>z>=1&&z<=20).map(z=>[z,`${atom(z).name} (${atom(z).symbol})`]))}${requiresShells()?field('shells','제시된 입자의 전자 배치는?',shellOptions.map(s=>[s,s])):''}${high()?field('mass','화학 추가 탐구 · 질량수는? (선택)',[...new Set([m.z+m.n,m.z,m.e])].map(n=>[n,n])):''}<fieldset class="mission-field final-evidence"><legend>원소를 찾을 때 사용한 근거는?</legend><div class="choice-row">${btn('양성자 수','evidence','final:protons',evidenceCorrect?'selected':'secondary')}${btn('전자 수','evidence','final:electrons',state.evidence.final==='electrons'?'selected':'secondary')}${btn('중성자 수','evidence','final:neutrons',state.evidence.final==='neutrons'?'selected':'secondary')}</div></fieldset><div class="mission-submit">${btn(done?'다른 입자도 분석하기':'분석 결과 확인',done?'new-mission':'check-mission','','primary')}${done?btn('탐험 기록 보기','journal','','secondary'):''}</div><div id="mission-result" aria-live="polite"></div></section></div>${done?`<div class="completion"><b>탐험 완료</b><p>양성자 ${m.z}개 → ${a.name} · 원자 번호 ${m.z}<br>양성자 ${m.z}개와 전자 ${m.e}개 → ${m.z===m.e?'중성':'전하 '+(m.z-m.e>0?'+':'')+(m.z-m.e)}${requiresShells()?`<br>전자 ${m.e}개 → ${m.shells.join(', ')}`:''}${high()&&state.mission.mass?`<br>양성자 + 중성자 → 질량수 ${m.z+m.n}`:''}</p>${btn('처음 물질로 돌아가기','chapter',0,'secondary')}${btn('탐험 기록 인쇄','print','','secondary')}</div>`:''}`;
}

function judgmentNotes(){
 const notes=[];
 for(const [id,answer] of Object.entries(state.conceptAnswers))if(MATERIALS[id]&&(answer.atoms||answer.types))notes.push(`${MATERIALS[id].formula} 분자: 원자 ${answer.atoms||'미선택'}개 · 원소 ${answer.types||'미선택'}종류로 판단`);
 const label={p:'양성자',e:'전자',n:'중성자'};
 if(state.groupChecked.length)notes.push(`시험한 분류 기준: ${state.groupChecked.map(k=>label[k]+' 수').join(' / ')}. 실제 원소 이름과 대조함.`);
 if(state.identityRule)notes.push(`원소 분류 규칙: ${label[state.identityRule]} 수 · ${state.identityConfirmed?'관찰 근거로 확인':'아직 검증 중'}`);
 if(state.order.length)notes.push(`내 정렬: ${state.order.map(z=>atom(z).symbol+'(양성자 '+z+')').join(' → ')}`);
 if(state.numberPrediction)notes.push(`새 입자(양성자7·중성자8·전자7)의 번호 예측: ${state.numberPrediction} · ${state.numberConfirmed?'양성자 수와 대조하여 원자 번호 7을 확인':'아직 검증 중'}`);
 if(state.mapFound.length)notes.push(`원자 번호 규칙으로 찾은 원소: ${state.mapFound.map(z=>atom(z).name+' '+z).join(', ')}`);
 for(const [id,answer] of Object.entries(state.chargeAnswers)){const c=CHARGE_TASKS.find(v=>v.id===id);if(c)notes.push(`${c.symbol}: ${ {neutral:'중성',positive:'양전하',negative:'음전하'}[answer] }로 판단`);}
 if(state.shellTrack==='skip')notes.push('중2 기본 종합 탐험 선택 · 전자 배치 확장은 건너뜀');
 if(state.shellPrediction)notes.push(`Mg의 예상 배치: ${state.shellPrediction} · ${state.shellPredictionChecked?'배치와 근거 확인':'아직 확인 중'}`);
 if(high()&&state.familyAnswer)notes.push(`같은 족 비교: ${{outer:'최외각 전자 수',total:'전자 전체 수',protons:'양성자 수'}[state.familyAnswer]||'아직 확인 중'} 선택`);
 if(state.done){const m=missionFor(context.mode,state.missionIndex);notes.push(`종합 탐험: 양성자 ${m.z}개 → 원소 ${atom(m.z).name} · 전자 ${m.e}개 → ${m.z===m.e?'중성':'전하 '+(m.z-m.e>0?'+':'')+(m.z-m.e)} · 양성자 수를 원소의 판단 근거로 사용`);}
 return notes;
}

function judgmentList(){const notes=judgmentNotes();return `<h3>내가 선택한 판단과 근거</h3><ul>${notes.map(t=>`<li>${esc(t)}</li>`).join('')||'<li>아직 선택한 판단이 없어요.</li>'}</ul><p class="note">선택 기록에는 탐구 중의 예상도 포함됩니다. 발견한 개념과 비교하며 설명해 보세요.</p>`;}
function showJournal(){modal(`<p class="eyebrow">EXPLORATION NOTES</p><h2>나의 탐험 기록</h2><p>${esc(context.lessonId==='personal'?'개인 탐험':context.classLabel||'반별 탐험')} · ${high()?'고등학교 확장':'중학교 2학년'}</p><p>${state.records.length}개의 발견을 모았어요.${storageOK?' 현재 수업·수준의 기록이 이 브라우저에 자동 저장됩니다.':' 현재 브라우저에서는 진행 저장을 사용할 수 없어요.'}</p>${judgmentList()}<h3>확인한 개념</h3><ol class="journal">${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')||'<li>물질을 선택해 첫 발견을 기록해 보세요.</li>'}</ol><div class="choice-row">${btn('기록 인쇄','print','','secondary')}${btn('새 학생으로 시작','reset-confirm','','text-button')}</div>`);}
async function zoom(level,origin,selection=false){
 if(busy||!state.material)return;
 level=Math.max(0,Math.min(5,Number(level)));if(level===state.level)return;
 if(state.level===1&&level===2&&!selection)return selectParticle(0,origin);
 if(state.level===2&&level===3&&!MATERIALS[state.material].atoms.includes(state.z)){state.z=MATERIALS[state.material].atoms[0];}
 const inward=level>state.level,world=$('.world');busy=true;
 if(world&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const box=world.getBoundingClientRect();let x=50,y=50;
  if(origin){const r=origin.getBoundingClientRect();x=(r.x+r.width/2-box.x)/box.width*100;y=(r.y+r.height/2-box.y)/box.height*100;}
  world.style.transformOrigin=`${x}% ${y}%`;
  await world.animate([{transform:'scale(1)',opacity:1},{transform:`scale(${inward?3.3:.38})`,opacity:0}],{duration:480,easing:'cubic-bezier(.55,0,.3,1)',fill:'forwards'}).finished.catch(()=>{});
 }
 state.level=level;state.deepest=Math.max(level,state.deepest);particle=null;exploded=false;
 if(level>=4){add('visited',state.material);record(state.material);record('structure');}
 render(true);
 const next=$('.world');if(next&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await next.animate([{transform:`scale(${inward?.55:1.7})`,opacity:.1},{transform:'scale(1)',opacity:1}],{duration:570,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});
 busy=false;
}
async function selectMaterial(id){
 if(busy||!MATERIALS[id])return;state.material=id;state.level=0;state.deepest=0;state.chapter=0;state.z=id==='gold'?79:id==='water'?8:1;particle=null;render(true);await zoom(1);
}
async function selectParticle(index,el){state.selected=Number(index);await zoom(2,el,true);}
function advance(){
 const c=state.chapter;
 if(c===0){
  if(!state.visited.length)return say('선택한 물질에서 원자 내부까지 확대해 보세요.');
  if(!['p','n','e'].every(k=>state.seen.includes(`${state.z}:${k}`)))return say('+·0·− 입자를 눌러 위치와 이름을 먼저 관찰하세요.');
  if(MATERIALS[state.material]?.kind==='molecule'){
   const a=state.conceptAnswers[state.material]||{},expected=state.material==='water'?{atoms:'3',types:'2'}:{atoms:'2',types:'1'};
   if(a.atoms!==expected.atoms||a.types!==expected.types)return say('분자로 돌아가 원자 개수와 원소 종류를 구분해 보세요.');
  }
 }
 if(c===1&&!state.identityConfirmed)return say('세 기준으로 분류하고 실제 이름과 대조한 뒤, 내 규칙을 확인해 주세요.');
 if(c===2&&(!state.numberConfirmed||!MAP_TARGETS.every(z=>state.mapFound.includes(z))))return say('표의 숫자에 대한 예측을 확인하고, 양성자 12개·20개 원소를 찾아 주세요.');
 if(c===3&&!state.chargeConfirmed)return say('세 입자의 +와 −를 비교한 뒤 전하 판단을 확인해 주세요.');
 if(c===4){
  if(state.shellTrack==='undecided')return say('전자 배치를 탐험할지, 기본 종합 탐험으로 갈지 선택하세요.');
  if(requiresShells()&&(!state.shellDone.length||!state.shellPredictionChecked))return say('원자 하나를 배치하고, 마그네슘의 예상과 판단 근거를 확인해 주세요.');
  if(high()&&state.familyAnswer!=='outer')return say('Li·Na·K의 배치를 비교해 공통점을 찾아 주세요.');
 }
 state.chapter=Math.min(5,c+1);state.unlocked=Math.max(state.unlocked,state.chapter);render(true);window.scrollTo({top:0,behavior:'instant'});
}

function doPlace(index){const r=placeElectron(state.shells,Number(index),state.shellZ);if(!r.ok)return say(r.message);state.shells=r.shells;render();say(`${Number(index)+1}번째 껍질에 전자를 놓았어요. 남은 전자 ${state.shellZ-total(state.shells)}개.`);}
function requiresShells(){return high()||state.shellTrack==='explore';}

function extensionChoice(){
 return `${question('중2 선택 탐험','전자 수를 알았어요. 배치도 더 탐구할까요?','원소의 종류·원자 번호·전하를 발견했습니다. 기본 종합 탐험으로 바로 가거나, 전자들이 놓이는 자리를 모형으로 알아볼 수 있어요.')}<div class="extension-choice"><section><h2>전자 배치까지 탐험하기</h2><p>전자들을 껍질 모형에 놓으며 2개·8개의 배치 규칙을 비교합니다. 원자번호 1~20을 자유롭게 관찰합니다.</p>${btn('전자 배치 탐험','shell-track','explore','primary')}</section><section><h2>기본 개념으로 새로운 입자 분석하기</h2><p>양성자와 전자 수를 사용해 원소·원자 번호·중성 여부를 판단합니다. 전자 배치는 기본 분석에서 묻지 않습니다.</p>${btn('기본 종합 탐험으로 이동','shell-track','skip','secondary')}</section></div><p class="note">전자 배치는 중2의 선택 확장입니다. 고등학교에서는 배치와 족·주기를 이어서 탐구합니다.</p>`;
}

function shellPatterns(){
 return `<section class="shell-patterns"><h2>한 껍질이 채워지면 다음 전자는 어디에 놓일까?</h2><div class="charge-case-grid">${[2,3,10,11].map(z=>{const a=atom(z);return `<section class="charge-card"><h3>${a.symbol} · 전자 ${z}개</h3><p>전자 배치 <b>${a.shells.join(', ')}</b></p>${btn('이 모형 배치해 보기','shell-atom',z,'secondary')}</section>`;}).join('')}</div><p class="note">He → Li, Ne → Na를 나란히 비교하세요. 전자가 하나 늘어날 때 다음 껍질이 시작되는 사례입니다.</p></section>`;
}

async function handle(action,value,el){
 if(busy&&['material','zoom','select-particle','select-atom','chapter','home','advance','choose-mode','switch-mode','reset','resume','group-criterion','check-order','check-number-rule','shell-track'].includes(action))return;
 switch(action){
 case 'learning-settings':learningSettings();break;
 case 'teacher-setup':teacherSetup();break;
 case 'copy-class-link':return copyClassLink(value);
 case 'choose-mode':if(normalizeMode(value)===context.mode){$('#dialog').close();break;}if(context.lessonId!=='personal'){modal(`<h2>다른 수준의 개인 탐험으로 이동할까요?</h2><p>현재 반의 진행 기록은 그대로 보관됩니다. 돌아오려면 지금 사용한 수업 링크를 다시 여세요.</p>${btn('개인 탐험으로 이동','switch-mode',normalizeMode(value),'primary')}`);}else switchMode(value);break;
 case 'switch-mode':switchMode(value);break;
 case 'resume':needsResume=false;state.upgraded=false;render(true);break;
 case 'concept':{const [id,key,n]=value.split(':');if(['water','hydrogen'].includes(id)&&['atoms','types'].includes(key)&&['1','2','3'].includes(n)){state.conceptAnswers[id]||={};state.conceptAnswers[id][key]=n;render();}break;}
 case 'isotope-high':state.isotopeAnswer=value;render();say(value==='same'?'양성자가 모두 6개라 같은 탄소 원소입니다.':'양성자 수를 비교하세요. 질량수가 달라도 같은 원소일 수 있어요.',value==='same');break;
 case 'evidence':{const [key,answer]=value.split(':');if(['identity','neutral','shells','final'].includes(key)){state.evidence[key]=answer;if(key==='shells')state.shellPredictionChecked=false;if(key==='final')state.done=false;render();}break;}
 case 'shell-prediction':state.shellPrediction=value;state.shellPredictionChecked=false;render();break;
 case 'check-prediction':if(state.shellPrediction==='2,8,2'&&state.evidence.shells==='second-shell'){state.shellPredictionChecked=true;render();say('두 번째 껍질의 8개와 전자 전체 12개를 모두 확인했어요.',true);}else say('전자 전체는 12개이고, 두 번째 껍질에는 최대 8개를 놓아요. 예상과 근거를 함께 확인하세요.');break;
 case 'family-answer':state.familyAnswer=value;render();say(value==='outer'?'Li·Na·K의 최외각 전자는 모두 1개예요.':'세 원소의 전자 전체 수와 최외각 전자 수를 따로 비교해 보세요.',value==='outer');break;
case 'group-criterion':if(['p','e','n'].includes(value)){state.groupCriterion=value;render();}break;
 case 'reveal-group':add('groupChecked',state.groupCriterion);render();break;
 case 'identity-rule':if(['p','e','n'].includes(value)){state.identityRule=value;state.identityConfirmed=false;render();}break;
 case 'check-identity':
  if(!['p','e','n'].every(k=>state.groupChecked.includes(k)))return say('세 기준을 실제 원소 이름과 먼저 대조해 주세요.');
  if(state.identityRule==='p'){state.identityConfirmed=true;state.answers.identity='p';record('compare');render();say('전자와 중성자 기준의 반례를 확인하고 양성자 규칙을 찾았어요.',true);}
  else say(state.identityRule==='e'?'B와 C는 전자가 모두 10개인데 원소 이름도 같았나요?':'중성자가 모두 12개인 그룹에서 원소 이름이 하나뿐이었나요?');break;
 case 'order-add':{const z=Number(value);if(ORDER_ZS.includes(z)&&!state.order.includes(z)&&state.order.length<4){state.order.push(z);state.orderChecked=false;state.numberConfirmed=false;render();}break;}
 case 'order-undo':state.order.pop();state.orderChecked=false;state.numberConfirmed=false;state.numberStage=0;state.mapFound=[];state.done=false;render();break;
 case 'order-clear':state.order=[];state.orderChecked=false;state.numberConfirmed=false;state.numberStage=0;state.mapFound=[];state.done=false;render();break;
 case 'check-order':
  if(validOrder(state.order)){state.orderChecked=true;state.numberStage=1;render(true);say('1, 2, 6, 8개의 순서예요. 이제 실제 표의 숫자와 맞대어 보세요.',true);}
  else say(state.order.length<4?'네 원소 카드를 모두 놓아 주세요.':'양성자 수가 줄어드는 구간이 있어요. 적은 것부터 순서대로 놓아 보세요.');break;
 case 'number-stage':{const stage=Number(value),max=state.numberConfirmed?2:state.orderChecked?1:0;if(Number.isInteger(stage)&&stage>=0&&stage<=max){state.numberStage=stage;render(true);}break;}
 case 'number-rule':if(['p','e','mass'].includes(value)){state.numberRule=value;state.numberConfirmed=false;render();}break;
 case 'check-number-rule':
  if(state.identityConfirmed&&state.orderChecked&&testNumber(state.numberRule,state.numberPrediction)){state.numberConfirmed=true;state.numberStage=2;state.tableZ=7;record('number');render(true);say('여러 원소에서 대조한 이 숫자를 원자 번호라고 부릅니다.',true);}
  else{const text=state.numberRule==='e'?'Na⁺의 전자는 10개인데 나트륨 칸의 숫자는 11이에요. 전자 수 규칙이 모든 사례에 맞을까요?':state.numberRule==='mass'?'H·He·O의 양성자와 중성자를 더한 수를 실제 표의 숫자와 비교하세요.':'위의 실제 사례에서 원소 칸의 숫자와 함께 변하는 수를 찾아 새 입자에 적용하세요.';$('#number-feedback').innerHTML=`<p class="answer-note">${text}</p>`;}break;
 case 'map-element':{const z=Number(value);if(!atom(z)||z>20||!state.numberConfirmed)break;state.tableZ=z;add('tableSeen',z);const target=MAP_TARGETS.find(n=>!state.mapFound.includes(n));if(z===target){add('mapFound',z);if(MAP_TARGETS.every(n=>state.mapFound.includes(n)))record('table');render();say(`양성자 ${z}개 → 원자 번호 ${z} → ${atom(z).name}`,true);}else{render();if(target)say(`선택한 ${atom(z).name}은 양성자 ${z}개예요. 지금 찾는 것은 ${target}개인 원소입니다.`);}break;}
 case 'charge-answer':{const [id,answer]=value.split(':');if(CHARGE_TASKS.some(c=>c.id===id)&&['neutral','positive','negative'].includes(answer)){state.chargeAnswers[id]=answer;state.chargeConfirmed=false;render();}break;}
 case 'check-charge':if(chargeRuleWorks(state.chargeAnswers)){state.chargeConfirmed=true;record('neutral');render();say('원소 이름은 양성자로, 전하는 +와 −의 수로 따로 판단했어요.',true);}else say('세 입자에서 선택한 상태와 짝짓기 뒤 남는 전하를 대조해 보세요.');break;
 case 'shell-track':
  if(value==='skip'&&!high()){state.shellTrack='skip';delete state.mission.shells;state.done=false;advance();}
  else if(value==='explore'){state.shellTrack='explore';state.done=false;render(true);}break;

 case 'material':return selectMaterial(value);
 case 'home':state.material=null;state.level=0;state.deepest=0;render(true);break;
 case 'zoom':return zoom(value,el?.closest('svg')?el:null);
 case 'select-particle':return selectParticle(value,el);
 case 'select-atom':state.z=Number(value);return zoom(3,el);
 case 'particle':particle=value;add('seen',`${state.z}:${value}`);if(['p','n','e'].every(k=>state.seen.some(v=>v.endsWith(':'+k))))record('particles');render();break;
 case 'explode':exploded=!exploded;render();break;
 case 'advance':advance();break;
 case 'chapter':if(Number(value)<=state.unlocked){state.chapter=Number(value);render(true);}break;
 case 'isotope':state.answers.isotope=value;render();say(value==='same'?'양성자 8개가 유지되므로 모두 산소예요.':'중성자만 달라졌어요. 원소를 결정하는 양성자는 여전히 8개예요.',value==='same');break;
 case 'shell-atom':state.shellZ=Number(value);state.shells=[0,0,0,0];render();break;
 case 'electron-select':say('원하는 껍질이나 오른쪽의 껍질 버튼을 누르면 전자 한 개가 놓여요.');break;
 case 'place':doPlace(value);break;
 case 'remove':{const i=Number(value);if(state.shells.slice(i+1).some(Boolean))return say('바깥쪽 껍질의 전자부터 빼 주세요.');state.shells[i]=Math.max(0,state.shells[i]-1);render();break;}
 case 'clear-shells':state.shells=[0,0,0,0];render();break;
 case 'check-shells':if(correctShells(state.shells,state.shellZ)){add('shellDone',state.shellZ);record('shells');render();say(`${atom(state.shellZ).name}의 전자 배치는 ${atom(state.shellZ).shells.join(', ')}예요.`,true);}else say(`전자 ${state.shellZ-total(state.shells)}개를 더 배치해 보세요. 안쪽 껍질부터 채워요.`);break;
 case 'mission':{const i=value.indexOf(':');state.mission[value.slice(0,i)]=value.slice(i+1);state.done=false;render();break;}
 case 'check-mission':{
  const result=evaluateMission(missionFor(context.mode,state.missionIndex),state.mission,context.mode,{requireShells:requiresShells()});
  const labels={neutrality:'중성: 양성자 수와 전자 수를 비교해 보세요.',number:'원자 번호: 양성자 수를 확인해 보세요.',element:'원소: 원자 번호로 주기율표를 찾아보세요.',shells:'전자 배치: 제시된 입자의 전자 전체 수를 확인해 보세요.',mass:'질량수: 양성자 수와 중성자 수를 더해 보세요.'};
  if(result.allCorrect&&state.evidence.final==='protons'){state.done=true;record('final');render(true);say('새 입자를 관찰한 근거로 분석했어요.',true);}else{$('#mission-result').innerHTML=`<div class="discovery"><b>단서와 판단 근거를 다시 확인해 볼까요?</b><ul>${Object.entries(labels).filter(([key])=>key in result&&!result[key]).map(([key])=>`<li>${labels[key]}</li>`).join('')}${state.evidence.final!=='protons'?'<li>원소를 결정하는 입자를 판단 근거로 선택하세요.</li>':''}</ul></div>`;}break;
 }
 case 'new-mission':state.missionIndex=(state.missionIndex+1)%12;state.mission={};delete state.evidence.final;state.done=false;render(true);break;
 case 'reference-table':modal(`<h2>원자 번호로 원소 찾기</h2><div class="reference-elements">${ELEMENTS.map(e=>`<div><b>${e.z}</b><strong>${e.symbol}</strong><span>${e.name}</span></div>`).join('')}</div>`);break;
 case 'journal':showJournal();break;
 case 'help':modal('<h2>작은 세계를 탐험하는 방법</h2><ol><li>물·수소 기체·금 중 하나를 선택해 확대해요.</li><li>분자나 원자를 누르고, 안으로 더 들어가 보세요.</li><li>+·0·− 입자의 위치와 성질을 확인해요.</li><li>입자 수로 묶고 실제 원소 이름과 대조해 분류 기준을 찾아요.</li><li>찾아낸 기준을 표의 숫자와 비교하고, 새 원소의 번호를 예측해요.</li><li>전하를 분석하고, 전자 배치는 선택하여 더 탐험해요.</li></ol><p>마우스·터치·키보드로 사용할 수 있어요. Tab으로 선택하고 Enter 또는 Space로 실행하세요. 전자 끌기 대신 껍질 버튼을 눌러도 됩니다.</p><p>각 화면의 모형은 실제 색·크기·거리·전자 궤도를 그대로 나타내지 않아요. 원형 껍질은 전자 배치를 위한 단순화입니다.</p><p>학생 계정 없이 활동하며, 진행 기록은 현재 기기에 저장됩니다. 반별 수업 링크와 학습 수준마다 따로 저장하며, 다른 기기에서는 이어지지 않습니다. 공용 기기에서 다른 학생이 시작할 때는 ‘새 학생으로 시작’을 사용하세요.</p>');break;
 case 'close':$('#dialog').close();break;
 case 'reset-confirm':modal(`<h2>탐험 기록을 초기화할까요?</h2><p>현재 수업 링크와 학습 수준의 이 기기 기록만 지워집니다. 다른 반의 기록과 다른 학생의 기기에는 영향을 주지 않습니다.</p>${btn('초기화하고 새로 시작','reset','','danger')}`);break;
 case 'reset':state=fresh(context.mode);needsResume=false;$('#dialog').close();render(true);break;
 case 'print':{const html=`<section class="print-report"><h1>확대! 물질 탐험 연구소 · 탐험 기록</h1><p>학습 수준: ${high()?'고등학교 확장':'중학교 2학년'} · 수업: ${esc(context.lessonId==='personal'?'개인 탐험':context.classLabel||'반별 탐험')}</p><p>탐험한 물질: ${state.visited.map(k=>MATERIALS[k].name).join(', ')||'아직 없음'}</p>${judgmentList()}<h2>확인한 개념</h2><ol>${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')}</ol><p>전자 배치 완료: ${state.shellDone.map(z=>`${atom(z).name} (${atom(z).shells.join(',')})`).join(' / ')||'아직 없음'}</p></section>`;document.querySelector('.print-report')?.remove();document.body.insertAdjacentHTML('beforeend',html);window.print();break;}
 }
 save();
}
document.addEventListener('submit',e=>{if(e.target.id==='teacher-form'){e.preventDefault();createClassLinks();}});
document.addEventListener('click',e=>{if(suppressClick&&e.target.closest('[data-drag]')){suppressClick=false;return;}const b=e.target.closest('[data-action]');if(b&&!b.disabled)handle(b.dataset.action,b.dataset.value||'',b);});
document.addEventListener('keydown',e=>{const b=e.target.closest('svg [role="button"]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handle(b.dataset.action,b.dataset.value,b);}});
document.addEventListener('input',e=>{if(e.target.dataset.change==='number-prediction'){state.numberPrediction=e.target.value;state.numberConfirmed=false;save();}});
document.addEventListener('change',e=>{if(e.target.dataset.change==='neutron'){state.neutron=Number(e.target.value);state.answers.isotope='';render();}if(e.target.dataset.change==='shell-atom')handle('shell-atom',e.target.value);});
document.addEventListener('pointerdown',e=>{const source=e.target.closest('[data-drag]');if(!source||source.disabled||e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,source};source.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;if(drag.moved){e.preventDefault();const ghost=$('#drag-ghost');ghost.hidden=false;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]')?.classList.add('drop-hover');}},{passive:false});
function endDrag(e,cancel=false){if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;drag=null;$('#drag-ghost').hidden=true;document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));if(moved){suppressClick=true;setTimeout(()=>suppressClick=false,100);if(!cancel){const drop=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]');if(drop)doPlace(drop.dataset.drop);else say('원형 껍질 위에 놓아 보세요. 오른쪽 껍질 버튼으로도 배치할 수 있어요.');}}}
document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));
render();if(!storageOK)say('진행 저장을 사용할 수 없지만 탐험은 계속할 수 있어요.');
