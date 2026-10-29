import {SAMPLE as LEGACY_SAMPLE} from './sample.mjs?v=12';
import {COOPERATIVE_SAMPLE as SAMPLE} from './cooperative-sample.mjs?v=19';
import {deskHTML,notesHTML,textPages,overlayHTML,clueDeck} from './desk-ui.mjs?v=19';
import {mechanismHTML,discoveryHTML,discoveryNotes,discoveryKey,isPhysical} from './mechanism-ui.mjs?v=19';
import {STAGES} from './content.mjs?v=19';
import {fresh,transition,previewState,playerContent,hintsFor,normalizeDraft,chosenReasons} from './engine.mjs?v=19';
import {CAST,ROOMS,GOALS,OPENING,BEFORE,AFTER,CONFESSION,WALK_TO_YOU,MEMORIES,STORY_VERSION} from './story.mjs?v=19';
import {esc,lines,puzzleHTML,interactionGuide,finalNotesHTML,finalSequenceHTML,cabinetMarksHTML} from './puzzle-ui.mjs?v=19';
import {Session,secret} from './client.mjs';
import {Author} from './author.mjs?v=19';
import {PHOTO_SPOTS,EXPLORE,MAIN_SPOTS} from './exploration.mjs?v=19';
import {Sound} from './sound.mjs';
import {dialogueFrame,restoreStoryUI} from './narrative.mjs?v=10';
import {fitRoomFrame,spreadScenePoints} from './scene-points.mjs?v=10';
const root=document.querySelector('#app'),modal=document.querySelector('#modal'),toastNode=document.querySelector('#toast'),sound=new Sound();
let pointWorld=null,pointViewport=null;
const pointObserver=new ResizeObserver(arrangeScenePoints);
function arrangeScenePoints(){
 if(!pointWorld?.isConnected||!pointViewport?.isConnected)return;
 const width=pointViewport.clientWidth,height=pointViewport.clientHeight;
 if(!width||!height)return;
 // Portrait phone conversations keep their full-height composition.
 if(dialogue&&width<=700){pointWorld.removeAttribute('style');return;}
 const frame=fitRoomFrame(EXPLORE[room]||[],width,height);
 Object.assign(pointWorld.style,{width:frame.width+'px',height:frame.height+'px',left:frame.left+'px',top:frame.top+'px',transform:'none'});
 const buttons=[...pointWorld.querySelectorAll('.scene-point')];
 const anchors=buttons.map(b=>({x:(frame.left+Number(b.dataset.x)*frame.width/100)/width*100,y:(frame.top+Number(b.dataset.y)*frame.height/100)/height*100}));
 const positions=spreadScenePoints(anchors,width,height);
 buttons.forEach((button,i)=>{button.style.left=positions[i].left-frame.left+'px';button.style.top=positions[i].top-frame.top+'px';});
}
const LEGACY_SOLO='scilab-first-love-solo-v1',SOLO='scilab-first-love-solo-v2';
let previewRole=0,soloKey=SOLO,deskView={note:0,page:0,overlay:null},deskStage=-1;
const spots=()=>PHOTO_SPOTS.filter(p=>p.role<4||content?.schema==='TODAY-TO-YOU-2');
let mode='home',lesson=SAMPLE,s=fresh(),content=null,draft={},selected='',room='classroom',preview=null,ui={seen:[],history:[]},dialogue=null,busy=false,panel='',status='연결됨',saveTimer=null,dirty=false,typing=null,syncPromise=null,draftSerial=0,feedback=null;
const session=new Session(remoteUpdate,t=>{status=t;document.querySelector('#connection')?.replaceChildren(document.createTextNode(t));});
const author=new Author(root,(l,p,r)=>startPreview(l,p,r),()=>home());
const read=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
const uiKey=()=>mode==='group'?'first-love-ui:'+session.meta.token:soloKey+':ui';
function saveUI(){if(!['solo','group'].includes(mode))return;try{localStorage.setItem(uiKey(),JSON.stringify({...ui,room,dialogue:dialogue?{key:dialogue.key,index:dialogue.index}:null}));}catch{}}
function saveSolo(){if(mode!=='solo')return;try{localStorage.setItem(soloKey,JSON.stringify(s));}catch{toast('이 기기에 진행을 저장할 수 없습니다. 저장 공간을 확인하세요.');}saveUI();}
function toast(t){if(modal.open&&panel==='puzzle'){feedback={kind:'notice',text:t};const el=modal.querySelector('.submission-feedback');if(el){el.hidden=false;el.className='desk-feedback submission-feedback notice';el.textContent=t;}}toastNode.textContent=t;toastNode.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastNode.classList.remove('show'),4200);}

function portrait(index,extra='',expression=null){
 const actor=CAST[index];
 if(expression===null)return `<img class="portrait ${extra}" src="./assets/${actor.asset}.webp" alt="${actor.name}" width="800" height="1200" decoding="async" draggable="false">`;
 const mood=Math.max(0,actor.moods.indexOf(expression)),individual=actor.expressionAssets?.[actor.moods[mood]];
 if(individual)return `<img class="portrait ${extra}" src="./assets/${individual}.webp" alt="${actor.name} · ${actor.faces[mood]}" data-expression="${actor.moods[mood]}" width="1024" height="1536" decoding="async" draggable="false">`;
 const frame=actor.expressionFrames?.[actor.moods[mood]]??mood,col=frame%2,row=Math.floor(frame/2);
 const split=index===2?541:512,x=col?split:0,width=col?1024-split:split;
 const centers=actor.sheetCenters||[[280,248],[308,238],[302,268],[316,287]][index],shift=256-(col*512+centers[col]-x);
 // Clip the original atlas before centering; never expose the neighboring figure.
 return `<svg class="portrait expression-sprite ${extra}" viewBox="0 0 512 768" width="512" height="768" role="img" aria-label="${actor.name} · ${actor.faces[mood]}" data-expression="${actor.moods[mood]}"><svg x="${shift}" y="0" width="${width}" height="768" viewBox="${x} ${row*768} ${width} 768" overflow="hidden"><image href="./assets/${actor.sheet}.webp" width="1024" height="1536"/></svg></svg>`;
}

