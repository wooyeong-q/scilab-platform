import {ContentError} from '../common-escape/content.mjs';
import {ESCAPE_SCHEMA,clueKey} from './escape-content.mjs';
export const isEscape=p=>['riddle','jigsaw','dials','circuit','tools','film','frames','key'].includes(p?.type);
const fail=(m,status=400)=>{throw new ContentError(m,status);};
const int=(v,min,max,fallback=0)=>Number.isInteger(v)&&v>=min&&v<=max?v:fallback;
export function escapeDraft(p,d){
 if(['riddle','tools'].includes(p.type))return {};
 if(p.type==='film')return {x:int(d.x,-2,2),y:int(d.y,-2,2),turns:int(d.turns,0,3)};
 if(['dials','circuit'].includes(p.type))return {values:Array.from({length:4},(_,i)=>p.items.some(x=>x.id===d.values?.[i])||/^digit:[0-9]$/.test(d.values?.[i])?d.values[i]:'')};
 const order=Array.from({length:4},(_,i)=>p.items.some(x=>x.id===d.order?.[i])?d.order[i]:'');
 if(new Set(order.filter(Boolean)).size!==order.filter(Boolean).length)fail('같은 조각을 두 곳에 놓을 수 없어요.');
 return {order,rotations:Object.fromEntries(p.items.map(i=>[i.id,p.rotationMode==='none'?0:int(d.rotations?.[i.id],0,p.type==='jigsaw'?3:1)]))};
}
export function escapeComplete(p,d){
 if(['riddle','tools'].includes(p.type))return false;
 if(p.type==='film')return Number.isInteger(d.x)&&Number.isInteger(d.y)&&Number.isInteger(d.turns);
 if(['dials','circuit'].includes(p.type))return d.values?.length===4&&d.values.every(Boolean);
 return d.order?.length===4&&d.order.every(Boolean)&&new Set(d.order).size===4;
}
export function escapeCorrect(p,d){
 if(p.type==='film')return d.x===0&&d.y===0&&d.turns===2;
 if(['dials','circuit'].includes(p.type))return d.values.every((id,n)=>p.items.find(i=>i.id===id)?.answer.split('|').includes(String(n+1)));
 return d.order.every((id,n)=>{const i=p.items.find(i=>i.id===id);return i?.answer===String(n+1)&&(i.via===''||d.rotations[id]===Number(i.via));});
}
export const escapeFlag=(s,id)=>s.discoveries?.includes('item:'+id);
const add=(s,id)=>{s.discoveries=[...new Set([...(s.discoveries||[]),id])];};
export function escapeGate(s,p){
 if(s.stage===3&&p.type==='circuit'&&!escapeFlag(s,'connector'))return false;
 if(s.stage===6&&p.type==='frames'&&!escapeFlag(s,'tab'))return false;
 return true;
}
// Only actual interaction events can acquire tools or operate covers. Client drafts cannot forge them.
export function escapeAction(s,e,roles,p){
 const n=s.stage;
 if(n===0&&p.type==='riddle'&&e.target==='eraser'){
  if(!roles.includes(1))fail('윤재 역할이 수수께끼의 물건을 확인해 주세요.',403);
  add(s,'item:map-piece');
 }else if(n===3&&e.target==='socket')add(s,'item:connector');
 else if(n===4&&p.type==='tools'&&e.target==='gap'){
  if(e.tool==='mirror')add(s,'item:gap-seen');
  else if(e.tool==='tongs'&&escapeFlag(s,'gap-seen'))add(s,'item:films');
  else return {state:s,outcome:'observe',message:e.tool==='tongs'?'안쪽이 보이지 않아 잡을 수 없어요.':'이 도구로는 안쪽을 살필 수 없어요.'};
 }else if(n===6&&e.target==='tab')add(s,'item:tab');
 else if(n===8&&e.target==='cover'){add(s,'item:cover');s.cabinetSeen=true;}
 else return {state:s,outcome:'observe',message:'살펴봤지만 여기에는 찾는 물건이 없어요.'};
 return escapeExplorationAdvance(s,p);
}
export function escapeExplorationAdvance(s,p){
 const advance=s.stage===0&&p.type==='riddle'&&escapeFlag(s,'map-piece')&&[1,2,3,4].every(r=>s.discoveries.includes(clueKey('P1',r)))||s.stage===4&&p.type==='tools'&&escapeFlag(s,'films');
 if(advance){s.solved.push('P'+(s.stage+1));s.stage++;s.draft={};s.draftVersion++;return {state:s,outcome:'correct'};}
 return {state:s,outcome:'discovered'};
}
export function escapeClues(p,roles,s){
 const intrinsic=['jigsaw','film'].includes(p.type);
 return p.clues.filter(c=>roles.includes(c.role)).map(c=>{
  const found=intrinsic||s.discoveries?.includes(clueKey(p.id,c.role));
  return {role:c.role,title:found?c.title:'아직 찾지 못한 단서',text:found?c.text:'',found};
 });
}
