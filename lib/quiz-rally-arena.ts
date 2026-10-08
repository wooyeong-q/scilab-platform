// Deterministic top-down obstacle race. Shared by the authoritative server and client prediction.
export type Arena={version:1;length:number;seed:number;combat:boolean};
export type Gear='mine'|'missile'|'banana'|'field'|'shield'|'boost';
export type Effect={id:string;type:Gear;owner:string;x:number;y:number;dx:number;dy:number;born:number;expires:number;victim?:string;hitAt?:number};
export type Runner={x:number;y:number;z:number;vz:number;dx:number;dy:number;fx:number;fy:number;t:number;seq:number;inputUntil:number;jumpAt:number;diveAt:number;diveUntil:number;stunUntil:number;immuneUntil:number;boostUntil:number;shieldUntil:number;knockX:number;knockY:number;checkpoint:number;fallUntil:number;falls:number;open:boolean;boxes:number[];usedEffects:string[];hits:{id:string;t:number}[];finishAt?:number};
export const GEAR_NAMES:Record<Gear,string>={mine:'지뢰',missile:'미사일',banana:'바나나',field:'감속 영역',shield:'보호막',boost:'질주'};
export const GEAR_HELP:Record<Gear,string>={mine:'뒤에 설치 · 밟은 친구를 튕겨 냅니다',missile:'바라보는 방향으로 발사합니다',banana:'뒤에 놓기 · 밟으면 미끄러집니다',field:'주변에 5초 동안 느려지는 영역을 만듭니다',shield:'4초 동안 공격을 막습니다',boost:'3초 동안 더 빠르게 달립니다'};
export const WIDTH=620, SPEED=145, RADIUS=18, COUNTDOWN=3000;
export const CHECKPOINTS=[100,690,1350,2060,2700,3350,4010];
export const STAGES=['출발 광장','움직이는 문','회전봉 정원','점프 브리지','컨베이어 길','볼링 대로','사라지는 발판'];
export const center=(y:number)=>Math.sin(y/660)*65;
export function freshRunner(clock=0,slot=0):Runner{return{x:center(100)+(slot%8-3.5)*48,y:100-Math.floor(slot/8)*20,z:0,vz:0,dx:0,dy:0,fx:0,fy:1,t:clock,seq:0,inputUntil:0,jumpAt:-2000,diveAt:-3000,diveUntil:0,stunUntil:0,immuneUntil:0,boostUntil:0,shieldUntil:0,knockX:0,knockY:0,checkpoint:100,fallUntil:0,falls:0,open:false,boxes:[],usedEffects:[],hits:[]};}
export function boxes(){return [270,640,1270,1950,2590,3220,3900,4480].flatMap((y,i)=>[-150,150].map((x,j)=>({id:i*2+j,x:center(y)+x,y,r:27})));}
export function gates(clock:number){return [830,1010,1190].map((y,i)=>({y,gap:center(y)+Math.sin(clock/1100+i*1.9)*160,width:180}));}
export function spinners(clock:number){return[1530,1770].map((y,i)=>({x:center(y)+(i?100:-95),y,angle:clock/(i?850:-1000)+i,length:185,r:15}));}
export function balls(clock:number){return[3510,3690,3850].map((y,i)=>({x:center(y)+Math.sin(clock/(900+i*180)+i*2)*250,y,r:34}));}
export function bumpers(){return [{x:-180,y:2850},{x:165,y:3030},{x:-120,y:3100}].map(p=>({...p,x:p.x+center(p.y),r:32}));}
export function floorAt(x:number,y:number,clock:number){if(y<5||Math.abs(x-center(y))>WIDTH/2)return false;if((y>2170&&y<2240)||(y>2420&&y<2490))return false;
 if(y>4130&&y<4410){const row=Math.floor((y-4130)/95),col=Math.max(0,Math.min(4,Math.floor((x-center(y)+310)/124)));if((row+col)%3===0&&((clock/1000+row*.8+col*.45)%3.6)>2.4)return false;}return true;}
