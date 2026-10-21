import {EXPLORATION} from './exploration.mjs';
import {artURL,warmArt} from './assets.mjs';

// Hotspots, collectible props and photo crops share the same scene coordinates.
const W=1600,H=900;
const image=(name,attrs='')=>`<image href="${artURL(name)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" ${attrs}/>`;
const has=(s,flag)=>s.flags?.includes(flag);
const SPOTS={
 classroom:[['desk','교탁 서랍',52,58],['board','칠판의 종이',66,34],['notebook','창가 책상',21,68],['locker','사물함',75,53],['chair','앞줄 의자',70,79],['blood','붉은 자국',36,87,'optional'],['attendance','출석부',68,61,'optional']],
 library:[['returns','반납함',31,65],['books','반납 도서',31,43],['book','안쪽 책장',70,28],['checkout','대출대',80,56,'optional'],['footprints','책장 사이',52,82,'optional']],
 broadcast:[['recorder','방송 기록',57,53],['control','제어함',81,37],['drawer','보조 서랍',89,75],['microphone','마이크',28,50,'optional'],['monitor','모니터',50,30,'optional'],['log','방송 일지',8,66,'optional']],
 entrance:[['door','현관문',60,48],['terminal','현관 제어 장치',85,43],['notice','게시판',32,34],['shoes','신발장',23,66,'optional']]
};
export function sceneSpots(room,s={}){const spots=[...SPOTS[room],...EXPLORATION.filter(o=>o.room===room).map(o=>[o.id,o.label,o.x,o.y,'optional'])];
 if(room==='library'&&has(s,'returns'))spots.push(['fallen-box','떨어진 상자',56,84]);
 if(room==='entrance'&&has(s,'power'))spots.push(['relay','비상 회로 점검판',85,66]);
 return spots.map(spot=>{
 const [id,label,x,y,type]=spot;
 if(room==='broadcast'&&id==='monitor'&&has(s,'script'))return[id,label,x,y];
 if(room==='classroom'&&id==='chair'&&has(s,'power'))return[id,label,52,79,type];
 if(room==='library'&&id==='book'&&!s.libraryBooks?.includes('D')&&!has(s,'power'))return[id,label,74,49,type];
 return [...spot];
});}
export function sceneAsset(room,s={}){
 if(room==='classroom')return has(s,'power')?'classroom-changed':has(s,'locker-open')?'classroom-open':'classroom';
 if((room==='library'||room==='entrance')&&has(s,'power'))return room+'-changed';
 return room;
}
// Individually removable transparent book props, with IDs printed by the game.
const BOOKS={A:[1240,478,110,145,'1 0 -.42 .4 15 0'],B:[475,369,95,120,'1 0 -.65 .26 20 0'],C:[790,685,115,155,'1 .05 -.35 .6 25 0'],D:[1150,418,92,122,'1 0 -.55 .28 20 0']};
function looseBooks(s){return Object.entries(BOOKS).filter(([id])=>!s.libraryBooks?.includes(id)).map(([id,[x,y,w,h,matrix]])=>`<g data-scene-book="${id}" transform="translate(${x} ${y}) matrix(${matrix})"><image href="${artURL('book')}" width="${w}" height="${h}" preserveAspectRatio="none"/><text x="${w*.52}" y="${h*.39}" text-anchor="middle" font-family="serif" font-size="${w*.14}" fill="#463e2b">${id}</text></g>`).join('');}
const bloodTrail=()=>`<image data-scene-part="blood-trail" href="${artURL('blood')}" x="520" y="738" width="240" height="96" opacity=".78" style="mix-blend-mode:multiply"/>`;
const archiveBox=()=>`<g data-scene-part="fallen-box"><ellipse cx="910" cy="792" rx="99" ry="12" fill="#100d09" opacity=".42"/><image href="${artURL('archive-box')}" x="800" y="640" width="230" height="189"/></g>`;
const monitorScreen=(active=false)=>`<g data-scene-part="lit-monitor"><path d="M532 126 1046 124 1046 390 532 391Z" fill="#1a3837"/><path d="M789 126V390M532 258H1046" stroke="#739a85" stroke-width="2" opacity=".65"/><text x="789" y="369" text-anchor="middle" fill="#b9d4b7" font-size="16" font-family="sans-serif">${active?'녹음 장치 연결됨':'기록 복원 대기'}</text></g>`;
const roomImage=(name,attrs='')=>image(name,attrs)+(name.startsWith('classroom')?bloodTrail():'');
function relayPanel(s){
 const open=has(s,'order');
 return `<g data-scene-part="relay-panel"><defs><linearGradient id="relay-metal" x2=".8" y2="1"><stop stop-color="#4b4e40"/><stop offset="1" stop-color="#292e29"/></linearGradient></defs><rect x="1322" y="510" width="106" height="128" rx="3" fill="#0e1513" opacity=".6"/><rect x="1318" y="506" width="104" height="128" rx="3" fill="url(#relay-metal)" stroke="#787b67" stroke-width="2"/>${open?`<path d="M1318 508 1282 498V622L1318 634" fill="#373d32" stroke="#686e5d"/><rect x="1325" y="535" width="90" height="90" rx="2" fill="#212822" stroke="#535a4c"/>${[0,1,2,3].map(n=>`<circle cx="${1343+n%2*51}" cy="${551+Math.floor(n/2)*38}" r="9" fill="#141b17" stroke="#555b48"/><circle cx="${1343+n%2*51}" cy="${551+Math.floor(n/2)*38}" r="5" fill="${has(s,'relay')?'#91a873':'#535744'}"/>`).join('')}`:'<path d="M1409 561v18" stroke="#181f19" stroke-width="4"/>'}<text x="1370" y="527" text-anchor="middle" fill="#aaa98e" font-size="10">비상 회로</text>${[[1323,511],[1417,511],[1323,629],[1417,629]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="#a09d86"/>`).join('')}</g>`;
}
export function scene(room,s={flags:[]}){
 const name=sceneAsset(room,s);
 warmArt([room==='classroom'?'classroom-open':room+'-changed',room==='classroom'?'classroom-changed':'book',room==='entrance'?'ghost-hand':'ghost-'+room,'blood']);
 const marker=room==='classroom'&&has(s,'locker-open')?'data-scene-part="open-locker"':'';
 let overlay=room==='library'?looseBooks(s):'';
 if(room==='library'&&has(s,'returns'))overlay+='<path d="M1005 12 1120 12 1103 45 1014 45Z" fill="#0b0e0e" stroke="#454a43" stroke-width="2"/>'+(s.seen?.includes('event:box')?archiveBox():'');
 if(room==='broadcast'&&has(s,'script'))overlay+=monitorScreen(has(s,'monitor'));
 if(room==='entrance'&&has(s,'power'))overlay+=relayPanel(s);
 if(room==='entrance'&&has(s,'order')&&!has(s,'relay'))overlay+='<rect width="1600" height="900" fill="#061014" opacity=".2"/><circle cx="1370" cy="490" r="8" fill="#bc9a45"/>';
 if(room==='broadcast'&&has(s,'power'))overlay+='<circle cx="1361" cy="432" r="3" fill="#bad4a5"/><circle cx="1361" cy="432" r="12" fill="#b5d59b" opacity=".12"/>';
 if(room==='entrance'&&has(s,'power'))overlay+=has(s,'relay')?`<text x="1368" y="371" text-anchor="middle" font-size="13" font-family="monospace" fill="#213727">${has(s,'unlocked')?'OPEN':'CODE'}</text>`:'<path d="M1333 340H1397V392H1333Z" fill="#14231c"/>';
 if(room==='entrance'&&s.photos?.includes('notice'))overlay+=`<image href="${artURL('ghost-hand')}" x="1060" y="310" width="70" height="105" opacity=".12"/>`;
 return `<svg class="scene-art" viewBox="0 0 ${W} ${H}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#101819"/><g class="room-atmosphere">${roomImage(name,marker)}${overlay}</g></svg>`;
}
export function corridor(){warmArt(['classroom','book','ghost-classroom']);return `<img class="landing-art" src="${artURL('corridor')}" alt="" fetchpriority="high" decoding="async"/>`;}
export function courtyard(){
 warmArt(['courtyard','courtyard-haunted']);
 // Two complete backgrounds share the same framing. The figure is painted into
 // the second scene, including the window glass, lighting and occlusion.
 return `<svg class="ending-art" viewBox="0 0 1600 900" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${image('courtyard')}${image('courtyard-haunted','class="ending-presence"')}</svg>`;
}

// The exact same area of the actual room is shown in both comparison photos.
const PHOTOS={
 chair:{before:'classroom-open',after:'classroom-changed',box:[650,390,750,500]},
 book:{before:'library',after:'library-changed',box:[1020,190,300,200]},
 notice:{before:'entrance',after:'entrance-changed',box:[310,200,300,200]}
};
export function photoArt(id,changed=false){
 const p=PHOTOS[id];if(!p)return '';const [x,y,w,h]=p.box;
 return `<svg class="evidence-photo" viewBox="${p.box.join(' ')}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${roomImage(changed?p.after:p.before)}<rect x="${x}" y="${y+h*.88}" width="${w}" height="${h*.12}" fill="#10181b" opacity=".7"/><text x="${x+w*.045}" y="${y+h*.96}" fill="#ddd4ba" font-family="monospace" font-size="${w*.037}">${changed?'현재':'17:40'}</text></svg>`;
}
export function detailArt(id,s={flags:[]}){
 if(id==='fallen-box')return `<figure class="scene-detail"><svg viewBox="760 590 320 270" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${roomImage(sceneAsset('library',s))}${archiveBox()}</svg></figure>`;
 const details={locker:['classroom',[1110,365,300,245]],recorder:['broadcast',[365,365,800,280]],blood:['classroom',[480,635,270,245]]};
 const p=details[id];if(!p)return '';
 return `<figure class="scene-detail"><svg viewBox="${p[1].join(' ')}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${roomImage(sceneAsset(p[0],s))}</svg></figure>`;
}
export function foundBookArt(id){return `<img class="collected-book-art" src="${artURL('book')}" alt="낡은 반납 도서"/><span class="collected-book-id" aria-hidden="true">${id}</span>`;}
export function worldEventArt(id){
 let body='';
 if(id==='box')body=`<g class="falling-archive"><image href="${artURL('archive-box')}" x="800" y="640" width="230" height="189"/></g><g class="archive-dust"><ellipse cx="909" cy="811" rx="125" ry="24" fill="#b8ad94" opacity=".28"/></g>`;
 if(id==='monitor')body=`<g class="monitor-waking"><path d="M532 126 1046 124 1046 390 532 391Z" fill="#9dbfb3"/><path d="M544 165H1034M544 221H1034M544 310H1034M544 350H1034" stroke="#1c3837" stroke-width="8" opacity=".3"/></g>`;
 if(id==='blackout')body='<rect class="lights-dimming" width="1600" height="900" fill="#030808"/><circle class="emergency-waking" cx="1370" cy="490" r="23" fill="#d4af62"/>';
 return `<svg viewBox="0 0 1600 900" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
export function ghost(room='classroom'){
 const svg=body=>`<svg viewBox="0 0 1600 900" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
 if(room==='classroom')return svg(`<defs><clipPath id="visitor-glass"><polygon points="1434,222 1510,197 1510,389 1434,389"/><polygon points="1546,186 1600,169 1600,390 1546,390"/><polygon points="1434,420 1510,426 1510,518 1434,518"/><polygon points="1546,425 1600,428 1600,517 1546,518"/></clipPath></defs><g clip-path="url(#visitor-glass)"><image href="${artURL('ghost-classroom')}" x="1447" y="303" width="150" height="225"/></g>`);
 if(room==='library')return svg(`<defs><clipPath id="visitor-shelf"><rect x="145" y="130" width="195" height="600"/></clipPath></defs><g clip-path="url(#visitor-shelf)"><image href="${artURL('ghost-library')}" x="-24" y="235" width="275" height="412.5"/></g>`);
 if(room==='entrance')return svg(`<defs><linearGradient id="visitor-hand-fade" x2="0" y2="1"><stop offset=".65" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="visitor-hand-mask"><rect x="1060" y="310" width="70" height="105" fill="url(#visitor-hand-fade)"/></mask></defs><image href="${artURL('ghost-hand')}" x="1060" y="310" width="70" height="105" mask="url(#visitor-hand-mask)"/>`);
 return svg(`<defs><clipPath id="visitor-monitor"><polygon points="532,126 1046,124 1046,390 532,391"/></clipPath><pattern id="monitor-lines" width="8" height="6" patternUnits="userSpaceOnUse"><path d="M0 1H8" stroke="#a9bfc2" stroke-opacity=".16"/></pattern></defs><g clip-path="url(#visitor-monitor)"><rect x="532" y="124" width="514" height="268" fill="#839597" opacity=".12"/><image href="${artURL('ghost-broadcast')}" x="685" y="181" width="205" height="205" opacity=".88"/><rect x="532" y="124" width="514" height="268" fill="url(#monitor-lines)"/></g>`);
}
