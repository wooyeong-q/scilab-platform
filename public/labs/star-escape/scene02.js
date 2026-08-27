(function(){
'use strict';
var ROOT='/labs/star-escape/assets/scene02/';
var ctx=null,identity='',introStep=0,inspect=null,puzzleOpen=false,banner='',lastQuestion=0,viewRole=1,transitionNotice=null;
var visited=new Set(),selectedCard='',selectionKind='',slotValue='',recordSlots=['',''],q2Step=1,parallaxChoice='',distanceSlots=['','','',''];
var intro=[
['루멘','2번 구획 진입. 거리 보정실입니다. 귀환 항법 장치가 별까지의 거리 자료를 잃었습니다.'],
['루멘','거리 자료가 복구되지 않으면 3번 구획과 지구 귀환 항로를 열 수 없습니다.'],
['루멘','복구 절차는 관측 센서 보정 → 6개월 관측 비교 → 별 거리 순서 복원입니다.'],
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
{id:'camera',name:'천장 보조 카메라',box:[38,2,21,18]},
{id:'hatch',name:'바닥 점검구',box:[34,67,27,26]},
{id:'rail',name:'이동식 관측 레일',box:[72,62,24,27]},
{id:'calibration',name:'관측 센서 점검 장치',box:[25,38,22,28]},
{id:'orbit',name:'중앙 궤도 관측 투영기',box:[58,30,16,38]},
{id:'distance',name:'거리 자료 복구 장치',box:[70,35,26,31]},
{id:'communicator',name:'일반 통신기',box:[64,18,8,21]},
{id:'panel',name:'수상한 벽면 패널',box:[89,16,9,29]},
{id:'window',name:'관측창',box:[0,9,25,28]},
{id:'storage',name:'빈 보관함',box:[2,72,14,20]},
{id:'belt',name:'바닥 고정 벨트',box:[62,79,12,12]},
{id:'door',name:'3번 구획 연결문',box:[43,12,16,45]}
];
var clues={
1:{id:'leftObserver',title:'표적 A · 좌우 관측 전환',kind:'toggle',images:['scene2_targetA_left.png','scene2_targetA_right.png'],text:'표적 A는 관측 위치를 바꾸자 고정된 배경별에 대해 매우 크게 이동해 보였다.'},
2:{id:'camera',title:'표적 B · 천장 보조 카메라',kind:'zoom',images:['scene2_targetB_view1.png','scene2_targetB_view2.png'],text:'표적 B는 두 관측 위치에서 거의 같은 곳에 보였다.'},
3:{id:'hatch',title:'표적 C · 투명 관측 필름',kind:'film',images:['scene2_starfield_base.png','scene2_target_star_overlay.png'],text:'두 필름의 배경별을 겹치자 표적 C의 위치가 꽤 크게 달라져 보였다.'},
4:{id:'rail',title:'표적 D · 이동식 관측 레일',kind:'rail',images:['scene2_rail_targetD_left.png','scene2_rail_targetD_right.png'],text:'레일을 이동하자 표적 D는 배경에 대해 중간 정도 위치가 달라져 보였다.'}
};
var q2Intel=[
{title:'관측 기록 A',text:'관측일: 3월 18일'},
{title:'관측 기록 B',text:'관측일: 9월 18일'},
{title:'관측 기록 C',text:'관측일: 6월 18일'},
{title:'연주시차 관측 설명서',text:'지구가 태양의 반대편에 놓이는 6개월 간격의 두 관측을 비교한다. 두 겉보기 위치 사이의 최대 각거리 2p에서 절반이 연주시차 p이다.'}
];
var q3Intel=[
{star:'K',shift:78,text:'별 K의 연주시차는 매우 크게 나타난다.'},
{star:'L',shift:18,text:'별 L의 연주시차는 매우 작게 나타난다.'},
{star:'M',shift:58,text:'별 M의 연주시차는 K보다 작지만 비교적 크게 나타난다.'},
{star:'N',shift:36,text:'별 N의 연주시차는 M보다 작고 L보다 크게 나타난다.'}
];
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function img(n){return ROOT+n}
function question(){return Number(ctx.state.progress.question||1)}
function storeKey(s){return'scilab-star-escape-scene02-v1:'+identity+':'+s}
function restore(){try{visited=new Set(JSON.parse(localStorage.getItem(storeKey('visited'))||'[]'));introStep=localStorage.getItem(storeKey('intro'))==='done'?intro.length:0;q2Step=Number(localStorage.getItem(storeKey('q2step'))||1)}catch(e){visited=new Set();introStep=0;q2Step=1}}
function save(){try{localStorage.setItem(storeKey('visited'),JSON.stringify(Array.from(visited)));localStorage.setItem(storeKey('q2step'),String(q2Step))}catch(e){}}
function availableRoles(){var occupied=new Set((ctx.state.members||[]).map(function(m){return m.role}));return[1,2,3,4].filter(function(r){return r===ctx.state.player.role||!occupied.has(r)})}
function roleForObject(id){return availableRoles().find(function(r){return clues[r].id===id})}
function statusText(id,q){var map={
orbit:q===1?'관측 센서와 연결되지 않았다. 센서 보정이 먼저 필요하다.':'과거 관측 기록을 투영할 준비가 되었다.',
distance:q<3?'연주시차 보정 자료가 없다.':'별 K, L, M, N의 거리 순서 자료를 복구할 수 있다.',
communicator:'수신 기록이 없다. 아까 들린 신호는 이 장비에서 나온 것이 아니다.',
panel:q<3?'단단히 닫혀 있다. 내부에 무엇이 있는지는 확인할 수 없다.':'잠금 회로가 거리 자료 시스템과 연결되어 있다. 거리 복구가 먼저 필요하다.',
window:'멀리 있는 배경별들은 거의 움직이지 않는 것처럼 보인다.',
storage:'렌즈 보호 덮개 몇 개가 들어 있다. 핵심 기록은 없다.',
belt:'관측 장비를 고정하는 벨트다.',door:'3번 구획 문은 거리 자료 시스템과 연결되어 잠겨 있다.',
calibration:'거리 측정 전 관측 센서를 점검하는 장치다. 노란 상태등이 처음부터 켜져 있다.'};
return map[id]||'특별한 기록은 보이지 않는다.'
}
function inspectObject(id){var q=question();
if((q===1&&id==='calibration')||(q===2&&id==='orbit')||(q===3&&id==='distance')){inspect=null;puzzleOpen=true;draw();return}
var role=q===1?roleForObject(id):null;
if(role){visited.add('q1:'+id);save();inspect={id:id,role:role,clue:clues[role],mode:0,value:0};draw();return}
inspect={id:id,name:(objects.find(function(o){return o.id===id})||{}).name||'조사 대상',text:statusText(id,q)};draw()
}
function objective(q){if(q===1)return'겉보기 이동이 가장 큰 표적으로 <b>관측 센서</b>의 기준을 잡으세요.';if(q===2)return'6개월 간격 자료에서 <b>연주시차 p</b>를 복구하세요.';return'연주시차 크기를 이용해 <b>별 거리표</b>를 복원하세요.'}
function missionChain(q){var labels=['1. 센서 보정','2. 연주시차 복구','3. 거리표 복원'];return'<div class="s2-mission-chain" aria-label="거리 자료 복구 절차">'+labels.map(function(label,i){var step=i+1;return'<span class="'+(step<q?'done':step===q?'active':'')+'">'+label+'</span>'+(step<3?'<i>→</i>':'')}).join('')+'</div>'}
function storyWhy(q){if(q===1)return'자동 센서의 기준이 틀어졌습니다. 겉보기 이동이 가장 뚜렷한 표적을 먼저 고정해야 6개월 관측 자료를 비교할 수 있습니다.';if(q===2)return'센서는 정상화됐지만 거리 계산에 필요한 연주시차가 비어 있습니다. 지구가 태양의 반대편에 있는 두 시점의 관측을 연결하세요.';return'연주시차가 클수록 별은 가깝습니다. 복구한 연주시차로 항법 장치의 거리 순서를 다시 만들면 3번 구획이 열립니다.'}
function roomMarkup(q){var required=q===1?'calibration':q===2?'orbit':'distance';var hotspots=objects.map(function(o){var cls='s2-hotspot'+(visited.has('q1:'+o.id)?' visited':'')+(o.id===required?' required':'');return'<button class="'+cls+'" data-s2-object="'+o.id+'" aria-label="'+esc(o.name)+'" style="left:'+o.box[0]+'%;top:'+o.box[1]+'%;width:'+o.box[2]+'%;height:'+o.box[3]+'%"></button>'}).join('');
return'<div class="s2-shell"><div class="s2-room s2-room-q'+q+'"><div class="s2-title"><small>DISTANCE CALIBRATION ROOM 02</small><b>어긋난 별의 위치</b></div><div class="s2-objective">현재 목표 · '+objective(q)+'</div>'+missionChain(q)+hotspots+(banner?'<div class="s2-system">'+esc(banner)+'</div>':'')+(transitionNotice?transitionMarkup():'')+(inspect?inspectMarkup():'')+(introStep<intro.length?dialogueMarkup():'')+(puzzleOpen?puzzleMarkup(q):'')+'</div></div>'}
function transitionMarkup(){return'<section class="s2-transition" role="dialog" aria-modal="true"><div><small>MISSION LINK UPDATED</small><h2>'+esc(transitionNotice.title)+'</h2><p>'+esc(transitionNotice.text)+'</p><button class="primary" id="s2TransitionContinue">다음 장치 확인</button></div></section>'}
function dialogueMarkup(){var d=intro[Math.min(introStep,intro.length-1)];return'<button class="s2-dialogue" id="s2Dialogue"><img src="/labs/star-escape/assets/scene01/characters/ui_lumen_ai_icon.webp" alt=""><span><small>'+esc(d[0])+'</small><p>'+esc(d[1])+'</p></span><i class="advance">터치하여 계속 ▼</i></button>'}
function clueMedia(c,ins){if(c.kind==='film')return'<div class="s2-film" id="s2Film" style="--film-shift:'+(-30+ins.value*.6)+'px"><span class="s2-film-sheet bottom"><img class="field" src="'+img(c.images[0])+'" alt="고정된 배경별"><img class="target c1" src="'+img(c.images[1])+'" alt="표적 C 첫 번째 위치"></span><span class="s2-film-sheet top"><img class="field" src="'+img(c.images[0])+'" alt="고정된 배경별"><img class="target c2" src="'+img(c.images[1])+'" alt="표적 C 두 번째 위치"></span></div>';
if(c.kind==='toggle'||c.kind==='rail')return'<img id="s2InspectImage" src="'+img(c.images[ins.mode])+'" alt="'+esc(c.title)+'">';
return'<div class="s2-pair" id="s2ZoomPair" style="transform:scale('+(1+ins.value/130)+')"><img src="'+img(c.images[0])+'" alt="첫 번째 관측"><img src="'+img(c.images[1])+'" alt="두 번째 관측"></div>'}
function clueTask(c,ins){if(c.kind==='toggle')return'<div class="s2-task s2-task-actions"><button data-s2-mode="0" class="'+(!ins.mode?'on':'')+'">왼쪽 관측</button><button data-s2-mode="1" class="'+(ins.mode?'on':'')+'">오른쪽 관측</button></div>';
if(c.kind==='zoom')return'<div class="s2-task"><b>관측 영상 확대</b><input id="s2InspectRange" type="range" min="0" max="100" value="'+ins.value+'"></div>';
if(c.kind==='film')return'<div class="s2-task"><b>위쪽 필름을 밀어 배경별 겹치기</b><input id="s2InspectRange" type="range" min="0" max="100" value="'+ins.value+'"></div>';
return'<div class="s2-task"><b>관측 레일 이동</b><input id="s2InspectRange" type="range" min="0" max="100" value="'+ins.value+'"></div>'}
function inspectText(c,ins){if(c.kind==='film'&&(ins.value<43||ins.value>57))return'위쪽 필름을 밀어 두 사진의 배경별을 먼저 정확히 겹쳐 보세요.';return c.text}
function inspectMarkup(){if(!inspect.clue){var media=inspect.id==='hatch'?'scene2_floor_hatch_open.png':inspect.id==='rail'?'scene2_observation_rail.png':'scene2_room_base.png';return'<section class="s2-inspect"><div class="s2-inspect-media"><img src="'+img(media)+'" alt=""></div><div><small>INVESTIGATION</small><b>'+esc(inspect.name)+'</b><p>'+esc(inspect.text)+'</p></div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>'}
var c=inspect.clue;var lead=c.kind==='film'?'<span class="s2-device-state">바닥 점검구 개방 · 관측 필름 2장 확인</span>':c.kind==='rail'?'<span class="s2-device-state">이동식 관측 레일 연결</span>':'';return'<section class="s2-inspect"><div class="s2-inspect-media">'+clueMedia(c,inspect)+'</div><div><small>대원 '+inspect.role+' 전용 관측 자료</small><b>'+esc(c.title)+'</b>'+lead+'<p id="s2InspectText">'+esc(inspectText(c,inspect))+'</p>'+clueTask(c,inspect)+'</div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>'}
function roleTabs(){var a=availableRoles();if(a.indexOf(viewRole)<0)viewRole=ctx.state.player.role;return a.length>1?'<div class="s2-role-tabs">'+a.map(function(r){return'<button data-s2-role="'+r+'" class="'+(r===viewRole?'on':'')+'">'+r+'번 자료'+(r!==ctx.state.player.role?' · 빈 역할':'')+'</button>'}).join('')+'</div>':''}
function card(letter,file,placed,location){location=location||'bank';return'<button class="s2-card '+(selectedCard===letter&&selectionKind==='card'?'selected ':'')+(placed?'placed':'')+'" data-s2-card="'+letter+'" data-s2-location="'+location+'" aria-pressed="'+(selectedCard===letter)+'" '+(placed&&location==='bank'?'disabled':'')+'><img src="'+img(file)+'" alt="표적 '+letter+'"><b>'+letter+'</b>'+(location==='slot'?'<small>눌러서 다시 이동</small>':'')+'</button>'}
function selectionNotice(kind){var on=selectedCard&&selectionKind===kind;return'<div class="s2-selection-note '+(on?'on':'')+'" aria-live="polite">'+(on?'<b>'+esc(selectedCard)+' 선택됨</b><span>옮길 슬롯을 누르세요.</span><button id="s2CancelSelection">선택 취소</button>':'<span>카드를 한 번 누른 뒤, 넣을 슬롯을 누르세요. 슬롯의 카드를 누르면 다시 뺄 수 있습니다.</span>')+'</div>'}
function guideBlock(q,kicker,title,prompt){return'<div class="s2-guide"><small>'+kicker+'</small><b>'+title+'</b><p>'+prompt+'</p><div class="s2-story-why"><strong>이 단계가 필요한 이유</strong><span>'+storyWhy(q)+'</span></div></div>'+missionChain(q)}
function puzzle1(){var files={A:'scene2_targetA_left.png',B:'scene2_targetB_view1.png',C:'scene2_targetC_film_bottom.png',D:'scene2_rail_targetD_left.png'};return'<div class="s2-panel">'+guideBlock(1,'PARALLAX SENSOR CALIBRATION','관측 센서 기준 표적 선택','두 위치에서 관측했을 때 배경별에 대해 겉보기 이동이 가장 크게 나타난 표적을 기준 슬롯에 넣으세요.')+'<div class="s2-drag-area"><div><div class="s2-bank">'+['A','B','C','D'].map(function(x){return card(x,files[x],slotValue===x,'bank')}).join('')+'</div>'+selectionNotice('card')+'</div><div class="s2-slot-wrap"><span class="s2-slot-label">기준 표적 슬롯</span><div class="s2-slot '+(slotValue?'filled':'')+'" data-s2-slot="single">'+(slotValue?card(slotValue,files[slotValue],false,'slot'):'선택한 카드를<br>여기에 놓으세요.')+'</div></div></div></div>'}
function q2IntelMarkup(intel){return'<div class="s2-role-intel"><b>'+esc(intel.title)+'</b><p>'+esc(intel.text)+'</p></div>'}
function parallaxBoard(){return'<div class="s2-parallax-board '+(parallaxChoice?'choice-'+parallaxChoice:'')+'"><div class="s2-parallax-field" aria-label="같은 배경별 위에 겹친 3월과 9월 표적 위치"><i class="bg b1"></i><i class="bg b2"></i><i class="bg b3"></i><i class="bg b4"></i><i class="bg b5"></i><span class="s2-target-pos pos-a"><i></i><b>A</b><small>3월 18일</small></span><span class="s2-target-pos pos-o"><i></i><b>O</b><small>태양 기준 방향</small></span><span class="s2-target-pos pos-b"><i></i><b>B</b><small>9월 18일</small></span><span class="s2-whole-segment">두 겉보기 위치 사이의 각거리 = 2p</span><span class="s2-half-segment">후보 구간 A–O</span></div><p class="s2-science-note">배경별을 맞춰 겹친 단순화 모형입니다. O는 별의 실제 위치가 아니라 태양에서 본 기준 방향이며, A–B의 화면상 거리는 두 방향 사이의 각거리를 나타냅니다.</p><div class="s2-parallax-options"><button data-s2-parallax="whole" class="'+(parallaxChoice==='whole'?'on':'')+'"><b>A ↔ B</b><span>두 관측 위치 사이 전체 각거리</span></button><button data-s2-parallax="half" class="'+(parallaxChoice==='half'?'on':'')+'"><b>A ↔ O</b><span>한 관측 위치에서 기준 방향까지</span></button></div></div>'}
function puzzle2(){var intel=q2Intel[viewRole-1];if(q2Step===2)return'<div class="s2-panel">'+guideBlock(2,'ANNUAL PARALLAX CALIBRATION · STEP 2/2','연주시차 p에 해당하는 구간을 선택하세요.','두 관측에서 표적별의 위치를 같은 배경별 위에 겹쳤습니다. 두 겉보기 위치 사이의 최대 각거리는 2p입니다.')+roleTabs()+q2IntelMarkup(intel)+parallaxBoard()+'</div>';
var files={A:'scene2_record_A.png',B:'scene2_record_B.png',C:'scene2_record_C.png'};return'<div class="s2-panel">'+guideBlock(2,'ANNUAL PARALLAX CALIBRATION · STEP 1/2','6개월 간격의 관측 기록 두 장을 선택하세요.','공통 카드에는 날짜가 없습니다. 각 대원의 날짜 정보를 공유해 지구가 태양의 반대편에 놓이는 두 기록을 찾으세요.')+roleTabs()+'<div class="s2-role-intel"><b>'+esc(intel.title)+'</b><p>'+esc(intel.text)+'</p></div><div class="s2-record-bank">'+['A','B','C'].map(function(x){return card(x,files[x],recordSlots.indexOf(x)>=0,'bank')}).join('')+'</div>'+selectionNotice('card')+'<div class="s2-two-slots">'+recordSlots.map(function(x,i){return'<div class="s2-slot '+(x?'filled':'')+'" data-s2-record-slot="'+i+'">'+(x?card(x,files[x],false,'slot'):(i?'두 번째 관측':'첫 번째 관측'))+'</div>'}).join('')+'</div></div>'}
function distanceVisual(intel){var half=intel.shift/2;return'<div class="s2-role-parallax" style="--shift:'+intel.shift+'%;--half:'+half+'%" aria-label="같은 축척에서 표시한 별 '+intel.star+'의 두 겉보기 위치"><small>SAME ANGULAR SCALE · 동일 각도 축척</small><b>별 '+intel.star+'</b><div class="s2-role-track"><i class="center"></i><i class="epoch-a"></i><i class="epoch-b"></i><span class="shift-label">두 위치의 각거리 2p</span></div><div class="s2-role-legend"><span>3월 위치 A</span><span>태양 기준 O</span><span>9월 위치 B</span></div></div>'}
function puzzle3(){var intel=q3Intel[viewRole-1];return'<div class="s2-panel">'+guideBlock(3,'DISTANCE DATA RESTORE','별을 지구에서 가까운 순서로 배치하세요.','네 대원의 동일 축척 연주시차 자료를 비교하세요. 연주시차가 클수록 가까운 별입니다.')+roleTabs()+'<div class="s2-role-intel"><b>대원 '+viewRole+' · 별 '+intel.star+'</b><p>'+esc(intel.text)+'</p></div><div class="s2-distance-layout"><div class="s2-distance-visual">'+distanceVisual(intel)+'</div><div><div class="s2-distance-rail"><span>지구 · 가까움</span>'+distanceSlots.map(function(x,i){return'<div class="s2-distance-slot '+(x?'filled':'')+'" data-s2-distance-slot="'+i+'">'+(x?'<button class="s2-star-chip" data-s2-star="'+x+'" data-s2-location="slot">'+x+'<small>눌러서 이동</small></button>':'슬롯 '+(i+1))+'</div>'}).join('')+'<span>멂</span></div><div class="s2-star-bank">'+['K','L','M','N'].map(function(x){var placed=distanceSlots.indexOf(x)>=0;return'<button class="s2-star-chip '+(placed?'placed ':'')+(selectedCard===x&&selectionKind==='star'?'selected':'')+'" data-s2-star="'+x+'" data-s2-location="bank" '+(placed?'disabled':'')+'>'+x+'</button>'}).join('')+'</div>'+selectionNotice('star')+'</div></div></div>'}
function puzzleMarkup(q){return'<section class="s2-puzzle"><header class="s2-puzzle-head"><div><small>SCENE 02 · CALIBRATION '+q+'/3</small><h2>'+(q===1?'관측 센서 점검':q===2?'6개월 관측 자료 복구':'별 거리 자료 복구')+'</h2></div><button class="s2-close" id="s2PuzzleClose">×</button></header><div class="s2-puzzle-body">'+(q===1?puzzle1():q===2?puzzle2():puzzle3())+'<div class="hintbox" id="hintbox"></div></div><footer class="s2-footer"><p class="s2-feedback" id="feedback">'+(q===1?'카드를 누르고 기준 슬롯을 누르세요.':q===2&&q2Step===1?'기록 카드를 누르고 두 슬롯에 배치하세요.':q===2?'연주시차 p에 해당하는 구간을 선택하세요.':'별을 누르고 가까운 순서의 슬롯을 누르세요.')+'</p><button class="secondary" id="hintBtn">힌트 · '+Math.min(ctx.state.progress.hintCount,3)+'/3 무료</button><button class="primary" id="s2Submit">'+(q===1?'보정 실행':q===2&&q2Step===1?'기록 확인':q===2?'연주시차 복구':'거리 자료 복구')+'</button></footer></section>'}
function clearSelection(){selectedCard='';selectionKind=''}
function chooseItem(value,kind){if(selectedCard===value&&selectionKind===kind)clearSelection();else{selectedCard=value;selectionKind=kind}draw()}
function bindPlacement(q){
document.querySelectorAll('[data-s2-location="bank"][data-s2-card]').forEach(function(el){el.onclick=function(e){e.stopPropagation();chooseItem(el.dataset.s2Card,'card')}});
document.querySelectorAll('[data-s2-location="slot"][data-s2-card]').forEach(function(el){el.onclick=function(e){e.stopPropagation();var value=el.dataset.s2Card;if(q===1)slotValue='';else recordSlots=recordSlots.map(function(x){return x===value?'':x});selectedCard=value;selectionKind='card';draw()}});
document.querySelectorAll('[data-s2-location="bank"][data-s2-star]').forEach(function(el){el.onclick=function(e){e.stopPropagation();chooseItem(el.dataset.s2Star,'star')}});
document.querySelectorAll('[data-s2-location="slot"][data-s2-star]').forEach(function(el){el.onclick=function(e){e.stopPropagation();var value=el.dataset.s2Star;distanceSlots=distanceSlots.map(function(x){return x===value?'':x});selectedCard=value;selectionKind='star';draw()}});
document.querySelectorAll('[data-s2-slot]').forEach(function(slot){slot.onclick=function(){if(selectionKind!=='card'||!selectedCard)return;slotValue=selectedCard;clearSelection();draw()}});
document.querySelectorAll('[data-s2-record-slot]').forEach(function(slot){slot.onclick=function(){if(selectionKind!=='card'||!selectedCard)return;var target=Number(slot.dataset.s2RecordSlot),value=selectedCard;recordSlots=recordSlots.map(function(x){return x===value?'':x});recordSlots[target]=value;clearSelection();draw()}});
document.querySelectorAll('[data-s2-distance-slot]').forEach(function(slot){slot.onclick=function(){if(selectionKind!=='star'||!selectedCard)return;var target=Number(slot.dataset.s2DistanceSlot),value=selectedCard;distanceSlots=distanceSlots.map(function(x){return x===value?'':x});distanceSlots[target]=value;clearSelection();draw()}});
var cancel=document.getElementById('s2CancelSelection');if(cancel)cancel.onclick=function(){clearSelection();draw()}
}
function bad(msg){var f=document.getElementById('feedback');if(f){f.textContent=msg;f.className='s2-feedback bad'}}
function bindPuzzle(q){var close=document.getElementById('s2PuzzleClose');if(close)close.onclick=function(){puzzleOpen=false;draw()};document.querySelectorAll('[data-s2-role]').forEach(function(b){b.onclick=function(){viewRole=Number(b.dataset.s2Role);draw()}});
bindPlacement(q);
if(q===2&&q2Step===2)document.querySelectorAll('[data-s2-parallax]').forEach(function(b){b.onclick=function(){parallaxChoice=b.dataset.s2Parallax;draw()}});
document.getElementById('hintBtn').onclick=ctx.hint;document.getElementById('s2Submit').onclick=async function(){if(q===1){if(!slotValue)return bad('기준 슬롯에 표적 카드를 배치하세요.');if(slotValue!=='A')return bad(slotValue==='B'?'이 표적은 두 위치에서 거의 같은 곳에 보입니다.':'이 표적보다 더 크게 위치가 달라져 보이는 표적이 있습니다.');await ctx.submit('A',this);return}
if(q===2&&q2Step===1){if(recordSlots.filter(Boolean).length<2)return bad('관측 기록 두 장을 모두 배치하세요.');if(recordSlots.slice().sort().join('')!=='AB')return bad('두 관측 기록의 날짜 간격을 다시 확인하세요.');q2Step=2;parallaxChoice='';clearSelection();save();draw();return}
if(q===2){if(!parallaxChoice)return bad('두 구간 중 연주시차 p에 해당하는 구간을 선택하세요.');if(parallaxChoice!=='half')return bad('A–B는 두 겉보기 위치 사이의 전체 각거리 2p입니다. 연주시차 p는 그 절반입니다.');await ctx.submit('ABP',this);return}
if(distanceSlots.some(function(x){return!x}))return bad('K, L, M, N을 네 슬롯에 모두 배치하세요.');if(distanceSlots.join('')!=='KMNL'){var k=distanceSlots.indexOf('K'),l=distanceSlots.indexOf('L');if(k>1)return bad('연주시차가 큰 별의 위치가 너무 멀리 배치되어 있습니다.');if(l<2)return bad('연주시차가 작은 별은 더 먼 곳에 있어야 합니다.');return bad('연주시차가 큰 순서부터 다시 비교해 보세요.')}await ctx.submit('KMNL',this)}
}
function updateInspectControl(){if(!inspect||!inspect.clue)return;var c=inspect.clue;if(c.kind==='film'){var film=document.getElementById('s2Film');if(film)film.style.setProperty('--film-shift',(-30+inspect.value*.6)+'px');var textBox=document.getElementById('s2InspectText');if(textBox)textBox.textContent=inspectText(c,inspect)}else if(c.kind==='zoom'){var pair=document.getElementById('s2ZoomPair');if(pair)pair.style.transform='scale('+(1+inspect.value/130)+')'}else if(c.kind==='rail'){var next=inspect.value>50?1:0;if(next!==inspect.mode){inspect.mode=next;var imageBox=document.getElementById('s2InspectImage');if(imageBox)imageBox.src=img(c.images[next])}}}
function bindRoom(){var d=document.getElementById('s2Dialogue');if(d)d.onclick=function(){introStep++;if(introStep>=intro.length){try{localStorage.setItem(storeKey('intro'),'done')}catch(e){}}draw()};var transition=document.getElementById('s2TransitionContinue');if(transition)transition.onclick=function(){transitionNotice=null;draw()};document.querySelectorAll('[data-s2-object]').forEach(function(b){b.onclick=function(){inspectObject(b.dataset.s2Object)}});var c=document.getElementById('s2InspectClose');if(c)c.onclick=function(){inspect=null;draw()};document.querySelectorAll('[data-s2-mode]').forEach(function(b){b.onclick=function(){inspect.mode=Number(b.dataset.s2Mode);draw()}});var r=document.getElementById('s2InspectRange');if(r)r.oninput=function(){inspect.value=Number(r.value);updateInspectControl()}}
function draw(){if(!ctx||!ctx.game)return;var q=question();ctx.game.innerHTML=roomMarkup(q);bindRoom();if(puzzleOpen)bindPuzzle(q);if(banner)setTimeout(function(){banner='';var e=document.querySelector('.s2-system');if(e)e.remove()},2500)}
function render(options){ctx=options;var next=options.state.session.code+':'+options.state.player.team+':'+options.state.player.role;if(identity!==next){identity=next;restore();inspect=null;puzzleOpen=false;lastQuestion=0;transitionNotice=null;viewRole=options.state.player.role}var q=question();if(lastQuestion&&q!==lastQuestion){inspect=null;puzzleOpen=false;clearSelection();slotValue='';recordSlots=['',''];distanceSlots=['','','',''];parallaxChoice='';if(q===2){banner='관측 센서 보정 완료 · 궤도 관측 투영기 연결';transitionNotice={title:'1단계 완료 · 센서 기준 복구',text:'표적의 겉보기 이동을 구분할 수 있게 됐습니다. 이제 6개월 간격의 두 관측을 찾아 전체 각거리 2p와 연주시차 p의 관계를 복구하세요.'}}else if(q===3){banner='연주시차 복구 완료 · 거리 자료 복구 장치 활성화';transitionNotice={title:'2단계 완료 · 연주시차 복구',text:'두 겉보기 위치의 전체 각거리에서 연주시차 p를 복원했습니다. 연주시차가 클수록 가깝다는 관계로 별 거리표를 완성하세요.'}}}lastQuestion=q;draw()}
function renderEnding(game,onContinue){var step=0,line=0;var signal=[
['미확인 음성','치직— “…여기까지 왔다면 거리 자료는 복구했겠지.”'],
['루멘','실시간 통신이 아닙니다. 저장된 음성 기록입니다.'],
['미확인 음성','“자동 관측값이 계속 바뀌고 있다. 그래서 수동 채널에 기록을 남긴다.”'],
['미확인 음성','“다음은 3번 구획. 별이 얼마나 밝게 보이는지만 믿지 마.”'],
['대원','누가 남긴 거지?'],
['루멘','송신자 정보가 삭제되어 있습니다. …한 가지 기록을 복구했습니다. 수동 송신 예약 시각은 사고 발생 이전입니다.'],
['대원','사고가 나기 전부터 알고 있었다는 거야?'],
['루멘','…가능성이 있습니다. 거리 보정 시스템 정상화. 3번 구획 진입이 가능합니다.']
];function paint(){if(step===0){game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-q3"><div class="s2-title"><small>DISTANCE CALIBRATION ROOM 02</small><b>별 거리 자료 복구 완료</b></div><div class="s2-system">센서 보정 → 연주시차 복구 → 거리표 복원 완료</div><div class="s2-objective">현재 목표 · 파란 신호가 깜박이는 <b>벽면 패널</b>을 조사하세요.</div><button class="s2-hotspot required" id="s2EndPanel" aria-label="잠금 해제된 벽면 패널" style="left:88%;top:12%;width:11%;height:35%"></button></div></div>';document.getElementById('s2EndPanel').onclick=function(){step=1;paint()};return}
if(step===1){game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-q3"><div class="s2-ending"><div class="s2-ending-card"><small>HIDDEN CHANNEL FOUND</small><h2>숨겨진 수동 송신기</h2><img class="s2-ending-image" src="'+img('scene2_hidden_transmitter.png')+'" alt="벽면 패널 안에 숨겨진 수동 송신기"><p>거리표가 복구되면서 벽면 패널의 잠금이 풀렸습니다. 안쪽에는 정거장의 공식 장비와 다른 작은 송신 장치가 숨겨져 있습니다.</p><button class="primary" id="s2PlaySignal">송신 기록 재생</button></div></div></div></div>';document.getElementById('s2PlaySignal').onclick=function(){step=2;line=0;paint()};return}
if(step===2){var d=signal[line];game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-q3"><div class="s2-ending s2-signal-stage"><img class="s2-transmitter-live" src="'+img('scene2_hidden_transmitter_on.png')+'" alt="작동 중인 수동 송신기"><button class="s2-ending-dialogue" id="s2SignalNext"><small>'+esc(d[0])+'</small><p>'+esc(d[1])+'</p><i>'+(line===signal.length-1?'3번 구획 확인':'터치하여 계속')+' ▼</i></button></div></div></div>';document.getElementById('s2SignalNext').onclick=function(){line++;if(line>=signal.length){step=3;line=0}paint()};return}
game.innerHTML='<div class="s2-shell"><div class="s2-room s2-room-q3"><div class="s2-ending"><div class="s2-ending-card"><small>SCENE 02 · COMPLETE</small><h2>03 — 별빛 분석 구획</h2><img class="s2-corridor-image" src="'+img('scene2_corridor3_inside.png')+'" alt="3번 구획으로 이어지는 복도"><p>별 거리표가 항법 장치에 연결되어 3번 구획의 문이 열렸습니다. 숨겨진 기록의 다음 경고를 따라 별빛 분석 구획으로 이동합니다.</p><button class="primary" id="s2Continue">3번 구획으로 이동</button></div></div></div></div>';document.getElementById('s2Continue').onclick=onContinue}paint()}
window.StarEscapeScene02={render:render,renderEnding:renderEnding};
})();