export function tileDanger(x:number,y:number,clock:number){if(y<4130||y>4410)return 0;const row=Math.floor((y-4130)/95),col=Math.max(0,Math.min(4,Math.floor((x-center(y)+310)/124)));if((row+col)%3!==0)return 0;const phase=(clock/1000+row*.8+col*.45)%3.6;return phase>2.4?2:phase>1.8?1:0;}
export function effectPosition(e:Effect,t:number){const dt=Math.max(0,t-e.born)/1000;return e.type==='missile'?{x:e.x+e.dx*460*dt,y:e.y+e.dy*460*dt}:{x:e.x,y:e.y};}
function segmentDistance(x:number,y:number,ax:number,ay:number,bx:number,by:number){const dx=bx-ax,dy=by-ay,k=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-k*dx,y-ay-k*dy);}
function knock(r:Runner,x:number,y:number,t:number,force=190,stun=600){if(t<r.immuneUntil||r.open)return;const d=Math.hypot(r.x-x,r.y-y)||1;r.knockX=(r.x-x)/d*force;r.knockY=(r.y-y)/d*force-55;r.stunUntil=t+stun;r.immuneUntil=t+1050;}
export function control(source:Runner,dx:number,dy:number,jump:boolean,dive:boolean,clock:number,seq:number):Runner{
 const r={...source};r.seq=seq;if(r.open||r.finishAt!==undefined)return r;const n=Math.max(1,Math.hypot(dx,dy));r.dx=dx/n;r.dy=dy/n;r.inputUntil=clock+2200;
 if(dx||dy){r.fx=dx/n;r.fy=dy/n;}
 if(jump&&r.z<=.1&&!r.fallUntil&&clock>=r.stunUntil&&clock-r.jumpAt>=880){r.vz=300;r.jumpAt=clock;}
 if(dive&&clock>=r.stunUntil&&!r.fallUntil&&clock-r.diveAt>=1800){r.diveAt=clock;r.diveUntil=clock+360;if(r.z>0)r.vz=Math.min(r.vz,20);}
 return r;
}
export function advanceRunner(source:Runner,clock:number,arena:Arena,effects:Effect[]=[],id=''):Runner{
 const r={...source,boxes:[...source.boxes],usedEffects:[...source.usedEffects],hits:[...source.hits]};if(r.finishAt!==undefined)return r;
 const end=Math.max(r.t,clock);let t=r.t;if(r.open){r.t=end;r.dx=0;r.dy=0;return r;}
 // No active input survives a disconnect. Skip long idle periods without thousands of steps.
 if(end-t>6000&&r.inputUntil<t+2500&&!r.open){const cutoff=Math.min(end,t+5000);const first=advanceRunner(r,cutoff,arena,effects,id);return advanceRunner({...first,t:Math.max(cutoff,end-1000)},end,arena,effects,id);}
 while(t<end-.001){const dt=Math.min(20,end-t)/1000;t+=dt*1000;r.t=t;if(t<COUNTDOWN||r.open){r.dx=0;r.dy=0;continue;}
  if(r.fallUntil){if(t>=r.fallUntil){r.x=center(r.checkpoint);r.y=r.checkpoint;r.z=0;r.vz=0;r.knockX=0;r.knockY=0;r.fallUntil=0;r.immuneUntil=t+1100;}else{r.z-=dt*140;continue;}}
  const grounded=r.z<=0;let slow=1;for(const e of effects){if(e.type==='field'&&e.owner!==id&&e.born<=t&&e.expires>t&&t>=r.shieldUntil&&Math.hypot(r.x-e.x,r.y-e.y)<145)slow=.38;}
  if(r.y>2800&&r.y<3140&&r.x<center(r.y)-40&&grounded)slow=Math.min(slow,.65);
  const active=t<r.inputUntil&&t>=r.stunUntil,fast=t<r.boostUntil?1.6:1,dive=t<r.diveUntil;
  let vx=(active?r.dx:0)*SPEED*fast*slow,vy=(active?r.dy:0)*SPEED*fast*slow;
  if(dive){vx=r.fx*SPEED*2;vy=r.fy*SPEED*2;}
  if(grounded&&r.y>2800&&r.y<3140)vx+=Math.floor((r.y-2800)/110)%2?75:-75;
  const previousY=r.y;
  r.x+=(vx+r.knockX)*dt;r.y+=(vy+r.knockY)*dt;r.knockX*=Math.pow(.04,dt);r.knockY*=Math.pow(.04,dt);
  r.vz-=680*dt;r.z=Math.max(0,r.z+r.vz*dt);if(r.z===0)r.vz=0;
  // Tall sliding gates cannot be jumped; find the moving opening.
  for(const gate of gates(t))if(Math.abs(r.y-gate.y)<RADIUS+16&&Math.abs(r.x-gate.gap)>gate.width/2-RADIUS){r.y=vy>=0?gate.y-RADIUS-17:gate.y+RADIUS+17;}
  if(r.z<32){for(const s of spinners(t)){const a=Math.cos(s.angle)*s.length,b=Math.sin(s.angle)*s.length;if(segmentDistance(r.x,r.y,s.x-a,s.y-b,s.x+a,s.y+b)<RADIUS+s.r)knock(r,s.x,s.y,t,230);}
   for(const b of [...balls(t),...bumpers()])if(Math.hypot(r.x-b.x,r.y-b.y)<RADIUS+b.r)knock(r,b.x,b.y,t,240);
  }
  for(const e of effects){if(e.owner===id||e.born>t||e.expires<=t||e.victim&&e.victim!==id||r.usedEffects.includes(e.id)||e.type==='field'||e.type==='boost'||e.type==='shield')continue;
   if(e.type==='mine'&&t<e.born+500)continue;if(r.z>(e.type==='missile'?50:25))continue;const p=effectPosition(e,t),radius=e.type==='missile'?34:e.type==='mine'?32:29;
   if(Math.hypot(r.x-p.x,r.y-p.y)<RADIUS+radius){r.usedEffects.push(e.id);r.usedEffects=r.usedEffects.slice(-80);r.hits.push({id:e.id,t});r.hits=r.hits.slice(-12);if(t>=r.shieldUntil)knock(r,p.x,p.y,t,e.type==='banana'?115:280,e.type==='banana'?1050:850);}
  }
  if(!floorAt(r.x,r.y,t)&&r.z<=3){r.fallUntil=t+850;r.falls++;r.dx=0;r.dy=0;r.vz=0;continue;}
  if(r.z<2){for(const cp of CHECKPOINTS)if(r.y>=cp&&r.y<cp+80&&cp>r.checkpoint)r.checkpoint=cp;}
  if(r.y>=arena.length&&Math.abs(r.x-center(arena.length))<WIDTH/2){r.finishAt=t-dt*1000+Math.max(0,Math.min(1,(arena.length-previousY)/(r.y-previousY||1)))*dt*1000;r.y=arena.length;r.dx=0;r.dy=0;break;}
 }
 return r;
}
export function progress(r:Runner){return r.finishAt!==undefined?Infinity:r.y;}
