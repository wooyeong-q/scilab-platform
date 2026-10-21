import {EXPLORATION} from './exploration.mjs';
import {SAMPLE} from './sample.mjs';
import {playSound,stopSounds,warmSounds,setAmbience} from './sound.mjs';
import {validateLesson,playerContent,exitCode,answerMatches} from './content.mjs';
import {PUZZLE_EVENTS,previewState} from './engine.mjs';
import {nextWorldEvent} from './world-events.mjs';
import {puzzleMarkup,freshDraft,changeDraft,submission} from './puzzle-ui.mjs';
import {Author} from './author.mjs';
import {ROOMS,CARDS,PHOTOS,LIBRARY_BOOKS,PHOTO_DIGITS,SYMBOL_KEY,EXIT_ROUTE,ROUTE_ARROWS,EXIT_CODE_LENGTH,rotatedGrid,exitSide,fresh,has,goal,act,restore,inventory} from './engine.mjs';
import {scene,sceneSpots,corridor,courtyard,photoArt,ghost,detailArt,foundBookArt,worldEventArt} from './art.mjs';
import {GroupSession,ROLE_NAMES,RECORD_ROLES,PHOTO_ROLES} from './group-client.mjs';
const $=s=>document.querySelector(s),app=$('#app'),dialog=$('#dialog'),content=$('#dialog-content');
const KEY='scilab-common-escape-solo-v2';
let currentLesson=SAMPLE,activePuzzle=null,puzzleRole=1,stagePreview=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.lesson)currentLesson=validateLesson(saved.lesson);}catch{}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={arrow:'M4 12h16m-6-6 6 6-6 6',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',file:'M6 3h8l4 4v14H6Zm8 0v5h4M9 12h6m-6 4h6',book:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',sound:'m3 9 4 0 5-4v14l-5-4H3Zm13-2c3 3 3 7 0 10m3-13c5 4 5 12 0 16',mute:'m3 9 4 0 5-4v14l-5-4H3Zm13 0 5 6m0-6-5 6',close:'m6 6 12 12M6 18 18 6',gear:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-1-5h2l1 3 3 1 3-1 1 2-2 3v2l2 3-1 2-3-1-3 1-1 3h-2l-1-3-3-1-3 1-1-2 2-3v-2L3 8l1-2 3 1 3-1Z',target:'M12 3v4m0 10v4M3 12h4m10 0h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',check:'m5 12 4 4L19 6',photo:'M3 5h18v14H3Zm0 11 6-6 4 4 3-3 5 5M16 8h.01',home:'m3 10 9-7 9 7M6 9v12h12V9M10 21v-8h4v8'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[n]||icons.file}"/></svg>`;
let state;try{state=restore(JSON.parse(localStorage.getItem(KEY))?.state)}catch{state=fresh()}
let view='home',pending=null,effectBusy=false,toastTimer=0,effectTimer=0,endingTimer=0,endingEpoch=0,saveFailure=false,lastFocus=null;
const lockDrafts={drawer:'',exit:''};
let groupMode=false,groupBusy=false,groupStatus='connected',clueRole=1;
const group=new GroupSession(receiveGroup,connectionStatus);
const author=new Author(app,{preview:previewLesson,home:renderHome});
function publicContent(){return groupMode?group.data.content:playerContent(currentLesson,[1,2,3,4],state);}
function exitLength(){return groupMode?group.data.content.exitLength:exitCode(currentLesson.devices).length;}
function photoDigit(id){return groupMode?evidence(PHOTO_ROLES[id])?.photo?.digit||'':currentLesson.devices.photoDigits[id];}
function photoOrder(){return groupMode?evidence(4)?.photoOrder||[]:currentLesson.devices.photoOrder;}
function photoOrderMarkup(){return photoOrder().map(id=>({chair:'의자',book:'책',notice:'게시물'})[id]).join(' → ');}
function lessonMeta(){return groupMode?group.data.content.meta:currentLesson.meta;}
function previewLesson(lesson,id=null){
 const selected=validateLesson(lesson);
 if(id){
  stagePreview={id,state,lesson:currentLesson,groupMode,locks:{...lockDrafts}};
  group.pause();clearEffects();clearEnding();stopSounds();groupMode=false;currentLesson=selected;
  state=previewState(id);state.drafts={};state.sound=false;state.soft=true;
  if(id==='P6')state.photos=[...PHOTOS];
  lockDrafts.drawer='';lockDrafts.exit='';puzzleRole=1;pending=null;view='preview';
  app.innerHTML=`<main class="author-page"><header><div><span class="eyebrow">교사용 · 문제 미리보기</span><h1>${esc(selected.puzzles.find(p=>p.id===id).title)}</h1><p>선택한 문제만 확인합니다. 필요한 자료는 준비되어 있으며, 다음 단계로 넘어가지 않습니다.</p></div>${btn('수업 준비로 돌아가기','preview-exit','',false)}</header></main>`;
  return showPreviewProblem();
 }
 group.pause();groupMode=false;currentLesson=selected;state=fresh();state.drafts={};pending=null;if(dialog.open)dialog.close();start();
}
function showPreviewProblem(){
 if(!stagePreview)return;
 if(stagePreview.id==='P6')return showDrawer();
 if(stagePreview.id==='P7')return showTerminal();
 showCurriculum(stagePreview.id);
}
function exitStagePreview(){
 if(!stagePreview)return;
 const lesson=currentLesson,previous=stagePreview;stagePreview=null;
 state=previous.state;currentLesson=previous.lesson;groupMode=previous.groupMode;Object.assign(lockDrafts,previous.locks);
 activePuzzle=null;pending=null;view='author';if(dialog.open)dialog.close();
 author.lesson=lesson;author.show();
}
async function showDeviceHints(id,next=false){
 let p=publicContent().puzzles.find(p=>p.id===id);if(!p)return;
 if(next||!p.hints.length){await update({type:'hint',id});p=publicContent().puzzles.find(p=>p.id===id);}
 openModal('기록 해석 힌트',paragraph(esc(p.task))+p.hints.map((h,i)=>paper('힌트 '+(i+1),paragraph(esc(h)))).join(''),(p.hints.length<3?btn('다음 힌트','device-next-hint',id,false):'')+closeBtn('기록 다시 살펴보기'),'단계별 도움');
}
function showAuthor(){group.pause();clearEffects();clearEnding();stopSounds();author.lesson=currentLesson;view='author';pending=null;if(dialog.open)dialog.close();author.show();}
function showCurriculum(id,message=''){
 const p=publicContent().puzzles.find(p=>p.id===id);if(!p)return openModal('아직 읽을 수 없는 기록',paragraph('앞에서 찾은 자료가 더 필요하다.'),closeBtn());
 state.drafts||={};state.drafts[id]||=freshDraft(p.type);activePuzzle=id;
 const roles=groupMode?group.data.allowedRoles:[1,2,3,4];if(!roles.includes(puzzleRole))puzzleRole=roles[0];
 openModal(esc(p.title),paragraph(esc(p.intro))+puzzleMarkup(p,state.drafts[id],{role:puzzleRole,roles,group:groupMode?group.data:null,message}),btn('주변 더 살펴보기','close','',false),'마지막 수업 · '+esc(lessonMeta().subject),'curriculum-dialog');
}
async function curriculumClick(action,id){
 const pid=activePuzzle,p=publicContent().puzzles.find(p=>p.id===pid);if(!p)return;
 if(action==='role'){puzzleRole=Number(id);return showCurriculum(pid);}
 if(action==='hint'){await update({type:'hint',id:pid});return showCurriculum(pid);}
 if(action==='submit'){
  if(stagePreview){const correct=answerMatches(currentLesson.puzzles.find(p=>p.id===pid),submission(p,state.drafts[pid]));return showCurriculum(pid,correct?'정답입니다. 이 문제의 확인이 끝났어요. 다시 풀거나 수업 준비로 돌아갈 수 있어요.':'정답이 아닙니다. 자료와 배치를 다시 확인하세요.');}
  const accepted=await update({type:PUZZLE_EVENTS[pid],answer:submission(p,state.drafts[pid])},({P3:'script',P5:'power'})[pid]);
  if(!accepted)return showCurriculum(pid,'아직 맞지 않는다. 모둠원의 기록과 배치를 다시 대조해 보자.');
  if(pid==='P1'){log('locker','교실 · 사물함','자료를 맞추자 사물함의 걸쇠가 풀렸다. 안쪽은 아직 확인하지 않았다.');return showUnlockedLocker();}
  const nextNote={P8:'열쇠 손잡이에 ‘반납 도서 아래’라고 적혀 있다.',P9:'화면 아래에 ‘녹음 장치 연결됨’이라는 표시가 남았다.',P10:'제어 장치의 번호 입력창이 켜졌다.',P2:'반납함이 잠기고, 천장 쪽에서 무언가 밀리는 소리가 났다.',P3:'실제 방송은 방송실에 녹음된다고 적혀 있다. 대본과 배치표를 챙겼다.',P4:'천장 스피커에서 짧게 들렸다. “거기 두세요.”',P5:'제어함에서 사진 세 장을 찾았다. 모두 17:40에 찍힌 사진이다.'}[pid];
  return openModal('복구된 기록',paragraph(esc(p.success))+paragraph(nextNote)+(pid==='P3'?scriptPaper():'')+(pid==='P5'?photosMarkup():''),closeBtn('계속 살펴보기'),'장치 확인');
 }
 changeDraft(p,state.drafts[pid],action,id);persist();showCurriculum(pid);
}

const motionMedia=window.matchMedia('(prefers-reduced-motion: reduce)');
const cardNames={desk1:'정리 자료',desk2:'활동 기록',board:'칠판에 붙은 메모',notebook:'공책 속 낱장'};
const photoInfo={chair:{room:'classroom',n:'①',name:'앞줄 의자',get digit(){return photoDigit('chair')}},book:{room:'library',n:'②',name:'안쪽 책장',get digit(){return photoDigit('book')}},notice:{room:'entrance',n:'③',name:'게시판',get digit(){return photoDigit('notice')}}};
const roomInfo={classroom:'문이 닫히자 복도 소리가 끊겼다. 시계는 5시 40분에 멈춰 있다.',library:'조금 전까지 들리던 발소리가 문 앞에서 멎었다. 반납함 안에서 종이 스치는 소리가 난다.',broadcast:'마이크의 전원선이 바닥에 놓여 있다. 천장 스피커에서는 방송이 계속 나온다.',entrance:'운동장은 평소와 같다. 유리문 손잡이는 움직이지 않는다.'};
function persist(){if(stagePreview)return;if(groupMode){group.saveLocal(state);return;}try{localStorage.setItem(KEY,JSON.stringify({lesson:currentLesson,state}));}catch{if(!saveFailure){saveFailure=true;toast('자동 저장을 사용할 수 없어요. 이 창을 열어 둔 채 진행해 주세요.')}}}
function dispatch(event){const result=act(state,event,currentLesson);state=result.state;if(result.accepted)persist();return result.accepted;}
function log(id,title,text){dispatch({type:'journal',id,title,text});}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4300);}
function sound(kind='tap',pan=0){if(state.sound){warmSounds();playSound(kind,pan);}}
function syncAmbience(){setAmbience(view==='game'&&state.sound&&!state.soft&&!document.hidden&&(!groupMode||group.data.group.status==='playing'));}
function clearEnding(){clearTimeout(endingTimer);endingTimer=0;endingEpoch++;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSounds();else syncAmbience();});