function refreshContent(){if(mode!=='group')content=playerContent(lesson,mode==='preview'&&previewRole?[previewRole]:[1,2,3,4],s);}
function home(){author.pause();session.pause();clearTimeout(saveTimer);clearInterval(typing);sound.set('quiet');mode='home';dialogue=null;closeModal();root.innerHTML=`<section class="landing"><header><a href="/" class="brand">SCI<span>LAB</span></a><span class="edition">AFTER SCHOOL · A STORY FOR FOUR</span><a href="./guide.html" target="_blank" rel="noopener">사용법 ↗</a></header><div class="landing-content"><div class="title-copy"><p class="eyebrow">교과를 넘어, 같은 마음으로</p><h1>오늘,<br><em>너에게.</em></h1><p class="lead">편지 한 장을 전하러 가는 길.<br>평범한 방과 후가 조금 특별해졌다.</p><div class="landing-buttons"><button class="primary" data-action="join">수업 코드로 입장 <span>↗</span></button>${session.available?'<button data-action="resume-group">참여 중인 모둠 이어하기</button>':''}<button data-action="solo">혼자 체험하기 <span>→</span></button>${read(SOLO)?'<button data-action="resume-solo">이전 체험 이어하기</button>':''}${read(LEGACY_SOLO)?'<button data-action="resume-legacy-solo">기존 양식 체험 이어하기</button>':''}<button class="text-button" data-action="teacher">선생님 · 수업 준비</button></div><p class="landing-note">4인 협동 · 10단계 · 약 40분<br>인원이 적으면 빈자리의 자료를 함께 볼 수 있어요.</p></div><div class="cast-cover"><div class="cast-image" aria-label="여주인공 서아와 남학생 윤재, 도하, 시우">${CAST.map((c,i)=>`<div class="cast-panel">${portrait(i)}</div>`).join('')}</div><div class="cast-names">${CAST.map(c=>`<span><b>${c.name}</b><small>${c.role}</small></span>`).join('')}</div><p class="cover-caption">오늘은, 미루지 않기로 했다.</p></div></div><footer><span>오늘, 너에게</span><span>SCILAB ORIGINAL · 학교에서 시작되는 이야기</span></footer></section>`;}
function startLocal(resume=false,legacy=false){deskStage=-1;author.pause();session.pause();mode='solo';soloKey=legacy?LEGACY_SOLO:SOLO;lesson=soloKey===LEGACY_SOLO?LEGACY_SAMPLE:SAMPLE;preview=null;feedback=null;selected='';s=resume&&read(soloKey)||fresh();ui=restoreStoryUI(resume&&read(uiKey()),STORY_VERSION);room=ui.room||STAGES[s.stage]?.room||'bench';draft=structuredClone(s.draft);dirty=false;refreshContent();saveSolo();sound.start();sound.set(s.stage>=7?'evening':s.stage>=4?'comic':'spring');if(s.finished)return ending();renderScene();if(resume&&restoreFind())return;if(!resume||!ui.seen.includes('opening'))play('opening',OPENING,()=>renderScene());else if(ui.dialogue)resumeDialogue();}
function startPreview(l,p,role=0){previewRole=role;deskStage=-1;clearInterval(typing);dialogue=null;mode='preview';lesson=l;preview=p;ui=restoreStoryUI(null,STORY_VERSION);dirty=false;selected='';feedback=null;sound.start();closeModal();if(typeof p==='string'){s=previewState(10);s.ending=p;s.finished=true;room='bench';refreshContent();return ending();}s=p===null?fresh():previewState(p);room=STAGES[s.stage]?.room||'bench';draft=structuredClone(s.draft);refreshContent();renderScene();if(p===null)play('opening',OPENING,()=>renderScene());else arrive();}
async function connect(input){try{busy=true;const data=await session.connect(input);deskStage=-1;mode='group';preview=null;s=data.state;content=data.content;ui=restoreStoryUI(read(uiKey()),STORY_VERSION);room=ui.room||STAGES[s.stage]?.room||'bench';draft=structuredClone(s.draft);dirty=false;closeModal();sound.start();renderScene();if(session.meta.pendingAttempt)await event(session.meta.pendingAttempt);if(s.finished)return ending();if(restoreFind())return;if(s.stage===0&&data.group.status==='playing'&&!ui.seen.includes('opening'))play('opening',OPENING,()=>renderScene());else if(ui.dialogue)resumeDialogue();}catch(e){toast(e.message);}finally{busy=false;}}
function remoteUpdate(data){
 if(mode!=='group')return;if(data.error){toast(data.error);return home();}
 const old=s.stage,oldVersion=s.draftVersion;s=data.state;content=data.content;
 if(!dirty)draft=structuredClone(s.draft);
 else if(s.draftVersion!==oldVersion&&!syncPromise){clearTimeout(saveTimer);dirty=false;draft=structuredClone(s.draft);toast('모둠원이 새 답안을 저장했어요. 반영된 답안을 확인해 주세요.');}
 if(s.stage!==old){dirty=false;draft=structuredClone(s.draft);closeModal();selected='';if(s.stage>old&&s.stage<=10)afterStage(old);}
 else if(s.finished&&!dialogue)ending();else if(!dialogue){renderScene();if(panel==='puzzle')renderPuzzle();}
 if(s.stage===0&&data.group.status==='playing'&&!ui.seen.includes('opening')&&!dialogue)play('opening',OPENING,()=>renderScene());
}
function toolbar(){return `<div class="sound-controls"><button data-action="mute" aria-label="음소거 전환">${sound.muted?'소리 끔':'소리 켬'}</button><input aria-label="볼륨" id="volume" type="range" min="0" max=".5" step=".01" value="${sound.volume}"></div>`;}
function renderScene(){
 if(s.finished&&!dialogue)return ending();
 if(dialogue)room=dialogueFrame(dialogue.list,dialogue.index,room).room;
 const st=STAGES[s.stage],waiting=mode==='group'&&session.data.group.status!=='playing',r=ROOMS[room]||ROOMS.classroom;

 root.innerHTML=`<section class="game ${dialogue?'in-dialogue':''}"><header class="game-header"><button class="wordmark" data-action="home">오늘, 너에게</button><span>${mode==='preview'?'교사 미리보기':mode==='group'?esc(session.data.group.name):'혼자 체험 · 시연 자료'}</span><div class="game-tools">${toolbar()}${mode==='preview'?'<button data-action="back-preview">목록으로</button>':'<button data-action="menu">메뉴</button>'}</div></header>
 <div class="scene-area ${dialogue?'narrating':''} ${s.stage===10?'final-walk':''}">
 ${!dialogue?`<div class="scene-briefing"><div><small>${String(Math.min(s.stage+1,10)).padStart(2,'0')} / 10 · ${r.name} <span>${s.stage<4?'늦은 오후':s.stage<8?'노을이 번지는 시간':'분홍빛 저녁'}</span></small><h2>${st?.title||'한 걸음, 너에게'}</h2></div><p>${waiting?'선생님이 수업을 시작하면 함께 진행해요.':s.stage<10?(room===st.room?GOALS[s.stage]:`${r.caption}. 지금 찾는 기록은 ${ROOMS[st.room].name}에 있다.`):'편지를 챙겼다. 이제, 기다리는 사람에게 가자.'}</p></div>`:''}
 <div class="scene-viewport" style="--scene:url('./assets/room-${r.art}-v3.webp')"><div class="scene-soft-backdrop"></div><div class="world ${s.stage>=8?'late':''}"><div class="room-art"></div><div class="light-overlay"></div>${!dialogue?hotspots(st,waiting):''}</div><div id="dialogue-layer"></div>${s.stage===10&&!dialogue?'<button class="to-bench primary" data-action="confession">벚꽃나무 아래로 걸어간다 →</button>':''}</div>
 </div>
 <footer class="game-footer"><span class="place-caption">${r.name}</span>${!dialogue&&s.stage<10?`<div class="scene-controls"><button data-action="map">장소 이동</button>${s.stage===8?'<button class="clue-button" data-action="photos">사진 보기</button>':''}${content?.evidence?.length||s.stage===8?'<button class="clue-button" data-action="clues">단서함</button>':''}</div>`:''}<span id="connection">${mode==='group'?status:''}</span></footer></section>`;
 pointObserver.disconnect();pointWorld=root.querySelector('.world');pointViewport=root.querySelector('.scene-viewport');if(pointViewport){arrangeScenePoints();pointObserver.observe(pointViewport);}
 root.querySelector('#volume')?.addEventListener('input',e=>{sound.volume=Number(e.target.value);sound.settings();});if(dialogue)renderDialogue();
}


