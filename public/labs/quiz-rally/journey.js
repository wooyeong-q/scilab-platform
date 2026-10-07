/* A shared route derived exclusively from server-confirmed correct answers. */
(()=>{'use strict';
const themes=['주거 거리','상점가','강변 공원','항구','연구 지구','하늘 정원'];
const path=[[80,590],[80,360],[80,130],[310,130],[540,130],[770,130],[1000,130],[1000,360],[1000,590],[770,590],[540,590]];
const count=p=>Math.max(0,Math.floor(Number(p?.correct)||0));
const zone=p=>Math.floor(count(p)/10),step=p=>count(p)%10;
const title=z=>`${z+1}구역 · ${themes[z%themes.length]}`;
const ordered=s=>[...(s?.ranking||[])].sort((a,b)=>count(b)-count(a)||a.nickname.localeCompare(b.nickname,'ko',{numeric:true})||a.id.localeCompare(b.id));
const rank=(s,p)=>1+(s?.ranking||[]).filter(x=>count(x)>count(p)).length;
const rankText=(s,p)=>`${(s?.ranking||[]).filter(x=>count(x)===count(p)).length>1?'공동 ':''}${rank(s,p)}위`;
const focus=(s,id)=>(s?.ranking||[]).find(p=>p.id===id)||s?.player||ordered(s)[0]||{correct:0};
function neighbors(s,p){const others=ordered(s).filter(x=>x.id!==p.id),ahead=others.filter(x=>count(x)>count(p)),behind=others.filter(x=>count(x)<count(p));return{ahead:ahead.find(x=>count(x)===Math.min(...ahead.map(count))),behind:behind[0],tied:others.filter(x=>count(x)===count(p))};}
function overtakes(before,after){if(!before?.player||!after?.player||before.player.id!==after.player.id||before.code!==after.code||before.status!=='running'||after.status!=='running'||count(after.player)<=count(before.player)||(after.serverNow-before.serverNow)>20000)return 0;const old=new Map(before.ranking.map(p=>[p.id,p]));return after.ranking.filter(p=>p.id!==after.player.id&&old.has(p.id)&&count(before.player)<=count(old.get(p.id))&&count(after.player)>count(p)).length;}
function zones(s,id,selected){return [...new Set([0,zone(focus(s,id)),...(s?.ranking||[]).map(zone),...(Number.isInteger(selected)?[selected]:[])])].sort((a,b)=>a-b);}
window.quizJourney={count,zone,step,title,path,ordered,rank,rankText,focus,neighbors,overtakes,zones};
})();
