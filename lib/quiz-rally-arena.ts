import { cityLayout, cityTrack, cityRegion, cityTileDanger, cityPistons } from './quiz-rally-city';
// Deterministic top-down obstacle race. Shared by the authoritative server and client prediction.
export type Arena={version:1|2;length:number;seed:number;combat:boolean;energy?:boolean;supplies?:2};
export type Gear='mine'|'missile'|'banana'|'field'|'shield'|'boost';
export type Effect={id:string;type:Gear;owner:string;x:number;y:number;dx:number;dy:number;born:number;expires:number;victim?:string;hitAt?:number};
export type Runner={x:number;y:number;z:number;vz:number;dx:number;dy:number;fx:number;fy:number;t:number;seq:number;inputUntil:number;jumpAt:number;diveAt:number;diveUntil:number;stunUntil:number;immuneUntil:number;boostUntil:number;shieldUntil:number;knockX:number;knockY:number;checkpoint:number;fallUntil:number;falls:number;open:boolean;boxes:number[];usedEffects:string[];hits:{id:string;t:number}[];finishAt?:number;energy?:number};
export const GEAR_NAMES:Record<Gear,string>={mine:'지뢰',missile:'미사일',banana:'바나나',field:'감속 영역',shield:'보호막',boost:'질주'};
export const GEAR_HELP:Record<Gear,string>={mine:'뒤에 설치 · 밟은 친구를 튕겨 냅니다',missile:'코스 정면으로 발사 · 옆으로 움직여도 방향 유지',banana:'뒤에 놓기 · 밟으면 미끄러집니다',field:'주변에 5초 동안 느려지는 영역을 만듭니다',shield:'4초 동안 공격을 막습니다',boost:'3초 동안 더 빠르게 달립니다'};
export const WIDTH=620, SPEED=145, RADIUS=18, COUNTDOWN=3000;
export const ENERGY_DRAIN=1.5, ENERGY_CHARGE=45, MIN_ENERGY_SPEED=.55;
export function energyValue(r:Runner){return Math.max(0,Math.min(100,r.energy??100));}
export function energySpeed(r:Runner,arena:Arena){return arena.energy?MIN_ENERGY_SPEED+(1-MIN_ENERGY_SPEED)*energyValue(r)/100:1;}
function drainEnergy(r:Runner,end:number,arena:Arena){
 if(!arena.energy||r.open||r.finishAt!==undefined)return energyValue(r);
 const seconds=Math.max(0,end-Math.max(r.t,COUNTDOWN))/1000,start=energyValue(r),powered=Math.min(seconds,start/ENERGY_DRAIN);
 r.energy=Math.max(0,start-seconds*ENERGY_DRAIN);
 return seconds?(start*powered-ENERGY_DRAIN*powered*powered/2)/seconds:start;
}
export const CHECKPOINTS=[100,690,1350,2060,2700,3350,4010];
export const STAGES=['출발 광장','움직이는 문','회전봉 정원','점프 브리지','컨베이어 길','볼링 대로','사라지는 발판'];
export const center=(y:number)=>Math.sin(y/660)*65;
export function freshRunner(clock=0,slot=0):Runner{return{x:center(100)+(slot%8-3.5)*48,y:100-Math.floor(slot/8)*20,z:0,vz:0,dx:0,dy:0,fx:0,fy:1,t:clock,seq:0,inputUntil:0,jumpAt:-2000,diveAt:-3000,diveUntil:0,stunUntil:0,immuneUntil:0,boostUntil:0,shieldUntil:0,knockX:0,knockY:0,checkpoint:100,fallUntil:0,falls:0,open:false,boxes:[],usedEffects:[],hits:[],energy:100};}
export const ROUND_LENGTH=4700;
export function raceLength(durationSeconds:number){return Math.round(14000+(durationSeconds-300)*13000/600);}
export function stageAt(y:number,arena?:Arena){if(arena?.version===2)return cityRegion(y,arena);const round=Math.max(0,Math.floor(y/ROUND_LENGTH)),stage=Math.min(6,Math.floor((y-round*ROUND_LENGTH)/670));return{round,stage,index:round*7+stage,name:STAGES[stage],hint:"결승선을 향해!",color:stage};}
function bases(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){const length=arena?.length||ROUND_LENGTH,first=Math.max(0,Math.floor(near/ROUND_LENGTH)),last=Math.min(Math.ceil(length/ROUND_LENGTH)-1,Math.floor(far/ROUND_LENGTH));return Array.from({length:Math.max(0,last-first+1)},(_,i)=>(first+i)*ROUND_LENGTH);}
export function boxes(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).boxes.filter(b=>b.y>=near&&b.y<=far);return bases(arena,near,far).flatMap(base=>[270,640,1270,1950,2590,3220,3900,4480].flatMap((local,i)=>[-150,150].map((x,j)=>{const y=base+local;return{id:base/ROUND_LENGTH*16+i*2+j,x:center(y)+x,y,r:27};}))).filter(b=>b.y>=near&&b.y<=far);}
export function checkpoints(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).checkpoints.filter(b=>b>=near&&b<=far);return bases(arena,near,far).flatMap(base=>CHECKPOINTS.map(y=>base+y)).filter(y=>y>=near&&y<=far);}
export function gaps(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).gaps.filter(b=>b.end>=near&&b.start<=far);return bases(arena,near,far).flatMap(base=>[[2170,2240],[2420,2490]].map(([a,b])=>({start:base+a,end:base+b}))).filter(g=>g.end>=near&&g.start<=far);}
export function conveyors(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).belts.filter(b=>b.end>=near&&b.start<=far);return bases(arena,near,far).map(base=>({start:base+2800,end:base+3140,vx:0,vy:0})).filter(g=>g.end>=near&&g.start<=far);}
export function tileRows(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).tiles.filter(b=>b.y+95>=near&&b.y<=far);return bases(arena,near,far).flatMap(base=>[0,1,2].map(row=>({y:base+4130+row*95,row}))).filter(r=>r.y+95>=near&&r.y<=far);}
export function gates(clock:number,arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).gates.filter(g=>g.y>=near&&g.y<=far).map(g=>({y:g.y,gap:center(g.y)+g.offset+Math.sin(clock/g.period+g.phase)*g.amplitude,width:g.width}));return bases(arena,near,far).flatMap(base=>[830,1010,1190].map((v,i)=>{const y=base+v;return{y,gap:center(y)+Math.sin(clock/1100+i*1.9+base/ROUND_LENGTH)*160,width:180};})).filter(g=>g.y>=near&&g.y<=far);}
export function spinners(clock:number,arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).rotors.filter(g=>g.y+g.length>=near&&g.y-g.length<=far).map(g=>({...g,angle:clock/g.period+g.phase}));return bases(arena,near-200,far+200).flatMap(base=>[1530,1770].map((v,i)=>{const y=base+v;return{x:center(y)+(i?100:-95),y,angle:clock/(i?850:-1000)+i+base/ROUND_LENGTH,length:185,r:15,arms:1};})).filter(g=>g.y+200>=near&&g.y-200<=far);}
export function balls(clock:number,arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return cityLayout(arena).balls.filter(g=>g.y+g.r>=near&&g.y-g.r<=far).map(g=>({x:g.x+Math.sin(clock/g.period+g.phase)*g.amplitude,y:g.y,r:g.r}));return bases(arena,near,far).flatMap(base=>[3510,3690,3850].map((v,i)=>{const y=base+v;return{x:center(y)+Math.sin(clock/(900+i*180)+i*2+base/ROUND_LENGTH)*250,y,r:34};})).filter(g=>g.y>=near&&g.y<=far);}
export function bumpers(arena?:Arena,near=0,far=arena?.length||ROUND_LENGTH){if(arena?.version===2)return [];return bases(arena,near,far).flatMap(base=>[{x:-180,y:2850},{x:165,y:3030},{x:-120,y:3100}].map(p=>{const y=base+p.y;return{x:p.x+center(y),y,r:32};})).filter(g=>g.y>=near&&g.y<=far);}
export function trackAt(y:number,arena?:Arena){return arena?.version===2?cityTrack(y,arena):{center:center(y),width:WIDTH};}
export function barriers(arena:Arena,near=0,far=arena.length){return arena.version===2?cityLayout(arena).walls.filter(b=>b.y+40>=near&&b.y-40<=far):[];}
export function fans(arena:Arena,near=0,far=arena.length){return arena.version===2?cityLayout(arena).fans.filter(b=>b.end>=near&&b.start<=far):[];}
export function pistons(clock:number,arena:Arena,near=0,far=arena.length){return arena.version===2?cityPistons(clock,arena,near,far):[];}
export function missileDirection(){return{dx:0,dy:1};}
// A cheap conservative bound avoids simulating all classmates just to learn
// that nobody near the start can have reached the finish yet.
export function couldFinish(r:Runner,clock:number,arena:Arena){return r.finishAt!==undefined||Math.max(r.y,r.checkpoint)+(SPEED*3+Math.abs(r.knockY))*Math.min(6000,Math.max(0,clock-r.t))/1000>=arena.length;}
export function floorAt(x:number,y:number,clock:number,arena?:Arena){if(arena?.version===2){const road=trackAt(y,arena);return y>=5&&Math.abs(x-road.center)<=road.width/2&&!gaps(arena,y,y).length&&tileDanger(x,y,clock,arena)!==2;}if(y<5||Math.abs(x-center(y))>WIDTH/2)return false;const local=y%ROUND_LENGTH;if((local>2170&&local<2240)||(local>2420&&local<2490))return false;
 return tileDanger(x,y,clock)!==2;}
