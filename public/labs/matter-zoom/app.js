import {ELEMENTS,atom,MATERIALS,PARTICLES,CHAPTERS,DISCOVERIES} from './data.mjs';
import {STORAGE_KEY,fresh,restore,total,placeElectron,correctShells,checkMission} from './core.mjs';

let state,storageOK=true;
try{state=restore(localStorage.getItem(STORAGE_KEY));}catch{state=fresh();storageOK=false;}
let busy=false,exploded=false,particle=null,toastTimer,drag=null,suppressClick=false;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,value='',cls='',extra='')=>`<button class="${cls}" data-action="${action}" data-value="${esc(value)}" ${extra}>${label}</button>`;
const add=(key,value)=>{if(!state[key].includes(value))state[key].push(value);};
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{storageOK=false;}}
function record(key){add('records',key);save();}
function say(message,success=false){const el=$('#feedback');el.textContent=message;el.className=success?'show success':'show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',5500);}
function modal(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal();}
const question=(eyebrow,title,copy='')=>`<div class="question"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1>${copy?`<p class="intro-copy">${copy}</p>`:''}</div>`;
const note=t=>`<p class="note">${t}</p>`;
const checkMark=done=>done?'✓':'○';
function navigation(){
 $('#navigation').innerHTML=CHAPTERS.map((name,i)=>btn(`<span>${String(i+1).padStart(2,'0')}</span>${name}`,'chapter',i,i===state.chapter?'active':'',`${i>state.unlocked?'disabled':''} ${i===state.chapter?'aria-current="step"':''}`)).join('');
 $('#record-count').textContent=state.records.length;
}
function render(focus=false){
 const previous=document.activeElement;const action=previous?.dataset?.action;const value=previous?.dataset?.value;const change=previous?.dataset?.change;
 navigation();$('#app').innerHTML=[introOrZoom,comparison,numbers,neutral,shells,table,final][state.chapter]();
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
 if(!state.material)return `<section class="landing">${question('작은 세계로 떠나는 과학 탐험','눈에 보이는 물질,<br>그 안에는 무엇이 있을까?','물질 하나를 선택하고, 더 작은 세계로 들어가 보세요.')}<div class="material-grid">${Object.entries(MATERIALS).map(([id,m],i)=>`<button class="material-card ${id}" data-action="material" data-value="${id}"><div class="material-photo">${photo(id)}<span class="specimen">SPECIMEN 0${i+1}</span><span class="lens-icon" aria-hidden="true">＋</span></div><div class="material-copy"><small>${m.tag}</small><h2>${m.name}<span>${m.formula}</span></h2><p>${m.intro}</p><b>선택하여 확대 <span aria-hidden="true">↗</span></b></div></button>`).join('')}</div><p class="model-notice"><span>ⓘ</span> 원자와 전자는 맨눈으로 직접 볼 수 없어요. 이 프로그램은 이해를 돕는 확대 모형을 사용합니다.<br>입자의 색·크기·간격과 확대 비율은 실제와 다릅니다. 실물 화면은 사실적인 일러스트입니다.</p></section>`;
 const m=MATERIALS[state.material],a=atom(state.z),l=state.level;
 const titles=[m.intro,'더 작은 세계에는 어떤 입자들이 있을까?',m.kind==='array'?'배열 속 원자 하나를 골라 볼까?':'분자 하나는 무엇으로 이루어져 있을까?','원자는 더 작은 입자로 이루어져 있을까?','가운데 뭉친 입자와 주변 입자는 어떻게 다를까?','가운데 뭉친 입자들의 정체는 무엇일까?'];
 const levels=['실제 물질',m.kind==='array'?'원자 배열':'여러 분자',m.kind==='array'?'원자 선택':'한 분자','원자 하나','원자 내부','원자핵'];
 const path=`${m.name} <span>›</span> ${l>=2?(m.kind==='array'?'Au 배열':m.formula):levels[l]} ${l>=3?`<span>›</span> ${a.name} 원자`:''} ${l>=4?'<span>›</span> 내부 구조':''}`;
 let scene='',panel='';
 if(l===0){scene=`<div class="macro-photo">${photo(state.material)}<div class="reticle"></div><span class="macro-label">${m.name} <b>${m.formula}</b></span></div>`;panel=`<p class="eyebrow">탐험 준비</p><h2>지금 보이는 물질 속으로</h2><p>${m.name}을 이루는 아주 작은 입자들을 찾아봅시다.</p>${btn('입자 수준으로 확대 ＋','zoom',1,'primary wide')}${note('확대하면서 실제 모습에서 학습 모형으로 전환합니다.')}`;}
 if(l===1){scene=fieldSVG();panel=`<p class="eyebrow">발견 01 · 물질을 이루는 입자</p><h2>${m.kind==='array'?'같은 원자가 반복돼요':'작은 묶음들이 보여요'}</h2><p>${m.field}</p><div class="instruction">${m.kind==='array'?'금 원자 하나':'분자 하나'}를 눌러 더 확대하세요.</div>${note(m.kind==='array'?'금속의 3차원 원자 배열을 평면에 단순화했어요.':'선으로 연결된 구들은 같은 분자를 나타내요. 분자의 이동은 생략했어요.')}${btn(m.kind==='array'?'가운데 원자 선택':'가운데 분자 선택','select-particle',0,'secondary wide')}`;}
 if(l===2){scene=moleculeSVG();panel=`<p class="eyebrow">발견 02 · ${m.kind==='array'?'원자':'분자를 이루는 원자'}</p><h2>${m.kind==='array'?'금 원자 하나, Au':m.formula+'를 자세히 보면'}</h2><p>${m.detail}</p><div class="instruction">${m.kind==='array'?'Au':'H'+(state.material==='water'?' 또는 O':'')} 표시가 있는 원자를 눌러 보세요.</div><div class="choice-row">${[...new Set(m.atoms)].map(z=>btn(`${atom(z).symbol} · ${atom(z).name} 원자`,'select-atom',z,'secondary')).join('')}</div>${note('구의 색과 크기는 원자를 구분하기 위한 표현이에요.')}`;}
 if(l===3){scene=solidAtomSVG(state.z);panel=`<p class="eyebrow">관찰 대상 · ${a.symbol}</p><h2>${a.name} 원자의 안쪽으로</h2><p>겉으로는 하나의 구처럼 보이지만, 안에는 더 작은 입자들이 있어요.</p>${btn('원자 내부로 확대 ＋','zoom',4,'primary wide')}<div class="model-note"><b>모형 전환 안내</b><p>이제 ${a.name} 원소의 <strong>독립된 중성 원자</strong> 모형을 살펴봐요. ${m.kind==='array'?'금속에서 전자가 여러 원자에 걸쳐 움직이는 모습은 생략합니다.':'분자 속 원자들이 전자를 함께 사용하는 결합 모습은 생략합니다.'}</p></div>`;}
 if(l>=4){scene=atomSVG(state.z,{nucleus:l===5,exploded});panel=particlePanel();}
 const nextMaterial=Object.keys(MATERIALS).find(k=>!state.visited.includes(k));
 return `${question(`확대 탐험 · ${m.name}`,titles[l])}<div class="path-bar"><span>${path}</span>${btn('물질 다시 선택','home','','text-button')}</div>${frame(scene,panel,l===0?'실제 물질을 표현한 일러스트 · 확대하면 모형으로 전환':l>=4?(state.z===79?'금-197 중성 원자 · 양성자 79 / 중성자 118 / 전자 79 · 입자는 일부만 표시':'입자 수는 선택한 원자의 예 · 크기·거리·전자 위치는 실제 비율이 아님'):'선택한 입자를 중심으로 더 작은 세계를 관찰하세요.')}<div class="zoom-controls">${btn('− 한 단계 밖으로','zoom',Math.max(0,l-1),'secondary',l===0?'disabled':'')}<ol class="scale-track">${levels.map((label,i)=>`<li>${btn(`<span>${i<=l?'●':'○'}</span>${label}`,'zoom',i,i===l?'current':'',i>state.deepest?'disabled':'')}</li>`).join('')}</ol>${btn('＋ 더 안으로','zoom',Math.min(5,l+1),'secondary',l===5?'disabled':'')}</div>${l>=4?footer(nextMaterial?'다른 물질도 확대하면 같은 모습일까요?':'세 물질에서 찾은 원자들을 나란히 비교해 봅시다.',nextMaterial?`${MATERIALS[nextMaterial].name}도 탐험하기`:'원자 비교로 이동 →',nextMaterial?'material':'advance',nextMaterial||''):''}`;
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
 return `<p class="eyebrow">발견 03 · 원자 내부</p><h2>입자를 눌러 정체를 확인해요</h2><div class="particle-keys">${Object.entries(PARTICLES).map(([k,p])=>btn(`<span class="dot ${k}">${p.sign}</span><span>${seen(k)?p.name:p.sign+' 입자 알아보기'}<small>${seen(k)?p.location:'선택하여 관찰'}</small></span><b>${a[k==='e'?'z':k==='p'?'z':'n']}개</b>`,'particle',k,particle===k?'selected':'')).join('')}</div>${particle?`<div class="discovery"><b>${PARTICLES[particle].name} · ${PARTICLES[particle].sign}</b><p>${state.z===1&&particle==='n'?'지금 보는 가장 흔한 수소(수소-1)에는 중성자가 없어요. 다른 수소 원자에는 중성자가 있을 수 있어요.':`위치: ${PARTICLES[particle].location}. ${PARTICLES[particle].description}`}</p></div>`:'<p class="hint">모형 속 +, 0, − 입자나 위의 버튼을 눌러 보세요.</p>'}<div class="choice-row">${btn(exploded?'다시 모아 보기':'원자핵 펼쳐 보기','explode','','secondary')}${btn(state.level===5?'원자 전체로':'원자핵 더 확대','zoom',state.level===5?4:5,'secondary')}</div>${note('원자핵은 양성자와 중성자로 이루어져 있어요. 가장 흔한 수소의 원자핵에는 중성자가 없어요.')}${note(state.z===79?'금의 전자는 79개예요. 이 그림은 일부 입자만 보여주며, 1~20번의 전자 배치 규칙을 금에 적용하지 않아요.':'원은 전자 배치를 돕는 껍질 모형이에요. 전자가 행성처럼 이 선을 따라 돈다는 뜻이 아니에요.')}<div class="mini-heading">처음 물질과 연결하기</div>${materialButtons()}${m.kind==='molecule'?btn('분자로 돌아가 다른 원자 선택','zoom',2,'text-button wide'):''}`;
}
function comparison(){
 const answered=state.answers.identity==='p',isotope=state.answers.isotope==='same';
 return `${question('탐구 01 · 나란히 관찰하기','수소, 산소, 금은 왜 서로 다른 원소일까?','확대해서 만난 원자들을 비교해 보세요. 아래의 수는 모두 중성 원자 한 개의 예입니다.')}<div class="comparison-grid">${[1,8,79].map(z=>{const a=atom(z);return `<section class="compare-card"><div class="compare-heading"><span>${a.symbol}</span><div><small>${z===1?'물·수소 기체에서':z===8?'물에서':'금에서'} 발견</small><h2>${a.name}</h2></div></div>${atomSVG(z,{interactive:false})}<dl><div><dt>+ 양성자</dt><dd>${z}개</dd></div><div><dt>− 전자</dt><dd>${z}개</dd></div><div><dt>0 중성자 <small>(예)</small></dt><dd>${a.n}개</dd></div><div><dt>원자 번호</dt><dd>${z}</dd></div></dl><p class="note">${a.name}-${a.z+a.n} 원자를 예로 들었어요.${z===79?' 그림은 입자 일부만 표시해요.':''}</p></section>`;}).join('')}</div><div class="investigate-row"><section><p class="eyebrow">발견 질문</p><h2>원소의 종류를 결정하는 것은?</h2><div class="choice-row">${[['p','양성자 수'],['n','중성자 수'],['e','전자 수']].map(([k,n])=>btn(n,'identity',k,answered&&k==='p'?'selected':'secondary')).join('')}</div>${answered?'<p class="answer-note">✓ 양성자 수가 원소를 결정해요. 전자 수가 바뀌면 전하가 달라지고, 중성자 수가 달라도 같은 원소일 수 있어요.</p>':''}</section><section><p class="eyebrow">한 가지 조건만 바꿔 보기</p><h2>중성자를 바꿔도 산소일까?</h2><div class="isotope-controls"><span>양성자 <b>8</b> 고정</span><label>중성자 <select data-change="neutron" aria-label="산소 원자의 중성자 수">${[8,9,10].map(n=>`<option value="${n}" ${state.neutron===n?'selected':''}>${n}개</option>`).join('')}</select></label></div><p>현재 원자핵: + 8개, 0 ${state.neutron}개</p><div class="choice-row">${btn('여전히 산소다','isotope','same',isotope?'selected':'secondary')}${btn('다른 원소다','isotope','different','secondary')}</div>${isotope?'<p class="answer-note">✓ 양성자가 8개이므로 모두 산소예요. 같은 원소라도 중성자 수가 다를 수 있어요.</p>':''}</section></div>${footer('비교 결과를 다음 탐구의 단서로 사용하세요.','원자 번호와 연결 →')}`;
}
function numbers(){
 return `${question('탐구 02 · 숫자의 의미','양성자 수와 주기율표의 숫자는 어떤 관계일까?','먼저 양성자를 세어 보고, 각 원자의 원자 번호를 골라 보세요.')}<div class="number-grid">${[1,8,79].map(z=>{const a=atom(z),correct=Number(state.numberAnswers[z])===z;return `<section class="number-card"><div class="element-stamp"><small>원자 번호</small><b>${correct?z:'?'}</b><strong>${a.symbol}</strong><span>${a.name}</span></div><p>양성자 <strong>${z}개</strong></p><fieldset><legend>${a.name}의 원자 번호는?</legend><div class="choice-row">${[1,8,79].map(n=>btn(n,'number',`${z}:${n}`,correct&&z===n?'selected':'secondary')).join('')}</div></fieldset>${correct?'<p class="answer-note">✓ 양성자 수 = 원자 번호</p>':''}</section>`;}).join('')}</div><div class="discovery full"><b>주기율표의 원자 번호는 원소를 찾는 단서예요.</b><p>수소 1 → 산소 8 → 금 79. 금은 원자번호 1~20 범위 밖에 있으며, 뒤의 주기율표에서는 1~20을 탐색합니다.</p></div>${footer('세 원자의 원자 번호를 모두 연결하면 다음으로 갈 수 있어요.','중성의 비밀 알아보기 →')}`;
}
function neutral(){
 const a=atom(state.neutralZ),net=a.z-state.neutralE,balanced=net===0;
 const scene=`<div class="charge-lab"><div class="charge-columns"><section><span class="charge-sign p">+</span><h2>양성자</h2><strong>${a.z}</strong><span>원자핵 안</span></section><div class="charge-equals">${balanced?'=':'≠'}</div><section><span class="charge-sign e">−</span><h2>전자</h2><strong>${state.neutralE}</strong><span>원자핵 주변</span></section></div><div class="charge-meter ${balanced?'balanced':''}"><span>전체 전하</span><strong>${net>0?'+':''}${net}</strong><b>${balanced?'전기적으로 중성':net>0?'+ 전하가 더 많아요':'− 전하가 더 많아요'}</b></div><p>+1 × ${a.z} + (−1) × ${state.neutralE} = ${net}</p></div>`;
 const panel=`<p class="eyebrow">전하 맞추기</p><h2>+가 있는데 왜 중성일까요?</h2><p>전자를 더하거나 빼서 전체 전하를 0으로 맞춰 보세요.</p><div class="choice-row">${[1,8].map(z=>btn(`${atom(z).symbol} ${atom(z).name}`,'neutral-atom',z,state.neutralZ===z?'selected':'secondary')).join('')}</div><div class="counter">${btn('−','electron-minus','','secondary','aria-label="전자 한 개 빼기" '+(state.neutralE===0?'disabled':''))}<span>전자 <b>${state.neutralE}</b>개</span>${btn('＋','electron-plus','','secondary','aria-label="전자 한 개 더하기" '+(state.neutralE===20?'disabled':''))}</div>${btn('중성인지 확인','check-neutral','','primary wide')}${state.records.includes('neutral')?'<div class="discovery"><b>양성자 수 = 전자 수</b><p>반대 부호의 전하가 같은 수만큼 있어 전체 전하가 0이 돼요.</p></div>':''}${note('중성자(0)는 전체 전하에 영향을 주지 않아요. 전자가 모자라거나 남으면 전하를 띤 입자, 이온이 됩니다.')}`;
 return `${question('탐구 03 · 전기적 성질','양성자는 +인데 원자는 왜 중성일까?')}${frame(scene,panel,'전하의 크기는 양성자를 +1, 전자를 −1로 놓고 비교한 상대값입니다.')}${footer('중성 원자에서 발견한 전자 수를 다음 모형에 배치해 봅시다.','전자 배치해 보기 →')}`;
}
function shellSVG(){
 const a=atom(state.shellZ);let s='';
 for(let i=3;i>=0;i--){const r=76+i*48;s+=`<g role="button" tabindex="0" class="shell-zone" data-action="place" data-value="${i}" data-drop="${i}" aria-label="${i+1}번째 껍질에 전자 놓기"><circle cx="360" cy="245" r="${r}" fill="none" stroke="transparent" stroke-width="38"/><circle cx="360" cy="245" r="${r}" class="shell-ring"/><text x="${360+r+6}" y="${245+13}" class="shell-name">${i+1}</text></g>`;}
 s+=`<circle cx="360" cy="245" r="40" fill="#354b5f"/><text x="360" y="238" class="svg-label">${a.symbol}</text><text x="360" y="263" class="svg-label small">+ ${a.z}</text>`;
 state.shells.forEach((n,i)=>{for(let j=0;j<n;j++){const t=-Math.PI/2+j*2*Math.PI/Math.max(n,1),r=76+i*48;s+=`<g data-drop="${i}" data-action="place" data-value="${i}">${particleDot('e',360+r*Math.cos(t),245+r*Math.sin(t),15,false)}</g>`;}});
 return svg(s,'전자 배치 모형. 전자를 끌어 껍질에 놓거나 껍질 버튼을 누르세요.','shell-model');
}
function shells(){
 const a=atom(state.shellZ),remaining=a.z-total(state.shells),complete=correctShells(state.shells,a.z);
 const panel=`<p class="eyebrow">전자 배치 실험대</p><label class="select-label">중성 원자 선택<select data-change="shell-atom" aria-label="전자 배치할 원소">${ELEMENTS.map(e=>`<option value="${e.z}" ${e.z===a.z?'selected':''}>${e.z}. ${e.name} (${e.symbol})${state.shellDone.includes(e.z)?' ✓':''}</option>`).join('')}</select></label><p><strong>양성자 ${a.z}개 → 전자 ${a.z}개</strong></p><button class="electron-source" data-action="electron-select" data-drag="electron" ${remaining===0?'disabled':''}><span class="dot e">−</span><span>전자를 껍질로 끌어 놓기<small>남은 전자 ${remaining}개 · 버튼으로도 배치 가능</small></span></button><div class="shell-buttons">${state.shells.map((n,i)=>`<div>${btn(`${i+1}번째 껍질 <b>${n}개</b> ＋`,'place',i,'secondary')}${btn('−','remove',i,'remove','aria-label="'+(i+1)+'번째 껍질 전자 빼기" '+(!n?'disabled':''))}</div>`).join('')}</div><div class="configuration"><span>지금의 전자 배치</span><strong>${state.shells.join(' · ')}</strong></div><div class="choice-row">${btn('배치 확인','check-shells','','primary')}${btn('다시 놓기','clear-shells','','secondary')}</div>${complete&&state.shellDone.includes(a.z)?`<p class="answer-note">✓ ${a.name}: ${a.shells.join(', ')} — 중성 원자의 전자를 모두 배치했어요.</p>`:''}`;
 return `${question('탐구 04 · 전자를 놓는 자리','전자들은 원자 안에서 어떻게 배치될까?','안쪽 껍질부터 채워 보세요. 원은 전자 수를 정리하는 모형이며, 전자의 실제 궤도가 아닙니다.')}<div class="rule-strip"><span>1번째 <b>최대 2개</b></span><span>2번째 <b>최대 8개</b></span><span>3번째 <b>이번 활동에서는 8개까지</b></span><span>4번째 <b>K·Ca에서 사용</b></span></div>${frame(shellSVG(),panel,'원자번호 1~20의 바닥상태 중성 원자만 다룹니다. 세 번째 껍질의 일반적인 최대 수용량이 8이라는 뜻은 아닙니다.')}<div class="quick-elements"><span>추천 원자</span>${[1,2,3,8,10,11,19,20].map(z=>btn(`${atom(z).symbol}${state.shellDone.includes(z)?' ✓':''}`,'shell-atom',z,z===a.z?'selected':'secondary')).join('')}</div>${footer(`${state.shellDone.length}종의 원자를 배치했어요. 다른 원자도 자유롭게 탐색할 수 있어요.`,'주기율표에서 찾아보기 →')}`;
}
function table(){
 const a=atom(state.tableZ);const cells=ELEMENTS.map(e=>`<button class="element-cell ${e.z===a.z?'selected':''} ${state.tableSeen.includes(e.z)?'visited':''}" style="grid-row:${e.period+1};grid-column:${e.group}" data-action="table-element" data-value="${e.z}" aria-label="원자 번호 ${e.z}, ${e.name}, ${e.symbol}"><small>${e.z}</small><strong>${e.symbol}</strong><span>${e.name}</span></button>`).join('');
 return `${question('탐구 05 · 원소 지도','양성자 수를 알면 원소를 찾을 수 있을까?','원자 번호 1~20의 실제 주기·족 위치를 살펴보세요. 원소 칸을 누르면 원자 정보가 열립니다.')}<div class="periodic-layout"><section class="periodic-panel"><p class="scroll-hint">↔ 작은 화면에서는 표를 좌우로 움직여 보세요.</p><div class="periodic-scroll" tabindex="0" role="region" aria-label="원자번호 1~20 주기율표, 가로 스크롤 가능"><div class="periodic-grid">${[1,2,13,14,15,16,17,18].map(n=>`<span class="group-label" style="grid-row:1;grid-column:${n}">${n}족</span>`).join('')}${cells}<div class="table-space">원자 번호 = 양성자 수<small>원소 기호 아래에서 이름을 확인하세요.</small></div></div></div><div class="periodic-legend"><span>■ 선택한 원소</span><span>• 탐색한 원소 ${state.tableSeen.length}/20</span><span>금 Au는 79번 · 이 표의 범위 밖</span></div></section><aside class="element-detail"><div class="element-stamp"><small>원자 번호</small><b>${a.z}</b><strong>${a.symbol}</strong><span>${a.name}</span></div><dl><div><dt>양성자</dt><dd>${a.z}개</dd></div><div><dt>전자 <small>(중성 원자)</small></dt><dd>${a.z}개</dd></div><div><dt>전자 배치</dt><dd>${a.shells.join(', ')}</dd></div></dl>${btn('이 원자 전자 배치해 보기','table-to-shells',a.z,'secondary wide')}<p class="note">중성자 수는 같은 원소 안에서도 달라질 수 있어 원소의 기준으로 쓰지 않아요.</p></aside></div>${footer('이제 이름이 가려진 원자를 스스로 분석해 볼까요?','종합 탐험 시작 →')}`;
}
function final(){
 const a=atom(state.missionZ),done=state.done;
 const field=(key,title,options)=>`<fieldset class="mission-field"><legend><span>${['neutral','number','element','shells'].indexOf(key)+1}</span>${title}</legend><div class="choice-row">${options.map(([value,label])=>btn(label,'mission',`${key}:${value}`,String(state.mission[key])===String(value)?'selected':'secondary',`aria-pressed="${String(state.mission[key])===String(value)}"`)).join('')}</div>${done?`<p class="answer-note">✓ ${key==='neutral'?'양성자 수와 전자 수가 같아요.':key==='number'?'양성자 수가 원자 번호예요.':key==='element'?`${a.z}번은 ${a.name}예요.`:'안쪽 껍질부터 전자를 채웠어요.'}</p>`:''}</fieldset>`;
 return `${question('종합 탐험 · 이름이 가려진 원자',done?'아주 작은 세계를 읽는 힘을 얻었어요!':'이 원자의 정체를 밝혀 볼까?',done?'물질에서 출발해 원자 내부의 증거로 원소를 찾아냈어요.':'이름 대신 입자 수만 주어졌어요. 앞에서 발견한 규칙으로 분석해 보세요.')}<div class="mission-layout"><section class="mystery-specimen"><p class="eyebrow">UNKNOWN ATOM</p><div class="mystery-symbol">${done?a.symbol:'?'}</div><h2>${done?a.name:'이름이 가려진 원자'}</h2><dl><div><dt>+ 양성자</dt><dd>${a.z}개</dd></div><div><dt>− 전자</dt><dd>${a.z}개</dd></div><div><dt>0 중성자 <small>(이 원자의 예)</small></dt><dd>${a.n}개</dd></div></dl><p>네 가지 단서를 연결해 탐험을 완성하세요.</p>${btn('주기율표 참고','reference-table','','secondary wide')}</section><section class="mission-questions">${field('neutral','전기적으로 중성일까?',[['yes','중성이다'],['no','중성이 아니다']])}${field('number','원자 번호는?',[a.z,a.z+a.n,a.z+1].map(n=>[n,n]))}${field('element','어떤 원소일까?',[a.z===12?11:12,a.z,8].filter((v,i,x)=>x.indexOf(v)===i).map(z=>[z,`${atom(z).name} (${atom(z).symbol})`]))}${field('shells','전자 배치는?',[a.shells.join(','),a.z===12?'2,10':'2,5',a.z===12?'8,4':'8'].map(s=>[s,s]))}<div class="mission-submit">${btn(done?'다른 원자도 분석하기':'분석 결과 확인',done?'new-mission':'check-mission','','primary')}${done?btn('탐험 기록 보기','journal','','secondary'):''}</div><div id="mission-result" aria-live="polite"></div></section></div>${done?`<div class="completion"><b>탐험 완료</b><p>물질 → 분자 또는 원자 배열 → 원자 → 원자핵과 전자 → 양성자·중성자·전자</p>${btn('처음 물질로 돌아가기','chapter',0,'secondary')}${btn('탐험 기록 인쇄','print','','secondary')}</div>`:''}`;
}
function showJournal(){modal(`<p class="eyebrow">EXPLORATION NOTES</p><h2>나의 탐험 기록</h2><p>${state.records.length}개의 발견을 모았어요.${storageOK?' 이 브라우저에 자동 저장됩니다.':' 현재 브라우저에서는 진행 저장을 사용할 수 없어요.'}</p><ol class="journal">${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')||'<li>물질을 선택해 첫 발견을 기록해 보세요.</li>'}</ol><div class="choice-row">${btn('기록 인쇄','print','','secondary')}${btn('기록 초기화','reset-confirm','','text-button')}</div>`);}
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
 if(c===0&&!state.visited.length)return say('원자 하나의 내부까지 확대해 보세요.');
 if(c===1&&(state.answers.identity!=='p'||state.answers.isotope!=='same'))return say('양성자 수 비교와 중성자 바꾸기 질문에 답해 보세요.');
 if(c===2&&![1,8,79].every(z=>Number(state.numberAnswers[z])===z))return say('세 원자의 원자 번호를 모두 연결해 주세요.');
 if(c===3&&!state.records.includes('neutral'))return say('전자를 조절하고 중성인지 확인해 보세요.');
 if(c===4&&!state.shellDone.length)return say('원자 하나의 전자 배치를 완성하고 확인해 보세요.');
 if(c===5&&!state.tableSeen.length)return say('주기율표에서 원소 하나를 선택해 보세요.');
 state.chapter=Math.min(6,c+1);state.unlocked=Math.max(state.unlocked,state.chapter);render(true);window.scrollTo({top:0,behavior:'instant'});
}
function doPlace(index){const r=placeElectron(state.shells,Number(index),state.shellZ);if(!r.ok)return say(r.message);state.shells=r.shells;render();say(`${Number(index)+1}번째 껍질에 전자를 놓았어요. 남은 전자 ${state.shellZ-total(state.shells)}개.`);}
async function handle(action,value,el){
 if(busy&&['material','zoom','select-particle','select-atom','chapter','home','advance'].includes(action))return;
 switch(action){
 case 'material':return selectMaterial(value);
 case 'home':state.material=null;state.level=0;state.deepest=0;render(true);break;
 case 'zoom':return zoom(value,el?.closest('svg')?el:null);
 case 'select-particle':return selectParticle(value,el);
 case 'select-atom':state.z=Number(value);return zoom(3,el);
 case 'particle':particle=value;add('seen',`${state.z}:${value}`);if(['p','n','e'].every(k=>state.seen.some(v=>v.endsWith(':'+k))))record('particles');render();break;
 case 'explode':exploded=!exploded;render();break;
 case 'advance':advance();break;
 case 'chapter':if(Number(value)<=state.unlocked){state.chapter=Number(value);render(true);}break;
 case 'identity':state.answers.identity=value;if(value==='p'){record('compare');say('맞아요. 원소의 종류는 양성자 수가 결정해요.',true);}else say(value==='n'?'중성자가 달라도 양성자 수가 같으면 같은 원소예요.':'전자가 달라지면 전하가 바뀌어요. 원소의 종류는 원자핵의 어떤 입자가 결정할까요?');render();break;
 case 'isotope':state.answers.isotope=value;render();say(value==='same'?'양성자 8개가 유지되므로 모두 산소예요.':'중성자만 달라졌어요. 원소를 결정하는 양성자는 여전히 8개예요.',value==='same');break;
 case 'number':{const [z,n]=value.split(':').map(Number);state.numberAnswers[z]=n;if(z===n){if([1,8,79].every(v=>Number(state.numberAnswers[v])===v))record('number');say(`${atom(z).name}: 양성자 ${z}개 → 원자 번호 ${z}`,true);}else say('원자 번호는 양성자 수와 같아요. 양성자 수를 다시 확인해 보세요.');render();break;}
 case 'neutral-atom':state.neutralZ=Number(value);state.neutralE=0;render();break;
 case 'electron-minus':state.neutralE=Math.max(0,state.neutralE-1);render();break;
 case 'electron-plus':state.neutralE=Math.min(20,state.neutralE+1);render();break;
 case 'check-neutral':if(state.neutralZ===state.neutralE){record('neutral');render();say('두 입자의 수가 같아 전체 전하는 0! 전기적으로 중성이에요.',true);}else say(`양성자 ${state.neutralZ}개와 전자 ${state.neutralE}개가 달라요. 전자 수를 조절해 보세요.`);break;
 case 'shell-atom':state.shellZ=Number(value);state.shells=[0,0,0,0];render();break;
 case 'electron-select':say('원하는 껍질이나 오른쪽의 껍질 버튼을 누르면 전자 한 개가 놓여요.');break;
 case 'place':doPlace(value);break;
 case 'remove':{const i=Number(value);if(state.shells.slice(i+1).some(Boolean))return say('바깥쪽 껍질의 전자부터 빼 주세요.');state.shells[i]=Math.max(0,state.shells[i]-1);render();break;}
 case 'clear-shells':state.shells=[0,0,0,0];render();break;
 case 'check-shells':if(correctShells(state.shells,state.shellZ)){add('shellDone',state.shellZ);record('shells');render();say(`${atom(state.shellZ).name}의 전자 배치는 ${atom(state.shellZ).shells.join(', ')}예요.`,true);}else say(`전자 ${state.shellZ-total(state.shells)}개를 더 배치해 보세요. 안쪽 껍질부터 채워요.`);break;
 case 'table-element':state.tableZ=Number(value);add('tableSeen',state.tableZ);record('table');render();break;
 case 'table-to-shells':state.chapter=4;state.shellZ=Number(value);state.shells=[0,0,0,0];render(true);break;
 case 'mission':{const i=value.indexOf(':');state.mission[value.slice(0,i)]=value.slice(i+1);state.done=false;render();break;}
 case 'check-mission':{const results=checkMission(state.missionZ,state.mission),labels={neutral:'중성: 양성자 수와 전자 수를 비교해 보세요.',number:'원자 번호: 양성자 수를 확인해 보세요.',element:'원소: 원자 번호로 주기율표를 찾아보세요.',shells:'전자 배치: 첫 껍질 2개, 다음 껍질 8개부터 채워 보세요.'};if(Object.values(results).every(Boolean)){state.done=true;record('final');render(true);say('네 가지 분석을 모두 마쳤어요. 탐험 완료!',true);}else{$('#mission-result').innerHTML=`<div class="discovery"><b>${Object.values(results).filter(Boolean).length}/4개의 단서가 맞아요.</b><ul>${Object.entries(results).filter(([,ok])=>!ok).map(([k])=>`<li>${labels[k]}</li>`).join('')}</ul></div>`;}break;}
 case 'new-mission':state.missionZ=state.missionZ===12?8:12;state.mission={};state.done=false;render(true);break;
 case 'reference-table':modal(`<h2>원자 번호로 원소 찾기</h2><div class="reference-elements">${ELEMENTS.map(e=>`<div><b>${e.z}</b><strong>${e.symbol}</strong><span>${e.name}</span></div>`).join('')}</div>`);break;
 case 'journal':showJournal();break;
 case 'help':modal('<h2>작은 세계를 탐험하는 방법</h2><ol><li>물·수소 기체·금 중 하나를 선택해 확대해요.</li><li>분자나 원자를 누르고, 안으로 더 들어가 보세요.</li><li>+·0·− 입자의 위치와 성질을 확인해요.</li><li>비교, 원자 번호, 중성, 전자 배치, 주기율표를 연결해요.</li></ol><p>마우스·터치·키보드로 사용할 수 있어요. Tab으로 선택하고 Enter 또는 Space로 실행하세요. 전자 끌기 대신 껍질 버튼을 눌러도 됩니다.</p><p>각 화면의 모형은 실제 색·크기·거리·전자 궤도를 그대로 나타내지 않아요. 원형 껍질은 전자 배치를 위한 단순화입니다.</p><p>이름·계정 없이 활동하며, 진행 기록은 현재 기기의 브라우저에 저장됩니다.</p>');break;
 case 'close':$('#dialog').close();break;
 case 'reset-confirm':modal(`<h2>탐험 기록을 초기화할까요?</h2><p>이 브라우저에 저장된 이 프로그램의 발견과 진행만 지워집니다.</p>${btn('초기화하고 새로 시작','reset','','danger')}`);break;
 case 'reset':state=fresh();$('#dialog').close();render(true);break;
 case 'print':{const html=`<section class="print-report"><h1>확대! 물질 탐험 연구소 · 탐험 기록</h1><p>탐험한 물질: ${state.visited.map(k=>MATERIALS[k].name).join(', ')||'아직 없음'}</p><ol>${state.records.map(k=>`<li>${DISCOVERIES[k]}</li>`).join('')}</ol><p>전자 배치 완료: ${state.shellDone.map(z=>`${atom(z).name} (${atom(z).shells.join(',')})`).join(' / ')||'아직 없음'}</p></section>`;document.querySelector('.print-report')?.remove();document.body.insertAdjacentHTML('beforeend',html);window.print();break;}
 }
 save();
}
document.addEventListener('click',e=>{if(suppressClick&&e.target.closest('[data-drag]')){suppressClick=false;return;}const b=e.target.closest('[data-action]');if(b&&!b.disabled)handle(b.dataset.action,b.dataset.value||'',b);});
document.addEventListener('keydown',e=>{const b=e.target.closest('svg [role="button"]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handle(b.dataset.action,b.dataset.value,b);}});
document.addEventListener('change',e=>{if(e.target.dataset.change==='neutron'){state.neutron=Number(e.target.value);state.answers.isotope='';render();}if(e.target.dataset.change==='shell-atom')handle('shell-atom',e.target.value);});
document.addEventListener('pointerdown',e=>{const source=e.target.closest('[data-drag]');if(!source||source.disabled||e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,source};source.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;if(drag.moved){e.preventDefault();const ghost=$('#drag-ghost');ghost.hidden=false;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]')?.classList.add('drop-hover');}},{passive:false});
function endDrag(e,cancel=false){if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;drag=null;$('#drag-ghost').hidden=true;document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));if(moved){suppressClick=true;setTimeout(()=>suppressClick=false,100);if(!cancel){const drop=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]');if(drop)doPlace(drop.dataset.drop);else say('원형 껍질 위에 놓아 보세요. 오른쪽 껍질 버튼으로도 배치할 수 있어요.');}}}
document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));
render();if(!storageOK)say('진행 저장을 사용할 수 없지만 탐험은 계속할 수 있어요.');
