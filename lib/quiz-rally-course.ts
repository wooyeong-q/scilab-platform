// Shared, deterministic course physics. The browser uses the generated copy.
export type Course = { version:1; length:number; seed:number };
export type Racer = { d:number; e:number; lane:number; t:number; capsule:number; open:boolean; hits:number; finishAt?:number };
export const ENERGY_DRAIN=1.8, MIN_SPEED=18, MAX_SPEED=72, CHARGE=45;
export function speed(energy:number){return MIN_SPEED+(MAX_SPEED-MIN_SPEED)*Math.max(0,Math.min(100,energy))/100;}
export function freshRacer(clock=0):Racer{return {d:0,e:70,lane:2,t:clock,capsule:-1,open:false,hits:0};}
export function gameClock(room:{status:string;durationSeconds:number;endsAt:number|null;remainingMs:number;stoppedClock?:number},now=Date.now()){
  if(room.status==='lobby')return 0;
  if(room.stoppedClock!==undefined&&room.status==='ended')return room.stoppedClock;
  return Math.max(0,Math.min(room.durationSeconds*1000,room.durationSeconds*1000-(room.status==='paused'?room.remainingMs:Math.max(0,(room.endsAt??now)-now))));
}
export function capsuleAt(index:number,course:Course){return {index,d:180+index*260,lane:(Math.imul(index+1,17)+course.seed)%5};}
export function obstacleAt(index:number,course:Course){return {index,d:380+index*480,lane:(Math.imul(index+3,13)+course.seed)%5};}
function distance(e:number,seconds:number){const powered=Math.min(seconds,e/ENERGY_DRAIN);return MIN_SPEED*seconds+.54*(e*powered-ENERGY_DRAIN*powered*powered/2);}
function secondsFor(e:number,d:number){let lo=0,hi=d/MIN_SPEED;for(let i=0;i<36;i++){const mid=(lo+hi)/2;if(distance(e,mid)<d)lo=mid;else hi=mid;}return hi;}
export function advance(source:Racer,clock:number,course:Course):Racer{
  const r={...source};if(r.finishAt!==undefined)return r;
  let left=Math.max(0,clock-r.t)/1000;
  // Obstacles are resolved at their exact crossing time, once per crossing.
  let index=Math.max(0,Math.floor((r.d-380)/480)+1);
  for(let guard=0;guard<2048&&left>0;guard++){
    const obstacle=obstacleAt(index,course),edge=Math.min(obstacle.d,course.length),gap=Math.max(0,edge-r.d);
    if(distance(r.e,left)<gap){r.d+=distance(r.e,left);r.e=Math.max(0,r.e-ENERGY_DRAIN*left);r.t+=left*1000;break;}
    const dt=secondsFor(r.e,gap);r.d=edge;r.e=Math.max(0,r.e-ENERGY_DRAIN*dt);r.t+=dt*1000;left=Math.max(0,left-dt);
    if(edge>=course.length){r.finishAt=r.t;break;}
    if(obstacle.lane===r.lane){r.e=Math.max(0,r.e-18);r.hits++;}
    index++;
  }
  return r;
}
