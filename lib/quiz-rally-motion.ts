import { advanceRunner,control,isDashing,type Runner } from './quiz-rally-arena';
import type { getQuizMotionAccess } from './quiz-rally';
export type MotionAccess=Awaited<ReturnType<typeof getQuizMotionAccess>>;
type Input={seq:number;at:number;dx:number;dy:number;jump:boolean;dash:boolean};
const round=(n:number)=>Math.round(n*100)/100;
export function motionInputs(values:unknown):Input[]{
  if(!Array.isArray(values)||values.length<1||values.length>24)throw new Error('invalid inputs');
  let seq=0;const inputs:Input[]=[];
  for(const v of values){
    if(!v||!Number.isSafeInteger(v.seq)||v.seq<=seq||v.seq<1||!Number.isFinite(v.at)||v.at<0||!Number.isFinite(v.dx)||Math.abs(v.dx)>1||!Number.isFinite(v.dy)||Math.abs(v.dy)>1||typeof v.jump!=='boolean'||typeof v.dash!=='boolean')throw new Error('invalid input');
    seq=v.seq;inputs.push({seq:v.seq,at:v.at,dx:v.dx,dy:v.dy,jump:v.jump,dash:v.dash});
  }
  return inputs;
}

// This projection never writes scores, items, hits or the player's saved
// position. It uses the SAME server physics and ordered inputs as HTTP saves.
export class MotionProjection{
  access:MotionAccess;pending:Input[]=[];anchor?:Runner;projection?:Runner;
  lastSeq=0;lastSent=0;previous?:Runner;lastSignature='';
  constructor(access:MotionAccess,readonly id:string){this.access=access;this.reset(access);}
  clock(now=Date.now()){return Math.min(this.access.duration,this.access.raceClock+(this.access.status==='running'?Math.max(0,now-this.access.serverNow):0));}
  reset(access:MotionAccess){
    const changed=access.roomRevision!==this.access.roomRevision||access.status!==this.access.status;
    this.access=access;if(changed||access.status!=='running')this.pending=[];
    if(access.runner)this.ack(access.runner,access.version);
  }
  ack(source:Runner,version:number){
    if(version<this.access.version)return;
    this.access.version=version;this.pending=this.pending.filter(e=>e.seq>source.seq);
    this.anchor={...source,boxes:[],boxReadyAt:{}};this.lastSeq=Math.max(this.lastSeq,source.seq);
    for(const e of this.pending)this.apply(e);
    this.projection=undefined;
  }
  apply(e:Input){
    if(!this.anchor||!this.access.arena)return;
    const at=Math.max(this.anchor.t,Math.min(this.clock(),Math.max(this.clock()-6000,e.at)));
    this.anchor=control(advanceRunner(this.anchor,at,this.access.arena,this.access.effects,this.id),e.dx,e.dy,e.jump,e.dash,at,e.seq);
    this.projection=undefined;
  }
  inputs(values:unknown){
    const inputs=motionInputs(values);
    if(this.access.status!=='running'||!this.anchor||this.anchor.open||this.anchor.finishAt!==undefined)return;
    for(const e of inputs){if(e.seq<=this.lastSeq)continue;this.lastSeq=e.seq;this.pending.push(e);this.apply(e);}
    if(this.pending.length>96)throw new Error('unacknowledged inputs');
  }
  frame(){
    if(!this.anchor||!this.access.arena||this.access.status!=='running')return null;
    const t=this.clock();this.projection=advanceRunner(this.projection||this.anchor,t,this.access.arena,this.access.effects,this.id);
    const r=this.projection,previous=this.previous,dt=previous?(t-previous.t)/1000:0;
    const moving=!!r.dx||!!r.dy||!!r.vz||!!r.z||!!r.fallUntil||t<r.stunUntil;
    const flags=(isDashing(r,this.access.arena,t)?1:0)|(r.open?2:0)|(r.fallUntil?4:0)|(t<r.stunUntil?8:0)|(t<r.boostUntil?16:0)|(t<r.shieldUntil?32:0)|(r.finishAt!==undefined?64:0);
    const signature=[r.x,r.y,r.z,flags,r.seq,r.falls].join(':');
    if(!moving&&signature===this.lastSignature&&t-this.lastSent<1000)return null;
    const velocity=(key:'x'|'y')=>dt>0&&dt<.5?round(Math.max(-800,Math.min(800,(r[key]-previous![key])/dt))):0;
    const pose=[Math.round(t),round(r.x),round(r.y),round(r.z),velocity('x'),velocity('y'),round(r.vz),round(r.fx),round(r.fy),flags,r.seq,r.falls,round(r.jumpAt)];
    this.previous={...r};this.lastSent=t;this.lastSignature=signature;
    return {type:'frame',code:this.access.code,id:this.id,roomRevision:this.access.roomRevision,arenaRevision:this.access.arenaRevision,pose};
  }
}
