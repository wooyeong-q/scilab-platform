(function(){
'use strict';
var ROOT='/labs/star-escape/assets/scene02/';
var ctx=null,identity='',introStep=0,inspect=null,puzzleOpen=false,banner='',lastQuestion=0,viewRole=1;
var visited=new Set(),selectedCard='',slotValue='',recordSlots=['',''],q2Step=1,halfValue=0,distanceSlots=['','','',''];
var intro=[
['루멘','2번 구획 진입. 거리 보정실입니다.'],
['루멘','별 위치 자료 일부가 손상되어 있습니다.'],
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
{id:'orbit',name:'중앙 궤도 관측 투영기',box:[46,27,20,34]},
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
3:{id:'hatch',title:'표적 C · 투명 관측 필름',kind:'film',images:['scene2_targetC_film_bottom.png','scene2_targetC_film_top.png'],text:'두 필름의 배경별을 겹치자 표적 C의 위치가 꽤 크게 달라져 보였다.'},
4:{id:'rail',title:'표적 D · 이동식 관측 레일',kind:'rail',images:['scene2_rail_targetD_left.png','scene2_rail_targetD_right.png'],text:'레일을 이동하자 표적 D는 배경에 대해 중간 정도 위치가 달라져 보였다.'}
};
var q2Intel=[
{title:'관측 기록 A',text:'관측일: 3월 18일'},
{title:'관측 기록 B',text:'관측일: 9월 18일'},
{title:'관측 기록 C',text:'관측일: 6월 18일'},
{title:'연주시차 관측 설명서',text:'같은 별을 6개월 간격으로 관측한다. 연주시차는 두 관측 위치 사이에서 나타난 전체 시차의 절반이다.'}
];
var q3Intel=[
{star:'K',image:'scene2_star_K_parallax.png',text:'별 K의 연주시차는 매우 크게 나타난다.'},
{star:'L',image:'scene2_star_L_parallax.png',text:'별 L의 연주시차는 매우 작게 나타난다.'},
{star:'M',image:'scene2_star_M_parallax.png',text:'별 M의 연주시차는 K보다 작지만 비교적 크게 나타난다.'},
{star:'N',image:'scene2_star_N_parallax.png',text:'별 N의 연주시차는 M보다 작고 L보다 크게 나타난다.'}
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
panel:'단단히 닫혀 있다. 내부에 무엇이 있는지는 확인할 수 없다.',
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
function objective(q){if(q===1)return'보정 표적의 시차를 비교해 <b>관측 센서</b>를 보정하세요.';if(q===2)return'활성화된 <b>궤도 관측 투영기</b>를 눌러 연주시차를 복구하세요.';return'<b>거리 자료 복구 장치</b>에서 별을 가까운 순서로 배치하세요.'}
function overlayObjects(q){return'<img class="s2-status-object calibration" src="'+img(q>1?'scene2_calibration_console_success.png':'scene2_calibration_console_idle.png')+'" alt="">'+
'<img class="s2-status-object orbit" src="'+img(q>1?'scene2_orbit_projector_on.png':'scene2_orbit_projector_off.png')+'" alt="">'+
'<img class="s2-status-object distance" src="'+img(q>2?'scene2_distance_console_on.png':'scene2_distance_console_off.png')+'" alt="">'}
function roomMarkup(q){var required=q===1?'calibration':q===2?'orbit':'distance';var hotspots=objects.map(function(o){var cls='s2-hotspot'+(visited.has('q1:'+o.id)?' visited':'')+(o.id===required?' required':'');return'<button class="'+cls+'" data-s2-object="'+o.id+'" aria-label="'+esc(o.name)+'" style="left:'+o.box[0]+'%;top:'+o.box[1]+'%;width:'+o.box[2]+'%;height:'+o.box[3]+'%"></button>'}).join('');
return'<div class="s2-shell"><div class="s2-room">'+overlayObjects(q)+'<div class="s2-title"><small>DISTANCE CALIBRATION ROOM 02</small><b>어긋난 별의 위치</b></div><div class="s2-objective">현재 목표 · '+objective(q)+'</div>'+hotspots+(banner?'<div class="s2-system">'+esc(banner)+'</div>':'')+(inspect?inspectMarkup():'')+(introStep<intro.length?dialogueMarkup():'')+(puzzleOpen?puzzleMarkup(q):'')+'</div></div>'}
function dialogueMarkup(){var d=intro[Math.min(introStep,intro.length-1)];return'<button class="s2-dialogue" id="s2Dialogue"><img src="/labs/star-escape/assets/scene01/characters/ui_lumen_ai_icon.webp" alt=""><span><small>'+esc(d[0])+'</small><p>'+esc(d[1])+'</p></span><i class="advance">터치하여 계속 ▼</i></button>'}
function clueMedia(c,ins){if(c.kind==='film')return'<div class="s2-film" style="--film-shift:'+(-26+ins.value*.52)+'px"><img src="'+img(c.images[0])+'" alt=""><img class="top" src="'+img(c.images[1])+'" alt=""></div>';
if(c.kind==='toggle'||c.kind==='rail')return'<img src="'+img(c.images[ins.mode])+'" alt="'+esc(c.title)+'">';
return'<div class="s2-pair" style="transform:scale('+(1+ins.value/130)+')"><img src="'+img(c.images[0])+'" alt=""><img src="'+img(c.images[1])+'" alt=""></div>'}
function clueTask(c,ins){if(c.kind==='toggle')return'<div class="s2-task s2-task-actions"><button data-s2-mode="0" class="'+(!ins.mode?'on':'')+'">왼쪽 관측</button><button data-s2-mode="1" class="'+(ins.mode?'on':'')+'">오른쪽 관측</button></div>';
if(c.kind==='zoom')return'<div class="s2-task"><b>관측 영상 확대</b><input id="s2InspectRange" type="range" min="0" max="100" value="'+ins.value+'"></div>';
if(c.kind==='film')return'<div class="s2-task"><b>위쪽 필름을 밀어 배경별 겹치기</b><input id="s2InspectRange" type="range" min="0" max="100" value="'+ins.value+'"></div>';
return'<div class="s2-task"><b>관측 레일 이동</b><input id="s2InspectRange" type="range" min="0" max="100" value="'+ins.value+'"></div>'}
function inspectMarkup(){if(!inspect.clue)return'<section class="s2-inspect"><div class="s2-inspect-media"><img src="'+img('scene2_room_base.png')+'" alt=""></div><div><small>INVESTIGATION</small><b>'+esc(inspect.name)+'</b><p>'+esc(inspect.text)+'</p></div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>';
var c=inspect.clue;return'<section class="s2-inspect"><div class="s2-inspect-media">'+clueMedia(c,inspect)+'</div><div><small>대원 '+inspect.role+' 전용 관측 자료</small><b>'+esc(c.title)+'</b><p>'+esc(c.text)+'</p>'+clueTask(c,inspect)+'</div><button class="s2-inspect-close" id="s2InspectClose">×</button></section>'}
function roleTabs(){var a=availableRoles();if(a.indexOf(viewRole)<0)viewRole=ctx.state.player.role;return a.length>1?'<div class="s2-role-tabs">'+a.map(function(r){return'<button data-s2-role="'+r+'" class="'+(r===viewRole?'on':'')+'">'+r+'번 자료'+(r!==ctx.state.player.role?' · 빈 역할':'')+'</button>'}).join('')+'</div>':''}
function card(letter,file,placed){return'<button class="s2-card '+(selectedCard===letter?'selected ':'')+(placed?'placed':'')+'" data-s2-card="'+letter+'" draggable="true"><img src="'+img(file)+'" alt="표적 '+letter+'"><b>'+letter+'</b></button>'}
function puzzle1(){var files={A:'scene2_targetA_left.png',B:'scene2_targetB_view1.png',C:'scene2_targetC_film_bottom.png',D:'scene2_rail_targetD_left.png'};return'<div class="s2-panel"><div class="s2-guide"><small>PARALLAX SENSOR CALIBRATION</small><b>관측 센서 기준 표적 선택</b><p>두 위치에서 관측했을 때 가장 큰 시차가 나타난 표적을 기준 슬롯에 넣으세요.</p></div><div class="s2-drag-area"><div class="s2-bank">'+['A','B','C','D'].map(function(x){return card(x,files[x],slotValue===x)}).join('')+'</div><div class="s2-slot-wrap"><span class="s2-slot-label">기준 표적 슬롯</span><div class="s2-slot '+(slotValue?'filled':'')+'" data-s2-slot="single">'+(slotValue?card(slotValue,files[slotValue],false):'카드를 끌어 놓거나<br>카드 선택 후 슬롯을 누르세요.')+'</div></div></div></div>'}
function puzzle2(){var intel=q2Intel[viewRole-1];if(q2Step===2)return'<div class="s2-panel"><div class="s2-guide"><small>ANNUAL PARALLAX CALIBRATION · STEP 2/2</small><b>연주시차에 해당하는 범위를 표시하세요.</b><p>두 사진의 배경별은 동일하며 관측 대상 별만 위치가 달라 보입니다.</p></div>'+roleTabs()+'<div class="s2-role-intel"><b>'+esc(intel.title)+'</b><p>'+esc(intel.text)+'</p></div><div class="s2-measure"><img src="'+img('scene2_record_AB_compare.png')+'" alt="3월과 9월의 동일 배경 별 관측 비교"><div class="s2-measure-line"></div><div class="s2-half-arrow" style="--half:'+halfValue+'"></div></div><div class="s2-measure-control"><input id="s2HalfRange" type="range" min="0" max="100" value="'+halfValue+'" aria-label="연주시차 범위"></div></div>';
var files={A:'scene2_record_A.png',B:'scene2_record_B.png',C:'scene2_record_C.png'};return'<div class="s2-panel"><div class="s2-guide"><small>ANNUAL PARALLAX CALIBRATION · STEP 1/2</small><b>6개월 간격의 관측 기록 두 장을 선택하세요.</b><p>공통 카드에는 날짜가 없습니다. 각 대원의 날짜 정보를 공유하세요.</p></div>'+roleTabs()+'<div class="s2-role-intel"><b>'+esc(intel.title)+'</b><p>'+esc(intel.text)+'</p></div><div class="s2-record-bank">'+['A','B','C'].map(function(x){return card(x,files[x],recordSlots.indexOf(x)>=0)}).join('')+'</div><div class="s2-two-slots">'+recordSlots.map(function(x,i){return'<div class="s2-slot '+(x?'filled':'')+'" data-s2-record-slot="'+i+'">'+(x?card(x,files[x],false):(i?'두 번째 관측':'첫 번째 관측'))+'</div>'}).join('')+'</div></div>'}
function puzzle3(){var intel=q3Intel[viewRole-1];return'<div class="s2-panel"><div class="s2-guide"><small>DISTANCE DATA RESTORE</small><b>별을 지구에서 가까운 순서로 배치하세요.</b><p>네 대원의 동일 축척 연주시차 자료를 비교하세요. 연주시차가 클수록 가까운 별입니다.</p></div>'+roleTabs()+'<div class="s2-role-intel"><b>대원 '+viewRole+' · 별 '+intel.star+'</b><p>'+esc(intel.text)+'</p></div><div class="s2-distance-layout"><div class="s2-distance-visual"><img src="'+img(intel.image)+'" alt="별 '+intel.star+' 연주시차 자료"></div><div><div class="s2-distance-rail"><span>지구 · 가까움</span>'+distanceSlots.map(function(x,i){return'<div class="s2-distance-slot '+(x?'filled':'')+'" data-s2-distance-slot="'+i+'">'+(x?'<button class="s2-star-chip" data-s2-star="'+x+'">'+x+'</button>':'슬롯 '+(i+1))+'</div>'}).join('')+'<span>멂</span></div><div class="s2-star-bank">'+['K','L','M','N'].map(function(x){return'<button class="s2-star-chip '+(distanceSlots.indexOf(x)>=0?'placed ':'')+(selectedCard===x?'selected':'')+'" data-s2-star="'+x+'" draggable="true">'+x+'</button>'}).join('')+'</div></div></div></div>'}
function puzzleMarkup(q){return'<section class="s2-puzzle"><header class="s2-puzzle-head"><div><small>SCENE 02 · CALIBRATION '+q+'/3</small><h2>'+(q===1?'관측 센서 점검':q===2?'6개월 관측 자료 복구':'별 거리 자료 복구')+'</h2></div><button class="s2-close" id="s2PuzzleClose">×</button></header><div class="s2-puzzle-body">'+(q===1?puzzle1():q===2?puzzle2():puzzle3())+'<div class="hintbox" id="hintbox"></div></div><footer class="s2-footer"><p class="s2-feedback" id="feedback">'+(q===1?'표적을 배치한 뒤 보정을 실행하세요.':q===2&&q2Step===1?'관측 기록 두 장을 배치하세요.':q===2?'연주시차 범위를 표시하세요.':'네 별을 모두 배치하세요.')+'</p><button class="secondary" id="hintBtn">힌트 · '+Math.min(ctx.state.progress.hintCount,3)+'/3 무료</button><button class="primary" id="s2Submit">'+(q===1?'보정 실행':q===2&&q2Step===1?'기록 확인':q===2?'보정 완료':'거리 자료 복구')+'</button></footer></section>'}
function bindDrag(selector,dropSelector,onDrop){document.querySelectorAll(selector).forEach(function(el){el.addEventListener('dragstart',function(e){selectedCard=el.dataset.s2Card||el.dataset.s2Star;e.dataTransfer.setData('text/plain',selectedCard)});el.addEventListener('pointerdown',function(){selectedCard=el.dataset.s2Card||el.dataset.s2Star});el.addEventListener('click',function(e){e.stopPropagation();selectedCard=el.dataset.s2Card||el.dataset.s2Star;draw()})});document.querySelectorAll(dropSelector).forEach(function(slot){slot.addEventListener('dragover',function(e){e.preventDefault()});slot.addEventListener('drop',function(e){e.preventDefault();onDrop(slot,e.dataTransfer.getData('text/plain')||selectedCard)});slot.addEventListener('click',function(){if(selectedCard)onDrop(slot,selectedCard)})})}
function bad(msg){var f=document.getElementById('feedback');if(f){f.textContent=msg;f.className='s2-feedback bad'}}
function bindPuzzle(q){var close=document.getElementById('s2PuzzleClose');if(close)close.onclick=function(){puzzleOpen=false;draw()};document.querySelectorAll('[data-s2-role]').forEach(function(b){b.onclick=function(){viewRole=Number(b.dataset.s2Role);draw()}});
if(q===1)bindDrag('[data-s2-card]','[data-s2-slot]',function(_,v){slotValue=v;selectedCard='';draw()});
if(q===2&&q2Step===1)bindDrag('[data-s2-card]','[data-s2-record-slot]',function(slot,v){var target=Number(slot.dataset.s2RecordSlot);recordSlots=recordSlots.map(function(x){return x===v?'':x});recordSlots[target]=v;selectedCard='';draw()});
if(q===2&&q2Step===2){var range=document.getElementById('s2HalfRange');range.oninput=function(){halfValue=Number(range.value);var a=document.querySelector('.s2-half-arrow');if(a)a.style.setProperty('--half',halfValue)}}
if(q===3)bindDrag('[data-s2-star]','[data-s2-distance-slot]',function(slot,v){var target=Number(slot.dataset.s2DistanceSlot);distanceSlots=distanceSlots.map(function(x){return x===v?'':x});distanceSlots[target]=v;selectedCard='';draw()});
document.getElementById('hintBtn').onclick=ctx.hint;document.getElementById('s2Submit').onclick=async function(){if(q===1){if(!slotValue)return bad('기준 슬롯에 표적 카드를 배치하세요.');if(slotValue!=='A')return bad(slotValue==='B'?'이 표적은 두 위치에서 거의 같은 곳에 보입니다.':'이 표적보다 더 크게 위치가 달라져 보이는 표적이 있습니다.');await ctx.submit('A',this);return}
if(q===2&&q2Step===1){if(recordSlots.filter(Boolean).length<2)return bad('관측 기록 두 장을 모두 배치하세요.');if(recordSlots.slice().sort().join('')!=='AB')return bad('두 관측 기록의 날짜 간격을 다시 확인하세요.');q2Step=2;save();draw();return}
if(q===2){if(halfValue<44||halfValue>56)return bad(halfValue>70?'지금 표시한 것은 두 관측 위치 사이의 전체 시차에 가깝습니다.':'연주시차가 전체 변화량과 어떤 관계인지 확인하세요.');await ctx.submit('AB50',this);return}
if(distanceSlots.some(function(x){return!x}))return bad('K, L, M, N을 네 슬롯에 모두 배치하세요.');if(distanceSlots.join('')!=='KMNL')return bad('연주시차가 큰 순서부터 다시 비교해 보세요.');await ctx.submit('KMNL',this)}
}
function bindRoom(){var d=document.getElementById('s2Dialogue');if(d)d.onclick=function(){introStep++;if(introStep>=intro.length){try{localStorage.setItem(storeKey('intro'),'done')}catch(e){}}draw()};document.querySelectorAll('[data-s2-object]').forEach(function(b){b.onclick=function(){inspectObject(b.dataset.s2Object)}});var c=document.getElementById('s2InspectClose');if(c)c.onclick=function(){inspect=null;draw()};document.querySelectorAll('[data-s2-mode]').forEach(function(b){b.onclick=function(){inspect.mode=Number(b.dataset.s2Mode);draw()}});var r=document.getElementById('s2InspectRange');if(r)r.oninput=function(){inspect.value=Number(r.value);if(inspect.clue.kind==='rail')inspect.mode=inspect.value>50?1:0;draw()}}
function draw(){if(!ctx||!ctx.game)return;var q=question();ctx.game.innerHTML=roomMarkup(q);bindRoom();if(puzzleOpen)bindPuzzle(q);if(banner)setTimeout(function(){banner='';var e=document.querySelector('.s2-system');if(e)e.remove()},2500)}
function render(options){ctx=options;var next=options.state.session.code+':'+options.state.player.team+':'+options.state.player.role;if(identity!==next){identity=next;restore();inspect=null;puzzleOpen=false;lastQuestion=0;viewRole=options.state.player.role}var q=question();if(lastQuestion&&q!==lastQuestion){inspect=null;puzzleOpen=false;selectedCard='';slotValue='';recordSlots=['',''];distanceSlots=['','','',''];halfValue=0;banner=q===2?'관측 센서 보정 완료 · 궤도 관측 투영기 연결':q===3?'연주시차 보정 완료 · 거리 자료 복구 장치 활성화':''}lastQuestion=q;draw()}
function renderEnding(game,onContinue){var step=0;function paint(){if(step===0){game.innerHTML='<div class="s2-shell"><div class="s2-room">'+overlayObjects(3)+'<div class="s2-title"><small>DISTANCE CALIBRATION ROOM 02</small><b>별 거리 자료 복구 완료</b></div><div class="s2-objective">현재 목표 · 노란색으로 빛나는 <b>벽면 패널</b>을 조사하세요.</div><button class="s2-hotspot required" id="s2EndPanel" aria-label="잠금 해제된 벽면 패널" style="left:88%;top:15%;width:10%;height:31%"></button></div></div>';document.getElementById('s2EndPanel').onclick=function(){step=1;paint()};return}
if(step===1){game.innerHTML='<div class="s2-shell"><div class="s2-room"><div class="s2-ending"><div class="s2-ending-card"><small>HIDDEN CHANNEL FOUND</small><h2>숨겨진 수동 송신기</h2><img class="s2-ending-image" src="'+img('scene2_hidden_transmitter.png')+'" alt="숨겨진 수동 송신기"><p>공식 장비와 다른 작은 송신 장치가 벽 안에 숨겨져 있습니다.</p><button class="primary" id="s2PlaySignal">송신 기록 재생</button></div></div></div></div>';document.getElementById('s2PlaySignal').onclick=function(){step=2;paint()};return}
game.innerHTML='<div class="s2-shell"><div class="s2-room"><div class="s2-ending"><div class="s2-ending-card"><small>SCENE 02 · COMPLETE</small><h2>3번 구획 개방</h2><img class="s2-ending-image" src="'+img('scene2_hidden_transmitter_on.png')+'" alt="작동 중인 송신기"><div class="s2-signal">치직— “…여기까지 왔다면 거리 자료는 복구했겠지.”<br>“자동 관측값이 계속 바뀌고 있다.”<br>“다음은 3번 구획. 별이 얼마나 밝게 보이는지만 믿지 마.”</div><p>루멘: 실시간 통신이 아닙니다. 수동 송신 예약 시각은 <b>사고 발생 이전</b>입니다.</p><p>거리 보정 시스템 정상화. 03 — 별빛 분석 구획 진입이 가능합니다.</p><button class="primary" id="s2Continue">3번 구획으로 이동</button></div></div></div></div>';document.getElementById('s2Continue').onclick=onContinue}paint()}
window.StarEscapeScene02={render:render,renderEnding:renderEnding};
})();
