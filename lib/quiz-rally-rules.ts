// Shared game rules: no database or network work belongs in this module.
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { QUESTION_MAP, QUIZ_QUESTIONS } from './quiz-rally-questions';
import type { CustomQuestion } from './quiz-rally-bank';
import { QuizError } from './quiz-rally-errors';
import { robotFor, validateRobot, type RobotParts } from './quiz-rally-robot';
import { capsuleAt, gameClock, CHARGE, type Course, type Racer } from './quiz-rally-course';
import { advanceRunner, control, missileDirection, boxes, boxWait, BOX_RESPAWN, GEAR_NAMES, ENERGY_CHARGE, energyValue, withHistory, runnerState, recordRunnerPatch, type Arena, type Runner, type Gear, type Effect, type ArenaInput } from './quiz-rally-arena';

export type Phase = 'lobby' | 'running' | 'paused' | 'ended';
export type Item = 'boost' | 'hint' | 'shield' | 'steal';
export type Reward = Item | 'bonus40' | 'bonus70' | 'energy' | 'gear';
export type Finish = {place:number; bonus:number};
export type Turn = { finishBonus?:number; id: string; nonce: string; order: number[]; eliminated: number[]; answered: boolean; selected: number | null; correct: boolean | null; points: number; rewards: Reward[]; reward: {type: Reward; text: string} | null; retries?:number; revealed?:boolean; wrongChoices?:number[] };
export type Player = {
  id: string; nickname: string; avatar?: number; robot?:RobotParts; tokenHash: string; version: number; removed: boolean;
  solvedIds?:string[]; finish?:Finish; racer?:Racer; runner?:Runner; gear?:Gear[]; gearDeck?:Gear[]; useAt?:number; answerAt?:number;
  score: number; correct: number; attempted: number; inventory: Record<Item,number>;
  boostActive: boolean; shieldActive: boolean; protectedUntil: number;
  deck: string[]; turn: Turn; requests: string[]; stats: Record<string,[number,number]>;
  notice: string; noticeId: string;
};
export type Room = {
  title: string; durationSeconds: number; extension: boolean; stealEnabled: boolean;
  status: Phase; endsAt: number | null; remainingMs: number; metaRevision: number;
  requests: string[]; players: Record<string,Player>;
  raceGoal?:number; finishers?:string[]; course?:Course; stoppedClock?:number; arena?:Arena; arenaEffects?:Effect[]; arenaRevision?:number;arenaCombatAt?:number;
  questionIds?: string[]; questionSetTitle?: string; cityTarget?:number; arenaFinalized?:boolean;
  realtime?: {version:1;generation:string;checkpoint:number};
};
export type Row = { code: string; teacher_key_hash: string; state: Room; expires_at: string; custom_question?:CustomQuestion;motion_inputs?:ArenaInput[] };
export type QuizIdentity = { role: 'teacher' | 'student' | 'public'; token: string; playerId: string };
export const codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const items: Item[]=['boost','hint','shield','steal'];
export const itemNames: Record<Item,string>={boost:'점수 2배',hint:'보기 줄이기',shield:'방어막',steal:'점수 가져오기'};
export const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
export function validToken(token:unknown): token is string { return typeof token==='string' && /^[A-Za-z0-9_-]{32,128}$/.test(token); }
export function matches(token:string,expected:string){if(!validToken(token)|| !/^[a-f0-9]{64}$/.test(expected))return false;return timingSafeEqual(Buffer.from(hash(token),'hex'),Buffer.from(expected,'hex'));}
export function assert(condition:unknown,message:string,status=400): asserts condition {if(!condition)throw new QuizError(message,status);}
export function codeValue(code:string){const value=code.toUpperCase();assert(/^[A-HJ-NP-Z2-9]{6}$/.test(value),'참여 코드 6자리를 확인해 주세요.');return value;}
export function textValue(value:unknown,max:number,fallback=''){return (typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' '):fallback).slice(0,max);}
export function uuid(value:unknown): value is string {return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);}
export function shuffled<T>(list:T[]):T[]{const a=[...list];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function deckFor(room:Room,solved:string[]=[]){return shuffled((room.questionIds||QUIZ_QUESTIONS.filter(q=>room.extension||!q.extension).map(q=>q.id)).filter(id=>room.arena||room.course||!room.raceGoal||!solved.includes(id)));}
export function turnFor(id:string):Turn{return {id,nonce:randomUUID(),order:shuffled([0,1,2,3]),eliminated:[],answered:false,selected:null,correct:null,points:0,rewards:[],reward:null};}
// Older rooms receive a stable character without changing their stored scores or turns.
export function avatarFor(p:{id:string;avatar?:number}){const value=p.avatar;return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<6?value:parseInt(hash(p.id).slice(0,8),16)%6;}
export function phase(room:Pick<Room,'status'|'endsAt'>,now=Date.now()):Phase{return room.status==='running'&&room.endsAt!==null&&room.endsAt<=now?'ended':room.status;}
export function authenticate(row:Pick<Row,'teacher_key_hash'>,identity:QuizIdentity,player?:Player){
  if(identity.role==='teacher'){assert(matches(identity.token,row.teacher_key_hash),'교사 화면의 접근 정보가 맞지 않습니다.',403);return;}
  assert(identity.role==='student'&&player&&matches(identity.token,player.tokenHash),'참여 정보를 확인할 수 없습니다. 원래 참여한 기기에서 열어 주세요.',403);
  assert(!player.removed,'교사가 참여를 종료했습니다.',403);
}
export function publicTurn(p:Player,q:CustomQuestion,code:string){const revealed=p.turn.correct===true||p.turn.revealed===true;return {
  nonce:p.turn.nonce,topic:q.topic,prompt:q.prompt,diagram:q.diagram||null,
  imageUrl:q.imageId?`/api/labs/quiz-rally/sessions/${code}/images/${q.imageId}`:q.imageUrl||null,imageAlt:q.imageAlt||'',
  options:p.turn.order.map(i=>q.options[i]),eliminated:[...new Set([...p.turn.eliminated,...(p.turn.wrongChoices||[])])],
  answered:p.turn.answered,retries:p.turn.retries||0,revealed,canRetry:p.turn.answered&&p.turn.correct===false&&!revealed,
  feedback:p.turn.answered?{correct:p.turn.correct,selected:p.turn.selected,...(revealed?{correctOption:p.turn.order.indexOf(q.answer),explanation:q.explanation}:{}),points:p.runner?undefined:p.turn.points}:null,
  finishBonus:p.runner?undefined:p.turn.finishBonus||0,needsReward:p.turn.answered&&p.turn.correct&&!p.turn.reward,reward:p.turn.reward,
};}
export function publicPlayer(p:Player,q:CustomQuestion,code:string,review:unknown[]=[]){return {review,version:p.version,runner:p.runner||null,gear:p.gear||[],answerAt:p.answerAt||0,racer:p.racer||null,finish:p.finish||null,id:p.id,nickname:p.nickname,avatar:avatarFor(p),robot:robotFor(p.robot,avatarFor(p)),score:p.runner?undefined:p.score,correct:p.correct,attempted:p.attempted,inventory:p.runner?undefined:p.inventory,boostActive:p.boostActive,shieldActive:p.shieldActive,protectedUntil:p.protectedUntil,turn:publicTurn(p,q,code),notice:p.notice,noticeId:p.noticeId};}

export function advanceArenaPlayer(room:Room,p:Player,clock:number){
  const previous=new Set(p.runner!.usedEffects),r=advanceRunner(p.runner!,clock,room.arena!,room.arenaEffects||[],p.id);
  for(const hit of r.hits)if(!previous.has(hit.id)){const e=room.arenaEffects?.find(e=>e.id===hit.id);if(e&&!e.victim&&!e.shared){e.victim=p.id;e.hitAt=hit.t;}}
  p.runner=r;return r;
}
export function closeArenaQuestion(r:Runner,clock:number){
  const id=r.questionBox??r.boxes.at(-1); // Also close questions opened before respawn timestamps existed.
  if(r.open&&id!==undefined)r.boxReadyAt={...r.boxReadyAt,[id]:clock+BOX_RESPAWN};
  delete r.questionBox;r.jumpQueuedUntil=0;r.open=false;r.dash=false;r.dx=0;r.dy=0;r.inputUntil=clock;
}
export function modifyArena(room:Room,p:Player,body:Record<string,unknown>,q:CustomQuestion){
  assert(p.runner&&!p.finish,'이미 완주했어요. 친구들의 경주를 지켜봐 주세요.',409);
  p.runner=withHistory(p.runner);
  const now=gameClock(room),action=body.action;
  if(action==='arena-input'||((action==='arena-collect'||action==='arena-use')&&Array.isArray(body.inputs))){
    const batch=Array.isArray(body.inputs)?body.inputs:[body];assert((batch.length>0||action!=='arena-input')&&batch.length<=(action==='arena-use'?96:24),'조작 값을 확인해 주세요.');
    let last=-1;
    for(const value of batch){assert(value&&typeof value==='object'&&!Array.isArray(value),'조작 값을 확인해 주세요.');const input=value as Record<string,unknown>;
      const dx=Number(input.dx),dy=Number(input.dy),seq=Number(input.seq);assert(Number.isFinite(dx)&&Number.isFinite(dy)&&Math.abs(dx)<=1&&Math.abs(dy)<=1&&Number.isSafeInteger(seq)&&seq>=0&&seq>last,'조작 값을 확인해 주세요.');last=seq;
      if(seq<=p.runner.seq)continue;
      const at=Number(input.at),clock=Number.isFinite(at)?Math.max(p.runner.t,room.arenaCombatAt||0,Math.min(now,Math.max(now-6000,at))):now;
      const r=advanceArenaPlayer(room,p,clock);p.runner=control(r,dx,dy,input.jump===true,input.dash===true||input.dive===true,clock,seq);
    }
    // Persist the last acknowledged input, not its extrapolation to request time.
    // New inputs may already have happened while this response is in flight.
    // Advancing this anchor to `now` would push those inputs (including jumps)
    // into the future on the next request and repeatedly rewind the client.
    // Rendering may project ahead; finish settlement uses confirmed controls.
    if(action==='arena-input'||p.runner.finishAt!==undefined)return;
  }
  // Item/popup actions share the input timeline, including when they waited
  // behind another request. Keep validation/cooldown time authoritative.
  const at=Number(body.at),actionClock=Number.isFinite(at)?Math.max(p.runner.t,room.arenaCombatAt||0,Math.min(now,Math.max(now-6000,at))):now;
  const r=advanceArenaPlayer(room,p,actionClock),before=runnerState(r);
  try{
  if(action==='arena-close'){closeArenaQuestion(r,actionClock);return;}
  if(action==='arena-collect'){
    assert(!r.open&&!r.fallUntil&&r.z<25,'지금은 문제 상자를 열 수 없어요.',409);
    const b=boxes(room.arena, r.y-100,r.y+100).find(b=>b.id===body.box);assert(b&&boxWait(r,b.id,actionClock)===0&&Math.hypot(b.x-r.x,b.y-r.y)<100,'가까운 문제 상자를 찾아 주세요. 사용한 상자는 8초 뒤 다시 생깁니다.',409);
    if(p.turn.correct||p.turn.revealed){if(!p.deck.length)p.deck=deckFor(room);if(p.deck.length>1&&p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);p.turn=turnFor(p.deck.shift()!);}
    if(!r.boxes.includes(b.id))r.boxes.push(b.id);
    r.boxReadyAt={...Object.fromEntries(Object.entries(r.boxReadyAt||{}).filter(([,ready])=>ready>actionClock)),[b.id]:actionClock+BOX_RESPAWN};
    r.questionBox=b.id;r.jumpQueuedUntil=0;r.open=true;r.dash=false;r.dx=0;r.dy=0;r.z=0;r.vz=0;r.knockX=0;r.knockY=0;r.inputUntil=now;return;
  }
  if(action==='answer'){
    assert(r.open,'문제 상자를 먼저 획득해 주세요.',409);const retry=p.turn.answered&&p.turn.correct===false&&!p.turn.revealed;
    assert(body.nonce===p.turn.nonce&&(!p.turn.answered||retry),'이미 처리한 문제입니다.',409);assert(now>=(p.answerAt||0),'잠깐 생각한 뒤 다시 골라 주세요.',409);
    const choice=Number(body.choice);assert(Number.isInteger(choice)&&choice>=0&&choice<4&&!p.turn.wrongChoices?.includes(choice),'남아 있는 보기를 골라 주세요.');
    p.turn.answered=true;p.turn.selected=choice;p.turn.correct=p.turn.order[choice]===q.answer;p.turn.points=0;p.attempted++;if(retry)p.turn.retries=(p.turn.retries||0)+1;
    const stat=p.stats[q.id]||[0,0];stat[0]++;
    if(p.turn.correct){
      p.correct++;stat[1]++;
      const charged=room.arena!.energy?Math.min(ENERGY_CHARGE,100-energyValue(r)):0;
      if(room.arena!.energy)r.energy=Math.min(100,energyValue(r)+ENERGY_CHARGE);
      if((p.gear||[]).length<3){
        const pool:Gear[]=room.arena!.combat?['mine','missile','banana','field','shield','boost']:['shield','boost'];
        // Deal every eligible item once in a shuffled cycle. Only consume a
        // draw when it fits in the bag, within the same idempotent player write.
        if(!p.gearDeck?.length||p.gearDeck.some(g=>!pool.includes(g)))p.gearDeck=shuffled(pool);
        const gear=p.gearDeck.shift()!;
        p.gear=[...(p.gear||[]),gear];p.turn.reward={type:'gear',text:GEAR_NAMES[gear]+' 획득!'};
        notice(p,'정답! '+(room.arena!.energy?`에너지 +${Math.round(charged)} · `:'')+GEAR_NAMES[gear]+' 획득');
      }else{
        p.turn.reward={type:'energy',text:room.arena!.energy?'에너지 충전 완료':'정답 확인 완료'};
        notice(p,'정답! '+(room.arena!.energy?`에너지 +${Math.round(charged)} · `:'')+'가방의 아이템 3개는 그대로 유지');
      }
      closeArenaQuestion(r,actionClock);
    }
    else{p.turn.wrongChoices=[...(p.turn.wrongChoices||[]),choice];p.turn.nonce=randomUUID();p.answerAt=now+1000;}
    p.stats[q.id]=stat;return;
  }
  if(action==='reveal'){assert(r.open&&body.nonce===p.turn.nonce&&p.turn.answered&&!p.turn.correct,'해설을 볼 문제를 확인해 주세요.',409);p.turn.revealed=true;return;}
  if(action==='arena-use'){
    assert(!r.open&&!r.fallUntil,'코스에서 아이템을 사용해 주세요.',409);assert(now-(p.useAt??-5000)>=900,'잠시 뒤 다음 아이템을 사용해 주세요.',409);
    if(body.gear!==undefined)assert(body.gear===(p.gear||[]).join(','),'아이템이 바뀌었어요. 가방을 다시 확인해 주세요.',409);
    const slot=Number(body.slot);assert(Number.isInteger(slot)&&slot>=0&&slot<(p.gear||[]).length,'아이템을 선택해 주세요.');const gear=p.gear![slot];
    if(gear==='shield')r.shieldUntil=actionClock+4000;
    else if(gear==='boost')r.boostUntil=actionClock+3000;
    else {const cutoff=Math.min(now-5000,(room.arenaCombatAt??now)-3000),effects=(room.arenaEffects||[]).filter(e=>e.expires>cutoff);assert(effects.length<200,'경기의 아이템이 많아요. 잠깐 뒤 사용해 주세요.');const behind=gear==='mine'||gear==='banana',offset=behind?-55:gear==='missile'?45:0,direction=gear==='missile'?missileDirection():{dx:r.fx,dy:r.fy};
      // A delayed request must not create an already-flown rocket behind a
      // target's saved input anchor. Project the muzzle to acceptance time,
      // without advancing the owner's anchor past their queued jump inputs.
      const born=gear==='missile'?now:actionClock,origin=gear==='missile'?advanceRunner(r,born,room.arena!,effects,p.id):r;
      effects.push({id:randomUUID(),type:gear,owner:p.id,x:origin.x+direction.dx*offset,y:origin.y+direction.dy*offset,dx:direction.dx,dy:direction.dy,born,expires:born+(gear==='missile'?2200:gear==='field'?5000:14000),shared:gear==='missile'});room.arenaEffects=effects;
    }
    p.gear!.splice(slot,1);p.useAt=now;notice(p,GEAR_NAMES[gear]+' 사용!');return;
  }
  throw new QuizError('이 경주에서는 사용할 수 없는 동작입니다.');
  }finally{recordRunnerPatch(before,r);}
}
export function notice(p:Player,message:string){p.notice=message;p.noticeId=randomUUID();}
export function remember(p:Player,requestId:string){p.requests=[...p.requests.slice(-11),requestId];p.version++;}
export function modifyPlayer(room:Room,p:Player,body:Record<string,unknown>,q:CustomQuestion,target?:Player){
  const action=body.action;
  if(action==='customize'){p.robot=validateRobot(body.robot);p.avatar=p.robot.headColor;return;}
  if(room.arena){modifyArena(room,p,body,q);return;}
  assert(!p.finish||action==='reward','이미 완주했어요. 친구들의 도전을 지켜봐 주세요.',409);
  if(room.course&&p.racer){
    const r=p.racer;
    if(action==='race-lane'){assert(Number.isInteger(body.lane)&&Number(body.lane)>=0&&Number(body.lane)<5,'이동할 차선을 확인해 주세요.');r.lane=Number(body.lane);return;}
    if(action==='race-close'){r.open=false;return;}
    if(action==='race-collect'){
      assert(!r.open,'지금 열린 문제를 먼저 확인해 주세요.',409);
      const index=Number(body.capsule);assert(Number.isInteger(index)&&index>=0&&index>r.capsule,'이미 지난 캡슐입니다.',409);
      const cap=capsuleAt(index,room.course);assert(cap.d<room.course.length&&Math.abs(r.d-cap.d)<=120&&r.lane===cap.lane,'같은 차선의 가까운 문제 캡슐을 획득할 수 있어요.',409);
      if(p.turn.correct||p.turn.revealed){if(!p.deck.length)p.deck=deckFor(room);if(p.deck.length>1&&p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);p.turn=turnFor(p.deck.shift()!);}
      r.capsule=index;r.open=true;return;
    }
    if(action==='next'){assert(p.turn.answered,'먼저 문제를 확인해 주세요.');r.open=false;return;}
    if(action==='answer'||action==='reveal'||action==='retry-question')assert(r.open,'코스의 문제 캡슐을 먼저 획득해 주세요.',409);
    if(action==='item'&&body.item==='hint')assert(r.open,'문제 캡슐을 연 다음 사용해 주세요.');
  }
  if(action==='retry-question'||action==='reveal'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&p.turn.correct===false&&!p.turn.revealed,'다시 풀 수 있는 오답이 없습니다.',409);
    if(action==='reveal'){p.turn.revealed=true;return;}
    p.score-=20;p.turn.retries=(p.turn.retries||0)+1;p.turn.answered=false;p.turn.selected=null;p.turn.correct=null;p.turn.points=0;p.turn.nonce=randomUUID();notice(p,'재도전 −20점 · 같은 문제를 다시 풀어 보세요.');return;
  }
  if(action==='answer'){
    const retry=p.turn.answered&&p.turn.correct===false&&!p.turn.revealed;
    assert(body.nonce===p.turn.nonce&&(!p.turn.answered||retry),'이미 처리한 문제입니다. 화면을 새로 확인해 주세요.',409);
    assert(Number.isInteger(body.choice)&&Number(body.choice)>=0&&Number(body.choice)<4,'보기를 선택해 주세요.');
    assert(!p.turn.eliminated.includes(Number(body.choice))&&!(p.turn.wrongChoices||[]).includes(Number(body.choice)),'남아 있는 보기를 선택해 주세요.');
    if(retry){p.score-=20;p.turn.retries=(p.turn.retries||0)+1;}
    p.turn.answered=true;p.turn.selected=Number(body.choice);p.turn.correct=p.turn.order[p.turn.selected]===q.answer;
    p.attempted++;const s=p.stats[q.id]||[0,0];s[0]++;
    if(p.turn.correct){p.correct++;s[1]++;p.turn.points=p.boostActive?200:100;p.score+=p.turn.points;p.boostActive=false;
      const pool:Reward[]=room.stealEnabled?['bonus40','bonus70','boost','hint','shield','steal']:['bonus40','bonus70','boost','hint'];
      p.turn.rewards=shuffled(pool).slice(0,3);
      if(room.course&&p.racer){
        p.racer.e=Math.min(100,p.racer.e+CHARGE);p.turn.rewards=[];
        let text='에너지 +45 충전 (최대 100)';let type:Reward='energy';
        if(randomInt(100)<30){const available:Item[]=room.stealEnabled?items:['boost','hint'];type=available[randomInt(available.length)];if(p.inventory[type]<3){p.inventory[type]++;text+=` · ${itemNames[type]} 획득!`;}else{p.score+=40;text+=' · 가방이 가득 차서 +40점!';}}
        p.turn.reward={type,text};notice(p,text);
      }
      if(room.raceGoal&&!room.course){p.solvedIds=[...new Set([...(p.solvedIds||[]),q.id])];if(p.solvedIds.length>=room.raceGoal){const winners=room.finishers||[],place=winners.length<3?winners.length+1:0,bonus=place?room.raceGoal*[50,30,15][place-1]:0;p.finish={place,bonus};p.turn.finishBonus=bonus;p.score+=bonus;if(place)room.finishers=[...winners,p.id];notice(p,place?`최종 결승 ${place}등! 추가 +${bonus}점!`:'모든 문제 해결! 최종 결승선에 도착했어요.');}}

    }
    else {p.turn.wrongChoices=[...(p.turn.wrongChoices||[]),p.turn.selected];p.turn.nonce=randomUUID();}
    p.stats[q.id]=s;return;
  }
  if(action==='reward'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&p.turn.correct&&!p.turn.reward,'받을 수 있는 보상이 없습니다.',409);
    assert(Number.isInteger(body.chest)&&Number(body.chest)>=0&&Number(body.chest)<3,'상자를 하나 골라 주세요.');
    const type=p.turn.rewards[Number(body.chest)];assert(type,'상자를 다시 확인해 주세요.');let text='';
    if(type==='bonus40'||type==='bonus70'){const points=type==='bonus40'?40:70;p.score+=points;text=`보너스 +${points}점`;}
    else if(type==='energy'||type==='gear'){text='에너지 충전';}
    else if(p.inventory[type]>=3){p.score+=40;text=`${itemNames[type]} 가방이 가득 차서 +40점`;}
    else{p.inventory[type]++;text=`${itemNames[type]} 아이템 +1`;}
    p.turn.reward={type,text};p.turn.rewards=[];return;
  }
  if(action==='next'){
    assert(body.nonce===p.turn.nonce&&p.turn.answered&&(!p.turn.correct||p.turn.reward),'해설과 보상을 확인해 주세요.',409);
    if(!p.deck.length){p.deck=deckFor(room,p.solvedIds);if(p.deck[0]===p.turn.id)p.deck.push(p.deck.shift()!);}
    p.turn=turnFor(p.deck.shift()!);return;
  }
  assert(action==='item','지원하지 않는 동작입니다.');
  assert(body.nonce===p.turn.nonce,'문제가 바뀌었습니다. 현재 문제에서 다시 사용해 주세요.',409);
  const item=body.item as Item;assert(items.includes(item)&&p.inventory[item]>0,'이 아이템이 없습니다.');
  if(item==='boost'){assert(!p.boostActive,'점수 2배가 이미 준비되어 있습니다.');p.boostActive=true;notice(p,'다음 정답은 200점! 틀려도 효과는 남아 있어요.');}
  if(item==='hint'){const candidates=[0,1,2,3].filter(i=>p.turn.order[i]!==q.answer&&!(p.turn.wrongChoices||[]).includes(i));assert(body.nonce===p.turn.nonce&&!p.turn.answered&&!p.turn.eliminated.length&&candidates.length,'이 문제에는 보기 줄이기를 사용할 수 없습니다.');p.turn.eliminated=shuffled(candidates).slice(0,2);notice(p,`오답 보기 ${p.turn.eliminated.length}개를 지웠어요. 남은 보기에서 골라 보세요.`);}
  if(item==='shield'){assert(room.stealEnabled,'이 게임에서는 점수 가져오기를 사용하지 않습니다.');assert(!p.shieldActive,'방어막이 이미 켜져 있습니다.');p.shieldActive=true;notice(p,'다음 점수 가져오기를 한 번 막아 줍니다.');}
  if(item==='steal'){
    assert(room.stealEnabled,'이 게임에서는 점수 가져오기를 사용하지 않습니다.');
    assert(target&&!target.removed&&target.id!==p.id&&target.score>p.score&&target.score>0&&!target.finish,'나보다 점수가 높고 점수가 남아 있는 친구를 골라 주세요.',409);
    assert(target.protectedUntil<=Date.now(),'이 친구는 잠시 보호 중입니다. 다른 친구를 골라 주세요.',409);
    if(target.shieldActive){target.shieldActive=false;notice(target,'방어막이 점수 가져오기를 막았어요!');notice(p,`${target.nickname}의 방어막이 막았어요.`);}
    else{const points=Math.min(randomInt(5,16)*10,target.score);target.score-=points;p.score+=points;target.protectedUntil=Date.now()+30000;notice(target,`친구가 ${points}점을 가져갔어요. 30초 동안 보호됩니다.`);notice(p,`${target.nickname}에게서 +${points}점!`);}
    target.version++;
  }
  p.inventory[item]--;
}