function scenePoint({x,y,name,action,value='',found=false,disabled=false}){
 const icon=found?'<path d="m5 12 4 4L19 6"/>':'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5"/>';
 return `<button class="scene-point${found?' found':''}" style="left:${x}%;top:${y}%" data-x="${x}" data-y="${y}" data-action="${action}" data-value="${esc(value)}" data-edge="${x<18?'left':x>82?'right':'center'}" aria-label="${esc(name)} 살펴보기${found?' · 확인한 사물':''}" ${disabled?'disabled':''}><span class="point-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span><b class="point-label" aria-hidden="true">${esc(name)}</b></button>`;
}
function hotspots(st,waiting){
 if(!st)return '';
 const photo=s.stage===8&&room==='classroom';
 const main=room===st.room&&!photo;
 const [x,y]=s.stage===9?[88.7,42.8]:(MAIN_SPOTS[room]||[50,50]);
 const ambient=(EXPLORE[room]||[]).filter(a=>!(photo&&spots().some(p=>p.id===a.id))&&!(main&&Math.hypot(a.x-x,a.y-y)<8));
 return ambient.map(a=>scenePoint({...a,action:'inspect',value:a.id})).join('')+(photo?spots().map(a=>scenePoint({...a,action:'inspect-photo',value:a.id,found:s.photos.includes(a.id),disabled:waiting})).join(''):main?scenePoint({x,y,name:st.object,action:'object',disabled:waiting}):'');
}

