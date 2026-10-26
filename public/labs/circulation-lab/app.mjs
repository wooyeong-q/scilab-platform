import {PARTS,BY_ID,CYCLE,ROUTES,nextPart,neighbors,generateMaze,fillPath,solveMaze,encodeMaze,decodeMaze,validateBoard,checkStep} from './model.mjs';
import {heartDiagram,vesselDiagram,flowDiagram} from './diagrams.mjs';

const $=s=>document.querySelector(s), app=$('#app');
const DEFAULT_MESSAGE='시작 칸에서 순환 순서에 맞는 이웃 칸을 눌러 보세요.';
let tab='observe', observe='heart',selectedPart='rv',selectedVessel='artery',selectedBlood='red',quickMessage='';
let journey={route:'all',step:0,quiz:false,answered:false,feedback:'',exchange:false};
let initial=generateMaze(),maze={board:initial.board,path:[0],hint:-1,reveal:false,message:DEFAULT_MESSAGE,kind:'ready',shared:false};
let maker={board:structuredClone(initial.board),path:[...initial.path],phase:'words',start:'rv',term:'pa',checked:false,showPath:true,message:'정답 경로는 준비했어요. 남은 칸의 단어를 바꾸어 나만의 미로를 만들어 보세요.',kind:'ready'};
try{const saved=JSON.parse(localStorage.getItem('scilab-circulation-maker-v1'));if(saved&&validateBoard(saved.board)&&Array.isArray(saved.path)){fillPath(saved.path,saved.board.start);if(saved.path.every((p,i)=>saved.board.cells[p]===CYCLE[(CYCLE.indexOf(saved.board.start)+i)%10]))maker={...maker,board:saved.board,path:saved.path,start:saved.board.start,message:'지난번 만들던 미로를 불러왔어요. 검사 후 공유할 수 있어요.'};}}catch{/* Storage may be disabled. */}
try{if(location.hash.startsWith('#maze=')){const b=decodeMaze(location.hash.slice(6));maze={...maze,board:b,shared:true,message:'짝이 만든 미로예요. 시작에서 끝까지 혈액의 길을 찾아보세요.'};tab='maze';}}catch(e){setTimeout(()=>toast(e.message),0);}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),4200);}
function persist(){try{if(maker.phase==='words')localStorage.setItem('scilab-circulation-maker-v1',JSON.stringify({board:maker.board,path:maker.path}));}catch{/* Continue without persistence. */}}
const button=(label,action,kind='secondary',extra='')=>`<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;
const status=(msg,kind='ready')=>`<div class="feedback ${kind}" role="status">${msg}</div>`;
const pill=(label,attr,selected)=>`<button class="pill ${selected?'selected':''}" ${attr} aria-pressed="${selected}">${label}</button>`;
function cardHead(kicker,title,right=''){return `<div class="card-heading"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${right}</div>`;}
const COLOR_NOTE='<span class="legend-dot blue"></span> 산소가 적은 혈액 <span class="legend-dot red"></span> 산소가 많은 혈액 <span class="color-caveat">모형의 색 · 실제 혈액은 모두 붉은색</span>';

const BLOOD={
  red:{name:'적혈구',role:'산소 운반',text:'붉은색의 오목한 원반 모양이에요. 헤모글로빈이 산소와 결합하여 온몸으로 산소를 운반합니다.',badge:'산소를 싣는 운반원',n:1},
  white:{name:'백혈구',role:'몸의 방어',text:'몸속에 들어온 세균 등 병원체를 없애는 역할을 합니다. 그림에서는 보라색 핵이 보이는 큰 세포예요.',badge:'몸을 지키는 방어대',n:2},
  platelet:{name:'혈소판',role:'혈액 응고',text:'혈관에 상처가 나면 혈액이 굳는 과정에 관여하여 피가 계속 흐르지 않도록 돕습니다.',badge:'상처를 막는 수리공',n:3},
  plasma:{name:'혈장',role:'물질 운반',text:'혈액의 액체 성분이에요. 대부분 물로 이루어져 있으며 영양소, 노폐물 등 여러 물질을 운반합니다.',badge:'물질이 이동하는 액체',n:4},
};
const VESSELS={
  artery:{name:'동맥',role:'심장 → 몸의 각 부분',text:'심장에서 나가는 혈액이 흐르는 혈관입니다. 벽이 두껍고 탄력이 있어 심장에서 나오는 높은 혈압을 견딥니다.',tip:'폐동맥에도 산소가 적은 혈액이 흘러요. 동맥의 기준은 심장에서 나가는 방향입니다.'},
  capillary:{name:'모세혈관',role:'혈액 ↔ 주변 세포',text:'동맥과 정맥을 이어 주는 매우 가는 혈관입니다. 벽이 매우 얇아 혈액과 주변 세포 사이에서 물질이 교환됩니다.',tip:'폐의 모세혈관에서는 산소를 받고, 온몸의 모세혈관에서는 세포에 산소를 줍니다.'},
  vein:{name:'정맥',role:'몸의 각 부분 → 심장',text:'심장으로 들어오는 혈액이 흐르는 혈관입니다. 동맥보다 벽이 얇고 혈압이 낮습니다.',tip:'팔·다리 등의 정맥에는 판막이 있어 혈액이 거꾸로 흐르는 것을 막아 줍니다.'},
};
function observeView(){
  const headings={heart:['HEART STRUCTURE','네 개의 방, 두 개의 펌프'],vessels:['BLOOD VESSELS','어디로 흐르는지 살펴봐요'],blood:['INSIDE THE BLOOD','혈액 속에는 무엇이 있을까요?']};
  let diagram='',side='';
  if(observe==='heart'){
    const p=BY_ID[selectedPart];diagram=heartDiagram(selectedPart);
    side=`<span class="number-tag">HEART / ${p.name}</span><h3>${p.name}</h3><p class="role-text">${p.role}</p><p class="explain">${p.text}</p><div class="insight"><span>기억의 연결</span><p>${p.why}</p></div><div class="mini-pairs"><div><small>혈액을 받는 방</small><strong>우심방 · 좌심방</strong></div><div><small>혈액을 내보내는 방</small><strong>우심실 · 좌심실</strong></div></div><p class="tiny-note">심장 속 판막은 혈액이 거꾸로 흐르는 것을 막아요.</p><div class="quick-check"><strong>온몸으로 내보내는 방은?</strong><div class="button-row">${button('우심실','quick-rv','choice')}${button('좌심실','quick-lv','choice')}</div></div>`;
  }else if(observe==='vessels'){
    const p=VESSELS[selectedVessel];diagram=vesselDiagram(selectedVessel);
    side=`<span class="number-tag">VESSELS / 혈관</span><h3>${p.name}</h3><p class="role-text">${p.role}</p><p class="explain">${p.text}</p><div class="insight"><span>이렇게 구분해요</span><p>${p.tip}</p></div><div class="quick-check"><strong>폐동맥이 동맥인 까닭은?</strong>${button('산소가 많아서','quick-oxygen','choice')}${button('심장에서 나가서','quick-away','choice')}</div>`;
  }else{
    const p=BLOOD[selectedBlood];
    diagram=`<div class="blood-art"><img src="./assets/blood-observation.webp" alt="혈장 속에 붉고 오목한 적혈구, 보라색 핵이 보이는 백혈구, 작은 혈소판이 떠 있는 관찰 그림" width="1536" height="1024"><button class="blood-pin red-pin ${selectedBlood==='red'?'selected':''}" data-blood="red" aria-label="1 적혈구">1</button><button class="blood-pin white-pin ${selectedBlood==='white'?'selected':''}" data-blood="white" aria-label="2 백혈구">2</button><button class="blood-pin platelet-pin ${selectedBlood==='platelet'?'selected':''}" data-blood="platelet" aria-label="3 혈소판">3</button><button class="blood-pin plasma-pin ${selectedBlood==='plasma'?'selected':''}" data-blood="plasma" aria-label="4 혈장">4</button></div><div class="blood-bank">${Object.entries(BLOOD).map(([id,b])=>pill(`${b.n} ${b.name}`,`data-blood="${id}"`,id===selectedBlood)).join('')}</div><p class="art-note">관찰을 돕기 위한 그림 · 성분의 크기와 개수는 실제 비율과 다릅니다.</p>`;
    side=`<span class="number-tag">BLOOD / 혈액</span><h3>${p.name}</h3><p class="role-text">${p.role}</p><p class="explain">${p.text}</p><div class="insight"><span>역할로 기억해요</span><p>${p.badge}</p></div><div class="quick-check"><strong>영양소·노폐물을 운반하는 액체 성분은?</strong><div class="button-row">${button('적혈구','quick-red','choice')}${button('혈장','quick-plasma','choice')}</div></div>`;
  }
  return `<section class="workspace"><article class="canvas-card">${cardHead(...headings[observe],'<span class="subtle-label">그림을 눌러 탐색해요 ↗</span>')}<div class="sub-tabs">${pill('심장의 네 방','data-observe="heart"',observe==='heart')}${pill('혈관 세 종류','data-observe="vessels"',observe==='vessels')}${pill('혈액의 구성','data-observe="blood"',observe==='blood')}</div><div class="observation-art ${observe}">${diagram}</div>${observe==='heart'?'<p class="art-note observation-note">네 방의 이름을 눌러 위치와 역할을 함께 살펴보세요.</p>':''}</article><aside class="info-card">${side}${quickMessage?status(quickMessage,quickMessage.startsWith('맞')?'success':'try'):''}<button class="next-link" data-tab="journey">혈액의 이동을 따라가 볼까요? <span>→</span></button></aside></section>`;
}
function journeyView(){
  const r=ROUTES[journey.route],ids=r.ids,id=ids[journey.step],p=BY_ID[id],done=journey.step===ids.length-1;
  const next=ids[journey.step+1];
  const options=next?PARTS.filter(x=>[next,...CYCLE.filter(x=>x!==id&&x!==next).filter((_,i)=>i%3===0).slice(0,2)].includes(x.id)):[];
  const exchange=id==='lung'||id==='body';
  const gas=exchange?`<div class="gas-box ${journey.exchange?'exchanged':''}"><strong>${id==='lung'?'폐의 모세혈관':'온몸의 모세혈관'}에서</strong><div><span>${id==='lung'?'폐':'세포'}</span><span class="gas-arrow">${journey.exchange?(id==='lung'?'산소 →':'← 산소'):'···'}</span><span>혈액</span></div><div><span>${id==='lung'?'폐':'세포'}</span><span class="gas-arrow">${journey.exchange?(id==='lung'?'← 이산화 탄소':'이산화 탄소 →'):'···'}</span><span>혈액</span></div>${journey.exchange?`<p>${id==='lung'?'혈액 속 산소가 많아져요.':'세포에 산소를 주어 혈액 속 산소가 적어져요.'}</p>`:button('기체 교환 확인하기','exchange','secondary')}</div>`:`<div class="oxygen-indicator ${p.color}"><span class="legend-dot ${p.color}"></span>산소가 ${p.color==='red'?'많은':'적은'} 혈액</div>`;
  return `<section class="workspace journey-workspace"><article class="canvas-card">${cardHead('FOLLOW THE BLOOD','혈액의 다음 목적지는?',`<span class="page-count">${journey.step+1}<small> / ${ids.length}</small></span>`)}<div class="journey-toolbar"><div class="sub-tabs">${Object.entries(ROUTES).map(([key,v])=>pill(v.name,`data-route="${key}"`,journey.route===key)).join('')}</div><button class="text-toggle" data-action="toggle-quiz" aria-pressed="${journey.quiz}">${journey.quiz?'✓ 다음 장소 맞히기':'한 단계씩 관찰'} <span>⇄</span></button></div><div class="flow-art">${flowDiagram(id,journey.route,ids.slice(0,journey.step+1))}</div><div class="route-trail" aria-label="지나온 순환 경로">${ids.map((v,i)=>`${i?'<span class="trail-arrow">→</span>':''}<span class="trail-word ${i===journey.step?'current':''} ${i>journey.step?'future':''}">${i<=journey.step||!journey.quiz?BY_ID[v].short:'?'}</span>`).join('')}</div><div class="color-legend">${COLOR_NOTE}</div></article><aside class="info-card journey-info"><span class="number-tag">${done?'도착!':'지금 혈액이 있는 곳'}</span><h3>${p.name}</h3><p class="role-text">${p.role}</p><p class="explain">${p.text}</p>${gas}${done?`<div class="insight"><span>${r.name} 정리</span><p>${journey.route==='all'?'다시 우심실에 도착했어요. 혈액은 폐와 온몸을 거치며 계속 순환합니다.':journey.route==='pulmonary'?'우심실에서 출발해 폐를 거쳐 좌심방으로 돌아왔어요.':'좌심실에서 출발해 온몸을 거쳐 우심방으로 돌아왔어요.'}</p></div>${button(journey.route==='all'?'미로에서 길 찾아보기 →':journey.route==='pulmonary'?'온몸순환 이어 보기 →':'전체 순환 이어 보기 →','journey-finish','primary')}`:journey.quiz?`<div class="destination"><strong>다음에는 어디로 이동할까요?</strong><div class="destination-options">${options.map(o=>`<button class="choice ${journey.answered&&o.id===next?'correct':''}" data-destination="${o.id}" ${journey.answered?'disabled':''}>${o.name}<span>→</span></button>`).join('')}</div>${journey.feedback?status(journey.feedback,journey.answered?'success':'try'):''}</div>`:`<div class="insight next-place"><span>다음 목적지</span><p>${BY_ID[next].name} <b>→</b></p></div>`}<div class="journey-buttons">${button('← 이전','journey-prev','secondary',journey.step===0?'disabled':'')}${button(done?'다시 출발':'다음 단계 →',done?'journey-reset':'journey-next','primary',!done&&journey.quiz&&!journey.answered?'disabled':'')}</div><p class="tiny-note">${journey.quiz?'정답을 고른 뒤 다음 단계로 이동해요.':'한 단계씩 멈추며 볼 수 있어요. 위의 ⇄ 버튼으로 맞히기 모드로 바꿔 보세요.'}</p></aside></section>`;
}
function grid(board,path,{editor=false,showPath=false,reveal=false,hint=-1,drawing=false}={}){
  const displayPath=reveal?solveMaze(board).path:path;
  const cellHtml=Array.from({length:36},(_,i)=>{
    const idx=displayPath.indexOf(i),selected=idx!==-1,term=board?.cells?.[i],last=path.at(-1)===i;
    const allowed=neighbors(path.at(-1)||0).includes(i)&&!path.includes(i);
    const name=drawing?(selected?BY_ID[CYCLE[(CYCLE.indexOf(maker.start)+idx)%10]].short:''):BY_ID[term]?.short||'';
    return `<button class="maze-cell ${selected&&(showPath||!editor||drawing)?'on-path':''} ${last&&(!editor||drawing)?'current-cell':''} ${hint===i?'hint-cell':''} ${drawing&&allowed?'available':''} ${editor&&maker.path.includes(i)&&!drawing?'locked':''}" data-cell="${i}" aria-label="${Math.floor(i/6)+1}행 ${i%6+1}열 ${name}${i===0?' 시작':i===35?' 끝':''}${selected?' 선택한 경로':''}" ${editor&&maker.path.includes(i)&&!drawing?'aria-disabled="true"':''}>${i===0?'<span class="cell-tag">시작 ↓</span>':i===35?'<span class="cell-tag finish-tag">끝</span>':''}<span class="cell-name">${name||'<span class="empty-dot">·</span>'}</span>${selected&&(showPath||!editor||drawing)?`<small class="step-number">${idx+1}</small>`:''}</button>`;
  }).join('');
  const lines=displayPath.slice(1).map((p,i)=>{const before=displayPath[i];return `${i===0?'M':'L'}${(before%6)*100+50},${Math.floor(before/6)*100+50} L${(p%6)*100+50},${Math.floor(p/6)*100+50}`;}).join(' ');
  return `<div class="maze-wrap ${editor?'editor':''}"><div class="maze-grid" role="group" aria-label="6행 6열 단어 미로">${cellHtml}</div>${lines&&(showPath||!editor||drawing)?`<svg class="maze-lines" viewBox="0 0 600 600" aria-hidden="true"><path d="${lines}"/></svg>`:''}</div>`;
}
function mazeView(){
  const p=maze.path,done=p.at(-1)===35,from=maze.board.cells[p.at(-1)];
  return `<section class="workspace maze-workspace"><article class="canvas-card maze-card">${cardHead('WORD MAZE',maze.shared?'짝이 만든 순환 미로':'혈액의 길을 이어 보세요',`<span class="page-count">${p.length}<small>칸 연결</small></span>`)}<div class="maze-instruction"><span class="instruction-number">↔</span><p>상하좌우로만 이동해요. <strong>지나온 칸을 누르면 되돌아가요.</strong></p></div><div class="maze-stage">${grid(maze.board,p,{reveal:maze.reveal,hint:maze.hint})}</div><div class="maze-footer"><span><b>폐</b> = 폐의 모세혈관</span><span><b>온몸</b> = 온몸의 모세혈관</span></div></article><aside class="info-card maze-info"><span class="number-tag">${maze.reveal?'정답 경로 살펴보기':done?'순환 경로 완성!':'순환 순서로 찾는 단어 미로'}</span><h3>${done?'길을 찾았어요!':maze.reveal?'경로를 설명해 봐요':BY_ID[from].name}</h3><p class="explain">${done?'폐를 지날 때와 온몸을 지날 때 혈액 속 산소량은 어떻게 달라졌나요?':maze.reveal?'정답길을 보며 왜 이 순서로 이동하는지 말해 보세요.':'지금 위치에서 혈액이 다음으로 이동할 곳을 찾아 이웃 칸을 누르세요.'}</p>${status(maze.message,maze.kind)}<div class="step-tools">${button('한 칸 뒤로','maze-back','secondary',p.length===1?'disabled':'')}${button('힌트 한 번','maze-hint','secondary',done||maze.reveal?'disabled':'')}</div><details class="route-help"><summary>순환 순서 도움말</summary><p>${CYCLE.map(id=>BY_ID[id].short).join(' → ')} → 우심실</p><p class="tiny-note">심장에서는 심방 → 심실, 그다음 동맥으로 나가요.</p></details><div class="partner-task"><span>PAIR TALK</span><strong>짝에게 말로 설명해요.</strong><p>한 명은 우심실부터 <b>허파순환</b>을,<br>다른 한 명은 좌심실부터 <b>온몸순환</b>을 말해 보세요.</p></div><div class="button-row">${button('처음부터','maze-reset','secondary')}${button('새 미로','maze-new','secondary')}</div><button class="text-button" data-action="maze-reveal">${maze.reveal?'정답 가리고 다시 풀기':'정답 경로 살펴보기'}</button><button class="next-link" data-tab="builder">이제 내 미로 만들기 <span>→</span></button></aside></section>`;
}
function builderView(){
  const drawing=maker.phase==='path',terms=PARTS.map(p=>pill(p.short,`data-term="${p.id}"`,maker.term===p.id)).join('');
  return `<section class="workspace maze-workspace"><article class="canvas-card maze-card">${cardHead('MAKE & SWAP','나만의 순환 미로 만들기',`<button class="text-toggle" data-action="builder-path">경로 직접 그리기 ↗</button>`)}<div class="maker-steps"><span class="${drawing?'active':'done'}">1. 정답 경로</span><b>→</b><span class="${!drawing?'active':''}">2. 나머지 단어</span><b>→</b><span class="${maker.checked?'active':''}">3. 검사 · 교환</span></div><div class="maze-stage">${grid(maker.board,maker.path,{editor:true,showPath:maker.showPath,drawing})}</div><div class="maze-footer">${drawing?`<span><b>${maker.path.length}칸</b> 연결 · 끝까지 11·21·31칸으로 이어요.</span>`:`<span>정답 경로의 단어는 순환 순서대로 고정돼요.</span><button class="text-toggle" data-action="builder-visibility">${maker.showPath?'경로 가리기':'경로 보기'}</button>`}</div></article><aside class="info-card builder-info"><span class="number-tag">${drawing?'STEP 01 / 정답 경로':'STEP 02–03 / 단어와 검사'}</span><h3>${drawing?'어떤 길로 갈까요?':'하나의 길만 남겨요'}</h3>${drawing?`<p class="explain">시작에서 끝까지 상하좌우로 이어요. 이전 칸을 누르면 그곳까지 되돌아가요.</p><label class="field-label" for="start-part">시작할 장소</label><select id="start-part"><option value="rv" ${maker.start==='rv'?'selected':''}>우심실에서 시작</option><option value="ao" ${maker.start==='ao'?'selected':''}>대동맥에서 시작</option></select>${status(maker.message,maker.kind)}${button('이 경로로 단어 채우기','builder-fill','primary',maker.path.at(-1)!==35?'disabled':'')}${button('경로 예시 가져오기','builder-example','secondary')}<p class="tiny-note">11칸이면 한 바퀴, 21칸이면 두 바퀴예요. 끝 칸에서 활동은 끝나도 혈액 순환은 계속돼요.</p>`:`<p class="explain">아래에서 단어를 고른 뒤 <strong>경로 밖 칸</strong>을 눌러 채워 보세요.</p><div class="term-bank">${terms}</div>${status(maker.message,maker.kind)}<div class="button-row">${button('남은 칸 다시 채우기','builder-refill','secondary')}${button('미로 검사','builder-check','secondary')}</div>${button('짝에게 미로 보내기 ↗','builder-share','primary',!maker.checked?'disabled':'')}<button class="text-button" data-action="builder-test">내 미로 풀어 보기</button><p class="tiny-note">정답길이 하나인 미로만 공유할 수 있어요. 경로 밖 단어를 바꾸면 다시 검사해요.</p>`}</aside></section>`;
}
function render(){
  const focused=document.activeElement;const key=focused?.dataset?.cell;
  app.innerHTML=tab==='observe'?observeView():tab==='journey'?journeyView():tab==='maze'?mazeView():builderView();
  document.querySelectorAll('.main-tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(key!==undefined)app.querySelector(`[data-cell="${key}"]`)?.focus({preventScroll:true});
}
function setTab(next){if(!['observe','journey','maze','builder'].includes(next))return;tab=next;quickMessage='';render();}
function resetJourney(route=journey.route){journey={...journey,route,step:0,answered:false,feedback:'',exchange:false};}
function resetMaze(board=maze.board,shared=maze.shared){maze={board,path:[0],hint:-1,reveal:false,message:DEFAULT_MESSAGE,kind:'ready',shared};}
function selectCell(i){
  if(tab==='builder'){
    if(maker.phase==='path'){
      const at=maker.path.indexOf(i);
      if(at!==-1)maker.path=maker.path.slice(0,at+1);
      else if(maker.path.at(-1)===35){maker.message='이미 끝에 도착했어요. 이전 칸을 눌러 경로를 수정할 수 있어요.';maker.kind='try';}
      else if(neighbors(maker.path.at(-1)).includes(i)){maker.path.push(i);maker.message=maker.path.at(-1)===35?'끝에 도착했어요. 단어 채우기를 눌러 경로를 검사해 보세요.':'좋아요. 순환 한 바퀴가 완성되도록 끝까지 이어요.';maker.kind='ready';}
      else {maker.message='현재 칸과 상하좌우로 붙은 칸을 눌러 주세요.';maker.kind='try';}
    }else if(maker.path.includes(i)){toast('정답 경로는 순환 순서를 유지해요. 경로 밖의 칸을 바꾸어 주세요.');return;}
    else{maker.board.cells[i]=maker.term;maker.checked=false;maker.message=`${BY_ID[maker.term].short}(으)로 바꿨어요. 미로 검사로 다른 길이 생겼는지 확인하세요.`;maker.kind='ready';persist();}
  }else if(tab==='maze'){
    if(maze.reveal){toast('정답 가리고 다시 풀기를 누르면 직접 풀 수 있어요.');return;}
    const r=checkStep(maze.board,maze.path,i);maze.hint=-1;
    if(r.ok){maze.path=r.path;maze.kind=r.complete?'success':'ready';maze.message=r.complete?'시작에서 끝까지 올바른 순서로 연결했어요!':r.back?'여기서 다시 길을 찾아보세요.':`${BY_ID[maze.board.cells[i]].name}에 도착했어요. 다음은 어디일까요?`;}
    else{maze.kind='try';maze.message=r.reason==='adjacent'?'대각선으로 건너뛸 수 없어요. 현재 칸과 상하좌우로 붙은 칸을 눌러 보세요.':'그곳으로 바로 이동하지 않아요. 현재 장소 다음에 혈액이 어디로 가는지 떠올려 보세요.';}
  }
  render();
}
const actions={
  'quick-rv':()=>{quickMessage='우심실은 폐로 보내요. 온몸으로 보내는 방을 다시 찾아보세요.';},
  'quick-lv':()=>{quickMessage='맞아요! 좌심실 → 대동맥 → 온몸으로 이동해요.';selectedPart='lv';},
  'quick-oxygen':()=>{quickMessage='산소량으로 동맥과 정맥을 나누지 않아요. 흐르는 방향을 보세요.';},
  'quick-away':()=>{quickMessage='맞아요! 폐동맥은 심장에서 나가므로 동맥이에요.';},
  'quick-red':()=>{quickMessage='적혈구는 주로 산소를 운반해요. 액체 성분을 찾아보세요.';},
  'quick-plasma':()=>{quickMessage='맞아요! 혈장은 영양소·노폐물 등을 운반해요.';selectedBlood='plasma';},
  'toggle-quiz':()=>{journey.quiz=!journey.quiz;journey.answered=false;journey.feedback='';},
  'journey-next':()=>{if(journey.quiz&&!journey.answered)return;if(journey.step<ROUTES[journey.route].ids.length-1){journey.step++;journey.answered=false;journey.feedback='';journey.exchange=false;}},
  'journey-prev':()=>{if(journey.step>0){journey.step--;journey.answered=false;journey.feedback='';journey.exchange=false;}},
  'journey-reset':()=>resetJourney(),
  'exchange':()=>{journey.exchange=true;},
  'journey-finish':()=>{if(journey.route==='all')tab='maze';else resetJourney(journey.route==='pulmonary'?'systemic':'all');},
  'maze-back':()=>{if(maze.path.length>1){maze.path.pop();maze.reveal=false;maze.hint=-1;maze.message='한 칸 뒤로 돌아왔어요.';maze.kind='ready';}},
  'maze-reset':()=>resetMaze(),
  'maze-new':()=>{const fresh=generateMaze(maze.board.start);resetMaze(fresh.board,false);if(location.hash.startsWith('#maze='))history.replaceState(null,'',location.pathname+location.search);},
  'maze-hint':()=>{const solution=solveMaze(maze.board).path;const diverged=maze.path.findIndex((v,i)=>v!==solution[i]);if(diverged!==-1){maze.message='순서는 맞지만 이 갈래는 끝까지 이어지지 않아요. 한 칸씩 뒤로 돌아가 다른 갈래를 찾아보세요.';maze.kind='try';}else{maze.hint=solution[maze.path.length];maze.message=`다음 목적지는 ${BY_ID[nextPart(maze.board.cells[maze.path.at(-1)])].name}이에요. 표시한 칸을 살펴보세요.`;maze.kind='ready';}},
  'maze-reveal':()=>{if(maze.reveal)resetMaze();else{maze.reveal=true;maze.hint=-1;maze.message='정답 경로가 표시되었어요. 순환 순서를 말로 설명해 보세요.';maze.kind='ready';}},
  'builder-path':()=>{maker.phase='path';maker.path=[0];maker.checked=false;maker.message='시작 칸에서 끝 칸까지 길을 그려 보세요. 혈액의 순서는 자동으로 들어가요.';maker.kind='ready';},
  'builder-example':()=>{const fresh=generateMaze(maker.start);maker={...maker,board:fresh.board,path:fresh.path,phase:'words',checked:false,showPath:true,message:'경로 예시가 준비됐어요. 남은 칸의 단어를 바꾸어 보세요.',kind:'ready'};persist();},
  'builder-fill':()=>{try{maker.board=fillPath(maker.path,maker.start);maker.phase='words';maker.showPath=true;maker.checked=false;maker.message='경로가 완성됐어요. 나머지 단어를 바꾼 뒤 미로 검사를 눌러 보세요.';maker.kind='ready';persist();}catch(e){maker.message=e.message;maker.kind='try';}},
  'builder-visibility':()=>{maker.showPath=!maker.showPath;},
  'builder-refill':()=>{try{maker.board=generateMaze(maker.start,Math.random,maker.path).board;maker.checked=false;maker.message='남은 칸을 새로 채웠어요. 미로 검사를 해 주세요.';maker.kind='ready';persist();}catch(e){maker.message=e.message;maker.kind='try';}},
  'builder-check':()=>{const r=solveMaze(maker.board);maker.checked=r.count===1&&!r.limited;maker.kind=maker.checked?'success':'try';maker.message=maker.checked?'정답길이 하나예요! 짝과 바꾸어 풀 준비가 됐어요.':r.count>1?'정답길이 둘 이상이에요. 경로 밖 단어를 바꾸거나 남은 칸을 다시 채워 보세요.':'끝까지 이어지는 길을 확인할 수 없어요. 경로를 다시 살펴보세요.';},
  'builder-share':()=>{if(!maker.checked)return;const url=new URL(location.href);url.hash='maze='+encodeMaze(maker.board);$('#share-url').value=url.href;$('#share-dialog').showModal();},
  'builder-test':()=>{const r=solveMaze(maker.board);if(!r.count||r.limited){toast('먼저 끝까지 이어지는 경로를 만들어 주세요.');return;}resetMaze(structuredClone(maker.board),true);tab='maze';},
};
document.addEventListener('click',e=>{
  const el=e.target.closest('button,[data-part],[data-vessel]');if(!el)return;
  if(el.dataset.tab){setTab(el.dataset.tab);return;}
  if(el.dataset.close){document.getElementById(el.dataset.close).close();return;}
  if(el.dataset.observe){observe=el.dataset.observe;quickMessage='';}
  else if(el.dataset.part)selectedPart=el.dataset.part;
  else if(el.dataset.vessel)selectedVessel=el.dataset.vessel;
  else if(el.dataset.blood)selectedBlood=el.dataset.blood;
  else if(el.dataset.route)resetJourney(el.dataset.route);
  else if(el.dataset.destination){if(journey.answered)return;const target=ROUTES[journey.route].ids[journey.step+1];journey.answered=el.dataset.destination===target;journey.feedback=journey.answered?'맞아요! 다음 단계로 이동해 보세요.':`${BY_ID[ROUTES[journey.route].ids[journey.step]].name}에서 어디로 연결되는지 화살표를 따라 살펴보세요.`;}
  else if(el.dataset.cell!==undefined){selectCell(Number(el.dataset.cell));return;}
  else if(el.dataset.term)maker.term=el.dataset.term;
  else if(el.dataset.action)actions[el.dataset.action]?.();
  else return;
  render();
});
document.addEventListener('keydown',e=>{
  const target=e.target.closest('[data-part],[data-vessel]');if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  const cell=e.target.closest('[data-cell]');if(!cell||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();const i=Number(cell.dataset.cell),j=i+{ArrowUp:-6,ArrowDown:6,ArrowLeft:-1,ArrowRight:1}[e.key];if(neighbors(i).includes(j))app.querySelector(`[data-cell="${j}"]`)?.focus();
});
document.addEventListener('change',e=>{if(e.target.id==='start-part'&&['rv','ao'].includes(e.target.value)){maker.start=e.target.value;maker.path=[0];maker.checked=false;render();}});
$('#help-open').addEventListener('click',()=>$('#help-dialog').showModal());
$('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#share-url').value);toast('미로 링크를 복사했어요. 짝에게 전달해 주세요.');}catch{$('#share-url').focus();$('#share-url').select();toast('링크를 선택했어요. Ctrl+C 또는 복사 메뉴로 복사해 주세요.');}});
$('#try-shared').addEventListener('click',()=>{resetMaze(structuredClone(maker.board),true);$('#share-dialog').close();setTab('maze');});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#maze='))try{resetMaze(decodeMaze(location.hash.slice(6)),true);setTab('maze');}catch(e){toast(e.message);}});
render();
