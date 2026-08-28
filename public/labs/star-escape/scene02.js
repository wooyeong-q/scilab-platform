(function(){
'use strict';
var ROOT='/labs/star-escape/assets/scene02/';
var ctx=null,identity='',introStep=0,inspect=null,puzzleOpen=false,clueTabOpen=false,banner='',lastQuestion=0,viewRole=1,transitionNotice=null;
var visited=new Set(),foundCards=new Set(),selectedCard='',selectionKind='',slotValue='',definitionFound=false,distanceSlots=['','','',''];
var intro=[
['루멘','2번 구획 진입. 거리 보정실입니다. 귀환 항법 장치가 별까지의 거리 자료를 잃었습니다.'],
['루멘','거리 자료가 복구되지 않으면 3번 구획과 지구 귀환 항로를 열 수 없습니다.'],
['루멘','각 요원에게 별 하나가 배정되었습니다. 방 안에서 그 별의 3월·9월 관측 카드 두 장을 찾아야 합니다.'],
['루멘','발견한 카드는 단서 탭에 자동 저장됩니다. 문제 화면에서도 언제든 다시 꺼내 비교할 수 있습니다.'],
['루멘','복구 절차는 관측 카드 수집 → 연주시차 비교 → 별 거리 순서 복원입니다.'],
['미확인 음성','…들린다면 자동 기록부터 믿지 마.'],
['대원','또 그 신호야.'],
['미확인 음성','…위치가 달라 보이는 이유부터 확인해.'],
['루멘','송신 위치를 확인했습니다. …이 방 내부입니다.'],
['대원','통신기에서 나온 거야?'],
['루멘','아닙니다. 공식 통신 장비에는 송신 기록이 없습니다.'],
['루멘','거리 보정실을 조사해 주세요. 관측 센서 점검 장치는 이미 작동 중입니다.']
];
var objects=[
{id:'leftObserver',name:'좌우 관측 위치 전환 장치',box:[5,34,23,36]},
{id:'camera',name:'천장 보조 카메라',box:[24,0,16,20]},
{id:'hatch',name:'바닥 점검구',box:[34,67,27,26]},
{id:'rail',name:'이동식 관측 레일',box:[1,54,21,19]},
{id:'calibration',name:'관측 센서 점검 장치',box:[25,38,22,28]},
{id:'pencil',name:'콘솔 위 연필',box:[29,48,7,10]},
{id:'orbit',name:'중앙 궤도 관측 투영기',box:[58,30,16,38]},
{id:'distance',name:'거리 자료 복구 장치',box:[70,35,26,31]},
{id:'communicator',name:'일반 통신기',box:[59,25,5,17]},
{id:'panel',name:'수상한 벽면 패널',box:[89,16,9,29]},
{id:'window',name:'관측창',box:[0,9,25,28]},
{id:'storage',name:'빈 보관함',box:[2,72,14,20]},
{id:'belt',name:'바닥 고정 벨트',box:[62,79,12,12]},
{id:'door',name:'3번 구획 연결문',box:[43,12,16,45]}
];
var observationSets=[
{role:1,star:'A',shift:64,level:'매우 큼',cards:[{id:'A-mar',object:'leftObserver',epoch:'3월 18일',source:'좌측 관측 장치'},{id:'A-sep',object:'window',epoch:'9월 18일',source:'관측창 기록 슬롯'}]},
{role:2,star:'B',shift:16,level:'매우 작음',cards:[{id:'B-mar',object:'camera',epoch:'3월 18일',source:'천장 보조 카메라'},{id:'B-sep',object:'communicator',epoch:'9월 18일',source:'통신기 기록 단자'}]},
{role:3,star:'C',shift:44,level:'큼',cards:[{id:'C-mar',object:'distance',epoch:'3월 18일',source:'거리 자료 장치 기록 슬롯'},{id:'C-sep',object:'storage',epoch:'9월 18일',source:'관측 필름 보관함'}]},
{role:4,star:'D',shift:30,level:'보통',cards:[{id:'D-mar',object:'rail',epoch:'3월 18일',source:'이동식 관측 레일'},{id:'D-sep',object:'belt',epoch:'9월 18일',source:'바닥 고정 벨트'}]}
];
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function img(n){return ROOT+n}
function question(){return Number(ctx.state.progress.question||1)}
function storeKey(s){return'scilab-star-escape-scene02-v1:'+identity+':'+s}
function restore(){try{visited=new Set(JSON.parse(localStorage.getItem(storeKey('visited'))||'[]'));foundCards=new Set(JSON.parse(localStorage.getItem(storeKey('cards'))||'[]'));definitionFound=localStorage.getItem(storeKey('definition-pencil'))==='found';introStep=localStorage.getItem(storeKey('intro'))==='done'?intro.length:0}catch(e){visited=new Set();foundCards=new Set();definitionFound=false;introStep=0}}
function save(){try{localStorage.setItem(storeKey('visited'),JSON.stringify(Array.from(visited)));localStorage.setItem(storeKey('cards'),JSON.stringify(Array.from(foundCards)));if(definitionFound)localStorage.setItem(storeKey('definition-pencil'),'found')}catch(e){}}
function availableRoles(){var occupied=new Set((ctx.state.members||[]).map(function(m){return m.role}));return[1,2,3,4].filter(function(r){return r===ctx.state.player.role||!occupied.has(r)})}
function setForRole(role){return observationSets[Number(role)-1]}
function cardForObject(id){var roles=availableRoles();for(var i=0;i<roles.length;i++){var set=setForRole(roles[i]);for(var j=0;j<set.cards.length;j++)if(set.cards[j].object===id)return{set:set,card:set.cards[j]}}return null}
function foundCount(role){return setForRole(role).cards.filter(function(card){return foundCards.has(card.id)}).length}
function statusText(id,q){var map={
orbit:q===1?'관측 센서와 연결되지 않았다. 센서 보정이 먼저 필요하다.':'과거 관측 기록을 투영할 준비가 되었다.',
distance:q<3?'연주시차 보정 자료가 없다.':'별 A, B, C, D의 거리 순서 자료를 복구할 수 있다.',
communicator:'수신 기록이 없다. 아까 들린 신호는 이 장비에서 나온 것이 아니다.',
panel:q<3?'단단히 닫혀 있다. 내부에 무엇이 있는지는 확인할 수 없다.':'잠금 회로가 거리 자료 시스템과 연결되어 있다. 거리 복구가 먼저 필요하다.',
window:'멀리 있는 배경별들은 거의 움직이지 않는 것처럼 보인다.',
storage:'렌즈 보호 덮개 몇 개가 들어 있다. 핵심 기록은 없다.',
belt:'관측 장비를 고정하는 벨트다.',door:'3번 구획 문은 거리 자료 시스템과 연결되어 잠겨 있다.',
calibration:'거리 측정 전 관측 센서를 점검하는 장치다. 노란 상태등이 처음부터 켜져 있다.'};
return map[id]||'특별한 기록은 보이지 않는다.'
}
function inspectObject(id){var q=question();
if(q===2&&id==='pencil'){definitionFound=true;save();inspect={id:'pencil',secretDefinition:true,name:'연필 아래에 접힌 기록',text:'별을 (□)개월 간격으로 관(□)했을 때, 두 관측 방향 사이 각의 (□)/(□)이 연주시차이다.'};draw();return}
if((q===1&&id==='calibration')||(q===2&&id==='orbit')||(q===3&&id==='distance')){inspect=null;puzzleOpen=true;clueTabOpen=false;draw();return}
var found=cardForObject(id);
if(found){visited.add('card:'+found.card.id);foundCards.add(found.card.id);save();inspect={id:id,role:found.set.role,set:found.set,card:found.card};draw();return}
inspect={id:id,name:(objects.find(function(o){return o.id===id})||{}).name||'조사 대상',text:statusText(id,q)};draw()
}
function objective(q){if(q===1)return'관측 카드로 <b>위치 변화가 가장 큰 별</b>을 찾으세요.';if(q===2)return'수수께끼가 가리키는 물건에서 기록을 찾아 <b>분석 장치 암호</b>를 푸세요.';return'별의 위치 변화 크기로 <b>거리 순서</b>를 복원하세요.'}
function missionChain(){return''}
function storyWhy(q){if(q===1)return'거리 자료가 사라져 기준별을 다시 정해야 합니다. 각 요원이 맡은 별의 3월·9월 관측 카드를 찾아 위치 변화를 비교하세요.';if(q===2)return'센서는 켜졌지만 연주시차의 정의가 지워졌습니다. 방 안에 숨은 정의 기록을 찾아 분석 장치의 암호를 복원해야 합니다.';return'연주시차가 큰 별일수록 가깝습니다. 네 요원의 관측 결과를 합치면 3번 구획 문을 여는 거리표를 만들 수 있습니다.'}
function powerStateMarkup(){return''}
function roomMarkup(q){var required=q===1?'calibration':q===2?'orbit':'distance',stage=q===1?(puzzleOpen?1:0):q===2?2:3;var hotspots=objects.map(function(o){if(o.id==='pencil'&&q!==2)return'';var found=cardForObject(o.id),done=found&&foundCards.has(found.card.id),isSecret=o.id==='pencil';var cls='s2-hotspot'+(done?' visited':'')+(!done&&found?' card-clue':'')+(isSecret?' secret-clue':'')+(o.id===required?' required':'');var label=isSecret?'콘솔 위 연필':found?'숨겨진 '+found.card.epoch+' 관측 카드':o.name;return'<button class="'+cls+'" data-s2-object="'+o.id+'" aria-label="'+esc(label)+'" style="left:'+o.box[0]+'%;top:'+o.box[1]+'%;width:'+o.box[2]+'%;height:'+o.box[3]+'%"></button>'}).join('');
return'<div class="s2-shell"><div class="s2-room s2-room-stage'+stage+'"><div class="s2-title"><small>DISTANCE CALIBRATION ROOM 02</small><b>어긋난 별의 위치</b></div><div class="s2-objective">현재 목표 · '+objective(q)+'</div>'+hotspots+(!puzzleOpen?clueTabButton():'')+(banner?'<div class="s2-system">'+esc(banner)+'</div>':'')+(transitionNotice?transitionMarkup():'')+(inspect?inspectMarkup():'')+(introStep<intro.length?dialogueMarkup():'')+(puzzleOpen?puzzleMarkup(q):'')+(clueTabOpen?clueTabMarkup(q):'')+'</div></div>'}
function transitionMarkup(){return'<section class="s2-transition" role="dialog" aria-modal="true"><div><small>MISSION LINK UPDATED</small><h2>'+esc(transitionNotice.title)+'</h2><p>'+esc(transitionNotice.text)+'</p><button class="primary" id="s2TransitionContinue">다음 장치 확인</button></div></section>'}
function dialogueMarkup(){var d=intro[Math.min(introStep,intro.length-1)];return'<button class="s2-dialogue" id="s2Dialogue"><img src="/labs/star-escape/assets/scene01/characters/ui_lumen_ai_icon.webp" alt=""><span><small>'+esc(d[0])+'</small><p>'+esc(d[1])+'</p></span><i class="advance">터치하여 계속 ▼</i></button>'}
function observationCard(set,card,size){var first=card.id.indexOf('-mar')>0,pos=50+(first?-set.shift/2:set.shift/2);return'<article class="s2-observation-card '+(size||'')+'" style="--target:'+pos+'%" aria-label="별 '+set.star+' '+card.epoch+' 관측 카드"><header><b>별 '+set.star+'</b><span>'+esc(card.epoch)+'</span></header><div class="s2-photo-field"><i class="s2-photo-target"></i></div><footer>'+esc(card.source)+'</footer></article>'}
function pairMarkup(set,size){return'<div class="s2-observation-pair '+(size||'')+'">'+set.cards.map(function(card){return foundCards.has(card.id)?observationCard(set,card,size):'<div class="s2-missing-card"><b>'+esc(card.epoch)+'</b><span>아직 발견하지 못함</span></div>'}).join('')+'</div>'}
function overlapEvidence(set){var left=50-set.shift/2,right=50+set.shift/2;return'<article class="s2-evidence-overlap" aria-label="별 '+set.star+'의 3월과 9월 관측 사진을 겹친 화면"><header><b>별 '+set.star+' · 두 사진 겹쳐 보기</b><span>배경별 기준 정렬</span></header><div class="s2-evidence-field"><i class="s2-evidence-target march" style="left:'+left+'%"><em>3월 18일</em></i><i class="s2-evidence-target september" style="left:'+right+'%"><em>9월 18일</em></i></div><footer>두 표시는 같은 별입니다. 날짜가 달라도 별의 색·밝기·크기는 같습니다.</footer></article>'}
function clueTabButton(inside){var count=foundCount(ctx.state.player.role);return'<button class="s2-clue-tab-button '+(inside?'inside':'')+'" id="s2ClueTab"><span>단서 탭</span><b>'+count+'/2</b></button>'}
function roleTabs(){var a=availableRoles();if(a.indexOf(viewRole)<0)viewRole=ctx.state.player.role;return a.length>1?'<div class="s2-role-tabs">'+a.map(function(r){return'<button data-s2-role="'+r+'" class="'+(r===viewRole?'on':'')+'">'+r+'번 · 별 '+setForRole(r).star+(r!==ctx.state.player.role?' · 빈 역할':'')+'</button>'}).join('')+'</div>':''}
function clueTabMarkup(q){var tabs=roleTabs(),set=setForRole(viewRole),count=foundCount(viewRole),ready=count===2;return'<section class="s2-clue-drawer" role="dialog" aria-modal="true" aria-label="관측 카드 단서 탭"><header><div><small>EVIDENCE ARCHIVE</small><h2>관측 카드 단서 탭</h2></div><button id="s2ClueClose" aria-label="단서 탭 닫기">×</button></header><div class="s2-clue-body">'+tabs+'<div class="s2-clue-summary"><b>대원 '+viewRole+' · 담당 별 '+set.star+'</b><span>'+count+'/2장 발견</span></div>'+(ready?overlapEvidence(set):pairMarkup(set,'drawer'))+'<p class="s2-clue-help">배경별은 같은 자리에 고정되어 있습니다. <b>3월과 9월에 같은 별이 얼마나 다른 위치에 보이는지</b> 비교하세요.</p>'+(!ready?'<div class="s2-clue-empty">방 안을 조사해 아직 찾지 못한 관측 카드를 확보하세요.</div>':'')+'</div></section>'}
function inspectMarkup(){if(inspect.card)return'<section class="s2-inspect s2-card-found"><div class="s2-inspect-media">'+observationCard(inspect.set,inspect.card,'compact')+'</div><div><small>대원 '+inspect.role+' · 별 '+inspect.set.star+'</small><b>'+esc(inspect.card.epoch)+' 관측 카드 발견</b><span class="s2-device-state">단서 탭에 자동 저장됨 · '+foundCount(inspect.role)+'/2</span><p>다른 날짜 카드와 배경별은 같습니다. 두 장을 모두 찾은 뒤 같은 별의 위치만 비교하세요.</p></div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>';
if(inspect.secretDefinition)return'<section class="s2-inspect s2-definition-found"><div class="s2-definition-icon">⌁</div><div><small>HIDDEN SCIENCE RECORD</small><b>'+esc(inspect.name)+'</b><p>별을 <strong>( □ )개월</strong> 간격으로 관<strong>( □ )</strong>했을 때,<br>두 관측 방향 사이 각의 <strong>( □ ) / ( □ )</strong>이 연주시차이다.</p><span class="s2-device-state">빈칸의 내용을 순서대로 이어 분석 장치에 입력하세요.</span></div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>';
var media=inspect.id==='hatch'?'scene2_floor_hatch_open.png':inspect.id==='rail'?'scene2_observation_rail.png':'scene2_room_base.png';return'<section class="s2-inspect"><div class="s2-inspect-media"><img src="'+img(media)+'" alt=""></div><div><small>INVESTIGATION</small><b>'+esc(inspect.name)+'</b><p>'+esc(inspect.text)+'</p></div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>'}
function card(letter,placed,location){location=location||'bank';return'<button class="s2-card s2-letter-card '+(selectedCard===letter&&selectionKind==='card'?'selected ':'')+(placed?'placed':'')+'" data-s2-card="'+letter+'" data-s2-location="'+location+'" aria-pressed="'+(selectedCard===letter)+'" '+(placed&&location==='bank'?'disabled':'')+'><span>별</span><b>'+letter+'</b>'+(location==='slot'?'<small>눌러서 다시 이동</small>':'')+'</button>'}
function selectionNotice(kind){var on=selectedCard&&selectionKind===kind;return'<div class="s2-selection-note '+(on?'on':'')+'" aria-live="polite">'+(on?'<b>'+esc(selectedCard)+' 선택됨</b><span>옮길 슬롯을 누르세요.</span><button id="s2CancelSelection">선택 취소</button>':'<span>카드를 한 번 누른 뒤, 넣을 슬롯을 누르세요. 슬롯의 카드를 누르면 다시 뺄 수 있습니다.</span>')+'</div>'}
function guideBlock(q,kicker,title,prompt){return'<div class="s2-guide"><small>'+kicker+'</small><b>'+title+'</b><p>'+prompt+'</p><div class="s2-story-why"><strong>이 단계가 필요한 이유</strong><span>'+storyWhy(q)+'</span></div></div>'}
function puzzle1(){var count=foundCount(ctx.state.player.role);return'<div class="s2-panel">'+guideBlock(1,'PARALLAX SENSOR CALIBRATION','겉보기 위치 변화가 가장 큰 별 선택','문제는 지금 풀어볼 수 있지만, 정확한 판단에는 방에서 찾은 3월·9월 관측 카드가 필요합니다. 두 날짜의 같은 별 위치를 비교하세요.')+'<div class="s2-coop-note">내 카드 수집 상태 <b>'+count+'/2장</b> · 각 요원은 자기 별의 변화 크기를 비교해 모둠에 공유하세요.</div><div class="s2-drag-area"><div><div class="s2-bank">'+['A','B','C','D'].map(function(x){return card(x,slotValue===x,'bank')}).join('')+'</div>'+selectionNotice('card')+'</div><div class="s2-slot-wrap"><span class="s2-slot-label">위치 변화가 가장 큰 별</span><div class="s2-slot '+(slotValue?'filled':'')+'" data-s2-slot="single">'+(slotValue?card(slotValue,false,'slot'):'선택한 별을<br>여기에 놓으세요.')+'</div></div></div></div>'}
function puzzle2(){return'<div class="s2-panel s2-q2-panel s2-q2-compact"><div class="s2-q2-compact-head"><small>ANNUAL PARALLAX ANALYZER</small><b>연주시차 분석 장치 암호</b></div><div class="s2-riddle-box"><small>비밀번호 기록이 숨겨진 물건</small><p>머리를 깎을수록 말이 많아지고,<br>말을 많이 할수록 키가 줄어든다.</p></div><label class="s2-password-field"><span>비밀번호</span><input id="s2Password" type="text" maxlength="5" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="비밀번호 입력"></label></div>'}
function puzzle3(){var own=setForRole(ctx.state.player.role);return'<div class="s2-panel">'+guideBlock(3,'DISTANCE DATA RESTORE','처음 조사한 별 A~D를 가까운 순서로 배치','각 요원은 단서 탭에서 자기 별의 두 사진을 다시 비교해 위치 변화 크기를 말해 주세요. 연주시차가 클수록 가까운 별입니다.')+'<div class="s2-coop-note">대원 '+ctx.state.player.role+'의 담당은 <b>별 '+own.star+'</b>입니다. 단서 탭은 마지막 문제에서도 계속 열 수 있습니다.</div><div class="s2-distance-layout s2-distance-only"><div><div class="s2-distance-rail"><span>지구 · 가까움</span>'+distanceSlots.map(function(x,i){return'<div class="s2-distance-slot '+(x?'filled':'')+'" data-s2-distance-slot="'+i+'">'+(x?'<button class="s2-star-chip" data-s2-star="'+x+'" data-s2-location="slot">'+x+'<small>눌러서 이동</small></button>':'슬롯 '+(i+1))+'</div>'}).join('')+'<span>멂</span></div><div class="s2-star-bank">'+['A','B','C','D'].map(function(x){var placed=distanceSlots.indexOf(x)>=0;return'<button class="s2-star-chip '+(placed?'placed ':'')+(selectedCard===x&&selectionKind==='star'?'selected':'')+'" data-s2-star="'+x+'" data-s2-location="bank" '+(placed?'disabled':'')+'>'+x+'</button>'}).join('')+'</div>'+selectionNotice('star')+'</div></div></div>'}
function puzzleMarkup(q){return'<section class="s2-puzzle"><header class="s2-puzzle-head"><div><small>SCENE 02 · CALIBRATION '+q+'/3</small><h2>'+(q===1?'관측 센서 점검':q===2?'연주시차 분석 장치':'별 거리 자료 복구')+'</h2></div><div class="s2-puzzle-actions">'+clueTabButton('inside')+'<button class="s2-close" id="s2PuzzleClose">×</button></div></header><div class="s2-puzzle-body">'+(q===1?puzzle1():q===2?puzzle2():puzzle3())+'<div class="hintbox" id="hintbox"></div></div><footer class="s2-footer"><p class="s2-feedback" id="feedback">'+(q===1?'관측 카드 두 장을 비교한 뒤 위치 변화가 가장 큰 별을 선택하세요.':q===2?'수수께끼가 가리키는 물건에서 정의 기록을 찾고 비밀번호를 입력하세요.':'네 요원의 카드 변화를 공유하고 가까운 순서로 배치하세요.')+'</p><button class="secondary" id="hintBtn">힌트 · '+Math.min(ctx.state.progress.hintCount,3)+'/3 무료</button><button class="primary" id="s2Submit">'+(q===1?'보정 실행':q===2?'암호 확인':'거리 자료 복구')+'</button></footer></section>'}
function clearSelection(){selectedCard='';selectionKind=''}
function chooseItem(value,kind){if(selectedCard===value&&selectionKind===kind)clearSelection();else{selectedCard=value;selectionKind=kind}draw()}
function bindPlacement(q){
document.querySelectorAll('[data-s2-location="bank"][data-s2-card]').forEach(function(el){el.onclick=function(e){e.stopPropagation();chooseItem(el.dataset.s2Card,'card')}});
document.querySelectorAll('[data-s2-location="slot"][data-s2-card]').forEach(function(el){el.onclick=function(e){e.stopPropagation();var value=el.dataset.s2Card;slotValue='';selectedCard=value;selectionKind='card';draw()}});
document.querySelectorAll('[data-s2-location="bank"][data-s2-star]').forEach(function(el){el.onclick=function(e){e.stopPropagation();chooseItem(el.dataset.s2Star,'star')}});
document.querySelectorAll('[data-s2-location="slot"][data-s2-star]').forEach(function(el){el.onclick=function(e){e.stopPropagation();var value=el.dataset.s2Star;distanceSlots=distanceSlots.map(function(x){return x===value?'':x});selectedCard=value;selectionKind='star';draw()}});
document.querySelectorAll('[data-s2-slot]').forEach(function(slot){slot.onclick=function(){if(selectionKind!=='card'||!selectedCard)return;slotValue=selectedCard;clearSelection();draw()}});
document.querySelectorAll('[data-s2-distance-slot]').forEach(function(slot){slot.onclick=function(){if(selectionKind!=='star'||!selectedCard)return;var target=Number(slot.dataset.s2DistanceSlot),value=selectedCard;distanceSlots=distanceSlots.map(function(x){return x===value?'':x});distanceSlots[target]=value;clearSelection();draw()}});
var cancel=document.getElementById('s2CancelSelection');if(cancel)cancel.onclick=function(){clearSelection();draw()}
}
function bad(msg){var f=document.getElementById('feedback');if(f){f.textContent=msg;f.className='s2-feedback bad'}}
function bindPuzzle(q){var close=document.getElementById('s2PuzzleClose');if(close)close.onclick=function(){puzzleOpen=false;clueTabOpen=false;draw()};
bindPlacement(q);
document.getElementById('hintBtn').onclick=ctx.hint;document.getElementById('s2Submit').onclick=async function(){if(q===1){if(!slotValue)return bad('기준 슬롯에 별 카드를 배치하세요.');if(slotValue!=='A')return bad(slotValue==='B'?'별 B는 두 사진에서 위치 변화가 가장 작습니다.':'다른 요원이 가진 카드의 위치 변화와 다시 비교하세요.');await ctx.submit('A',this);return}
if(q===2){var input=document.getElementById('s2Password'),answer=String(input&&input.value||'').replace(/\s/g,'');if(!definitionFound)return bad('수수께끼가 가리키는 물건에서 정의 기록을 먼저 찾으세요.');if(!answer)return bad('정의 문장의 빈칸 내용을 순서대로 이어 입력하세요.');if(answer!=='6측12')return bad('6개월, 관측, 전체 각의 1/2이라는 정의에서 빈칸만 다시 이어 보세요.');await ctx.submit('6측12',this);return}
if(distanceSlots.some(function(x){return!x}))return bad('A, B, C, D를 네 슬롯에 모두 배치하세요.');if(distanceSlots.join('')!=='ACDB'){var a=distanceSlots.indexOf('A'),b=distanceSlots.indexOf('B');if(a>1)return bad('위치 변화가 가장 큰 별 A는 더 가까운 곳에 있어야 합니다.');if(b<2)return bad('위치 변화가 가장 작은 별 B는 더 먼 곳에 있어야 합니다.');return bad('각 요원의 3월·9월 카드에서 위치 변화가 큰 순서부터 다시 비교하세요.')}await ctx.submit('ACDB',this)}
}
function bindClueControls(){var tab=document.getElementById('s2ClueTab');function open(){clueTabOpen=true;viewRole=ctx.state.player.role;draw()}if(tab)tab.onclick=open;var close=document.getElementById('s2ClueClose');if(close)close.onclick=function(){clueTabOpen=false;draw()};document.querySelectorAll('[data-s2-role]').forEach(function(b){b.onclick=function(){viewRole=Number(b.dataset.s2Role);draw()}})}
function bindRoom(){var d=document.getElementById('s2Dialogue');if(d)d.onclick=function(){introStep++;if(introStep>=intro.length){try{localStorage.setItem(storeKey('intro'),'done')}catch(e){}}draw()};var transition=document.getElementById('s2TransitionContinue');if(transition)transition.onclick=function(){transitionNotice=null;draw()};document.querySelectorAll('[data-s2-object]').forEach(function(b){b.onclick=function(){inspectObject(b.dataset.s2Object)}});var c=document.getElementById('s2InspectClose');if(c)c.onclick=function(){inspect=null;draw()};bindClueControls()}
function draw(){if(!ctx||!ctx.game)return;var q=question();ctx.game.innerHTML=roomMarkup(q);bindRoom();if(puzzleOpen)bindPuzzle(q);if(banner)setTimeout(function(){banner='';var e=document.querySelector('.s2-system');if(e)e.remove()},2500)}
function render(options){ctx=options;var next=options.state.session.code+':'+options.state.player.team+':'+options.state.player.role;if(identity!==next){identity=next;restore();inspect=null;puzzleOpen=false;clueTabOpen=false;lastQuestion=0;transitionNotice=null;viewRole=options.state.player.role}var q=question();if(lastQuestion&&q!==lastQuestion){inspect=null;puzzleOpen=false;clueTabOpen=false;clearSelection();slotValue='';distanceSlots=['','','',''];if(q===2){banner='관측 센서 보정 완료 · 연주시차 분석 장치 활성화';transitionNotice={title:'관측 센서 보정 완료',text:'별 A를 기준별로 설정해 중앙 연주시차 분석 장치가 켜졌습니다. 장치를 눌러 수수께끼를 확인하고 방 안에 숨은 정의 기록을 찾으세요.'}}else if(q===3){banner='분석 장치 암호 해제 · 거리 자료 장치 활성화';transitionNotice={title:'연주시차 정의 복구 완료',text:'6개월 간격으로 관측한 두 방향 사이 각의 1/2이 연주시차임을 복구했습니다. 이제 네 별의 위치 변화 크기로 가까운 순서를 완성하세요.'}}}lastQuestion=q;draw()}
function renderEnding(game,onContinue){var step=0,line=0;var signal=[
['미확인 음성','치직— “…여기까지 왔다면 거리 자료는 복구했겠지.”'],
['루멘','실시간 통신이 아닙니다. 저장된 음성 기록입니다.'],
['미확인 음성','“자동 관측값이 계속 바뀌고 있다. 그래서 수동 채널에 기록을 남긴다.”'],
['미확인 음성','“다음은 3번 구획. 별이 얼마나 밝게 보이는지만 믿지 마.”'],
['대원','누가 남긴 거지?'],
['루멘','송신자 정보가 삭제되어 있습니다. …한 가지 기록을 복구했습니다. 수동 송신 예약 시각은 사고 발생 이전입니다.'],
['대원','사고가 나기 전부터 알고 있었다는 거야?'],
['루멘','…가능성이 있습니다. 거리 보정 시스템 정상화. 3번 구획 진입이 가능합니다.']
];function paint(){if(step===0){game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-stage3 s2-room-recovered"><div class="s2-title"><small>DISTANCE CALIBRATION ROOM 02</small><b>별 거리 자료 복구 완료</b></div><div class="s2-recovery-flash"><small>SYSTEM RECOVERY COMPLETE</small><b>거리표 복구 · 3번 구획 잠금 해제</b><span>오른쪽 장치의 화면과 연결문 표시등이 켜졌습니다.</span></div><div class="s2-objective">현재 목표 · 잠금이 풀린 <b>벽면 패널</b>을 조사하세요.</div><button class="s2-hotspot" id="s2EndPanel" aria-label="잠금 해제된 벽면 패널" style="left:88%;top:12%;width:11%;height:35%"></button></div></div>';document.getElementById('s2EndPanel').onclick=function(){step=1;paint()};return}
if(step===1){game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-stage-panel-open s2-room-recovered"><div class="s2-title"><small>HIDDEN CHANNEL FOUND</small><b>벽면 패널 개방</b></div><div class="s2-panel-open-notice"><div><small>UNREGISTERED TRANSMITTER</small><b>숨겨진 수동 송신기 발견</b><span>열린 벽면 안쪽에서 정거장의 공식 장비와 다른 송신기가 켜졌습니다.</span></div><button class="primary" id="s2PlaySignal">송신 기록 재생</button></div></div></div>';document.getElementById('s2PlaySignal').onclick=function(){step=2;line=0;paint()};return}
if(step===2){var d=signal[line];game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-stage-panel-open s2-room-recovered"><div class="s2-ending s2-panel-signal-stage"><button class="s2-ending-dialogue" id="s2SignalNext"><small>'+esc(d[0])+'</small><p>'+esc(d[1])+'</p><i>'+(line===signal.length-1?'3번 구획 확인':'터치하여 계속')+' ▼</i></button></div></div></div>';document.getElementById('s2SignalNext').onclick=function(){line++;if(line>=signal.length){step=3;line=0}paint()};return}
game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-stage4 s2-room-recovered"><div class="s2-title"><small>SCENE 02 · COMPLETE</small><b>3번 구획 문 개방</b></div><div class="s2-door-open-notice"><div><small>DOOR OPEN</small><b>03 — 별빛 분석 구획</b><span>열린 문으로 이동할 수 있습니다.</span></div><button class="primary" id="s2Continue">3번 구획으로 이동</button></div></div></div>';document.getElementById('s2Continue').onclick=onContinue}paint()}
window.StarEscapeScene02={render:render,renderEnding:renderEnding};
})();