function play(key,list,done){if(ui.seen.includes(key)){done?.();return;}dialogue={key,list,index:ui.dialogue?.key===key?Math.min(Math.max(ui.dialogue.index||0,0),list.length-1):0,done,full:false};closeModal();renderScene();saveUI();}
function arrive(){room=STAGES[s.stage]?.room||'courtyard';saveUI();if(BEFORE[s.stage])play('before:'+s.stage,BEFORE[s.stage],()=>renderScene());else renderScene();}
function resumeDialogue(){const {key}=ui.dialogue||{};if(key==='opening')play(key,OPENING,()=>renderScene());else if(key?.startsWith('after:')){const n=Number(key.split(':')[1]);play(key,AFTER[n]||[],()=>arrive());}else if(key?.startsWith('before:')){const n=Number(key.split(':')[1]);play(key,BEFORE[n]||[],()=>renderScene());}else if(key==='walk')confession();else if(key==='said')play('said',[[0,'나, 너 좋아해.',{expression:'smile'}]],()=>ending());else if(key==='confession')play(key,CONFESSION,()=>letterPrompt());else renderScene();}
function renderDialogue(){
 clearInterval(typing);const box=document.querySelector('#dialogue-layer');if(!dialogue||!box)return;
 const {who,text,options,channel,messages,expressions,portraitActor}=dialogueFrame(dialogue.list,dialogue.index,room);
 const finale=['confession','said'].includes(dialogue.key),slow=options.pace||(dialogue.key==='said'?90:28);
 root.querySelector('.scene-area').dataset.channel=channel;
 const cueKey=dialogue.key+':'+dialogue.index;
 if(dialogue.cueKey!==cueKey){if(options.cue==='heartbeat')sound.set('silence');if(options.cue)sound.effect(options.cue);else if(channel==='phone'&&who===1)sound.effect('message');dialogue.cueKey=cueKey;}
 if(channel==='phone'){
  box.innerHTML=`<div class="vn phone-scene"><article class="story-phone" aria-label="윤재의 휴대전화"><header><span>메시지</span><b>한서아</b><small>방과 후</small></header><div class="phone-thread">${messages.map(m=>`<div class="message-bubble ${m.who===0?'outgoing':'incoming'}"><small>${m.who===0?'윤재':'서아'}</small><p ${m.current?`id="dialogue-text" aria-label="${esc(text)}"`:''}>${m.current?'':lines(m.text)}</p>${m.who===0?`<span>${m.current?'작성 중':'보냄'}</span>`:''}</div>`).join('')}</div><footer><button data-action="next-line" class="next-line">${who===0?'문자 보내기':'계속'} <span>▸</span></button></footer></article></div>`;
 }else if(channel==='note'){
  box.innerHTML=`<div class="vn note-scene"><article class="story-note"><small>${esc(options.label||'남겨 둔 글씨')}</small><p id="dialogue-text" aria-label="${esc(text)}"></p><button data-action="next-line" class="next-line">책갈피를 챙긴다 <span>▸</span></button></article></div>`;
 }else{
  box.innerHTML=`<div class="vn ${who<0?'inner-thought':''} ${finale?'confession-scene':''}">${!finale?`<div class="scene-caption">${esc(options.label||ROOMS[room].name)}</div>`:''}${finale?`<div class="pair"><div class="pair-yunjae ${who===0?'speaking':''}">${portrait(0,'',expressions[0]||'nervous')}</div><div class="pair-seoa ${who===1?'speaking':''}">${portrait(1,'',expressions[1]||'neutral')}</div></div><div class="petals" aria-hidden="true">${petals()}</div>`:portraitActor!==undefined?portrait(portraitActor,'vn-person',expressions[portraitActor]||'neutral'):''}<div class="vn-dialogue" role="group" aria-label="대화"><div class="speaker">${who<0?'윤재의 시선':CAST[who].name}</div><p id="dialogue-text" aria-label="${esc(text)}"></p><button data-action="next-line" class="next-line">${dialogue.key==='said'?'서아를 바라본다':'계속'} <span>▸</span></button><small>${dialogue.index+1} / ${dialogue.list.length}</small></div></div>`;
 }
 const el=box.querySelector('#dialogue-text');let pos=0;const chars=[...text];dialogue.full=false;
 typing=setInterval(()=>{if(!dialogue){clearInterval(typing);return;}pos++;el.textContent=chars.slice(0,pos).join('');if(pos>=chars.length){clearInterval(typing);dialogue.full=true;}},slow);saveUI();
}