export function tileDanger(x:number,y:number,clock:number,arena?:Arena){if(arena?.version===2)return cityTileDanger(x,y,clock,arena);const local=y%ROUND_LENGTH;if(local<4130||local>4410)return 0;const row=Math.floor((local-4130)/95),col=Math.max(0,Math.min(4,Math.floor((x-center(y)+310)/124)));if((row+col)%3!==0)return 0;const phase=(clock/1000+row*.8+col*.45)%3.6;return phase>2.4?2:phase>1.8?1:0;}
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
 if(!r.dx&&!r.dy&&!r.vz&&!r.z&&!r.knockX&&!r.knockY&&!r.fallUntil&&r.diveUntil<=r.t&&(arena.version===2?r.y/(arena.length/27000):r.y%ROUND_LENGTH)<700&&floorAt(r.x,r.y,end,arena)&&effects.every(e=>e.owner===id||e.expires<=r.t||e.born>end)){drainEnergy(r,end,arena);r.t=end;return r;}
 // No active input survives a disconnect. Skip long idle periods without thousands of steps.
 if(end-t>6000&&r.inputUntil<t+2500&&!r.open){const cutoff=Math.min(end,t+5000);const first=advanceRunner(r,cutoff,arena,effects,id),resume=Math.max(cutoff,end-1000);drainEnergy(first,resume,arena);return advanceRunner({...first,t:resume},end,arena,effects,id);}
 while(t<end-.001){const dt=Math.min(20,end-t)/1000;t+=dt*1000;const averageEnergy=drainEnergy(r,t,arena);r.t=t;if(t<COUNTDOWN||r.open){r.dx=0;r.dy=0;continue;}
  if(r.fallUntil){if(t>=r.fallUntil){r.x=trackAt(r.checkpoint,arena).center;r.y=r.checkpoint;r.z=0;r.vz=0;r.knockX=0;r.knockY=0;r.fallUntil=0;r.immuneUntil=t+1100;}else{r.z-=dt*140;continue;}}
  const groundY=r.y%ROUND_LENGTH,grounded=r.z<=0,belt=conveyors(arena,r.y,r.y)[0];let slow=1;for(const e of effects){if(e.type==='field'&&e.owner!==id&&e.born<=t&&e.expires>t&&t>=r.shieldUntil&&Math.hypot(r.x-e.x,r.y-e.y)<145)slow=.38;}
  if(arena.version===1&&belt&&r.x<center(r.y)-40&&grounded)slow=Math.min(slow,.65);
  const active=t<r.inputUntil&&t>=r.stunUntil,fast=t<r.boostUntil?1.6:1,dive=t<r.diveUntil;
  // Low charge slows running progressively. Keep a small minimum leap range
  // so an empty battery never makes a required gap impossible to clear.
  const drive=arena.energy?Math.max((r.z>0||r.vz>0)?.92:0,MIN_ENERGY_SPEED+(1-MIN_ENERGY_SPEED)*averageEnergy/100):1;
  let vx=(active?r.dx:0)*SPEED*fast*slow*drive,vy=(active?r.dy:0)*SPEED*fast*slow*drive;
  if(dive){vx=r.fx*SPEED*2*drive;vy=r.fy*SPEED*2*drive;}
  if(grounded&&belt){vx+=arena.version===1?(Math.floor((groundY-2800)/110)%2?75:-75):belt.vx;vy+=belt.vy;}
  for(const wind of fans(arena,r.y,r.y))vx+=wind.force*(.7+.3*Math.sin(t/700+wind.phase))*(grounded?1:.65);
  const previousY=r.y,previousX=r.x;
  r.x+=(vx+r.knockX)*dt;r.y+=(vy+r.knockY)*dt;r.knockX*=Math.pow(.04,dt);r.knockY*=Math.pow(.04,dt);
  // Integrate height analytically so 30/60/120 Hz rendering and server batches
  // produce the same jump arc, rather than a different height at every sync.
  r.z=Math.max(0,r.z+r.vz*dt-340*dt*dt);r.vz-=680*dt;if(r.z===0)r.vz=0;
  // Tall sliding gates cannot be jumped; find the moving opening.
  for(const gate of gates(t,arena,r.y-70,r.y+70))if(Math.abs(r.y-gate.y)<RADIUS+16&&Math.abs(r.x-gate.gap)>gate.width/2-RADIUS){r.y=previousY<=gate.y?gate.y-RADIUS-17:gate.y+RADIUS+17;}
  for(const wall of barriers(arena,r.y-40,r.y+40))if(r.z<wall.height&&Math.abs(r.x-wall.x)<wall.w/2+RADIUS&&Math.abs(r.y-wall.y)<wall.depth/2+RADIUS){const edge=wall.depth/2+RADIUS+.5;if(previousY<=wall.y-edge)r.y=wall.y-edge;else if(previousY>=wall.y+edge)r.y=wall.y+edge;else r.x=wall.x+(previousX<=wall.x?-1:1)*(wall.w/2+RADIUS+.5);}
  for(const press of pistons(t,arena,r.y-90,r.y+90))if(press.state===2&&Math.hypot(r.x-press.x,r.y-press.y)<press.r+RADIUS)knock(r,press.x,press.y,t,265,780);
  if(r.z<32){for(const s of spinners(t,arena,r.y-40,r.y+40)){for(let arm=0;arm<s.arms;arm++){const angle=s.angle+arm*Math.PI/2,a=Math.cos(angle)*s.length,b=Math.sin(angle)*s.length;if(segmentDistance(r.x,r.y,s.x-a,s.y-b,s.x+a,s.y+b)<RADIUS+s.r)knock(r,s.x,s.y,t,230);}}
   for(const b of [...balls(t,arena,r.y-70,r.y+70),...bumpers(arena,r.y-70,r.y+70)])if(Math.hypot(r.x-b.x,r.y-b.y)<RADIUS+b.r)knock(r,b.x,b.y,t,240);
  }
  for(const e of effects){if(e.owner===id||e.born>t||e.expires<=t||e.victim&&e.victim!==id||r.usedEffects.includes(e.id)||e.type==='field'||e.type==='boost'||e.type==='shield')continue;
   if(e.type==='mine'&&t<e.born+500)continue;if(r.z>(e.type==='missile'?50:25))continue;const p=effectPosition(e,t),radius=e.type==='missile'?34:e.type==='mine'?32:29;
   if(Math.hypot(r.x-p.x,r.y-p.y)<RADIUS+radius){r.usedEffects.push(e.id);r.usedEffects=r.usedEffects.slice(-80);r.hits.push({id:e.id,t});r.hits=r.hits.slice(-12);if(t>=r.shieldUntil)knock(r,p.x,p.y,t,e.type==='banana'?115:280,e.type==='banana'?1050:850);}
  }
  if(!floorAt(r.x,r.y,t,arena)&&r.z<=3){r.fallUntil=t+850;r.falls++;r.dx=0;r.dy=0;r.vz=0;continue;}
  if(r.z<2){for(const cp of checkpoints(arena,r.y-80,r.y))if(r.y>=cp&&r.y<cp+80&&cp>r.checkpoint)r.checkpoint=cp;}
  if(r.y>=arena.length&&Math.abs(r.x-center(arena.length))<WIDTH/2){r.finishAt=t-dt*1000+Math.max(0,Math.min(1,(arena.length-previousY)/(r.y-previousY||1)))*dt*1000;r.y=arena.length;r.dx=0;r.dy=0;break;}
 }
 return r;
}
export function progress(r:Runner){return r.finishAt!==undefined?Infinity:r.y;}
