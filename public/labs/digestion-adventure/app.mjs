import {STAGES, ORGAN_ART, SUMMARY, SOURCES} from './story.mjs';
import {mountScene} from './scene.mjs';
import {mountRoute} from './route.mjs';
import {ENZYMES, maskEnzymeNames, getEnzymeContext} from './memory.mjs';
import {ASSOCIATIONS, renderAssociations} from './associations.mjs';
import {createPractice, chooseEnzyme, nextMission, renderPractice} from './practice.mjs';
import {renderSummaryCards} from './summary.mjs';
import {renderPancreaticSource} from './pancreas.mjs';
import {mountAbsorption} from './absorption.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {stage:0,beat:0,time:0,animating:false,camera:'focus',mode:'tour',memoryMode:'connections',nameMode:'visible',summaryTeam:'starch',summaryLayout:'single',locationKey:'',completed:new Set()};
let practice = createPractice();
let raf = null, scene = null, animation = null, toastTimer;
const route = mountRoute($('#body-route'));
const pad = n => String(n).padStart(2,'0');
const escapeHTML = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const enzymeText = text => escapeHTML(maskEnzymeNames(text,state.nameMode)).replace(/\((말테이스|펩티데이스)( 등)?\)/g,'<small class="enzyme-detail">($1$2)</small>');
const currentBeat = () => STAGES[state.stage].beats[state.beat];
const artObserver = new ResizeObserver(entries => {
 const {width,height}=entries[0].contentRect;
 const artWidth=Math.min(width,height*1.5);
 $('#organ-canvas').style.width=artWidth+'px';
 $('#organ-canvas').style.height=(artWidth/1.5)+'px';
});
artObserver.observe($('#location-viewport'));


