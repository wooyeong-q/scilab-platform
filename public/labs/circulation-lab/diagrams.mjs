import {BY_ID} from './model.mjs';

// Raster anatomical illustrations support the lesson; only labels, leader lines
// and the exact circulation graph are drawn in code.
export function heartDiagram(active='rv'){
  const points={ra:[375,270,40,223],rv:[405,465,40,425],la:[637,270,760,223],lv:[650,470,760,425]};
  return `<svg viewBox="0 0 1000 700" class="heart-diagram" role="group" aria-label="정면에서 본 심장 내부 관찰 모형. 그림 왼쪽에 우심방과 우심실, 오른쪽에 좌심방과 좌심실이 있습니다.">
    <image href="./assets/heart-cutaway.webp" x="185" y="0" width="630" height="650" preserveAspectRatio="xMidYMid meet"/>
    ${Object.entries(points).map(([id,[x,y,bx,by]])=>{const p=BY_ID[id],on=id===active,left=bx<300,color=p.color==='blue'?'#5d8cb2':'#c5746f';return `<g class="svg-button ${on?'selected':''}" role="button" tabindex="0" data-part="${id}" aria-label="${p.name} 역할 살펴보기"><circle cx="${x}" cy="${y}" r="66" fill="transparent"/><path d="M${left?bx+200:bx} ${by+34} H${left?x-35:x+35} L${x} ${y}" stroke="${color}" fill="none" stroke-width="${on?4:2}"/><circle cx="${x}" cy="${y}" r="${on?9:6}" fill="${color}" stroke="#fff8ec" stroke-width="3"/><rect x="${bx}" y="${by}" width="200" height="80" rx="16" fill="${on?'#2d4653':'#fffdf8'}" stroke="${on?'#2d4653':'#dbd9ce'}" stroke-width="${on?3:1.5}"/><text x="${bx+100}" y="${by+54}" text-anchor="middle" fill="${on?'#fff':'#354e5b'}" font-size="44" font-weight="800">${p.name}</text></g>`;}).join('')}
    <text x="500" y="687" class="svg-small">정면에서 본 모형 · 그림의 왼쪽이 몸의 오른쪽</text>
  </svg>`;
}
export function vesselDiagram(active='artery'){
  const items=[['artery','동맥','심장에서 나가요'],['capillary','모세혈관','물질을 교환해요'],['vein','정맥','심장으로 들어와요']];
  return `<div class="vessel-photo"><img src="./assets/vessels-observation.webp" alt="두꺼운 벽의 동맥, 매우 얇은 벽의 모세혈관, 얇은 벽과 판막이 보이는 정맥의 내부를 비교한 관찰 그림" width="1536" height="1024"><div class="vessel-controls">${items.map(([id,name,sub])=>`<button class="vessel-pick ${active===id?'selected':''}" data-vessel="${id}" aria-pressed="${active===id}"><strong>${name}</strong><span>${sub}</span></button>`).join('')}</div><p class="art-note">구조를 확대하여 비교한 모형 · 실제 크기 비율과 다릅니다.</p></div>`;
}
const POS={rv:[297,424],pa:[113,173],lung:[400,87],pv:[686,173],la:[505,310],lv:[505,424],ao:[680,500],body:[400,575],vc:[117,500],ra:[297,310]};
const PATHS=[
  ['rv','pa','M240 424 H111 V204'],['pa','lung','M111 146 V87 H294'],['lung','pv','M506 87 H687 V145'],['pv','la','M687 202 V310 H564'],['la','lv','M505 338 V393'],['lv','ao','M564 424 H680 V469'],['ao','body','M680 532 V575 H507'],['body','vc','M293 575 H117 V532'],['vc','ra','M117 470 H195 V310 H238'],['ra','rv','M297 338 V393']];
export function flowDiagram(active='rv',scope='all',visited=[]){
  const inScope=scope==='pulmonary'?['rv','pa','lung','pv','la']:scope==='systemic'?['lv','ao','body','vc','ra']:Object.keys(POS);
  return `<svg viewBox="0 0 800 642" class="flow-diagram" role="img" aria-label="혈액 순환 경로. 우심실, 폐동맥, 폐의 모세혈관, 폐정맥, 좌심방, 좌심실, 대동맥, 온몸의 모세혈관, 대정맥, 우심방 순서로 연결됩니다."><defs><marker id="flow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0 10 5 0 10" fill="#568fb9"/></marker><marker id="flow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0 10 5 0 10" fill="#d56a6b"/></marker></defs>
  <image href="./assets/lungs.webp" x="285" y="0" width="230" height="193" preserveAspectRatio="xMidYMid meet" opacity="${scope==='systemic'?.35:1}"/>
  <image href="./assets/heart-cutaway.webp" x="244" y="193" width="330" height="345" preserveAspectRatio="xMidYMid meet"/>
  <image href="./assets/tissue-capillaries.webp" x="279" y="514" width="242" height="112" preserveAspectRatio="xMidYMid meet" opacity="${scope==='pulmonary'?.35:1}"/>
  ${PATHS.map(([from,to,d])=>{const red=['lung','pv','la','lv','ao'].includes(from);const enabled=inScope.includes(from)&&inScope.includes(to);const traced=visited.includes(from)&&visited.includes(to);return `<path d="${d}" fill="none" stroke="#fffdf9" stroke-width="21" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${red?'#df8884':'#86acc7'}" stroke-width="${from===active?13:9}" stroke-linejoin="round" opacity="${enabled?(traced||from===active?1:.65):.12}" marker-end="url(#flow-${red?'red':'blue'})"/>`;}).join('')}
  ${Object.entries(POS).map(([id,[x,y]])=>{const p=BY_ID[id],wide=id==='lung'||id==='body',on=id===active,enabled=inScope.includes(id);return `<g class="flow-node ${on?'current':''}" opacity="${enabled?1:.32}"><rect x="${x-(wide?106:70)}" y="${y-28}" width="${wide?212:140}" height="56" rx="15" fill="${on?'#253d4a':'#fffdfa'}" stroke="${on?'#253d4a':p.color==='blue'?'#afc9dd':p.color==='red'?'#dfb4ae':'#d8cbbd'}" stroke-width="${on?3:1.5}"/><text x="${x}" y="${y+7}" class="flow-label" fill="${on?'#fff':'#334957'}">${wide?p.short:p.name}</text>${on?`<circle cx="${x+(wide?91:45)}" cy="${y-24}" r="8" fill="#ec917e" stroke="#fff" stroke-width="3"/>`:''}</g>`;}).join('')}
  <text x="400" y="637" class="svg-small">혈액 흐름을 단순화한 모형 · 교차하는 혈관은 서로 연결되지 않아요.</text></svg>`;
}