function nextLine(){if(!dialogue)return;if(!dialogue.full){clearInterval(typing);document.querySelector('#dialogue-text').textContent=dialogue.list[dialogue.index][1];dialogue.full=true;return;}ui.history.push(dialogue.list[dialogue.index]);ui.history=ui.history.slice(-160);dialogue.index++;if(dialogue.index<dialogue.list.length){renderScene();return;}const done=dialogue.done;ui.seen.push(dialogue.key);dialogue=null;ui.dialogue=null;saveUI();done?.();}
function showFind(old){openModal(discoveryHTML(old),'find');modal.querySelector('[data-action="collect-find"]')?.focus();}
function restoreFind(){const old=ui.revealStage;if(Number.isInteger(old)&&old>=0&&old<8&&old<s.stage&&content?.schema==='TODAY-TO-YOU-2'){showFind(old);return true;}return false;}
function collectFind(){const old=ui.revealStage;if(!Number.isInteger(old))return;ui.revealStage=null;if(!ui.seen.includes('found:'+old))ui.seen.push('found:'+old);closeModal();saveUI();play('after:'+old,AFTER[old]||[],()=>arrive());}
function afterStage(old){sound.effect('success');sound.set(s.stage>=7?'evening':s.stage>=4?'comic':'spring');selected='';feedback=null;if(old<8&&content?.schema==='TODAY-TO-YOU-2'&&!ui.seen.includes('found:'+old)){ui.revealStage=old;saveUI();showFind(old);return;}play('after:'+old,AFTER[old]||[],()=>arrive());}
function openModal(html,kind='info'){panel=kind;modal.classList.toggle('find-dialog',kind==='find');modal.classList.toggle('desk-dialog',s.stage<8&&kind==='puzzle');modal.classList.toggle('photo-dialog',kind==='photos');modal.classList.toggle('final-dialog',s.stage===9&&kind==='puzzle');modal.classList.toggle('cabinet-dialog',kind==='cabinet');modal.innerHTML=html;if(!modal.open)modal.showModal();}
function closeModal(){if(modal.open)modal.close();panel='';}
function evidenceHTML(){return content?.evidence?.length?content.evidence.map(e=>`<article class="evidence"><small>획득한 기록</small><h3>${esc(e.title)}</h3><p>${lines(e.text)}</p></article>`).join(''):'<p class="help">찾아낸 책갈피와 전달 기록이 여기에 모입니다. 모둠에서는 담당 자리의 기록만 보입니다.</p>';}
function clueHTML(){const list=content?.puzzle?.clues||content?.clues||[];return list.map(c=>`<article class="clue"><small>${c.role}번 자리${mode==='group'&&c.role!==session.data.me.role?' · 빈자리 공동 열람':''}</small><h3>${esc(c.title)}</h3><p>${lines(c.text)}</p></article>`).join('');}
function openPuzzle(){if(s.stage>=10||s.stage===8)return;refreshContent();renderPuzzle();}
function currentHints(){return mode==='group'?session.data.hints:hintsFor(lesson,s);}
function renderPuzzle(){
 if(deskStage!==s.stage){deskView={note:0,page:0,overlay:null};deskStage=s.stage;}
 deskView.discovered=ui.discoveredProps||[];deskView.compact=window.innerWidth<=600;deskView.tight=window.innerWidth<360||window.innerHeight<460;
 const active=modal.contains(document.activeElement)?document.activeElement:null,focus=active?.dataset.action?{action:active.dataset.action,value:active.dataset.value}:null;
 if(s.stage===9)renderFinalPuzzle();else{
 const p=content.puzzle,st=STAGES[s.stage];if(!p||!st)return;
 openModal((isPhysical(p)?mechanismHTML:deskHTML)(p,draft,selected,deskView,{stage:st,role:mode==='group'?session.data.me.role:mode==='preview'?previewRole:0,busy,dirty,feedback,hints:currentHints()}),'puzzle');}
 if(focus)[...modal.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===focus.action&&b.dataset.value===focus.value&&!b.disabled)?.focus({preventScroll:true});
}
function renderFinalPuzzle(){
 const st=STAGES[9],ready=(draft.sequence||[]).length===content.moveCount+1;
 const ids=['bookmark','delivery','direction','drawers'];
 const notes=content.evidence.map(e=>({role:ids.indexOf(e.id)+1,title:e.title,pages:textPages(e.text,deskView.compact?60:110)}));
 openModal(`<header class="modal-header"><div><small>${st.id} · 마지막 자료함</small><h2 id="modal-title">${st.title}</h2></div><button data-action="close">장면 보기 ✕</button></header><div class="final-puzzle-layout" ${deskView.overlay?'inert':''}><aside class="final-notes"><div class="desk-clue-heading"><b>모아 둔 기록</b><small>친구와 함께 읽기</small></div>${notesHTML(notes,deskView)}</aside><section class="puzzle-main"><div class="final-task"><p>시작부터 거친 수납함을 <strong>순서대로 누르세요.</strong></p></div>${puzzleHTML(null,draft,'',content)}</section></div>${finalSequenceHTML(draft,content)}<div class="desk-feedback submission-feedback ${feedback?.kind||''}" role="status">${esc(feedback?.text||'')}</div><footer class="puzzle-footer"><button data-action="desk-hint" ${busy?'disabled':''}>힌트</button><span id="draft-status">${dirty?'입력 저장 중…':ready?'순서 입력 완료':'시작 칸도 포함해요'}</span><button class="primary" data-action="submit" ${busy||!ready?'disabled':''}>입력한 순서로 열기</button></footer>${overlayHTML({items:[],targets:[]},deskView)}`, 'puzzle');
}
function openCabinet(){openModal(`<header class="modal-header"><div><small>수납장 오른쪽 옆판</small><h2 id="modal-title">닳은 나무 위의 표시</h2></div><button data-action="back-final">수납함으로 돌아가기</button></header><div class="cabinet-inspection"><p>빛을 비스듬히 비추자 작은 화살표가 드러났다.<br>여러 줄로 나뉘어 새겨져 있다.</p><div class="cabinet-wood">${cabinetMarksHTML(content.cabinet?.marks||[])}</div><p>이 표시를 읽는 방법은<br><b>2번 친구의 전달 메모</b>에 적혀 있다.</p><button class="primary" data-action="back-final">기록과 맞춰 보기</button></div>`, 'cabinet');}
function draftChanged(){feedback=null;draftSerial++;dirty=true;clearTimeout(saveTimer);if(mode==='group')saveTimer=setTimeout(()=>flushDraft().catch(e=>toast(e.message)),400);else flushDraft().catch(e=>toast(e.message));if(panel==='puzzle')renderPuzzle();}
async function flushDraft(){
 clearTimeout(saveTimer);if(syncPromise)return syncPromise;if(!dirty)return;
 syncPromise=(async()=>{
  while(dirty){
   const sent=structuredClone(draft),stage=s.stage,version=s.draftVersion,serial=draftSerial;
   try{
    if(mode==='group'){
     const result=await session.send({type:'draft',stage,draft:sent,draftVersion:version});
     if(!result){dirty=false;return;}
     const previousStage=s.stage;s=result.state;content=result.content;
     if(s.stage!==stage){dirty=false;draft=structuredClone(s.draft);closeModal();if(s.stage>previousStage)afterStage(previousStage);return;}
    }else{s=transition(s,{type:'draft',stage,draft:sent,draftVersion:version},lesson).state;saveSolo();}
    if(serial===draftSerial){draft=structuredClone(s.draft);dirty=false;}
   }catch(e){
    if(e.status===409){const v=await session.api('state');session.setData(v);s=session.data.state;content=session.data.content;draft=structuredClone(s.draft);dirty=false;}
    throw e;
   }
  }
 })();
 try{await syncPromise;}finally{syncPromise=null;if(panel==='puzzle')renderPuzzle();}
}
async function event(e){const old=s.stage;let result;if(mode==='group'){result=await session.send(e);if(!result)return;s=result.state;content=result.content;}else{result=transition(s,e,lesson);s=result.state;refreshContent();saveSolo();}draft=structuredClone(s.draft);dirty=false;if(s.stage>old){closeModal();afterStage(old);}else if(result.outcome==='wrong'){sound.effect('tap');feedback={kind:'wrong',text:result.duplicate?'같은 답안이에요. 오답 횟수는 그대로예요.':isPhysical(content.puzzle)?'걸쇠가 움직이지 않아요. 발견한 기록을 다시 맞춰 보세요.':'아직 맞지 않아요. 친구들의 단서를 다시 비교해 보세요.'};}else if(result.outcome==='incomplete')feedback={kind:'incomplete',text:s.stage===9?`시작을 포함해 ${content.moveCount+1}칸을 입력하세요. 오답으로 세지 않아요.`:isPhysical(content.puzzle)?'아직 빈자리가 있어요. 조작을 마친 뒤 다시 시도해요. 오답으로 세지 않아요.':'답안을 완성해 주세요. 오답으로 세지 않아요.'};if(panel==='puzzle')renderPuzzle();else if(panel!=='find'&&!dialogue&&!s.finished)renderScene();return result;}
function photoHTML(a){return `<div class="photo-window" style="--px:${Math.max(0,Math.min(100,2*a.x-50))}%;--py:${Math.max(0,Math.min(100,2*a.y-50))}%" role="img" aria-label="교실 ${a.name} 주변을 찍은 사진"></div>`;}