const originalStaticText = new WeakMap();
const namesPattern = /아밀레이스|펩신|트립신|라이페이스/;
const recallButtons = () => '<div class="recall-controls" role="group" aria-label="효소 이름 표시"><button data-recall="hidden">이름 가리기</button><button data-recall="hint">첫 글자 힌트</button><button data-recall="visible">정답 보기</button></div>';
function maskStaticNames(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(!originalStaticText.has(node) && namesPattern.test(node.nodeValue))originalStaticText.set(node,node.nodeValue);
  if(originalStaticText.has(node))node.nodeValue=maskEnzymeNames(originalStaticText.get(node),state.nameMode);
 }
}
$('#memory-view').innerHTML=`<div class="memory-heading"><div><p class="eyebrow">어디서? → 어떤 효소가? → 무엇을? → 무엇으로?</p><h1 id="memory-title">장소부터 분해 결과까지 연결해요.</h1><p>분해 전과 후를 연결하고, 효소가 하는 일을 한 문장으로 말해 보세요.</p></div>${recallButtons()}</div><div class="memory-toolbar"><div class="memory-switch" role="group" aria-label="기억하는 방법"><button data-memory-mode="connections" aria-pressed="true">장소별 연결</button><button data-memory-mode="characters" aria-pressed="false">캐릭터 모아 보기</button><button data-memory-mode="practice" aria-pressed="false">직접 연결하기</button></div><p id="memory-status" class="memory-status" role="status"></p></div><div id="association-board"></div><div id="character-gallery" hidden><div id="enzyme-roster" class="enzyme-roster"></div><div class="memory-connections"><article><span class="connection-number">01</span><div><h2>달리기 토끼 · 탄수화물</h2><p><strong>에너지가 필요한 달리기</strong>를 떠올려요.<br>이 토끼는 탄수화물 중 녹말 담당! 입·작은창자에서 작용해요.</p></div></article><article class="protein-connection"><span class="connection-number">02</span><div><h2>근육 곰 둘 · 단백질</h2><p><strong>위의 빨간 머리띠 → 작은창자의 초록 머리띠</strong><br>몸을 구성하는 단백질 담당! 서로 다른 효소가 나눠서 소화해요.</p></div></article><article><span class="connection-number">03</span><div><h2>통통 햄스터 · 지방</h2><p>둥근 볼과 배로 <strong>에너지 저장</strong>을 떠올려요.<br>쓸개즙의 도움을 받아 작은창자에서 지방을 분해해요.</p></div></article></div><p class="nutrient-memory-note">몸의 특징은 담당 영양소의 역할을 떠올리는 단서예요. 세 영양소 모두 에너지원이며, 지방은 몸을 보호하는 역할도 해요. 캐릭터는 실제 효소의 모습이 아니에요.</p></div><div id="practice-board" hidden></div><div class="memory-footer"><p>작은창자 벽에서는 <strong>소화 효소</strong>라고 기억해요. 작은 괄호 이름은 참고용이에요. · 그림의 모양과 색은 학습용 표현이에요.</p><button class="memory-return" id="memory-return">몸속 여행 이어 보기 →</button></div>`;
function renderMemoryCards(){
 $('#enzyme-roster').innerHTML=Object.entries(ENZYMES).map(([id,e])=>{
  const name=state.nameMode==='visible'?e.name:state.nameMode==='hint'?e.hint:'이름을 떠올려요';
  const phrase=maskEnzymeNames(e.phrase,state.nameMode);
  return `<article class="enzyme-card" data-team="${e.team}" data-enzyme="${id}"><div class="enzyme-card-top"><span class="nutrient-tag">${e.target} 담당</span><span class="place-tag">${e.places}</span></div><div class="enzyme-card-portrait"><img src="./assets/${e.asset}" width="1254" height="1254" alt="${e.look} 모습의 ${e.target} 담당 효소 캐릭터"></div><p class="character-look">${e.look}</p><h2 class="enzyme-card-name" data-name-state="${state.nameMode}">${name}</h2><div class="enzyme-card-change"><span class="enzyme-change-label">무엇을 → 무엇으로?</span><p><span>${escapeHTML(e.substrate)}</span><i aria-hidden="true">→</i><strong>${escapeHTML(e.result)}</strong></p><small>${escapeHTML(e.after)}</small></div><p class="enzyme-card-phrase">“${phrase}”</p><p class="enzyme-card-source">${e.source}</p><button class="visit-enzyme" data-visit-enzyme="${id}" aria-label="${e.stage===0?'입':e.places}의 ${e.target} 소화 장면 보기">이 장면 보기 <span aria-hidden="true">→</span></button></article>`;
 }).join('');
 $('#association-board').innerHTML=renderAssociations(state.nameMode);
 renderPracticeBoard();
 $('#memory-status').textContent=state.nameMode==='hidden'?'이름을 가렸어요. 장소·대상·결과를 보고 말해 보세요.':state.nameMode==='hint'?'첫 글자 힌트! 나머지 이름을 이어서 말해 보세요.':'장소 → 효소 → 대상 → 결과, 끝까지 연결해 보세요.';
 setMemoryMode(state.memoryMode);
}
function renderPracticeBoard(){
 $('#practice-board').innerHTML=renderPractice(practice,state.nameMode);
}
function setMemoryMode(mode){
 if(!['connections','characters','practice'].includes(mode))return;
 state.memoryMode=mode;
 $('#association-board').hidden=mode!=='connections';
 $('#character-gallery').hidden=mode!=='characters';
 $('#practice-board').hidden=mode!=='practice';
 $$('[data-memory-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.memoryMode===mode)));
 $('#memory-status').textContent=mode==='practice'?'효소를 고른 뒤, 무엇으로 분해되는지도 설명해요.':state.nameMode==='visible'?'장소 → 효소 → 대상 → 결과, 끝까지 연결해 보세요.':state.nameMode==='hint'?'첫 글자 힌트! 나머지 이름을 이어서 말해 보세요.':'이름을 가렸어요. 장소와 역할을 보고 떠올려요.';
}
function renderSpotlight(){
 const ctx=getEnzymeContext(state.stage,state.beat);
 const card=$('#enzyme-spotlight');
 card.dataset.context=ctx.id||'observation';
 const named=Boolean(ctx.id);
 const pancreatic=state.stage===3 && state.beat===0;
 $('#spotlight-main').hidden=!named;
 $('#spotlight-observation').hidden=named||pancreatic;
 $('#spotlight-pancreas').hidden=!pancreatic;
 $('.spotlight-controls').hidden=!(named||pancreatic);
 if(pancreatic){
  card.dataset.team='pancreas';
  $('#spotlight-name').textContent='';
  $('#spotlight-pancreas').innerHTML=renderPancreaticSource(state.nameMode);
 }else{
  $('#spotlight-pancreas').innerHTML='';
 }
 if(named){
  const e=ENZYMES[ctx.id];
  card.dataset.team=e.team;
  $('#spotlight-image').src='./assets/'+e.asset;
  $('#spotlight-image').alt=e.look+' 모습의 '+e.target+' 담당 효소 캐릭터';
  const source=ctx.place==='입'?'침':ctx.place==='위'?'위액':'이자액';
  $('#spotlight-kicker').textContent=source==='이자액'?'이자에서 만든 이자액 → 작은창자에서 작용':ctx.label+' · '+source+'에 들어 있어요';
  $('#spotlight-place').textContent=ctx.place;
  $('#spotlight-target').textContent=e.target;
  $('#spotlight-result').textContent=e.result;
  $('#spotlight-name').textContent=state.nameMode==='visible'?e.name:state.nameMode==='hint'?e.hint:'어떤 효소?';
  $('#spotlight-role').textContent=ctx.role;
 }else if(!pancreatic){
  card.dataset.team='observation';
  $('#spotlight-name').textContent='';
  const asset=state.stage===4?'intestine-organ-v3.png':(state.stage===1?'food-bolus':state.stage===3?(state.beat===0?'pancreas':'bile-drop'):state.beat<2?'water-drop':'residue')+'-v5.png';
  $('#observation-image').src='./assets/'+asset;
  $('#observation-kicker').textContent=ctx.label;
  $('#observation-name').innerHTML=escapeHTML(ctx.title)+(ctx.reference?' <small class="enzyme-detail">'+escapeHTML(ctx.reference)+'</small>':'');
  $('#observation-role').textContent=ctx.role;
  $('#observation-role').hidden=Boolean(ctx.result);
  $('#observation-result').hidden=!ctx.result;
  $('#observation-result').innerHTML=ctx.result?'<span>'+escapeHTML(ctx.substrate)+'</span><i aria-hidden="true">→</i><strong>'+escapeHTML(ctx.result)+'</strong>':'';
 }
 card.dataset.nameState=state.nameMode;
}
function currentFocusPrompt(){
 if(state.stage===3)return ['소화액은 어디에서 만들어져 작은창자로 들어오나요?','작아진 것은 지방 방울의 크기일까요, 지방 분자일까요?','입에서 만난 녹말 담당 효소와 같은 종류인지 떠올려 보세요.','위에서 시작한 단백질 소화를 어떤 효소가 이어 가나요?','쓸개즙은 지방 방울을 흩어 놓고, 이 효소는 무엇을 바꾸나요?','녹말 · 단백질 · 지방에 작용한 효소를 하나씩 떠올려 보세요.'][state.beat];
 return STAGES[state.stage].focus;
}
function refreshNameView(){
 const beat=currentBeat();
 $('#caption-title').textContent=maskEnzymeNames(beat.title,state.nameMode);
 $('#caption-text').innerHTML=enzymeText(beat.text);
 $('#focus-prompt').textContent=maskEnzymeNames(currentFocusPrompt(),state.nameMode);
 renderSpotlight();renderMemoryCards();
 maskStaticNames($('#summary-view'));
 maskStaticNames($('#dialog-content'));
 scene?.setNameMode(state.nameMode);
 $$('[data-recall]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.recall===state.nameMode)));
 $('#tour-view').dataset.names=state.nameMode;
}
function setNameMode(mode){
 if(!['hidden','hint','visible'].includes(mode))return;
 stopAnimation(true);
 state.nameMode=mode;
 refreshNameView();
}
document.addEventListener('click',event=>{
 const absorptionLink=event.target.closest('button[data-open-absorption]');
 if(absorptionLink){absorptionLesson.show(Number(absorptionLink.dataset.openAbsorption));setMode('absorption');}
 const recall=event.target.closest('button[data-recall]');
 if(recall)setNameMode(recall.dataset.recall);
 const visit=event.target.closest('button[data-visit-enzyme]');
 if(visit){const e=ENZYMES[visit.dataset.visitEnzyme];setMode('tour');goTo(e.stage,e.beat);$('#enzyme-spotlight').scrollIntoView({block:'nearest'});}
 const association=event.target.closest('button[data-visit-association]');
 if(association){const item=ASSOCIATIONS.find(item=>item.id===association.dataset.visitAssociation);if(item){setMode('tour');goTo(item.stage,item.beat);$('#enzyme-spotlight').scrollIntoView({block:'nearest'});}}
 const memorySwitch=event.target.closest('button[data-memory-mode]');
 if(memorySwitch)setMemoryMode(memorySwitch.dataset.memoryMode);
 const choice=event.target.closest('button[data-practice-choice]');
 if(choice){
  const key=choice.dataset.practiceChoice;
  chooseEnzyme(practice,key);renderPracticeBoard();
  const target=practice.solved?'[data-practice-action="next"]':`[data-practice-choice="${key}"]`;
  $('#practice-board').querySelector(target)?.focus({preventScroll:true});
 }
 const action=event.target.closest('button[data-practice-action]');
 if(action){
  if(action.dataset.practiceAction==='connections')setMemoryMode('connections');
  else{
   if(action.dataset.practiceAction==='restart')practice=createPractice();
   else if(action.dataset.practiceAction==='next')nextMission(practice);
   renderPracticeBoard();$('#dispatch-title')?.focus({preventScroll:true});
  }
 }
});
$('#memory-return').addEventListener('click',()=>setMode('tour'));

$('#journey').innerHTML = STAGES.map((s,i)=>`<button class="stage-button" data-stage="${i}" aria-label="${i+1}단계 ${s.name}, ${s.action}"><span class="stage-number">${pad(i+1)}</span><span><span class="stage-name">${s.short}</span><span class="stage-action">${s.action}</span></span></button>`).join('');
$$('#journey [data-stage]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.stage))));

function updateJourney(){
 $$('#journey [data-stage]').forEach(button=>{
  const i=Number(button.dataset.stage);
  button.classList.toggle('active',i===state.stage);
  button.classList.toggle('completed',state.completed.has(i));
  if(i===state.stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
 });
}
function refreshControls(){
 const stage=STAGES[state.stage];
 const next=stage.beats[state.beat+1];
 const last=state.stage===STAGES.length-1 && state.beat===stage.beats.length-1;
 $('#step-count').textContent=`${stage.short} · ${state.beat+1} / ${stage.beats.length}단계`;
 $('#step-status-text').textContent=state.animating?'이 변화만 보여 준 뒤 멈춰요.':'멈춤 · 다음 단계를 누르면 진행해요.';
 $('#status-dot').classList.toggle('moving',state.animating);
 $('#prev-step').disabled=state.stage===0 && state.beat===0;
 $('#next-step strong').textContent=last?'한눈에 정리':'다음 단계';
 $('#next-step-label').textContent=next?next.label:last?'배운 내용 연결하기':`${STAGES[state.stage+1].short} · ${STAGES[state.stage+1].beats[0].label}`;
 $('#replay-step').innerHTML=state.animating?'<span aria-hidden="true">Ⅱ</span> 이 변화 멈추기':'<span aria-hidden="true">↻</span> 이 단계 다시 보기';
 $('#replay-step').setAttribute('aria-label',state.animating?'현재 변화의 결과에서 멈추기':'현재 단계의 변화만 다시 보기');
 $('#tour-view').dataset.animating=String(state.animating);
 $('#tour-view').dataset.stage=String(state.stage);
 $('#tour-view').dataset.beat=String(state.beat);
}
function stopAnimation(finish=false){
 if(raf!==null)cancelAnimationFrame(raf);
 raf=null;animation=null;state.animating=false;
 if(finish && scene){state.time=currentBeat().hold;paint();}
 refreshControls();
}
function animateStep(from){
 stopAnimation();
 const target=currentBeat().hold;
 if(reducedMotion || target<=from){state.time=target;paint();return;}
 state.time=from;state.animating=true;
 animation={from,to:target,start:null,duration:Math.min(3000,Math.max(1600,(target-from)*360))};
 refreshControls();paint();
 raf=requestAnimationFrame(tick);
}
function tick(now){
 if(!state.animating || !animation)return;
 if(animation.start===null)animation.start=now;
 const p=Math.min(1,(now-animation.start)/animation.duration);
 state.time=animation.from+(animation.to-animation.from)*p;
 paint();
 if(p>=1){stopAnimation();return;}
 raf=requestAnimationFrame(tick);
}
function selectBeat(index,animate=false){
 const stage=STAGES[state.stage];
 const before=state.time;
 const oldBeat=state.beat;
 stopAnimation();
 state.beat=Math.max(0,Math.min(stage.beats.length-1,index));
 if(state.nameMode==='hint' && oldBeat!==state.beat)state.nameMode='hidden';
 const beat=currentBeat();
 $('#caption-step').textContent=pad(state.beat+1);
 refreshNameView();
 $$('#chapters [data-beat]').forEach(button=>{
  const active=Number(button.dataset.beat)===state.beat;
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 });
 if(state.beat===stage.beats.length-1){state.completed.add(state.stage);updateJourney();}
 state.time=beat.hold;
 refreshControls();paint();
 if(animate){const from=state.beat===oldBeat+1?before:(state.beat>0?stage.beats[state.beat-1].hold:beat.at);animateStep(from);}
}
function goTo(index,beatIndex=0){
 stopAnimation();
 if(state.nameMode==='hint')state.nameMode='hidden';
 state.stage=Math.max(0,Math.min(STAGES.length-1,index));state.beat=0;state.locationKey='';
 const stage=STAGES[state.stage];
 scene?.destroy();scene=mountScene($('#organ-scene'),state.stage);
 // Keep the full-size reaction model beside the large generated organ illustration.
 $('#organ-scene svg').setAttribute('viewBox','0 54 800 332');
 $$('#organ-scene svg > text, #organ-scene svg > rect[y="10"], #organ-scene svg > rect[y="390"]').forEach(node=>node.setAttribute('visibility','hidden'));
 $('#scene-title').textContent=stage.scene;
 $('#secretion-label').textContent=stage.secretion;
 $('#focus-prompt').textContent=maskEnzymeNames(stage.focus,state.nameMode);
 $('#route-stage').textContent=`${pad(state.stage+1)} / 06`;
 $('#chapters').innerHTML=stage.beats.map((b,i)=>`<button class="chapter-button" data-beat="${i}"><span class="chapter-number">${pad(i+1)}</span>${b.label}</button>`).join('');
 $$('#chapters [data-beat]').forEach(button=>button.addEventListener('click',()=>selectBeat(Number(button.dataset.beat))));
 updateJourney();refreshCameraButtons();selectBeat(beatIndex);
}
function nextStep(){
 if(state.animating)stopAnimation(true);
 if(state.beat<STAGES[state.stage].beats.length-1){selectBeat(state.beat+1,true);return;}
 if(state.stage<STAGES.length-1){goTo(state.stage+1);animateStep(currentBeat().at);return;}
 setMode('summary');
}
function previousStep(){
 if(state.beat>0){selectBeat(state.beat-1);return;}
 if(state.stage>0){const previous=state.stage-1;goTo(previous,STAGES[previous].beats.length-1);}
}
function replayStep(){
 if(state.animating){stopAnimation(true);return;}
 const beat=currentBeat();
 const from=state.beat>0?STAGES[state.stage].beats[state.beat-1].hold:beat.at;
 animateStep(from);
}
function renderLocation(){
 const absorptionLink=$('#open-absorption-tour');
 absorptionLink.hidden=state.stage<4;
 absorptionLink.dataset.openAbsorption=state.stage===5?'3':'0';
 absorptionLink.textContent=state.stage===5?'큰창자와 배출 자세히 →':'융털과 흡수 경로 자세히 →';
 let key=STAGES[state.stage].id;
 let content=`음식은 지금 <strong>${STAGES[state.stage].location}</strong>에 있어요.`;
 let pin='음식은 여기!';
 if(state.stage===1 && state.time>=14){key='stomach';content='음식이 <strong>위</strong>에 도착했어요.';}
 if(state.stage===4){content='<strong>작은창자 벽</strong>에서 영양소를 흡수해요.';pin='이 벽에서 흡수!';}
 if(state.stage===5 && state.time>=17){content='찌꺼기가 <strong>몸 밖</strong>으로 나가요.';pin='항문으로 배출';}
 const cacheKey=key+'-'+pin;
 if(cacheKey!==state.locationKey){
  $('#location-title').innerHTML=content;
  const art=ORGAN_ART[key];
  $('#organ-image').src='./assets/'+art.src;$('#organ-image').alt=art.alt;
  $('#organ-art-label').textContent=art.label+' · 확대 모습';
  $('#food-pin').style.left=art.x+'%';$('#food-pin').style.top=art.y+'%';
  $('#pin-label').textContent=pin;
  $('#organ-art').dataset.organ=key;
  state.locationKey=cacheKey;
 }
 if(state.stage===5){const points=[[22,46],[51,22],[70,70],[51,91]];const [x,y]=points[state.beat];$('#food-pin').style.left=x+'%';$('#food-pin').style.top=y+'%';}
}
function paint(){
 const stage=STAGES[state.stage];
 state.time=Math.max(0,Math.min(stage.duration,state.time));
 route.update(state.stage,state.time,'full');
 scene.update(state.time);
 renderLocation();
}
function refreshCameraButtons(){
 $$('[data-camera]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.camera===state.camera)));
 $('#body-route').hidden=state.camera!=='full';
 $('#organ-art').hidden=state.camera==='full';
}
$$('[data-camera]').forEach(button=>button.addEventListener('click',()=>{state.camera=button.dataset.camera;refreshCameraButtons();paint();}));
$('#prev-step').addEventListener('click',previousStep);
$('#next-step').addEventListener('click',nextStep);
$('#replay-step').addEventListener('click',replayStep);
const sourceLinks=()=>SOURCES.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a></li>`).join('');
const SUMMARY_TEAMS=[{id:'starch',label:'녹말'},{id:'protein',label:'단백질'},{id:'fat',label:'지방'}];
$('#summary-view').innerHTML=`<div class="summary-top"><div><p class="eyebrow" id="summary-eyebrow">한 영양소씩 · 소화부터 흡수까지</p><h1 id="summary-title">영양소별로 크게 살펴봐요.</h1></div><div class="summary-recall"><span>이름을 가리고 설명해 보세요.</span>${recallButtons()}</div></div>
 <div class="summary-navigation"><div class="summary-nutrient-tabs" role="group" aria-label="크게 볼 영양소 선택">${SUMMARY_TEAMS.map((team,i)=>`<button type="button" data-summary-team="${team.id}" aria-pressed="${i===0}" aria-controls="summary-path-${team.id}"><span>${pad(i+1)}</span>${team.label}</button>`).join('')}</div><div class="summary-view-actions"><div class="summary-pagination" id="summary-pagination" role="group" aria-label="영양소별 정리 넘기기"><button type="button" id="summary-prev" aria-label="이전 영양소" disabled>← 이전</button><span id="summary-page-status" role="status" aria-live="polite">1 / 3</span><button type="button" id="summary-next" aria-label="다음 영양소">다음 →</button></div><button type="button" id="summary-compare" aria-pressed="false">전체 비교</button></div></div>
 <div class="summary-definitions"><p><strong>소화</strong><span>큰 영양소 → 흡수할 수 있는 작은 물질</span></p><p><strong>흡수</strong><span>소화관 벽을 통과 → 혈액이나 림프로</span></p></div>
 ${renderSummaryCards({layout:state.summaryLayout,activeTeam:state.summaryTeam})}
 <details class="summary-details"><summary>전체 과정 자세히 보기 · 식도·큰창자와 소화액까지</summary><div class="summary-table-wrap"><table class="summary-table"><thead><tr><th scope="col">어디서</th><th scope="col">무엇이</th><th scope="col">작용 대상</th><th scope="col">어떤 변화가</th><th scope="col">함께 기억해요</th></tr></thead><tbody>${SUMMARY.map(row=>`<tr>${row.map(cell=>`<td>${enzymeText(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
 <div class="summary-bottom"><div class="summary-foot"><p>작은창자 벽은 작은창자의 일부예요. 지방은 긴 사슬 지방의 대표 경로예요.<br>모양·색·수·크기는 학습용이며, 실제 소화는 여러 작용이 함께 일어나요.</p><div class="summary-foot-actions"><button type="button" class="absorption-link" data-open-absorption="1">융털 속 흡수 경로 보기 →</button><button id="return-tour">다시 관찰하기 →</button></div></div><details class="source-list"><summary>내용 출처</summary><ul>${sourceLinks()}</ul></details></div>`;
$('#return-tour').addEventListener('click',()=>setMode('tour'));
function applySummaryView(){
 const single=state.summaryLayout==='single';
 const index=SUMMARY_TEAMS.findIndex(team=>team.id===state.summaryTeam);
 $('#summary-view').dataset.summaryLayout=state.summaryLayout;
 $('#summary-view .summary-processes').dataset.summaryLayout=state.summaryLayout;
 $$('#summary-view .summary-card').forEach(card=>{card.hidden=single&&card.dataset.team!==state.summaryTeam;});
 $$('[data-summary-team]').forEach(button=>button.setAttribute('aria-pressed',String(single&&button.dataset.summaryTeam===state.summaryTeam)));
 $('#summary-title').textContent=single?'영양소별로 크게 살펴봐요.':'세 영양소를 함께 비교해요.';
 $('#summary-eyebrow').textContent=single?'한 영양소씩 · 소화부터 흡수까지':'전체 비교 · 같은 순서로 나란히';
 $('#summary-pagination').hidden=!single;
 $('#summary-page-status').textContent=`${index+1} / ${SUMMARY_TEAMS.length}`;
 $('#summary-page-status').setAttribute('aria-label',`${SUMMARY_TEAMS.length}개 중 ${index+1}번째, ${SUMMARY_TEAMS[index].label}`);
 $('#summary-prev').disabled=index===0;
 $('#summary-next').disabled=index===SUMMARY_TEAMS.length-1;
 $('#summary-prev').setAttribute('aria-label',index>0?`이전 영양소: ${SUMMARY_TEAMS[index-1].label}`:'첫 번째 영양소');
 $('#summary-next').setAttribute('aria-label',index<SUMMARY_TEAMS.length-1?`다음 영양소: ${SUMMARY_TEAMS[index+1].label}`:'마지막 영양소');
 $('#summary-compare').textContent=single?'전체 비교':'하나씩 보기';
 $('#summary-compare').setAttribute('aria-pressed',String(!single));
}
function selectSummaryTeam(team){
 if(!SUMMARY_TEAMS.some(item=>item.id===team))return;
 const changed=state.summaryTeam!==team;
 state.summaryTeam=team;state.summaryLayout='single';
 applySummaryView();
 if(changed&&state.nameMode==='hint'){state.nameMode='hidden';refreshNameView();}
}
function moveSummary(direction){
 const index=SUMMARY_TEAMS.findIndex(team=>team.id===state.summaryTeam);
 const target=SUMMARY_TEAMS[index+direction];
 if(target)selectSummaryTeam(target.id);
}
$$('[data-summary-team]').forEach(button=>button.addEventListener('click',()=>selectSummaryTeam(button.dataset.summaryTeam)));
$('#summary-prev').addEventListener('click',()=>moveSummary(-1));
$('#summary-next').addEventListener('click',()=>moveSummary(1));
$('#summary-compare').addEventListener('click',()=>{state.summaryLayout=state.summaryLayout==='single'?'all':'single';applySummaryView();});
applySummaryView();
function setMode(mode){
 stopAnimation(true);state.mode=mode;
 $('#tour-view').hidden=mode!=='tour';$('#absorption-view').hidden=mode!=='absorption';$('#memory-view').hidden=mode!=='memory';$('#summary-view').hidden=mode!=='summary';
 $$('.mode-tabs [data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 refreshNameView();
 if(mode==='tour')paint();
}
const absorptionLesson=mountAbsorption($('#absorption-view'),{onTour:stage=>{setMode('tour');goTo(stage);},onSummary:()=>setMode('summary')});
$$('.mode-tabs [data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
$('#dialog-content').innerHTML=`<h2 id="dialog-title">선생님 속도로, 한 단계씩.</h2><p>처음에는 멈춘 화면으로 시작해요. 선생님이 누를 때마다 한 가지 변화만 보여 주고 다시 멈춥니다.</p>
 <ol><li><strong>현재 위치 확대</strong>에서 크게 보이는 기관 그림과 위치 표식을 확인해요. <strong>전체 경로</strong>를 누르면 음식이 지나는 소화관 전체를 볼 수 있어요.</li><li><strong>오른쪽 관찰 장면</strong>에서 소화액, 작용하는 효소, 변화한 영양소를 살펴봐요.</li><li><strong>다음 단계</strong>를 눌러 한 단계씩 진행해요. 예를 들어 입은 ‘한 입 출발 → 꼭꼭 씹기 → 침 분비 → 녹말 분해 → 변화 확인’으로 나누어 보여 줍니다.</li><li><strong>이전 단계</strong>와 아래의 단계 이름으로 원하는 정지 화면을 선택해요. <strong>이 단계 다시 보기</strong>는 현재 변화만 짧게 반복한 뒤 멈춥니다.</li></ol>
 <h3>장소 · 효소 · 영양소를 한 문장으로</h3><p><strong>연결해서 기억 → 장소별 연결</strong>에서 기관 그림, 효소 캐릭터, 분해 대상과 결과를 왼쪽부터 읽어 보세요. 예를 들면 ‘입에서 아밀레이스가 녹말 일부를 엿당 등으로 분해해요.’라고 말할 수 있어요. 입과 작은창자에는 같은 종류의 녹말 담당 효소가 등장하며, 작은창자에서는 이자액에 들어온 효소가 작용해요. ‘무엇으로?’는 그 단계에서 생기는 물질이에요. 포도당·아미노산으로 이어지는 작은창자 벽의 최종 소화도 따로 살펴보세요. 각 줄의 <strong>장면 보기</strong>로 그 장소의 분해 장면을 확인할 수 있어요.</p>
 <h3>소화 다음에는 흡수와 이동</h3><p><strong>흡수와 이동</strong>에서는 주름·융털의 구조 → 두 가지 흡수 길 → 온몸의 세포로 이동 → 큰창자와 배출을 한 장면씩 보여 줘요. 매끈한 벽과 주름·융털 있는 벽을 비교하여 표면적을 설명하고, 물질 버튼을 눌러 모세 혈관과 암죽관 중 어느 길로 이동하는지 살펴봐요. 포도당과 아미노산은 작은창자 안 → 융털 겉면 통과 → 모세 혈관으로 흡수 → 혈액 이동의 네 단계를 직접 넘겨 봐요. 각 단계는 입자 모형이 한 번 이동한 뒤 멈추며, ‘이 단계 다시 보기’로 반복할 수 있어요. 그림의 ‘크게 보기’는 이미지를 화면 가득 확대해요. 융털 그림의 괄호 표시는 돌기 하나 전체를 가리켜요. 물·무기염류는 소화할 필요 없이 흡수돼요. 암죽관으로 간 지방도 림프관을 거쳐 혈액에 합류하며, 영양소는 심장을 거쳐 온몸의 세포로 운반돼요. 큰창자의 미생물 작용은 사람의 소화 효소에 의한 소화와 구별해요.</p>
 <h3>한 영양소씩 크게 정리해요</h3><p><strong>한눈에 정리</strong>에서는 녹말·단백질·지방 중 하나를 골라 소화와 흡수를 크게 봐요. 위쪽 영양소 버튼이나 <strong>이전·다음</strong>으로 넘길 수 있어요. <strong>전체 비교</strong>는 세 영양소를 나란히 보여 주고, <strong>하나씩 보기</strong>는 마지막으로 본 영양소로 돌아와요. 각 장에서 장소·효소·분해 전후·흡수 경로를 순서대로 읽어 보세요. 아래의 <strong>융털 속 흡수 경로 보기</strong>로 흡수 장면을 이어 볼 수 있어요.</p>
 <h3>이자에서 작은창자로</h3><p>작은창자의 첫 관찰 단계에서 이자 → 이자액 속 아밀레이스·트립신·라이페이스 → 작은창자를 그림으로 연결해요. 관을 따라 세 효소 캐릭터가 들어온 뒤 장면이 멈춰요. 효소는 이자에서 만들어지고 작은창자에서 작용한다는 점을 구별해 설명해 주세요. 입의 아밀레이스는 침에 들어 있어요.</p><h3>이름을 기억하는 세 번의 클릭</h3><p><strong>이름 가리기 → 첫 글자 힌트 → 정답 보기</strong>로 진행해요. 위치와 분해 대상은 계속 보여 주고, 이름은 그림·설명·정리 화면에서 함께 가려요. 힌트를 본 뒤 다른 단계나 영양소로 이동하면 다시 이름이 가려져요.</p><p><strong>캐릭터 모아 보기</strong>에서는 달리기 토끼·근육 곰 두 마리·통통 햄스터를 비교해요. 토끼는 탄수화물 중 녹말 담당, 두 곰은 단백질 담당, 햄스터는 지방 담당이에요. 근육 곰은 빨간 머리띠(위)와 초록 머리띠(작은창자)로 구분해요. 같은 동물이지만 서로 다른 효소예요. 이름을 가린 뒤에는 학생이 먼저 말하고 선생님이 정답을 열어 주세요.</p>
 <h3>직접 연결해서 설명해요</h3><p><strong>직접 연결하기</strong>에서 장소와 영양소를 보고 효소 캐릭터를 골라요. 틀리면 담당 영양소가 다른지, 작용 장소가 다른지 단서를 줍니다. 다섯 연결에는 입과 작은창자의 녹말 담당이 각각 등장해요. 이름을 가려도 그림으로 고를 수 있고, 정답을 열면 효소 이름까지 한 문장으로 말할 수 있어요.</p><p>캐릭터는 담당 영양소의 역할을 빌린 기억 단서예요. 근육 그림은 단백질의 몸 구성 역할을 떠올리는 단서이며, 세 영양소 모두 에너지원이에요. 지방은 에너지 저장과 몸의 보호 등에 쓰여요.</p><h3>용어는 필요한 만큼만</h3><p>작은창자 벽에서는 ‘소화 효소’를 주요 이름으로 사용해요. 개별 이름은 <small class="enzyme-detail">(말테이스)</small> <small class="enzyme-detail">(펩티데이스)</small>처럼 작게 표시했어요.</p>
 <h3>이렇게 질문해 보세요</h3><ul><li>씹어서 작아진 음식과 효소로 분해된 영양소는 어떻게 다른가요?</li><li>아밀레이스는 어떤 사슬에만 작용하나요?</li><li>쓸개즙의 유화와 라이페이스의 분해는 무엇이 달라지나요?</li><li>소화와 흡수는 각각 어느 순간에 보이나요?</li></ul>
 <h3>모형을 읽는 방법</h3><p>기관의 모습은 크게 알아보기 위한 삽화예요. 위치 표식은 현재 음식 내용물이나 관찰할 벽의 위치를 가리켜요. 영양소·효소·분비관·흡수 경로는 별도의 학습 모형이며, 모양·색·수·크기와 기관의 비율은 실제와 달라요.</p><p>실제로는 여러 작용이 겹쳐 일어나요. 여기서는 관찰하기 쉽게 순서대로 나누어 보여 줍니다. 지방 흡수는 긴 사슬 지방이 작은창자 벽 세포에서 재합성되어 주로 암죽관으로 들어가는 대표 경로를 단순화했어요.</p>
 <h3>키보드</h3><p><span class="key">Tab</span>으로 버튼을 이동하고 <span class="key">Enter</span>로 선택할 수 있어요. 빈 화면에서 <span class="key">←</span> <span class="key">→</span>는 이전·다음 단계, <span class="key">Space</span>는 현재 변화 다시 보기·멈추기입니다.</p>
 <h3>내용 출처</h3><ul class="source-list">${sourceLinks()}</ul>`;
$('#guide-btn').addEventListener('click',()=>{stopAnimation(true);$('#info-dialog').showModal();});
$('#close-dialog').addEventListener('click',()=>$('#info-dialog').close());
$('#info-dialog').addEventListener('click',event=>{if(event.target===$('#info-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3500);}
$('#fullscreen-btn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('이 환경에서는 브라우저의 전체 화면 기능을 사용해 주세요.');}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen-btn').setAttribute('aria-label',document.fullscreenElement?'전체 화면 종료':'전체 화면'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAnimation(true);});
document.addEventListener('keydown',event=>{
 if($('#info-dialog').open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('button,input,select,a,textarea,summary,[contenteditable="true"]'))return;
 if(state.mode==='summary'&&state.summaryLayout==='single'){
  if(event.key==='ArrowRight'){event.preventDefault();moveSummary(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();moveSummary(-1);}
  return;
 }
 if(state.mode==='absorption'){
  if(event.code==='Space'){event.preventDefault();absorptionLesson.replay();}
  if(event.key==='ArrowRight'){event.preventDefault();absorptionLesson.move(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();absorptionLesson.move(-1);}
  return;
 }
 if(state.mode!=='tour')return;
 if(event.code==='Space'){event.preventDefault();replayStep();}
 if(event.key==='ArrowRight'){event.preventDefault();nextStep();}
 if(event.key==='ArrowLeft'){event.preventDefault();previousStep();}
});
goTo(0);