function openModal(title,body,buttons='',tag='조사 기록',kind=''){
 if(stagePreview){tag='문제 미리보기 · '+stagePreview.id;body=`<nav class="preview-navigation" aria-label="미리보기 이동">${btn('수업 준비로 돌아가기','preview-exit','',false)}${btn('문제 화면','preview-problem','',false)}</nav>`+body;buttons=btn('수업 준비로 돌아가기','preview-exit');}
 if(kind!=='curriculum-dialog')activePuzzle=null;
 if(!dialog.open)lastFocus=document.activeElement;
 dialog.className=kind;
 content.innerHTML=`<div class="modal-inner"><div class="modal-head"><div><div class="eyebrow">${tag}</div><h2 id="dialog-title">${title}</h2></div><button class="close" data-action="close" aria-label="닫기">${icon('close')}</button></div>${body}${buttons?`<div class="modal-actions">${buttons}</div>`:''}</div>`;
 if(!dialog.open)dialog.showModal();
}
const btn=(label,action,id='',primary=true)=>`<button class="${primary?'primary':'ghost-button'}" data-action="${action}"${id?` data-id="${id}"`:''}>${label}${primary?icon('arrow'):''}</button>`;
const closeBtn=(label='확인')=>btn(label,'close');
const paragraph=t=>`<p class="story-text">${t}</p>`;
const paper=(title,text,stamp='')=>`<div class="paper"><small>교내 보관 자료</small>${stamp?`<span class="stamp">${stamp}</span>`:''}<h3>${title}</h3>${text}</div>`;
function returnSlip(){return paper('수업 자료 반납 확인표','<p>보관 장소: 도서관 반납함</p><p>반납 도서: 4권</p><p class="tiny">반납함 위쪽 투입구에 넣어 주세요.</p>','확인');}
function showUnlockedLocker(){openModal('사물함의 잠금이 풀렸다',paragraph(esc(publicContent().puzzles.find(p=>p.id==='P1').success))+detailArt('locker',state)+paragraph('문틈이 조금 벌어졌다. 손잡이를 당길 수 있을 것 같다.'),btn('사물함 열어 보기','locker-open')+btn('주변 더 살펴보기','close','',false),'교실 · 사물함');}
function showLockerContents(){
 if(has(state,'locker-records'))return openModal('열린 사물함',paragraph('바닥에 봉투만 남아 있다. 안에 있던 반납 확인표와 기호표는 챙겼다.'),closeBtn());
 openModal('사물함 안의 봉투',detailArt('locker',state)+paragraph('문을 당기자 맨 아래 칸에 낡은 봉투가 보인다. 봉투를 펼치니 종이 두 장이 들어 있다.')+`<div class="found-envelope"><span>사물함 안에서 발견</span><strong>수업 자료 반납</strong><div class="found-records">${returnSlip()}${paper('출입 장치 · 기호표',keySheet()+'<p class="tiny">반납 확인표와 같은 봉투에 들어 있다.</p>')}</div></div>`,btn('반납 확인표와 기호표 챙기기','locker-take')+btn('잠시 내려놓기','close','',false),'교실 · 사물함 안');
}
function showLibraryBook(id){
 const i=publicContent().puzzles.find(p=>p.id==='P2')?.items.find(i=>i.id===id);if(!i)return;
 const descriptions={A:'대출대 가장자리에 책 한 권이 남아 있다.',B:'보관 덮개 앞에 반납하지 않은 책 한 권이 놓여 있다.',C:'책장 사이 바닥에 책 한 권이 떨어져 있다. 주변 먼지에 신발 자국이 남아 있다.',D:'안쪽 책장 아래 칸에 다른 책들과 따로 놓인 책이 있다.'};
 openModal('반납하지 않은 책',paragraph(descriptions[id])+`<div class="found-book"><div class="book-object">${foundBookArt(id)}</div><div><small>수업 자료</small><strong>${esc(i.label)}</strong><span>표지 안쪽에 기록이 끼워져 있다.</span></div></div>`,btn('책과 기록 챙기기','library-book-take',id)+btn('그대로 두기','close','',false),'도서관 · '+LIBRARY_BOOKS[id].where);
}
function libraryBookPaper(i){return paper(esc(i.label),paragraph(esc(i.text))+(i.image?`<img class="material-image" src="${esc(i.image)}" alt="${esc(i.alt)}" referrerpolicy="no-referrer">`:'')+`<p class="tiny">찾은 곳 · ${LIBRARY_BOOKS[i.id].where}</p>`);}
const scriptObservation='현관에서 들은 방송은 교실로 가라고 했다. 이 대본은 현관으로 나가라고 한다.';
const scriptPaper=()=>paper('하교 안내 · 원본','<p>교내에 남아 있는 학생은 중앙 현관으로 이동해 주십시오.</p><p>퇴실할 때 교실 문은 열어 두시기 바랍니다.</p><div class="rule"></div><p><strong>방송 확인 안내</strong><br>실제 방송은 <strong>방송실</strong>에 녹음됩니다.<br>내용이 다르면 녹음 기록을 확인해 주세요.</p>');
function closeModal(){if(stagePreview)return exitStagePreview();dialog.close();}
dialog.addEventListener('close',()=>{
 if(dialog.open)return;if(stagePreview)return exitStagePreview();const task=pending;pending=null;const f=lastFocus;if(f?.isConnected)f.focus({preventScroll:true});
 if(view==='game')setTimeout(()=>{
  if(view!=='game'||dialog.open)return;
  if(task?.opening==='broadcast')return showOpeningBroadcast();
  if(task?.opening==='complete')return finishOpening();
  const finish=()=>runWorldEvent(()=>task?.goal&&showGoal());
  if(task?.scare)runScare(task.scare,finish);else finish();
 },100);
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function queueProgress(previous,scare){const changed=goal(state).id!==previous;pending={goal:changed||pending?.goal,scare:scare||pending?.scare};renderGame();}
async function update(event,scare){if(stagePreview)return event.type==='hint'?dispatch(event):false;if(groupMode&&group.data.group.status==='ended'){toast('수업이 종료되었습니다.');return false;}const prev=goal(state).id;if(groupMode){if(groupBusy)return false;groupBusy=true;try{const next=await group.send('event',{...event,room:state.room});mergeGroup(next);if(!next.accepted)return false;}catch(error){toast(error.message);return false;}finally{groupBusy=false;}}else if(!dispatch(event))return false;sound(({locker:'latch','locker-open':'latch','locker-records':'paper','library-book':'paper',collect:'paper',returns:'latch',script:'paper',compare:'unlock',power:'switch',order:'unlock',unlock:'unlock'})[event.type]||'tap');queueProgress(prev,scare);return true;}
function showGoal(){if(view!=='game'||state.finished)return;if(openingActive())return showOpening();const g=goal(state);sound('goal');openModal(g.title,`<div class="goal-number">${g.chapter}</div><div class="goal-rule"></div>${paragraph(g.text)}<p class="subtle">현재 목표는 화면 위에서 다시 확인할 수 있어요.</p>`,closeBtn('계속 탐색하기'),'새로운 목표','goal-modal');}
function renderHome(){
 author.pause();group.pause();if(groupMode){group.saveLocal(state);groupMode=false;try{state=restore(JSON.parse(localStorage.getItem(KEY))?.state);}catch{state=fresh();}}
 view='home';pending=null;clearEnding();clearEffects();stopSounds();if(dialog.open)dialog.close();
 app.innerHTML=`<section class="landing">${corridor()}<header class="landing-head"><span class="brand">SCILAB <span style="opacity:.45;margin:0 12px">/</span> SCHOOL ARCHIVE</span><span class="badge">4인 모둠 탐색</span></header><div class="landing-copy"><div class="eyebrow">AFTER THE LAST CLASS</div><h1>마지막<br>방송</h1><p class="lead">수업이 끝났는데, 현관문이 열리지 않는다.<br>그때 교실로 돌아가라는 방송이 나왔다.</p><div class="landing-actions">${window.__commonEscapeOffline?'':btn('수업에 참가','group-gate','join')}${btn('교사 · 수업 준비','author','',false)}${group.available&&!window.__commonEscapeOffline?btn('내 모둠 이어하기','group-resume','',false):''}<div class="solo-actions">${state.started&&!state.finished?btn('혼자 이어서 체험','resume','',false):btn('혼자 체험하기','new','',false)}${state.finished?btn('마지막 장면 다시 보기','ending-replay','',false):''}${btn('사용법','about','',false)}</div></div></div><footer class="landing-foot"><p>지도 이동 · 물건 조사 · 학교 괴담<br>각자의 단서를 모아 함께 탈출하세요.<br>빈자리의 단서는 남은 모둠원이 확인할 수 있어요.</p><div class="landing-clock">17:40<small>AFTER SCHOOL</small></div></footer></section>`;
}
function isDone(id){if(id.startsWith('explore:'))return state.seen.includes(id);return ({desk:state.cards.includes('desk1')&&state.cards.includes('desk2'),board:state.cards.includes('board'),notebook:state.cards.includes('notebook'),locker:has(state,'locker-records'),'fallen-box':has(state,'archive'),monitor:has(state,'monitor'),relay:has(state,'relay'),returns:has(state,'returns'),books:has(state,'script'),recorder:has(state,'compared'),control:has(state,'power'),drawer:has(state,'order'),chair:state.photos.includes('chair'),book:state.photos.includes('book'),notice:state.photos.includes('notice'),terminal:has(state,'unlocked')})[id]||false;}
function renderGame(){
 if(effectBusy)return;
 if(state.finished){renderEnding();return;}clearEnding();view='game';document.body.classList.toggle('no-motion',state.soft);syncAmbience();
 const r=ROOMS[state.room],g=openingActive()?{chapter:'17:40 · 하교',title:'잠긴 중앙 현관',text:'현관문이 열리지 않는다.'}:goal(state),items=inventory(state),pan=$('.scene-pan'),panLeft=pan?.scrollLeft||0;
 app.innerHTML=`<div class="game ${groupMode?'has-group':''}"><header class="topbar"><div class="row"><button class="wordmark" data-action="home">마지막 방송</button><span class="tiny-tag">${groupMode?esc(group.data.group.name):esc(lessonMeta().subject)+' · 개인 체험'}</span></div><div class="top-actions">${!groupMode?'<button class="utility" data-action="author">수업 준비</button>':''}<button class="map-trigger" data-action="map">${icon('map')}학교 지도</button><span class="clock">17:40</span><button class="utility" data-action="sound" aria-label="${state.sound?'소리 끄기':'소리 켜기'}" aria-pressed="${state.sound}">${icon(state.sound?'sound':'mute')}<span class="button-text">${state.sound?'소리 켜짐':'소리 꺼짐'}</span></button><button class="utility" data-action="settings" aria-label="설정">${icon('gear')}</button></div></header>${groupMode?groupBar():''}<section class="goalbar" aria-label="현재 목표"><span class="goal-icon">${icon('target')}</span><div class="goalcopy"><span>현재 목표 · ${groupMode&&group.data.group.status==='ended'?'수업 종료':g.chapter}</span><h2>${g.title}</h2><p>${g.text}</p></div><button class="goal-reopen" data-action="goal">다시 보기</button></section><section class="scene-wrap" aria-label="${r.name} 탐색"><div class="scene-pan"><div class="scene-inner">${scene(state.room,state)}<div class="scene-vignette"></div>${sceneSpots(state.room,state).map(([id,label,x,y,type])=>`<button class="hotspot ${x>72?'label-left':''} ${type||'current'} ${isDone(id)?'done':''}" style="left:${x}%;top:${y}%" data-action="inspect" data-id="${id}" aria-label="${label} 조사${isDone(id)?', 확인 완료':''}"><span class="hotspot-dot"></span><span class="hotspot-label">${label}</span></button>`).join('')}</div></div><div class="scene-label"><div class="room-no">LOCATION / ${r.no}</div><h1>${r.name}</h1><p>${r.caption}</p></div><div class="room-objects" aria-label="현재 장소 조사 목록">${sceneSpots(state.room,state).map(([id,label])=>`<button data-action="inspect" data-id="${id}" class="${isDone(id)?'checked':''}"><span>${label}</span>${isDone(id)?'<small>확인함</small>':''}</button>`).join('')}</div></section><footer class="inventorybar"><button class="bag-button" data-action="bag">${icon('file')}수집한 기록 <b>${items.length}</b></button><span class="footer-tip">물건의 표시를 눌러 조사하세요</span><button class="journal-button" data-action="journal">${icon('book')}탐색 기록</button></footer></div>`;
 const nextPan=$('.scene-pan');if(nextPan)nextPan.scrollLeft=panLeft;
}
function openingActive(){return state.seen.includes('opening:door')&&!state.seen.includes('opening:complete');}
function beginOpening(){
 state.room='entrance';dispatch({type:'seen',id:'opening:door'});
 log('start','17:40 · 중앙 현관','마지막 수업이 끝난 뒤 가방을 챙겨 현관으로 내려왔다. 손잡이를 당겼지만 문이 열리지 않았다.');
 showOpening();
}
function showOpening(){
 if(state.seen.includes('opening:broadcast'))return showOpeningBroadcast();
 renderGame();openModal('잠긴 현관문',`<div class="dialog-intro"><div class="intro-meta">오늘 마지막 수업 · ${esc(lessonMeta().subject)}</div><div class="intro-time">17:40</div>${paragraph('수업이 끝난 뒤 가방을 챙겨 중앙 현관으로 내려왔다.\n손잡이를 당겼지만 문이 열리지 않는다.')}${paragraph('유리 너머로 운동장이 보인다.\n문 옆의 출입 장치는 꺼져 있다.')}</div>`,btn('문을 다시 당겨 보기','opening-next')+btn(state.sound?'배경음·효과음 끄기':'배경음·효과음 켜기','sound','',false),'프롤로그');
 pending={opening:'broadcast'};
}
function showOpeningBroadcast(){
 dispatch({type:'seen',id:'opening:broadcast'});renderGame();sound('broadcast');
 openModal('현관 스피커에서 들린 방송',paragraph('문을 한 번 더 당겼다. 잠금장치가 짧게 흔들릴 뿐이다.\n그때 머리 위 스피커에서 잡음이 났다.')+'<blockquote class="speech"><small>교내 방송</small>“교내에 남아 있는 학생은 교실로 이동해 주십시오.”<br>“교실 문은 닫아 두시기 바랍니다.”</blockquote>'+paragraph('방송이 끊겼다. 복도 쪽은 조용하다.'),btn('방송 확인','opening-next'),'17:40 · 중앙 현관');
 pending={opening:'complete'};
}
function finishOpening(){
 dispatch({type:'seen',id:'opening:complete'});
 log('opening-broadcast','중앙 현관 · 안내 방송','현관문은 잠겨 있었다. 스피커에서 교실로 이동하고 문을 닫아 두라는 안내가 나왔다.');
 renderGame();showGoal();
}
function start(){author.pause();stopSounds();lockDrafts.drawer='';lockDrafts.exit='';const preferences={sound:state.sound,soft:state.soft};state={...fresh(),...preferences};state.drafts={};dispatch({type:'start'});beginOpening();}

function showMap(){openModal('학교 지도',`${paragraph('장소를 누르면 이동합니다. 아직 확인하지 못한 곳도 먼저 둘러볼 수 있어요.')}<div class="map"><div class="map-grid">${Object.entries(ROOMS).map(([id,r])=>`<button class="map-room ${state.room===id?'here':''}" data-action="move" data-id="${id}"><small>${r.no} / 1층</small><strong>${r.name}</strong>${state.room===id?'<span class="here-tag">현재 위치</span>':''}</button>`).join('')}</div><div class="map-legend"><span>본관 1층</span><span>중앙 현관 → 운동장</span></div></div>`,btn('탐색으로 돌아가기','close','',false),'이동');}
function move(room){if(!ROOMS[room])return;pending=null;dispatch({type:'move',room});closeModal();renderGame();sound('step');if(!state.seen.includes(`room:${room}`)){dispatch({type:'seen',id:`room:${room}`});log(`room:${room}`,ROOMS[room].name,roomInfo[room]);toast(roomInfo[room]);}runWorldEvent();}
function showDesk(){openModal('교탁 서랍',paragraph('서랍을 당기자 종이 두 장이 걸린다. 오늘 마지막 수업에서 보던 자료다.')+`<div class="card-grid">${['desk1','desk2'].map((id,i)=>`<div class="record-card ${state.cards.includes(id)?'taken':''}"><small>수업 자료 / 0${i+1}</small><div class="row"><strong>${cardNames[id]}</strong>${state.cards.includes(id)?'<span class="subtle">챙김</span>':groupMode&&!canRole(RECORD_ROLES[id])?`<span class="subtle">${RECORD_ROLES[id]}번 담당</span>`:`<button data-action="collect" data-id="${id}">챙기기${groupMode?' · '+RECORD_ROLES[id]+'번':''}</button>`}</div><p>${i?'접힌 모서리에 분필 가루가 묻어 있다.':'책상 아래쪽에서 꺼낸 종이다.'}</p></div>`).join('')}</div>`,closeBtn('서랍 닫기'));}
function showPaperCard(id){const board=id==='board';openModal(board?'칠판에 붙은 종이':'창가 책상',paragraph(board?'칠판 구석에 종이 한 장이 붙어 있다. 자석을 떼니 뒷면에도 필기가 보인다.':'공책을 펼치니 낱장이 끼워져 있다. 필기는 중간에서 끊겨 있다.')+paper(cardNames[id],'<p>마지막 수업에서 사용한 자료다.<br>교탁에서 찾은 종이와 같은 묶음인 것 같다.</p>'),state.cards.includes(id)?closeBtn():btn('자료 챙기기','collect',id));}
function photosMarkup(){if(groupMode)return `<div class="photo-set group-photos">${PHOTOS.map(id=>{const role=PHOTO_ROLES[id];return canRole(role)?`<button class="photo ${state.photos.includes(id)?'found':''}" data-action="photo-detail" data-id="${id}">${photoArt(id,false)}<div class="photo-caption"><b>${role}번 사진</b>${state.photos.includes(id)?'기록한 숫자 · '+evidence(role)?.photo?.digit:'17:40'}</div></button>`:`<div class="photo-hidden"><b>${role}번 사진</b><span>담당 모둠원이 확인</span></div>`;}).join('')}</div>`;return `<div class="photo-set">${PHOTOS.map(id=>{const p=photoInfo[id];return `<button class="photo ${state.photos.includes(id)?'found':''}" data-action="photo-detail" data-id="${id}">${photoArt(id,false)}<div class="photo-caption"><b>사진 ${p.n}</b>${state.photos.includes(id)?`기록한 숫자 · ${p.digit}`:'17:40'}</div></button>`;}).join('')}</div>`;}
function showPhoto(id,local=false){const p=photoInfo[id];if(!p)return;if(groupMode&&!canRole(PHOTO_ROLES[id]))return openModal('모둠원의 사진',restricted(PHOTO_ROLES[id]),closeBtn());const found=state.photos.includes(id);
 const desc={chair:'사진 속 의자는 책상 안으로 들어가 있다. 지금은 통로 쪽으로 나와 문을 향하고 있다.',book:'사진에서는 책등이 보인다. 지금은 이 책만 종이 단면이 밖을 향하고 있다.',notice:'사진 속 게시물은 평평하다. 지금은 오른쪽 아래 모서리가 접혀 있다.'};
 openModal(local?`${groupMode?'':p.n+' '}${p.name}`:groupMode?'담당 사진':`사진 ${p.n}`,paragraph(local?desc[id]:'사진 구석에 17:40이라고 찍혀 있다. 조금 전 지나온 곳 같은데, 무언가 다르다.')+(local?`<div class="photo-view"><figure>${photoArt(id,false)}<figcaption>방송실에서 찾은 사진</figcaption></figure><figure>${photoArt(id,true)}<figcaption>지금 눈앞의 모습</figcaption></figure></div>`:`<figure class="single-photo">${photoArt(id,false)}<figcaption>${groupMode?'담당 사진':'사진 '+p.n} · 17:40</figcaption></figure>`)+(found?`<div class="number-found"><strong>${p.digit}</strong><span>이 자리에서 찾은 숫자.<br>사진과 함께 기록해 두었다.</span></div>`:''),local&&!found?btn({chair:'의자 옆 살펴보기',book:'책 꺼내 보기',notice:'접힌 부분 펼치기'}[id],'photo-found',id):closeBtn(),'사진 대조');}
async function showRecorder(){
 if(!has(state,'monitor'))return openModal('녹음 장치',paragraph(has(state,'script')?'재생 표시가 꺼져 있다. 옆 모니터에는 기록 복원이 필요하다고 표시된다.':'재생 버튼을 눌러도 반응이 없다. 화면과 연결된 케이블이 모니터 뒤로 이어진다.'),closeBtn());
 if(!has(state,'transcript')){if(!await update({type:'transcript'}))return;log('transcript','방송실 · 남아 있는 녹음','17:40의 하교 안내와 마지막 수업의 복습 방송이 남아 있다.');}
 if(!has(state,'script'))return openModal('남아 있는 녹음',paragraph('교실로 이동하고 문을 닫으라는 안내가 반복된다. 원본 대본과 대조할 자료가 필요하다.'),closeBtn());
 return showCurriculum('P4');
}

function keySheet(){if(groupMode&&!canRole(1))return restricted(1);return `<div class="symbol-key">${Object.entries(groupMode?(evidence(1)?.key||{}):currentLesson.devices.key).map(([symbol,n])=>`<span><b>${symbol}</b><i>→</i><strong>${n}</strong></span>`).join('')}</div>`;}
function gridSheet(){if(groupMode&&!canRole(2))return restricted(2);const side=exitSide(state.gridTurns),arrows={top:'↑',right:'→',bottom:'↓',left:'←'};return `<div class="board-widget"><div class="board-frame"><span class="board-exit ${side}"><b aria-hidden="true">${arrows[side]}</b><span>현관</span></span><div class="symbol-grid" aria-label="세 행 세 열의 배치표">${rotatedGrid(state.gridTurns,groupMode?{grid:evidence(2).grid.map(c=>c.symbol),start:evidence(2).grid.findIndex(c=>c.start),skip:evidence(2).grid.findIndex(c=>c.skip)}:currentLesson.devices).map(c=>`<span class="${c.start?'start-cell':''} ${c.skip?'crossed-cell':''}" aria-label="${c.symbol}${c.start?', 시작점':''}${c.skip?', 줄이 그어진 칸':''}">${c.start?'<small>시작</small>':''}${c.symbol}</span>`).join('')}</div></div><div class="board-controls"><button data-action="rotate-grid" data-id="-1" aria-label="배치표 왼쪽으로 돌리기">↶ 왼쪽</button><button data-action="rotate-grid" data-id="1" aria-label="배치표 오른쪽으로 돌리기">오른쪽 ↷</button></div></div>`;}
function orderSheet(){if(groupMode)return groupRouteSheet()+groupRuleSheet();return `<div class="route-note"><p>현관 표시가 <strong>아래</strong>로 오게 맞춘다.</p><p>시작점에서 화살표마다 <strong>한 칸씩</strong> 이동한다.</p><div class="route-steps" aria-label="오른쪽, 아래, 오른쪽, 아래, 왼쪽, 위">${currentLesson.devices.route.map((dir,i)=>`<span><small>${i+1}</small>${ROUTE_ARROWS[dir]}</span>`).join('')}</div><p>도착한 칸만 순서대로 기록한다.<br>줄이 그어진 칸은 <strong>지나가되 적지 않는다.</strong></p></div>`;}
function exitEvidence(){if(groupMode)return `<div class="evidence-sheets group-evidence">${[[1,'기호표',keySheet()],[2,'배치표',gridSheet()],[3,'이동 기록',has(state,'order')?groupRouteSheet():'아직 찾지 못한 기록'],[4,'점검 기록',has(state,'order')?groupRuleSheet():'아직 찾지 못한 기록']].map(([role,label,html])=>`<section class="evidence-paper"><h3>${role}번 · ${label}</h3>${html}</section>`).join('')}</div>`;return `<div class="evidence-sheets"><section class="evidence-paper"><h3>기호표</h3>${keySheet()}</section><section class="evidence-paper"><h3>배치표</h3>${gridSheet()}</section><section class="evidence-paper order-paper ${has(state,'order')?'':'missing'}"><h3>순서표</h3>${has(state,'order')?orderSheet():'<p>이 부분의 기록은 아직 없다.</p>'}</section></div>`;}
function lockPanel(id,length,message='',ready=true){const value=lockDrafts[id];return `<section class="lock-panel" data-lock="${id}" aria-label="${length}자리 번호 잠금"><span class="lock-label">${id==='drawer'?'보조 서랍':'현관 출입 장치'}</span><div id="lock-readout" class="lock-readout" tabindex="0" aria-label="입력된 번호 ${value||'없음'}, ${length}자리"><span aria-hidden="true">${Array.from({length},(_,i)=>`<b>${value[i]||'—'}</b>`).join('')}</span></div><p class="lock-message" role="status">${esc(message||(ready?'번호를 입력하세요.':'아직 확인하지 못한 기록이 있다.'))}</p><div class="number-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-action="lock-digit" data-id="${id}:${n}" aria-label="숫자 ${n}">${n}</button>`).join('')}<button data-action="lock-erase" data-id="${id}" aria-label="한 자리 지우기">←</button><button data-action="lock-digit" data-id="${id}:0" aria-label="숫자 0">0</button><button class="lock-enter" data-action="lock-submit" data-id="${id}"${ready?'':' disabled'}>열기</button></div></section>`;}
function focusLock(){$('#lock-readout')?.focus({preventScroll:true});}
function showDrawer(message=''){
 if(has(state,'order'))return openModal('보조 서랍',paragraph('안에 있던 순서표를 챙겼다. 열린 서랍에는 아무것도 없다.'),closeBtn());
 const records=has(state,'power')?photosMarkup():'<div class="empty-evidence">손잡이 옆에 ① ② ③이 적힌 작은 사진 케이스가 있다. 케이스는 비어 있다.</div>';
 openModal('보조 서랍',paragraph(esc(publicContent().puzzles.find(p=>p.id==='P6')?.intro||'손잡이에 세 자리 번호 잠금이 달려 있다.'))+paragraph('손잡이에 세 자리 번호 잠금이 달려 있다.')+`<div class="lock-layout"><div><div class="paper lock-note"><small>손잡이에 붙은 표시</small>${groupMode?(canRole(4)?'<p class="photo-order group-order">'+photoOrderMarkup()+'</p>':restricted(4)):'<p class="photo-order">'+photoOrderMarkup()+'</p>'}</div>${records}</div>${lockPanel('drawer',3,message,has(state,'power')&&state.photos.length===3)}</div>`,btn('주변 더 살펴보기','close','',false),'잠긴 서랍','lock-dialog');if(has(state,'power'))content.querySelector('.modal-actions')?.insertAdjacentHTML('afterbegin',btn('힌트 보기','device-hints','P6',false));focusLock();
}
function showTerminal(message=''){
 if(!has(state,'power'))return openModal('현관 제어 장치',paragraph('화면이 꺼져 있다. 버튼을 눌러도 반응이 없다.')+paper('출입 장치 점검 안내','<p>전원 확인: 방송실 제어함</p><p class="tiny">사용 후 점검 자료는 제자리에 보관해 주세요.</p>'),closeBtn());
 if(!has(state,'relay'))return openModal('현관 제어 장치',paragraph(has(state,'order')?'전원 표시가 불안정하다. 아래쪽 비상 회로 점검판이 열려 있다.':'번호 입력창 아래에 비상 회로 점검 표시가 있다. 먼저 남은 기록을 찾아야 한다.'),closeBtn());
 if(has(state,'unlocked'))return openModal('현관 제어 장치',paragraph('번호가 맞았다. 화면에 OPEN 표시가 켜져 있다.\n문 아래쪽으로 바람이 들어온다.'),closeBtn('돌아가기'));
 openModal('현관의 마지막 잠금',paragraph(esc(publicContent().puzzles.find(p=>p.id==='P7')?.intro||'모은 기록을 확인한다.'))+paragraph(exitLength()+'자리 번호를 입력하는 장치다. 모아 둔 기록을 옆에 펼친다.')+`<div class="lock-layout">${exitEvidence()}${lockPanel('exit',exitLength(),message,has(state,'relay'))}</div>`,btn('주변 더 살펴보기','close','',false),'마지막 기록','lock-dialog');if(has(state,'order'))content.querySelector('.modal-actions')?.insertAdjacentHTML('afterbegin',btn('힌트 보기','device-hints','P7',false));focusLock();
}
function redrawLock(id,message=''){if(id==='drawer')showDrawer(message);else if(id==='exit')showTerminal(message);}
function activeLock(){return dialog.open?$('.lock-panel')?.dataset.lock:null;}
function editLock(id,value){if(activeLock()!==id||!['drawer','exit'].includes(id))return;const length=id==='drawer'?3:exitLength();lockDrafts[id]=value==='erase'?lockDrafts[id].slice(0,-1):/^\d$/.test(value)?(lockDrafts[id]+value).slice(0,length):lockDrafts[id];redrawLock(id);sound('tap');}
async function submitLock(id){
 if(activeLock()!==id||!['drawer','exit'].includes(id))return;
 const ready=id==='drawer'?has(state,'power')&&state.photos.length===3:has(state,'relay');
 if(!ready)return redrawLock(id,'아직 확인하지 못한 기록이 있다.');
 const code=lockDrafts[id];if(code.length!==(id==='drawer'?3:exitLength()))return redrawLock(id,'번호를 끝까지 입력해야 한다.');
 if(stagePreview){const expected=id==='drawer'?photoOrder().map(id=>photoDigit(id)).join(''):exitCode(currentLesson.devices);return redrawLock(id,code===expected?'정답입니다. 이 문제의 확인이 끝났어요.':'정답이 아닙니다. 기록을 다시 확인하세요.');}
 if(!await update({type:id==='drawer'?'order':'unlock',code},id==='exit'?'unlock':null))return redrawLock(id,'잠금이 풀리지 않는다. 기록을 다시 살펴보자.');
 lockDrafts[id]='';sound('switch');
 if(id==='drawer'){log('order','방송실 · 보조 서랍','사진 순서대로 숫자를 맞춰 서랍을 열었다. 안에서 순서표를 찾았다.');return openModal('서랍 안의 순서표',paragraph(esc(publicContent().puzzles.find(p=>p.id==='P6').success))+paragraph('안에 있던 종이는 앞서 찾은 기호표, 배치표와 같은 양식이다.')+paper('출입 장치 · 확인 순서',orderSheet()),closeBtn('순서표 챙기기'));}
 log('unlock','중앙 현관 · 잠금 해제','배치표의 방향을 맞추고 경로를 따라갔다. 지워진 칸을 빼고 기호를 숫자로 바꾸자 현관문 잠금이 풀렸다.');
 return openModal('열린 문',paragraph(esc(publicContent().puzzles.find(p=>p.id==='P7').success)),closeBtn('돌아가기'));
}
async function inspect(id){sound('tap');
 const object=EXPLORATION.find(o=>o.id===id&&o.room===state.room);if(object){dispatch({type:'seen',id});renderGame();return openModal(esc(object.label),paragraph(esc(object.text)),closeBtn('주변 더 살펴보기'),'주변 조사');}
 if(state.room==='library'&&has(state,'locker-records')){const entry=Object.entries(LIBRARY_BOOKS).find(([,source])=>source.spot===id);if(entry&&!state.libraryBooks.includes(entry[0]))return showLibraryBook(entry[0]);}
 if(id==='desk')return showDesk();
 if(groupMode&&RECORD_ROLES[id]&&!canRole(RECORD_ROLES[id]))return openModal('모둠원의 수업 기록',restricted(RECORD_ROLES[id]),closeBtn());
 if(id==='board'||id==='notebook')return showPaperCard(id);
 if(id==='locker'){
  if(has(state,'locker-open'))return showLockerContents();
  if(has(state,'locker'))return showUnlockedLocker();
  if(state.cards.length<4)return openModal('사물함',paragraph('문틈에 자료 보관용 봉투가 보인다. 봉투 겉면에 오늘 날짜가 적혀 있다.')+paper('자료 보관함','<p>자료 네 장을 맞춰 넣는 홈이 있다.</p>')+`<p class="fact">찾은 자료 ${state.cards.length}/4장. 교실에 남은 자료를 먼저 챙겨야 한다.</p>`,closeBtn());
  return showCurriculum('P1');
 }
 if(id==='blood'){log('blood','교실 · 바닥의 자국','마른 핏자국이 교탁 아래쪽까지 이어져 있다.');return openModal('교탁 아래의 자국',detailArt('blood',state)+paragraph('손으로 끌고 간 듯한 검붉은 자국이 바닥에 남아 있다. 가장자리는 이미 말라 있다.\n그 끝에서 떨어진 작은 자국들이 교탁 아래쪽으로 이어진다.'),closeBtn());}
 if(id==='attendance'){log('attendance','교실 · 출석부','마지막 줄의 이름만 여러 번 지워져 있다. 옆의 출석 표시는 그대로다.');return openModal('출석부',paragraph('오늘 날짜에 출석 표시가 되어 있다.\n마지막 줄의 이름만 종이가 보풀처럼 일어날 만큼 지워져 있다.'),closeBtn());}
 if(id==='chair'){if(has(state,'power'))return showPhoto('chair',true);return openModal('앞줄 의자',paragraph('의자가 책상 안으로 들어가 있다.\n옆으로 비켜서자 다리 한쪽이 바닥을 짧게 긁는다.'),closeBtn());}
 if(id==='returns'){
  if(has(state,'returns'))return openModal('도서관 반납함',paragraph('확인표는 안쪽에 들어가 있다. 꺼낸 반납 목록은 수집한 기록에서 다시 볼 수 있다.'),closeBtn());
  if(!has(state,'locker-records'))return openModal('도서관 반납함',paragraph('반납함의 작은 덮개가 잠겨 있다. 위쪽에 종이표를 넣는 틈이 있다.')+paper('반납 확인','<p>자료와 함께 받은 반납 확인표를 넣어 주세요.</p>'),closeBtn());
  if(state.libraryBooks.length<4)return openModal('비어 있는 반납 칸',paragraph('확인표에 적힌 반납 도서는 네 권이다. 반납함에는 책을 넣는 칸만 있고 책은 없다.')+paper('수업 자료 반납','<p>도서관에 남아 있는 반납 도서의 기록을 확인한 뒤 알맞은 칸에 넣어 주세요.</p>')+`<p class="fact">모은 책 ${state.libraryBooks.length}/4권</p>`,closeBtn('도서관 더 살펴보기'),'도서관 · 반납함');
  return showCurriculum('P2');
 }
 if(id==='fallen-box'){
  if(!has(state,'returns'))return;
  if(!has(state,'box-open'))return openModal('바닥에 떨어진 보관 상자',detailArt('fallen-box',state)+paragraph('천장 점검구 바로 아래에 상자가 떨어져 있다. 찢어진 틈으로 기록 여덟 장과 잠긴 안쪽 칸이 보인다.'),btn('상자 속 기록 펼치기','box-open')+closeBtn('주변 더 살펴보기'),'도서관 · 바닥');
  if(has(state,'archive'))return openModal('정리한 보관 상자',detailArt('fallen-box',state)+paragraph('네 기록을 맞춰 열쇠를 꺼냈다. 남겨 둔 종이 네 장은 보관 조건에 맞지 않았다.'),closeBtn());
  return showCurriculum('P8');
 }
 if(id==='relay'){
  if(!has(state,'order'))return openModal('비상 회로 점검판',paragraph('점검판이 닫혀 있다. 표찰에 ‘이동 기록 확인 후 점검’이라고 적혀 있다.'),closeBtn());
  if(has(state,'relay'))return openModal('비상 회로 점검판',paragraph('네 표시등의 상태를 맞췄다. 현관 번호 입력창에 전원이 들어와 있다.'),closeBtn());
  return showCurriculum('P10');
 }
 if(id==='books'){
  if(has(state,'script'))return openModal('반납 도서',paragraph('책 사이에 끼워져 있던 대본과 배치표를 챙겼다.\n책 한 권만 선반 밖으로 조금 나와 있다.'),closeBtn());
  if(!has(state,'archive'))return openModal('반납 도서',paragraph('선반 아래의 자료 보관 덮개가 잠겨 있다.\n작은 표찰에 ‘열쇠는 보관 상자 안에 있음’이라고 적혀 있다.'),closeBtn());
  return showCurriculum('P3');
 }
 if(id==='book'){if(has(state,'power'))return showPhoto('book',true);return openModal('안쪽 책장',paragraph('책들이 같은 방향으로 꽂혀 있다.\n이쪽 선반에는 수업 자료를 모아 둔 책이 많다.'),closeBtn());}
 if(id==='checkout'){log('checkout','도서관 · 대출 카드','같은 날짜의 반납 도장이 세 번 찍혀 있다. 대출자 칸은 비어 있다.');return openModal('대출대의 카드',paper('대출 기록','<p>대출자: __________________</p><div class="rule"></div><p>반납 확인 &nbsp; 반납 확인 &nbsp; 반납 확인</p><p class="tiny">세 도장의 날짜가 모두 같다.</p>'),closeBtn());}
 if(id==='footprints')return openModal('책장 사이',paragraph('바닥의 먼지에 신발 자국이 남아 있다.\n안쪽으로 들어간 자국은 있는데, 돌아 나온 자국은 보이지 않는다.'),closeBtn());
 if(id==='recorder')return showRecorder();
 if(id==='control'){
  if(has(state,'power'))return openModal('방송실 제어함',paragraph('현관 전원 표시등이 켜져 있다.\n제어함 아래에서 찾은 사진은 수집한 기록에 보관했다.'),btn('사진 다시 보기','item','photos'));
  if(!has(state,'compared'))return openModal('방송실 제어함',paragraph('덮개가 잠겨 있다. 옆의 점검표에는 대본과 방송 기록을 함께 확인하라는 표시가 있다.'),closeBtn());
  return showCurriculum('P5');
 }
 if(id==='drawer')return showDrawer();
 if(id==='microphone'){log('microphone','방송실 · 마이크','마이크의 전원선이 빠져 있다. 방송은 천장 스피커에서 나온다.');return openModal('마이크',paragraph('전원선 끝이 책상 아래에 떨어져 있다.\n마이크를 건드려도 스피커에는 아무 소리도 나지 않는다.'),closeBtn());}
 if(id==='monitor'){
  if(!has(state,'script'))return openModal('꺼진 모니터',paragraph('전원이 꺼진 화면에 빈 의자와 출입문이 비친다. 아래쪽에 ‘보관 기록 확인 후 복원’이라고 적혀 있다.'),closeBtn());
  if(has(state,'monitor'))return openModal('복구된 화면',paragraph('네 칸이 제자리로 돌아왔다. 화면 아래에는 ‘녹음 장치 연결됨’이라고 표시된다.'),closeBtn());
  return showCurriculum('P9');
 }
 if(id==='log'){log('log','방송실 · 방송 일지','17:40 방송 종료 표시가 있다. 다음 담당자 칸은 비어 있다.');return openModal('방송 일지',paper('방송 운영 기록','<p>17:40 &nbsp; 하교 안내 — 종료</p><div class="rule"></div><p>다음 담당자: __________________</p>')+paragraph('종료라고 적혀 있지만, 방금도 방송이 나왔다.'),closeBtn());}
 if(id==='notice'){if(has(state,'power'))return showPhoto('notice',true);return openModal('현관 게시판',paper('방과 후 출입 안내','<p>하교 시 중앙 현관을 이용해 주세요.</p><p class="tiny">교실 창문과 개인 소지품을 확인해 주세요.</p>')+paragraph('게시물 모서리가 반듯하게 붙어 있다.'),closeBtn());}
 if(id==='shoes'){log('shoes','현관 · 신발장','실내화 한 켤레가 나란히 놓여 있다. 바로 앞의 먼지만 닦여 있다.');return openModal('신발장',paragraph('실내화 한 켤레가 나란히 놓여 있다.\n신발장 앞쪽의 먼지만 누가 밟고 서 있었던 것처럼 닦여 있다.'),closeBtn());}
 if(id==='terminal')return showTerminal();
 if(id==='door')return openModal('중앙 현관문',paragraph(has(state,'unlocked')?'문이 손바닥만큼 열려 있다.\n틈으로 운동장의 바람 소리가 들어온다.':'손잡이를 당겨도 문이 움직이지 않는다.\n유리 너머 운동장에는 아무도 없다.'),has(state,'unlocked')?btn('학교 밖으로 나가기','exit'):closeBtn());
}
function item(id){
 if(id==='library-books'){const p=publicContent().puzzles.find(p=>p.id==='P2');return openModal('찾아낸 반납 도서',paragraph('도서관에서 직접 챙긴 책과 그 안의 기록이다.')+(p?.items.filter(i=>state.libraryBooks.includes(i.id)&&!i.hidden).map(libraryBookPaper).join('')||''),closeBtn('다시 보관하기'),'수집한 기록');}
 if(id==='records'){const p=publicContent().puzzles.find(p=>p.id==='P1');return openModal('수업 기록',p.items.map(i=>paper(esc(i.label),paragraph(i.hidden?i.owner+'번 모둠원에게 확인하세요.':esc(i.text)))).join(''),closeBtn());}
 if(groupMode&&['key','grid','order','photos','records'].includes(id)){const role=({key:1,grid:2,order:3})[id];if(role&&!canRole(role))return openModal('모둠원의 기록',restricted(role),closeBtn());return showGroupClues(role||group.data.me.role);}
 const docs={
 records:['수업 기록',paragraph('오늘 마지막 수업에서 사용한 자료들이다.')+`<div class="card-grid">${state.cards.map(c=>`<div class="record-card"><small>수업 자료</small><strong>${cardNames[c]}</strong></div>`).join('')}</div>`],
 slip:['반납 확인표',returnSlip()],
 key:['기호표',paper('출입 장치 · 기호표',keySheet()+'<p class="tiny">교내 보관용 / 1</p>')],
 'archive-key':['보관함 열쇠',paragraph('상자 안쪽 칸에서 꺼낸 작은 열쇠다. 손잡이에 ‘반납 도서 아래’라고 적혀 있다.')],
 returns:['반납 목록',paper('수업 자료 보관 목록','<p>도서 01 · 정리 자료<br>도서 02 · 활동 기록<br>도서 03 · 참고 자료<br>도서 04 · 방송 자료</p><p class="tiny">반납 도서 책장에 정리해 주세요.</p>')],
 script:['방송 대본',paragraph(scriptObservation)+scriptPaper()],
 grid:['배치표',paper('출입 장치 · 배치표',gridSheet()+'<p class="tiny">교내 보관용 / 2</p>')],
 transcript:['방송 기록',paper('17:40 · 녹음 내용','<p>교내에 남아 있는 학생은 교실로 이동해 주십시오.</p><p>교실 문은 닫아 두시기 바랍니다.</p>')],
 photos:['사진 세 장',paragraph('세 장 모두 17:40에 찍혀 있다.\n조금 전 우리가 지나온 곳들이다.')+photosMarkup()+paper('사진 봉투의 메모','<p>사진과 달라진 곳을 확인할 것.<br>확인 순서: '+photoOrderMarkup()+'</p>')],
 order:['순서표',paper('출입 장치 · 확인 순서',orderSheet()+'<div class="rule"></div><p class="tiny">교내 보관용 / 3</p>')]
 };
 if(!inventory(state).some(i=>i.id===id)||!docs[id])return;
 openModal(docs[id][0],docs[id][1],closeBtn('다시 보관하기'),'수집한 기록');
}
let worldEpoch=0;
function clearEffects(){clearTimeout(effectTimer);effectBusy=false;worldEpoch++;document.querySelectorAll('.world-event,.apparition,.scare-shade,.scare-caption').forEach(x=>x.remove());$('.scene-inner')?.classList.remove('world-box-active');}
function runWorldEvent(done=()=>{}){
 if(view!=='game'||dialog.open||effectBusy||state.finished)return;
 const event=nextWorldEvent(state);if(!event){done();return;}
 dispatch({type:'seen',id:'event:'+event.id});log('event:'+event.id,ROOMS[event.room].name+' · 남은 흔적',event.text);
 if(state.soft||motionMedia.matches){renderGame();toast(event.text);done();return;}
 const wrap=$('.scene-inner');if(!wrap){done();return;}
 const ticket=++worldEpoch,pan=$('.scene-pan'),previousPan=pan?.scrollLeft||0;
 if(pan)pan.scrollLeft=Math.max(0,Math.min(pan.scrollWidth-pan.clientWidth,pan.scrollWidth*event.focus-pan.clientWidth/2));
 effectBusy=true;wrap.classList.add('world-box-active');wrap.insertAdjacentHTML('beforeend',`<div class="world-event event-${event.id}" data-world-event="${event.id}">${worldEventArt(event.id)}</div>`);sound(event.cue);
 effectTimer=setTimeout(()=>{
  if(ticket!==worldEpoch||view!=='game')return;
  effectBusy=false;document.querySelectorAll('.world-event').forEach(x=>x.remove());wrap.classList.remove('world-box-active');
  if(pan?.isConnected)pan.scrollLeft=previousPan;
  renderGame();toast(event.text);done();
  if(!dialog.open&&pending?.goal){pending=null;showGoal();}
 },event.duration);
}
function runScare(id,done=()=>{}){
 if(state.seen.includes(`scare:${id}`)){done();return;}
 dispatch({type:'seen',id:`scare:${id}`});
 const effects={locker:['classroom','문 유리 바로 너머에 머리카락과 손이 보였다.'],script:['library','책장 뒤에서 누군가 몸을 기울였다.'],power:['broadcast','복구된 모니터 화면에 머리카락으로 얼굴을 가린 사람이 비쳤다.'],unlock:['entrance','유리문 안쪽의 손자국 위로 손 하나가 겹쳤다가 사라졌다.']};
 const [room,text]=effects[id]||[];if(!room){done();return;}log(`scare:${id}`,`${ROOMS[room].name} · 잠깐 보인 것`,text);
 if(state.soft||motionMedia.matches||(groupMode&&state.room!==room)){toast(text);done();return;}
 const wrap=$('.scene-inner');if(!wrap){done();return;}
 const pan=$('.scene-pan'),previousPan=pan?.scrollLeft||0;
 const focusX={classroom:1,library:0,broadcast:.5,entrance:.68}[room];
 if(pan)pan.scrollLeft=Math.max(0,Math.min(pan.scrollWidth-pan.clientWidth,pan.scrollWidth*focusX-pan.clientWidth/2));
 effectBusy=true;sound('apparition-'+room,room==='classroom'?.65:room==='library'?-.65:0);wrap.insertAdjacentHTML('beforeend',`<div class="apparition ${room}">${ghost(room)}</div><div class="scare-shade"></div><div class="scare-caption">${text}</div>`);
 effectTimer=setTimeout(()=>{effectBusy=false;document.querySelectorAll('.apparition,.scare-shade,.scare-caption').forEach(x=>x.remove());if(pan?.isConnected)pan.scrollLeft=previousPan;toast(text);renderGame();done();},5400);
}
function showJournal(){openModal('탐색 기록',state.journal.length?state.journal.map(j=>`<article class="journal-entry"><h3>${esc(j.title)}</h3><p>${esc(j.text)}</p></article>`).join(''):paragraph('아직 기록한 내용이 없어요.'),closeBtn('탐색으로 돌아가기'),'자동으로 기록한 내용');}
function settings(){openModal('탐색 설정',`<div class="settings-row"><div><strong>배경음·효과음</strong><p>탐색 중 공포 배경음이 계속 흐르고, 장소마다 다른 등장음이 재생됩니다. 꺼도 모든 내용을 확인할 수 있어요.</p></div><button class="toggle ${state.sound?'on':''}" data-action="sound" aria-pressed="${state.sound}">${state.sound?'켜짐':'꺼짐'}</button></div><div class="audio-check">${btn(state.sound?'소리 확인':'소리 켜고 확인','sound-test','',false)}${[['classroom','교실'],['library','도서관'],['broadcast','방송실'],['entrance','현관'],['ending','엔딩']].map(([id,label])=>btn(label+' 등장음','sound-scene',id,false)).join('')}</div><div class="settings-row"><div><strong>공포 연출 줄이기</strong><p>짧은 등장과 화면 변화 대신 글로 알려 주고 공포 배경음을 끕니다.</p></div><button class="toggle ${state.soft?'on':''}" data-action="soft" aria-pressed="${state.soft}">${state.soft?'켜짐':'꺼짐'}</button></div><p class="audio-credits">배경음: congusbongus · <a href="https://opengameart.org/content/lost-in-a-bad-place-horror-ambience-loop" target="_blank" rel="noopener noreferrer">Lost in a bad place</a> (CC0).</p><p class="subtle">${groupMode?'모둠의 진행은 함께 저장됩니다. 같은 브라우저에서 내 모둠 이어하기로 돌아올 수 있어요.':'진행은 이 브라우저에 자동 저장됩니다.'}</p>`,btn('사용법','about','',false)+(groupMode?btn('모둠 정보','group-info','',false):btn('처음부터 시작','restart','',false))+closeBtn('계속하기'),'설정');}
function renderEnding(){
 if(view==='ending')return;
 clearEnding();clearEffects();stopSounds();view='ending';pending=null;
 document.body.classList.toggle('no-motion',state.soft);
 app.innerHTML=`<section class="ending">${courtyard()}<span class="badge">탐색 완료</span><div class="ending-content"><div class="eyebrow">OUTSIDE THE SCHOOL</div><h1>학교 밖으로</h1><p>현관문을 밀자 운동장의 바람 소리가 돌아왔다.<br>뒤에서 종이 울렸다.</p><div class="ending-clock">17:40 → 17:41</div><p>“다 나왔어?”<br>“응. 가자.”</p><p class="subtle" style="margin-top:24px">운동장 끝에서 한 번 뒤를 돌아봤다.<br>불이 켜진 교실에는 아무도 보이지 않았다.</p><p id="ending-observation" class="ending-observation" role="status" aria-live="polite"></p><div class="ending-actions">${btn('탐색 기록 보기','journal')}${btn('처음 화면으로','home','',false)}</div></div></section>`;
 sound('bell');
 const ticket=endingEpoch;
 const reveal=()=>{
  if(ticket!==endingEpoch||view!=='ending')return;
  // Let the final moment wait while the record dialog or another tab is open.
  if(document.hidden||dialog.open){endingTimer=setTimeout(reveal,600);return;}
  const note=$('#ending-observation');
  if(note)note.textContent='불이 켜진 창문 안쪽에 사람의 실루엣이 보였다.';
  if(state.soft||motionMedia.matches){if(note)note.textContent='불이 켜진 창문 안쪽에 사람의 실루엣이 잠깐 보였다가 사라졌다.';note?.classList.add('visible');return;}
  $('.ending')?.classList.add('visitor-visible');sound('ending-shadow',.45);
  endingTimer=setTimeout(()=>{
   if(ticket!==endingEpoch||view!=='ending')return;
   $('.ending')?.classList.remove('visitor-visible');
   if(note)note.textContent='창문 안의 형체가 흐려지더니 사라졌다.';
  },6200);
 };
 endingTimer=setTimeout(reveal,4800);
}
function canRole(role){return !groupMode||group.data.allowedRoles.includes(role);}
function evidence(role){return group.data?.evidence.find(e=>e.role===role);}
function restricted(role){const member=group.data?.members.find(m=>m.role===role);return `<div class="private-clue"><span>${role}번 · ${ROLE_NAMES[role-1]}</span><p>${esc(member?.name||'담당 모둠원')}에게 내용을 물어보세요.</p></div>`;}
function mergeGroup(next){
 if(!next?.group)return;if(group.data&&next.group.revision<group.data.group.revision)return;
 group.setData(next);const local={room:state.room,gridTurns:state.gridTurns,seen:state.seen,sound:state.sound,soft:state.soft,drafts:state.drafts||{}};
 const journal=new Map([...state.journal,...next.state.journal].map(j=>[j.id,j]));state={...next.state,...local,journal:[...journal.values()]};persist();
}
function connectionStatus(value){groupStatus=value;const el=$('#group-connection');if(el){el.textContent=value==='connected'?'연결됨':'연결 확인 중';el.classList.toggle('offline',value!=='connected');}}
function receiveGroup(next){
 if(!groupMode)return;
 if(next.left){pending=null;if(dialog.open)dialog.close();renderHome();toast(next.message);return;}
 const oldGoal=goal(state).id,oldStarted=state.started,oldPuzzle=activePuzzle,foundLockerRecords=!has(state,'locker-records')&&has(next.state,'locker-records');
 // The transport may already hold the response, so compare with the displayed roles.
 const rolesChanged=displayedRoles&&displayedRoles!==next.allowedRoles.join(',');
 mergeGroup(next);displayedRoles=next.allowedRoles.join(',');
 if(next.group.status==='waiting'){renderLobby();return;}
 if(next.group.status==='ended'){pending=null;clearEffects();stopSounds();renderGame();if(!state.seen.includes('class-ended')){state.seen.push('class-ended');persist();openModal('수업 종료',paragraph('선생님이 수업을 종료했어요. 모은 기록을 다시 확인할 수 있어요.'),closeBtn());}return;}
 if(!oldStarted||view==='lobby'){groupWelcome();return;}
 if(openingActive()){renderGame();return;}
 if(state.finished){if(view!=='ending'){if(dialog.open)dialog.close();renderEnding();}return;}
 if(effectBusy){if(oldGoal!==goal(state).id)pending={...pending,goal:true};return;}
 renderGame();
 if(oldPuzzle&&dialog.open&&!changedPuzzle(oldPuzzle))showCurriculum(oldPuzzle,rolesChanged?'빈자리 단서를 다시 확인해 주세요.':'모둠의 기록을 반영했어요.');else if(rolesChanged&&dialog.open)openModal('모둠 구성이 바뀌었어요',paragraph('내 단서와 현재 빈자리의 단서를 다시 확인해 주세요.'),closeBtn());
 const changed=oldGoal!==goal(state).id;
 if(changed&&oldPuzzle&&changedPuzzle(oldPuzzle)){activePuzzle=null;if(dialog.open)dialog.close();}
 if(changed){toast(foundLockerRecords?'모둠원이 사물함에서 반납 확인표와 기호표를 챙겼어요.':'모둠의 진행이 업데이트되었어요.');if(dialog.open)pending={...pending,goal:true};else showGoal();}
 if(activeLock())redrawLock(activeLock());
}
function changedPuzzle(pid){return has(state,({P1:'locker',P2:'returns',P3:'script',P4:'compared',P5:'power',P8:'archive',P9:'monitor',P10:'relay'})[pid]);}
let displayedRoles='';
function groupBar(){const d=group.data;return `<section class="groupbar" aria-label="모둠 활동"><div><b>${d.me.role}번 ${esc(d.me.name)}</b><span>${d.members.length}/4명 · <i id="group-connection" class="${groupStatus==='connected'?'':'offline'}">${groupStatus==='connected'?'연결됨':'연결 확인 중'}</i></span></div><div class="groupbar-actions"><button data-action="group-clues">내 단서${d.allowedRoles.length>1?` + 빈자리 ${d.allowedRoles.length-1}`:''}</button><button data-action="group-info">모둠 정보</button><button data-action="group-progress">전체 모둠 현황</button></div></section>`;}
function seatsMarkup(manage=false){const d=group.data;return `<div class="group-seats">${[1,2,3,4].map(role=>{const m=d.members.find(x=>x.role===role);return `<div class="group-seat ${m?'occupied':'vacant'}"><b class="seat-number">${role}</b><div><strong>${m?esc(m.name)+(m.id===d.me.id?' · 나':''):'빈자리'}</strong><span>${ROLE_NAMES[role-1]}${!m?' · 모두 열람 가능':''}</span></div>${m?`<small>${m.id===d.group.leaderId?'모둠장':'참여 중'}</small>`:'<small>대신 확인</small>'}${manage&&m&&d.me.id===d.group.leaderId&&m.id!==d.me.id?`<button class="seat-remove" data-action="group-remove-confirm" data-id="${m.id}">내보내기</button>`:''}</div>`;}).join('')}</div>`;}
function renderLobby(){view='lobby';const d=group.data;app.innerHTML=`<section class="group-lobby">${corridor()}<div class="lobby-card"><div class="eyebrow">마지막 방송 · 수업 대기</div><h1>${esc(d.group.name)}</h1><p class="lobby-intro">${esc(d.content.meta.subject)} · ${esc(d.content.meta.unit)}<br>선생님이 수업을 시작하면 탐색할 수 있어요.</p><button class="group-code" data-action="group-copy">${d.group.code}<small>수업 코드</small></button>${seatsMarkup()}<p class="vacancy-note">${d.members.length<4?'빈자리의 단서는 남은 모둠원이 함께 확인할 수 있어요.':'각자 찾은 단서를 서로 설명하며 풀어보세요.'}</p><div class="lobby-actions"><button class="ghost-button" data-action="about">사용법</button><button class="ghost-button" data-action="group-info">내 모둠 확인</button><button class="ghost-button" data-action="home">처음 화면</button></div></div></section>`;}

function groupWelcome(){
 if(state.finished)return renderGame();
 if(openingActive())return showOpening();
 if(!state.seen.length)return beginOpening();
 renderGame();showGoal();
}
async function enterGroup(action,body){
 if(groupBusy)return;groupBusy=true;try{
  const next=await group.connect(action,body);groupMode=true;const local=group.loadLocal();state={...fresh(),...local,started:false};mergeGroup(next);displayedRoles=next.allowedRoles.join(',');clueRole=next.me.role;lockDrafts.drawer='';lockDrafts.exit='';pending=null;if(dialog.open)dialog.close();
  if(next.group.status==='waiting')renderLobby();else groupWelcome();
 }catch(error){if([401,410].includes(error.status))group.forget();const errorBox=$('#group-form-error');if(errorBox)errorBox.textContent=error.message;else toast(error.message);}finally{groupBusy=false;}
}
function showGroupGate(mode='join'){
 if(group.available)return openModal('참여 중인 수업',paragraph('같은 자리에서 이어갈 수 있어요.'),btn('내 모둠 이어하기','group-resume')+btn('다른 수업으로 이동','group-switch','join',false),'수업 입장');
 openModal('수업에 참가',paragraph('선생님에게 받은 수업 코드와 모둠 번호를 입력하세요.')+`<form id="group-entry-form" class="group-form"><label>내 이름<input id="group-name" maxlength="20" required autocomplete="off"></label><label>수업 코드<input id="group-code-input" required minlength="8" maxlength="12" autocomplete="off" autocapitalize="characters" placeholder="8자리 코드"></label><label>모둠 번호<select id="group-team">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}모둠</option>`).join('')}</select></label><label>내 자리<select id="group-role">${[1,2,3,4].map(n=>`<option value="${n}">${n}번</option>`).join('')}</select></label><p id="group-form-error" class="form-error" role="status"></p><p class="subtle">한 모둠에 최대 4명. 빈자리의 단서는 모두 확인할 수 있어요.</p><button type="button" class="primary" data-action="group-connect" data-id="join">참가하기</button></form>`,btn('돌아가기','close','',false),'4인 모둠 활동');
}