let photoPage=0;
function photos(){const roles=mode==='group'?session.data.allowedRoles:mode==='preview'&&previewRole?[previewRole]:[1,2,3,4],available=spots().filter(a=>roles.includes(a.role)),a=available[Math.min(photoPage,Math.max(0,available.length-1))];openModal(`<header class="modal-header"><h2 id="modal-title">친구가 남긴 사진</h2><button data-action="close">교실로 돌아가기</button></header><div class="photo-pages">${a?`<nav>${available.map((p,n)=>`<button data-action="photo-page" data-value="${n}" aria-pressed="${p===a}">${p.role}번 사진</button>`).join('')}</nav>${photoHTML(a)}<p>사진과 같은 사물을 교실에서 찾아 눌러 보세요.</p>`:'<p>친구들이 사진 속 사물을 찾도록 도와주세요.</p>'}</div>`,'photos');}
function inspectPhoto(id){const a=spots().find(x=>x.id===id);if(!a||s.stage!==8)return;const allowed=mode!=='group'||session.data.allowedRoles.includes(a.role);openModal(`<header class="modal-header"><h2 id="modal-title">${a.name} 살펴보기</h2><button data-action="close">교실로 돌아가기</button></header><div class="photo-inspection">${photoHTML(a)}<p>${s.photos.includes(id)?'사진과 같은 사물임을 확인해 기록했어요.':allowed?'친구의 사진과 같은 위치인가요? 주변의 배치와 표식을 확인하세요.':a.role+'번 사진을 가진 친구에게 이 위치를 알려 주세요.'}</p>${allowed?`<button class="primary" data-action="photo" data-value="${id}">${s.photos.includes(id)?'확인한 사물':'사진 속 사물로 기록'}</button>`:''}</div>`);}
function letterPrompt(){root.querySelector('#dialogue-layer').innerHTML=`<div class="vn confession-scene"><div class="pair"><div class="pair-yunjae">${portrait(0,'','nervous')}</div><div class="pair-seoa">${portrait(1,'','neutral')}</div></div><div class="petals" aria-hidden="true">${petals()}</div></div>`;root.querySelector('.scene-viewport').insertAdjacentHTML('beforeend','<div class="letter-prompt"><small>손끝에서, 마음까지</small><p>전하고 싶었던 말은 하나였다.</p><button class="primary" data-action="letter">편지를 내민다</button></div>');}

function confession(){room='courtyard';sound.set('evening');play('walk',WALK_TO_YOU,()=>{room='bench';play('confession',CONFESSION,()=>letterPrompt());});}

async function confess(){if(busy)return;busy=true;try{sound.set('silence');root.querySelector('.letter-prompt')?.remove();const d=await event({type:'confess',stage:10});if(!d)return;play('said',[[0,'나, 너 좋아해.',{expression:'smile'}]],()=>ending());}catch(e){toast(e.message);letterPrompt();}finally{busy=false;}}
function ending(){clearInterval(typing);sound.set(s.ending==='smile'?'ending':'evening');closeModal();room='bench';const expression=s.ending||'smile';root.innerHTML=`<section class="ending-screen ${expression}"><div class="ending-backdrop"></div><div class="petals" aria-hidden="true">${petals()}</div><img class="ending-face" src="./assets/ending-${expression}-${expression==='disgust'?'v7':'v3'}.webp" alt="${({smile:'서아가 눈을 맞추며 수줍게 미소 짓는다',surprise:'서아가 놀라 잠시 말을 잊는다',disgust:'서아가 미간과 코를 찡그리며 손바닥을 앞으로 내밀어 거절한다'})[expression]}" width="800" height="1200"><div class="ending-title"><small>그 말을 건넨 순간,</small><p>오늘은, 미루지 않았다.</p><h1>오늘, 너에게</h1></div><div class="ending-actions">${toolbar()}<button data-action="${mode==='preview'?'back-preview':'home'}">${mode==='preview'?'미리보기 목록으로':'처음 화면으로'}</button><button data-action="replay-ending">고백 장면 다시 보기</button></div></section>`;root.querySelector('#volume')?.addEventListener('input',e=>{sound.volume=Number(e.target.value);sound.settings();});}

function selectPlace(value){const p=content.puzzle;if(!selected){toast(isPhysical(p)?'먼저 옮길 물건을 누르세요.':'먼저 자료 카드를 선택하세요.');return;}if(['order','select-order'].includes(p.type)){const order=[...(draft.order||['','','',''])];const old=order.indexOf(selected);if(old>=0)order[old]='';order[Number(value)]=selected;draft={order};}else{if(p.type!=='classify')for(const k of Object.keys(draft))if(draft[k]===value)draft[k]='';draft[selected]=value;}selected='';draftChanged();}
async function action(a,v){try{
 if(busy&&['pick','field-value','select','place','unplace','candidate','reason','reset-draft','rotate','undo','drawer','inspect-cabinet'].includes(a))return;
 if(a==='home'){if(mode==='game'||mode==='group'||mode==='solo')await flushDraft();return home();}if(a==='teacher'){mode='teacher';author.show();return;}if(a==='back-preview'){closeModal();mode='teacher';return author.show();}
 if(a==='solo')return startLocal();if(a==='resume-solo')return startLocal(true);if(a==='resume-legacy-solo')return startLocal(true,true);if(a==='resume-group')return connect();if(a==='join')return openModal(`<header class="modal-header"><h2 id="modal-title">같은 이야기로 입장하기</h2><button data-action="close">✕</button></header><form id="join-form"><label>수업 코드<input name="code" maxlength="12" placeholder="선생님이 알려 준 8자리" required autocapitalize="characters"></label><label>이름<input name="name" maxlength="20" required></label><div class="form-row"><label>모둠<select name="team">${Array.from({length:12},(_,n)=>`<option>${n+1}</option>`).join('')}</select></label><label>자리<select name="role">${[1,2,3,4].map(n=>`<option>${n}</option>`).join('')}</select></label></div><button class="primary">입장하기</button><p class="help">모둠원끼리 서로 다른 자리를 골라 주세요.</p></form>`);
 if(a==='collect-find')return collectFind();
 if(a==='close'){if(panel==='find')return collectFind();if(deskView.overlay&&panel==='puzzle'){deskView.overlay=null;return renderPuzzle();}await flushDraft();if(panel==='cabinet')return openPuzzle();return closeModal();}if(a==='mute'){sound.muted=!sound.muted;sound.settings();return renderScene();}if(a==='next-line')return nextLine();
 if(a==='move'){if(dialogue||!ROOMS[v]||s.stage<ROOMS[v].unlock)return;closeModal();room=v;saveUI();sound.effect('paper');return renderScene();}if(a==='object'){if(dialogue||room!==STAGES[s.stage]?.room)return;return openPuzzle();}if(a==='map')return schoolMap();
 if(a==='clues')return openModal(`<header class="modal-header"><h2 id="modal-title">우리의 단서함</h2><button data-action="close">닫기 ✕</button></header><div class="evidence-list">${evidenceHTML()}${s.stage===8?clueHTML():''}</div>`);
 if(a==='inspect')return inspectObject(v);if(a==='memories')return memories();if(a==='memory')return memory(Number(v));
 if(a==='history')return openModal(`<header class="modal-header"><h2 id="modal-title">지난 대화</h2><button data-action="close">닫기 ✕</button></header><div class="history">${ui.history.map(([who,t,o={}])=>`<p><b>${who<0?'윤재의 시선':CAST[who].name}${o.channel==='phone'?' · 문자':o.channel==='note'?' · 책갈피':''}</b>${lines(t)}</p>`).join('')||'<p>아직 나눈 대화가 없어요.</p>'}</div>`);
 if(a==='menu')return openModal(`<header class="modal-header"><h2 id="modal-title">잠깐 쉬어 가기</h2><button data-action="close">닫기</button></header><div class="menu-panel"><button data-action="history">지난 대화</button><button data-action="memories">마음노트</button><p>자리와 진행은 ${mode==='group'?'서버':'이 기기'}에 저장되어 있어요.</p><button data-action="home">처음 화면으로</button>${mode==='group'?'<button data-action="leave">모둠에서 나가기</button>':''}<a href="./guide.html" target="_blank" rel="noopener">사용법</a></div>`);
 if(a==='leave'){if(!confirm('자리를 비우고 모둠에서 나갈까요? 빈자리 자료는 친구들이 볼 수 있게 됩니다.'))return;await session.leave();return home();}
 if(a==='discover'&&isPhysical(content.puzzle)){const role=Number(v),p=content.puzzle;if(!p.clues.some(c=>c.role===role))return;const key=discoveryKey(p.id,role);ui.discoveredProps=[...new Set([...(ui.discoveredProps||[]),key])];deskView.discovered=ui.discoveredProps;const notes=discoveryNotes(p,deskView);deskView.note=notes.findIndex(c=>c.role===role);deskView.page=0;saveUI();sound.effect('paper');return action('note-open');}
 if(a==='note-open'){const list=s.stage===9?content.evidence.map(e=>({title:e.title,text:e.text})):(isPhysical(content.puzzle)?discoveryNotes(content.puzzle,deskView):clueDeck(content.puzzle)).map(c=>({title:c.title,text:c.pages.join('')}));const note=list[Math.min(deskView.note||0,list.length-1)];if(note){deskView.overlay={kind:'note',...note};deskView.overlayPage=0;renderPuzzle();modal.querySelector('.desk-overlay button')?.focus();}return;}
 if(a==='target-detail'){deskView.overlay={kind:'target',id:v};deskView.overlayPage=0;return renderPuzzle();}
 if(a==='note'){deskView.note=Number(v);deskView.page=0;return renderPuzzle();}
 if(a==='note-page'){deskView.page=Math.max(0,Number(v));return renderPuzzle();}
 if(a==='overlay-page'){deskView.overlayPage=Math.max(0,Number(v));return renderPuzzle();}
 if(a==='overlay-close'){deskView.overlay=null;return renderPuzzle();}
 if(['detail','reference','field-menu'].includes(a)){deskView.overlay={kind:a==='field-menu'?'field':a,id:v};deskView.overlayPage=0;renderPuzzle();modal.querySelector('.desk-overlay button')?.focus();return;}
 if(a==='desk-hint'){if(busy)return;await action('hint');deskView.overlay={kind:'hint',text:currentHints().map((h,n)=>`${n+1}. ${h}`).join('\n\n')};deskView.overlayPage=0;return renderPuzzle();}
 if(a==='pick'){sound.effect('paper');draft={picked:v};return draftChanged();}
 if(a==='field-value'){const bits=v.split(':'),id=bits[0];if(bits.length===3)draft[id]={...(draft[id]||{}),[bits[1]]:bits[2]};else draft[id]=bits[1];deskView.overlay=null;return draftChanged();}
 if(a==='select'){if(feedback?.kind==='notice')feedback=null;selected=selected===v?'':v;sound.effect('paper');return renderPuzzle();}if(a==='place')return selectPlace(v);if(a==='unplace'){if(['order','select-order'].includes(content.puzzle.type)){draft.order[Number(v)]='';}else for(const id of Object.keys(draft))if(draft[id]===v)draft[id]='';selected='';return draftChanged();}
 if(a==='candidate'){const [id,choice]=v.split(':');const reasons=chosenReasons(draft[id]);draft[id]={choice,reasons,reason:reasons[0]||0};return draftChanged();}
 if(a==='reason'){const [id,value]=v.split(':'),n=Number(value);if(draft[id]?.choice!=='제외'||![1,2,3,4].includes(n))return;const old=chosenReasons(draft[id]),reasons=old.includes(n)?old.filter(x=>x!==n):[...old,n].sort((a,b)=>a-b);draft[id]={choice:'제외',reasons,reason:reasons[0]||0};return draftChanged();}
 if(a==='reset-draft'){draft=s.stage===9?{turns:draft.turns||0,sequence:[]}:{};selected='';return draftChanged();}
 if(a==='rotate'&&s.stage===9){draft={turns:((draft.turns||0)+1)%4,sequence:draft.sequence||[]};return draftChanged();}
 if(a==='undo'&&s.stage===9){draft={turns:draft.turns||0,sequence:(draft.sequence||[]).slice(0,-1)};return draftChanged();}
 if(a==='drawer'&&s.stage===9){if(!/^[A-I]$/.test(v)||(draft.sequence||[]).length>=content.moveCount+1)return;draft={turns:draft.turns||0,sequence:[...(draft.sequence||[]),v]};sound.effect('tap');return draftChanged();}
 if(a==='inspect-cabinet'&&s.stage===9){if(busy)return;busy=true;try{await flushDraft();if(!content.cabinet?.found)await event({type:'inspect-cabinet',stage:9});if(s.stage===9)openCabinet();}finally{busy=false;if(panel==='puzzle')renderPuzzle();}return;}
 if(a==='back-final')return openPuzzle();
 if(a==='hint'){if(busy)return;busy=true;try{await flushDraft();await event({type:'hint',stage:s.stage});}finally{busy=false;if(panel==='puzzle')renderPuzzle();}return;}
 if(a==='submit'){if(busy)return;busy=true;try{await flushDraft();if(mode==='group'&&session.data.group.status!=='playing')return toast('수업이 진행 중일 때 제출할 수 있어요.');await event({type:'submit',stage:s.stage,draftVersion:s.draftVersion,attemptId:secret()});}finally{busy=false;if(panel==='puzzle')renderPuzzle();}return;}
 if(a==='photo-page'){photoPage=Number(v);return photos();}if(a==='photos')return photos();if(a==='inspect-photo')return inspectPhoto(v);
 if(a==='photo'){if(mode==='group'&&session.data.group.status!=='playing')return toast('선생님이 수업을 시작하면 확인할 수 있어요.');closeModal();await event({type:'photo',stage:s.stage,id:v});return;}
 if(a==='confession')return confession();if(a==='letter')return confess();if(a==='replay-ending'){ui.seen=ui.seen.filter(k=>!['walk','confession','said'].includes(k));ui.dialogue=null;dialogue=null;return confession();}
 }catch(e){toast(e.message);}}