function showGroupInfo(){if(!groupMode)return;const d=group.data;openModal(esc(d.group.name),`<button class="group-code compact" data-action="group-copy">${d.group.code}<small>수업 코드 복사</small></button>${seatsMarkup()}<p class="subtle">잠시 연결이 끊겨도 자리는 유지됩니다. 참여하지 않는 친구의 자리는 선생님이 정리할 수 있어요.</p>`,btn('모둠 나가기','group-leave-confirm','',false)+closeBtn(),'모둠 정보');}

function groupRouteSheet(){if(!canRole(3))return restricted(3);const route=evidence(3)?.route;if(!route)return paragraph('아직 이 기록을 찾지 못했어요.');return `<div class="route-note"><p>현관 표시가 <strong>아래</strong>로 오게 맞춘다.</p><div class="route-steps" aria-label="이동 경로">${route.steps.map((dir,i)=>`<span><small>${i+1}</small>${ROUTE_ARROWS[dir]}</span>`).join('')}</div><p>이동 규칙은 점검 기록과 함께 확인할 것.</p></div>`;}
function groupRuleSheet(){return canRole(4)?paragraph(esc(evidence(4)?.rule||'아직 이 기록을 찾지 못했어요.')):restricted(4);}
function showGroupClues(role=clueRole){
 if(!groupMode)return;if(!canRole(role))role=group.data.me.role;clueRole=role;const e=evidence(role),mine=role===group.data.me.role;
 const tabs=`<div class="clue-tabs">${group.data.allowedRoles.map(r=>`<button class="${role===r?'on':''}" data-action="group-clues" data-id="${r}">${r}번 ${r===group.data.me.role?'내 단서':'빈자리'}</button>`).join('')}</div>`;
 let body=paper('교실의 수업 기록',`<p>${e.cardFound?'이 자리의 기록은 모둠이 챙겼다.':'교실에 남겨진 이 자리의 기록을 찾아야 한다.'}</p><p class="tiny">담당: ${cardNames[e.card]}</p>`);
 const curriculum=publicContent().puzzles.filter(p=>p.clues.length);for(const p of curriculum){const c=p.clues.find(c=>c.role===role);if(c)body+=paper(esc(p.title)+' · '+esc(c.title),paragraph(esc(c.text))+(c.original?paragraph(esc(c.original)):'')+p.items.filter(i=>i.owner===role&&!i.hidden).map(i=>paragraph(esc(i.label)+' · '+esc(i.text))).join(''));}
 if(e.photo)body+=`<div class="group-photo">${photoArt(e.photo.id,false)}<p>${e.photo.found?'발견한 숫자 · <strong>'+e.photo.digit+'</strong>':'사진과 달라진 곳을 찾아보세요.'}</p><button class="ghost-button" data-action="photo-detail" data-id="${e.photo.id}">사진 자세히 보기</button></div>`;
 if(e.photoOrder)body+=paper('사진 봉투 · 서랍 확인 순서','<p>'+photoOrderMarkup()+'</p><p>각 장소에서 찾은 숫자를 이 순서대로 입력한다.</p>');
 if(e.key)body+=paper('출입 장치 · 기호표',keySheet());
 if(e.grid)body+=paper('출입 장치 · 배치표',gridSheet());
 if(e.route)body+=paper('출입 장치 · 이동 기록',groupRouteSheet());
 if(e.rule)body+=paper('출입 장치 · 점검 기록',groupRuleSheet());
 openModal(`${role}번 · ${ROLE_NAMES[role-1]}`,tabs+`<p class="clue-owner">${mine?'내가 확인하는 단서예요. 모둠원에게 내용을 설명해 주세요.':'빈자리의 단서를 대신 확인하고 있어요.'}</p>`+body,closeBtn('탐색으로 돌아가기'),'모둠의 단서');
}
async function groupClick(a,id){
 if(a==='group-progress'){
  if(!groupMode)return;
  openModal('전체 모둠 현황',paragraph('현황을 불러오는 중입니다.'),closeBtn(),'수업 진행','progress-dialog');
  try{const data=await group.request('progress');if(!dialog.open||dialog.className!=='progress-dialog')return;
   openModal('전체 모둠 현황',paragraph('정답과 개인 단서는 공유되지 않습니다. 새로고침을 누르면 최근 진행을 확인합니다.')+`<div class="progress-teams">${data.teams.map(t=>`<article><h3>${t.number}모둠${t.number===Number(group.meta.team)?' · 우리 모둠':''}</h3><strong>${t.solved.length}/${t.total} 해결${t.finished?' · 탈출 완료':''}</strong><progress value="${t.solved.length}" max="${t.total}" aria-label="${t.number}모둠 진행"></progress><p>${esc(t.goal.text)}</p></article>`).join('')}</div>`,btn('새로고침','group-progress','',false)+closeBtn(),'수업 진행','progress-dialog');
  }catch(e){if(dialog.open&&dialog.className==='progress-dialog')openModal('현황을 불러오지 못했어요',paragraph(esc(e.message)),btn('다시 시도','group-progress','',false)+closeBtn(),'수업 진행','progress-dialog');}return;
 }

 if(a==='group-gate')return showGroupGate(id);
 if(a==='group-resume')return enterGroup('state');
 if(a==='group-connect'){const form=$('#group-entry-form');if(form?.reportValidity&&!form.reportValidity())return;return enterGroup(id,{name:$('#group-name').value,team:Number($('#group-team').value),code:$('#group-code-input')?.value,role:Number($('#group-role')?.value)});}
 if(a==='group-switch'){try{await group.request('leave',{});}catch(error){if(![401,410].includes(error.status)){toast(error.message);return;}}group.forget();return showGroupGate(id);}
 if(a==='group-copy'){try{await navigator.clipboard.writeText(group.data.group.code);toast('모둠 코드를 복사했어요.');}catch{toast('모둠 코드: '+group.data.group.code);}return;}
 if(a==='group-clues')return showGroupClues(id?Number(id):group.data.me.role);
 if(a==='group-info')return showGroupInfo();
 if(a==='group-start'){try{receiveGroup(await group.send('start'));}catch(error){toast(error.message);}return;}
 if(a==='group-remove-confirm'){const m=group.data.members.find(m=>m.id===id);if(m)return openModal('모둠원 내보내기',paragraph(`${esc(m.name)} 님을 내보낼까요? 이 자리의 단서는 남은 모둠원이 확인할 수 있게 됩니다.`),btn('취소','group-info','',false)+btn('내보내기','group-remove',id));return;}
 if(a==='group-leave-confirm')return openModal('모둠에서 나갈까요?',paragraph('내 자리가 비워지고 단서를 다른 모둠원이 대신 볼 수 있게 됩니다. 모둠의 진행은 유지됩니다.'),btn('취소','group-info','',false)+btn('모둠 나가기','group-leave'));
 if(a==='group-close-confirm')return openModal('모둠 탐색을 종료할까요?',paragraph('모든 모둠원이 이 모둠에 다시 입장할 수 없게 됩니다.'),btn('취소','group-info','',false)+btn('모둠 종료','group-close'));
 if(['group-remove','group-leave','group-close'].includes(a)){try{const next=await group.send(a.slice(6),a==='group-remove'?{memberId:id}:{});if(next.left){group.forget();pending=null;if(dialog.open)dialog.close();renderHome();}else{mergeGroup(next);showGroupInfo();if(view==='lobby')renderLobby();else renderGame();}}catch(error){toast(error.message);}return;}
}
document.addEventListener('submit',e=>{if(e.target.id==='group-entry-form')e.preventDefault();});
document.addEventListener('visibilitychange',()=>{if(groupMode&&!document.hidden)group.schedule(0);});
document.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-action]');if(!b||effectBusy)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='preview-exit')return exitStagePreview();
 if(a==='preview-problem')return showPreviewProblem();
 if(state.sound&&['new','resume','group-connect','group-resume'].includes(a))warmSounds();
 if(a.startsWith('group-'))return groupClick(a,id);
 if(a==='author')return showAuthor();
 if(a==='device-hints'||a==='device-next-hint')return showDeviceHints(id,a==='device-next-hint');
 if(a.startsWith('puzzle-'))return curriculumClick(a.slice(7),id);
 if(a==='bag'){const items=inventory(state);return openModal('수집한 기록',items.length?`<div class="bag-grid">${items.map(i=>btn(esc(i.name)+' · '+esc(i.sub),'item',i.id,false)).join('')}</div>`:paragraph('아직 챙긴 물건이 없어요.'),closeBtn(),'소지품');}
 if(a==='close')return closeModal();
 if(a==='opening-next')return closeModal();
 if(a==='new')return start();
 if(a==='resume'){renderGame();return showGoal();}
 if(a==='restart'&&groupMode)return showGroupInfo();
 if(a==='restart')return openModal('처음부터 시작할까요?',paragraph('지금까지 모은 물건과 탐색 기록이 지워집니다.'),btn('돌아가기','close','',false)+btn('처음부터 시작','reset'),'진행 초기화');
 if(a==='reset'){pending=null;if(dialog.open)dialog.close();return start();}
 if(a==='home')return renderHome();
 if(a==='about')return openModal('함께 탐색하는 방법',paragraph('화면 위 현재 목표를 확인하고, 지도에서 장소를 옮겨 물건을 조사하세요. 챙긴 물건과 탐색 기록은 언제든 다시 볼 수 있어요.')+paper('모둠 활동',paragraph('각자의 내 단서를 읽고 서로 설명하세요. 빈자리의 단서는 남은 모둠원이 확인할 수 있어요. 풀이를 의논한 뒤 한 명이 장치를 조작해 제출하면 해결 결과가 모둠에 함께 반영됩니다.'))+paper('교사의 수업 준비',paragraph('엑셀 양식과 AI 프롬프트로 교과 자료를 만들고, 미리보기 후 수업 코드를 안내하세요. 학생들이 들어오면 모든 모둠 시작을 누릅니다.'))+paragraph('설정에서 소리를 확인하거나 공포 연출을 줄일 수 있어요.')+`<a class="guide-link" href="${window.__commonEscapeOffline?'https://scilab-platform.vercel.app/labs/common-escape/guide.html':'./guide.html'}" target="_blank" rel="noopener">자세한 사용법 ↗</a>`,closeBtn('돌아가기'),'사용법');
 if(a==='sound'){dispatch({type:'setting',key:'sound',value:!state.sound});if(!state.sound)stopSounds();if(view==='game')renderGame();sound();if(dialog.open){const title=$('#dialog-title').textContent;if(title==='탐색 설정')settings();else if(title==='잠긴 현관문')showOpening();}return;}
 if(a==='sound-scene'){if(!['classroom','library','broadcast','entrance','ending'].includes(id))return;stopSounds();dispatch({type:'setting',key:'sound',value:true});syncAmbience();sound(id==='ending'?'ending-shadow':'apparition-'+id);settings();return;}
 if(a==='sound-test'){dispatch({type:'setting',key:'sound',value:true});syncAmbience();sound('preview');settings();return;}
 if(a==='ending-replay'&&state.finished)return renderEnding();
 if(a==='soft'){dispatch({type:'setting',key:'soft',value:!state.soft});document.body.classList.toggle('no-motion',state.soft);if(state.soft)stopSounds();syncAmbience();return settings();}
 if(a==='settings')return settings();
 if(a==='map')return showMap();
 if(a==='move')return move(id);
 if(a==='goal')return showGoal();
 if(a==='journal')return showJournal();
 if(a==='item')return item(id);
 if(a==='photo-detail')return showPhoto(id,!!stagePreview);
 if(a==='rotate-grid'){const lock=activeLock();if(dispatch({type:'rotate-grid',delta:Number(id)})){if(lock==='exit')showTerminal();else if(groupMode)showGroupClues(2);else item('grid');}return;}
 if(a==='lock-digit'){const [lock,n]=id.split(':');return editLock(lock,n);}
 if(a==='lock-erase')return editLock(id,'erase');
 if(a==='lock-submit')return submitLock(id);
 if(a==='inspect')return inspect(id);
 if(a==='box-open'){if(await update({type:'box-open'}))showCurriculum('P8');return;}
 if(a==='locker-open'){if(!await update({type:'locker-open'}))return;log('locker-open','교실 · 사물함 안','사물함을 열자 바닥에 수업 자료 반납 봉투가 있었다.');return showLockerContents();}
 if(a==='locker-take'){if(!await update({type:'locker-records'},'locker'))return;log('locker-records','교실 → 도서관','사물함의 봉투에서 반납 확인표와 기호표를 챙겼다. 확인표에 도서관 반납함이라고 적혀 있다.');return openModal('두 기록을 챙겼다',paragraph('반납 확인표와 기호표를 챙겼다. 확인표의 보관 장소는 도서관 반납함이다.')+returnSlip(),closeBtn('주변 살펴보기'),'사물함에서 챙긴 기록');}
 if(a==='library-book-take'){if(!await update({type:'library-book',id}))return;const record=publicContent().puzzles.find(p=>p.id==='P2').items.find(i=>i.id===id);log('library-book:'+id,'도서관 · '+LIBRARY_BOOKS[id].where,record.label+'와 그 안에 끼워진 기록을 챙겼다.');return openModal('책 속의 기록',libraryBookPaper(record)+`<p class="fact">모은 책 ${state.libraryBooks.length}/4권${groupMode?' · 모둠과 함께 확인할 수 있어요.':''}</p>`,closeBtn('계속 살펴보기'),'직접 찾은 도서');}
 if(a==='collect'){
  if(!await update({type:'collect',id}))return;log(`card:${id}`,'교실 · 수업 기록',`${cardNames[id]}를 챙겼다.`);toast(`자료를 챙겼어요 · ${state.cards.length}/4장`);
  const record=publicContent().puzzles[0].items.find(i=>i.owner===RECORD_ROLES[id]);return openModal('자료를 챙겼다',paper(esc(record?.label||cardNames[id]),paragraph(esc(record?.text||'수집한 기록에서 다시 확인할 수 있다.'))),closeBtn('계속 살펴보기'));
 }
 if(a==='returns'&&await update({type:'returns'})){log('returns','도서관 · 반납 확인','확인표를 넣자 반납함과 책장의 보관 덮개가 열렸다.');return openModal('반납 목록',paragraph('확인표를 넣자 안쪽에서 작은 걸쇠가 풀린다.\n덮개를 열어 반납 목록을 꺼냈다. 책장 쪽에서도 비슷한 소리가 난다.')+paper('도서 정리 안내','<p>반납 도서 책장 · 자료 보관 4권</p>'),closeBtn('목록 챙기기'));}
 if(a==='script'&&await update({type:'script'},'script')){log('script','도서관 → 방송실','현관에서 들은 안내와 대본의 내용이 다르다. 실제 방송은 방송실에 녹음된다는 메모가 있다.');return openModal('책 사이의 방송 대본',paragraph('책 사이에서 방송 대본과 배치표를 찾았다.\n'+scriptObservation)+scriptPaper(),closeBtn('대본과 배치표 챙기기'));}
 if(a==='compare'&&await update({type:'compare'})){log('compare','방송실 · 다른 내용','대본은 현관으로 나가라고 한다. 녹음은 교실로 돌아가 문을 닫으라고 한다.');return openModal('다른 지시',paragraph('같은 시각의 안내인데 내용이 다르다.\n녹음을 멈추자 제어함 쪽에서 걸쇠 풀리는 소리가 난다.')+`<blockquote class="speech"><small>천장 스피커</small>“거기 두세요.”</blockquote>`+paragraph('조금 전보다 목소리가 가까이 들렸다.'),closeBtn('제어함 살펴보기'));}
 if(a==='power'&&await update({type:'power'},'power')){sound('switch');log('power','방송실 · 현관 전원','현관 전원을 켰다. 제어함 안에서 사진 세 장을 찾았다.');return openModal('불이 들어온 현관',paragraph('스위치를 올리자 복도 끝에서 전자음이 들린다.\n제어함 안쪽에 있던 사진 세 장을 꺼냈다.')+photosMarkup()+paragraph('조금 전까지 우리가 있던 곳들이다.\n세 장 모두 5시 40분에 찍혀 있다.'),closeBtn('사진 챙기기'));}
 if(a==='photo-found'&&await update({type:'photo',id})){const p=photoInfo[id],lines={chair:'의자를 옆으로 밀자 책상 옆면에 붙은 종이가 보인다.\n손을 뗀 뒤에도 다른 쪽에서 의자 끄는 소리가 한 번 더 났다.',book:'책을 꺼내자 접힌 종이가 떨어진다.\n비어 있는 책장 틈이 잠깐 어두워졌다.',notice:'접힌 모서리를 펴자 뒷면에 적힌 숫자가 보인다.\n고개를 들었을 때 유리문 안쪽에 희미한 손자국이 남아 있었다.'};log(`photo:${id}`,`${ROOMS[p.room].name} · 달라진 물건`,`${p.name}에서 숫자 ${p.digit}을 찾았다.`);return openModal('사진에 없던 흔적',paragraph(lines[id])+`<div class="number-found"><strong>${p.digit}</strong><span>${groupMode?'':p.n} ${ROOMS[p.room].name}<br>사진과 함께 기록해 두었다.</span></div>`,closeBtn('확인한 흔적 기록하기'));}
 if(a==='exit'&&await update({type:'exit'})){pending=null;dialog.close();log('ending','17:41 · 학교 밖','모두 현관 밖으로 나왔다. 멈췄던 시간이 움직이기 시작했다.');return renderEnding();}
});
document.addEventListener('dragstart',e=>{const card=e.target.closest('[data-card-id]');if(!activePuzzle||!card)return;e.dataTransfer.setData('text/plain',card.dataset.cardId);e.dataTransfer.effectAllowed='move';});
document.addEventListener('dragover',e=>{if(activePuzzle&&e.target.closest('[data-drop-target]'))e.preventDefault();});
document.addEventListener('drop',e=>{const target=e.target.closest('[data-drop-target]');if(!activePuzzle||!target)return;e.preventDefault();const p=publicContent().puzzles.find(p=>p.id===activePuzzle),id=e.dataTransfer.getData('text/plain');if(!p.items.some(i=>i.id===id))return;state.drafts[activePuzzle].selected=id;curriculumClick('place',target.dataset.dropTarget);});
document.addEventListener('keydown',async e=>{if(view!=='game'||effectBusy||e.ctrlKey||e.metaKey||e.altKey)return;const lock=activeLock();if(lock){if(/^\d$/.test(e.key)){e.preventDefault();editLock(lock,e.key);}else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();editLock(lock,'erase');}else if(e.key==='Enter'&&(!document.activeElement?.dataset?.action||document.activeElement.dataset.action==='lock-submit')){e.preventDefault();await submitLock(lock);}return;}if(dialog.open)return;if(e.key.toLowerCase()==='m')showMap();if(e.key.toLowerCase()==='j')showJournal();});
renderHome();