function petals(){return Array.from({length:9},(_,n)=>`<i style="--n:${n}" aria-hidden="true"></i>`).join('');}
function schoolMap(){openModal(`<header class="modal-header"><h2 id="modal-title">장소 이동</h2><button data-action="close">돌아가기 ✕</button></header><nav class="school-map" aria-label="학교 지도">${Object.entries(ROOMS).map(([key,r])=>`<button data-action="move" data-value="${key}" aria-current="${room===key}" ${s.stage<r.unlock?'disabled':''}><b>${r.name}</b><small>${r.caption}</small></button>`).join('')}</nav>`);}
function inspectObject(id){const a=EXPLORE[room]?.find(x=>x.id===id);if(!a)return;if(s.stage===8&&room==='classroom'&&spots().some(x=>x.id===id))return inspectPhoto(id);sound.effect('paper');openModal(`<header class="modal-header"><h2 id="modal-title">${a.name}</h2><button data-action="close">돌아가기 ✕</button></header><div class="object-story"><p>${lines(a.text)}</p></div>`);}

function memories(){openModal(`<header class="modal-header"><div><small>지나온 순간을 한 장씩</small><h2 id="modal-title">윤재의 마음노트</h2></div><button data-action="close">닫기 ✕</button></header><div class="memory-list">${MEMORIES.map((m,n)=>m.stage<=s.stage?`<button data-action="memory" data-value="${n}"><small>${m.place}</small><b>${m.title}</b><span>펼쳐 보기 ↗</span></button>`:`<div class="locked-memory"><small>${m.place}</small>아직 쓰지 않은 페이지</div>`).join('')}</div>`);}
function memory(n){const m=MEMORIES[n];if(!m||m.stage>s.stage)return;sound.effect('paper');openModal(`<header class="modal-header"><h2 id="modal-title">${m.title}</h2><button data-action="memories">마음노트로</button></header><article class="memory-paper"><small>${m.place}에서, 윤재</small><p>${lines(m.text)}</p><span>오늘, 너에게.</span></article>`);}
root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)action(b.dataset.action,b.dataset.value);});
modal.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)action(b.dataset.action,b.dataset.value);});
modal.addEventListener('submit',e=>{if(e.target.id==='join-form'){e.preventDefault();const f=new FormData(e.target);connect({code:String(f.get('code')),name:String(f.get('name')),team:Number(f.get('team')),role:Number(f.get('role'))});}});
modal.addEventListener('change',e=>{if(busy)return renderPuzzle();const el=e.target;if(el.dataset.field){if(el.dataset.part)draft[el.dataset.field]={...(draft[el.dataset.field]||{}),[el.dataset.part]:el.dataset.part==='reason'?Number(el.value):el.value};else draft[el.dataset.field]=el.value;draftChanged();}});
modal.addEventListener('dragstart',e=>{const el=e.target.closest('[data-action="select"]');if(el){selected=el.dataset.value;e.dataTransfer.setData('text/plain',selected);}});
modal.addEventListener('dragover',e=>{if(e.target.closest('[data-drop]'))e.preventDefault();});modal.addEventListener('drop',e=>{const el=e.target.closest('[data-drop]');if(el){e.preventDefault();selectPlace(el.dataset.drop);}});
modal.addEventListener('cancel',e=>{e.preventDefault();action('close');});
document.addEventListener('keydown',e=>{if(dialogue&&!modal.open&&['Enter',' '].includes(e.key)&&!e.target.matches('button,input')){e.preventDefault();nextLine();}});
let puzzleResizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(puzzleResizeFrame);puzzleResizeFrame=requestAnimationFrame(()=>{if(panel==='puzzle')renderPuzzle();});});
document.addEventListener('visibilitychange',()=>{saveUI();saveSolo();});
home();
