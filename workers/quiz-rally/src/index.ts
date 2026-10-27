import { timingSafeEqual } from 'node:crypto';
import { QuizArenaRoom, ROOM_FRAME_MS, ROOM_TICK_MS, type RoomRecord } from '../../../lib/quiz-rally-room';
import { QuizError } from '../../../lib/quiz-rally-errors';
import type { QuizIdentity } from '../../../lib/quiz-rally-rules';
import type { Runner } from '../../../lib/quiz-rally-arena';

interface Env {
  QUIZ_ROOMS: DurableObjectNamespace;
  QUIZ_REALTIME_SECRET: string;
  APP_ORIGIN: string;
}
type Attachment = {who?:QuizIdentity;createdAt:number;playerDeltas?:boolean};
type PlayerSave = {revision:number;savedAt:number;player:RoomRecord['state']['players'][string]};
type EffectSave = {revision:number;savedAt:number;effects:RoomRecord['state']['arenaEffects'];arenaRevision:number};
type CheckpointSync = {revision:number;attempts:number;nextAt:number};
const CHECKPOINT_INTERVAL_MS=60000;
const IDLE_SYNC_ATTEMPTS=4;
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function secret(request:Request, env:Env) {
  const actual=Buffer.from(request.headers.get('authorization')||''), expected=Buffer.from('Bearer '+env.QUIZ_REALTIME_SECRET);
  return !!env.QUIZ_REALTIME_SECRET && env.QUIZ_REALTIME_SECRET.length>=32 && actual.length===expected.length && timingSafeEqual(actual,expected);
}
function failure(error:unknown) {return {error:error instanceof QuizError?error.message:'실시간 서버에 다시 연결해 주세요.',status:error instanceof QuizError?error.status:503};}
async function body(request:Request) {
  if(Number(request.headers.get('content-length')||0)>4300000)throw new QuizError('요청이 너무 큽니다.',413);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>4300000)throw new QuizError('요청이 너무 큽니다.',413);
  return JSON.parse(raw);
}

export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const url=new URL(request.url);
    if(url.pathname==='/health')return json({ok:true,protocol:1,tickMs:ROOM_TICK_MS,storage:'sqlite',performanceVersion:2,courseVersion:4,idleVersion:1});
    const match=/^\/rooms\/([A-HJ-NP-Z2-9]{6})\/([a-f0-9-]{36})\/(socket|init|rpc)$/.exec(url.pathname);
    if(!match)return json({error:'경기 주소를 확인해 주세요.'},404);
    if(match[3]==='socket') {
      if(request.headers.get('origin')!==env.APP_ORIGIN)return json({error:'같은 사이트에서 참여해 주세요.'},403);
      if(request.method!=='GET'||request.headers.get('upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket 연결이 필요합니다.'},426);
    } else if(request.method!=='POST'||!secret(request,env)) return json({error:'접근 정보를 확인해 주세요.'},403);
    return env.QUIZ_ROOMS.get(env.QUIZ_ROOMS.idFromName(match[1]+':'+match[2]),{locationHint:'apac'}).fetch(request);
  }
} satisfies ExportedHandler<Env>;

export class QuizRoom {
  private game?:QuizArenaRoom;
  private websocketUrl='';
  private timer?:ReturnType<typeof setInterval>;
  private frameAt=0;
  private saveAt=0;
  private syncedRevision=-1;
  private syncing=false;
  private nextSync=0;
  private syncAttempts=0;
  private previous=new Map<string,Runner>();
  private serial:Promise<unknown>=Promise.resolve();
  private tickQueued=false;
  private dirtyPlayers=new Set<string>();
  private legacyDirty=false;
  private legacySnapshotAt=0;
  private alarmAt=0;
  private rates=new Map<WebSocket,{at:number;tokens:number}>();
  private authenticationTimers=new Map<WebSocket,ReturnType<typeof setTimeout>>();

  constructor(private ctx:DurableObjectState,private env:Env) {
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}','{"type":"pong"}'));
    ctx.blockConcurrencyWhile(async()=>{
      const saved=await this.readChunks<RoomRecord>('room');
      if(saved){
        const sync=await ctx.storage.get<CheckpointSync>('checkpoint-sync');
        this.syncedRevision=sync?.revision??-1;
        this.syncAttempts=sync?.attempts??0;
        this.nextSync=sync?.nextAt??0;
        this.alarmAt=await ctx.storage.getAlarm()??0;
        saved.question_bank=(await this.readChunks<RoomRecord['question_bank']>('questions'))??null;
        const baseRevision=saved.revision;
        const patches=await Promise.all(Object.keys(saved.state.players).map(id=>this.readChunks<PlayerSave>('player:'+id)));
        for(const patch of patches)if(patch&&patch.revision>baseRevision){
          saved.state.players[patch.player.id]=patch.player;
          saved.revision=Math.max(saved.revision,patch.revision);saved.savedAt=Math.max(saved.savedAt,patch.savedAt);
        }
        const effects=await this.readChunks<EffectSave>('effects');
        if(effects&&effects.revision>baseRevision){saved.state.arenaEffects=effects.effects;saved.state.arenaRevision=effects.arenaRevision;saved.revision=Math.max(saved.revision,effects.revision);saved.savedAt=Math.max(saved.savedAt,effects.savedAt);}
        this.game=new QuizArenaRoom(saved); const recovered=this.game.recover();
        this.websocketUrl=(await ctx.storage.get<string>('url'))!;
        if(recovered)await this.save();
      }
    });
  }
  private enqueue<T>(fn:()=>Promise<T>|T):Promise<T> {
    const task=this.serial.then(fn); this.serial=task.catch(()=>{}); return task;
  }
  private async readChunks<T>(name:string):Promise<T|undefined> {
    const count=await this.ctx.storage.get<number>(name+':count');if(count===undefined)return;
    const keys=Array.from({length:count},(_,i)=>name+':'+i), values=await this.ctx.storage.get<string>(keys);
    return JSON.parse(keys.map(key=>values.get(key)!).join(''));
  }
  private chunkValues(name:string,value:unknown,values:Record<string,unknown>) {
    // Bounded keys also support large teacher question banks without exceeding
    // the per-value limit. One multi-key put commits the manifest and chunks.
    const raw=JSON.stringify(value), chunkSize=32000;
    const count=Math.ceil(raw.length/chunkSize);if(count>120)throw new QuizError('경기 저장 용량이 너무 큽니다.',413);
    values[name+':count']=count;
    for(let i=0;i<count;i++)values[name+':'+i]=raw.slice(i*chunkSize,(i+1)*chunkSize);
  }
  private async writeChunks(name:string,value:unknown){const values:Record<string,unknown>={};this.chunkValues(name,value,values);await this.ctx.storage.put(values);}
  private async save() {
    if(!this.game)return;
    const saved=this.game.checkpoint();saved.question_bank=null;
    await this.writeChunks('room',saved);this.saveAt=Date.now();
  }
  private async savePlayer(who:QuizIdentity,action:unknown){
    const game=this.game!,stamp={revision:game.record.revision,savedAt:Date.now()};
    // Persist the action and its deduplication IDs before acknowledgement.
    // Movement checkpoints stay bounded; no whole-class clone/write per answer.
    // One multi-key write keeps item consumption and its effect atomic.
    const values:Record<string,unknown>={};
    this.chunkValues('player:'+who.playerId,{...stamp,player:game.room.players[who.playerId]},values);
    if(action==='arena-use')this.chunkValues('effects',{...stamp,effects:game.room.arenaEffects,arenaRevision:game.room.arenaRevision||0},values);
    await this.ctx.storage.put(values);
    this.dirtyPlayers.add(who.playerId);this.legacyDirty=true;
  }
  private async persistAction(who:QuizIdentity,action:unknown){
    if(who.role==='student'&&this.game!.room.status==='running'&&action!=='join'&&action!=='customize')await this.savePlayer(who,action);
    else{await this.save();this.broadcastSnapshots();await this.armAlarm();}
  }
  private members(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===WebSocket.OPEN&&!!(ws.deserializeAttachment() as Attachment)?.who);}
  private clearAuthenticationTimer(ws:WebSocket){clearTimeout(this.authenticationTimers.get(ws));this.authenticationTimers.delete(ws);}
  private send(ws:WebSocket,value:unknown){try{ws.send(JSON.stringify(value));}catch{try{ws.close(1011,'Reconnect');}catch{}}}
  private snapshot(who:QuizIdentity){return this.game!.snapshot(who,this.websocketUrl);}
  private broadcastSnapshots(legacyOnly=false){
    if(!legacyOnly)this.dirtyPlayers.clear();
    this.legacyDirty=false;this.legacySnapshotAt=Date.now();
    for(const ws of this.members()){
      const attachment=ws.deserializeAttachment() as Attachment;if(legacyOnly&&attachment.playerDeltas)continue;
      const who=attachment.who!;
      try{this.send(ws,{type:'snapshot',data:this.snapshot(who)});}catch{ws.close(1008,'Participation ended');}
    }
  }
  private frames(){
    if(!this.game)return;
    const changes=[...this.dirtyPlayers].map(id=>this.game!.room.players[id]).filter(p=>p&&!p.removed).map(p=>({id:p.id,version:p.version,correct:p.correct,attempted:p.attempted,activity:p.turn.correct?'ready':'solving',runner:{...p.runner!,boxes:[],boxReadyAt:{},hits:[],usedEffects:[]}}));
    const frame={...this.game.world(this.previous),changes};this.dirtyPlayers.clear();
    for(const ws of this.members()){
      const who=(ws.deserializeAttachment() as Attachment).who!, p=this.game.room.players[who.playerId];
      this.send(ws,{...frame,self:p&&!p.removed?{runner:p.runner,version:p.version}:null});
    }
  }
  private run(){
    const active=this.game?.room.status==='running'&&this.members().length>0;
    if(!active){if(this.timer)clearInterval(this.timer);this.timer=undefined;return;}
    if(this.timer)return;
    this.timer=setInterval(()=>{
      if(this.tickQueued)return;this.tickQueued=true;
      void this.enqueue(async()=>{
        if(!this.game)return;
        // A stale/closed socket must never leave the simulation interval alive.
        if(!this.members().length){await this.sleepWhenEmpty();return;}
        if(this.game.room.status!=='running'){this.run();return;}
        const changed=this.game.tick(),now=Date.now();
        if(changed){await this.save();this.broadcastSnapshots();this.run();this.queueCheckpoint(this.game.room.endsAt!==null&&this.game.room.endsAt<=now);await this.armAlarm();}
        if(now-this.frameAt>=ROOM_FRAME_MS){this.frameAt=now;this.frames();}
        if(this.legacyDirty&&now-this.legacySnapshotAt>=1000)this.broadcastSnapshots(true);
        if(now-this.saveAt>=5000)await this.save();
        if(now>=this.nextSync)this.queueCheckpoint();
      }).catch(()=>{
        // Stop the race instead of acknowledging work that cannot be saved.
        this.game?.recover();this.broadcastSnapshots();this.run();
      }).finally(()=>{this.tickQueued=false;});
    },ROOM_TICK_MS);
  }
  private async persistSync(){
    await this.ctx.storage.put('checkpoint-sync',{revision:this.syncedRevision,attempts:this.syncAttempts,nextAt:this.nextSync} satisfies CheckpointSync);
  }
  private queueCheckpoint(force=false){
    if(!this.game||this.syncing||!force&&Date.now()<this.nextSync||this.syncedRevision>=this.game.record.revision)return;
    this.syncAttempts++;
    this.nextSync=Date.now()+CHECKPOINT_INTERVAL_MS*Math.min(15,5**(this.syncAttempts-1));
    this.syncing=true;
    const saved=this.game.checkpoint();
    this.ctx.waitUntil((async()=>{
      let acknowledged=false;
      try{
        // Retry budgets and acknowledgements must survive hibernation, too.
        await this.persistSync();
        const response=await fetch(this.env.APP_ORIGIN+'/api/labs/quiz-rally/realtime/checkpoint',{
          method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.env.QUIZ_REALTIME_SECRET},
          body:JSON.stringify({code:saved.code,generation:saved.state.realtime!.generation,revision:saved.revision,state:saved.state}),
          signal:AbortSignal.timeout(8000)
        });
        acknowledged=response.ok;
      }catch{}
      await this.enqueue(async()=>{
        if(acknowledged){this.syncedRevision=Math.max(this.syncedRevision,saved.revision);this.syncAttempts=0;}
        this.syncing=false;
        await this.persistSync();
        await this.armAlarm();
      });
    })());
  }
  private async armAlarm(){
    if(!this.game)return;
    let at=Date.parse(this.game.record.expires_at);
    if(this.game.room.status==='running'&&this.members().length&&this.game.room.endsAt!==null)at=Math.min(at,this.game.room.endsAt);
    // Synced idle rooms have only one expiry alarm. Failed saves get a bounded
    // 1/5/15-minute backoff; durable local records remain available on reconnect.
    if(this.syncedRevision<this.game.record.revision&&this.syncAttempts<IDLE_SYNC_ATTEMPTS){
      at=Math.min(at,Math.max(Date.now()+1000,this.nextSync||Date.now()+CHECKPOINT_INTERVAL_MS));
    }
    if(this.alarmAt===at)return;
    await this.ctx.storage.setAlarm(at);this.alarmAt=at;
  }
  private async sleepWhenEmpty(){
    if(!this.game||this.members().length)return;
    if(this.game.room.status==='running'){
      this.game.tick();
      this.game.record.savedAt=Date.now();
      this.game.recover();
    }
    this.run();
    await this.save();
    this.queueCheckpoint(true);
    await this.armAlarm();
  }
  async fetch(request:Request):Promise<Response>{
    return this.enqueue(async()=>{
      try{
        const url=new URL(request.url),action=url.pathname.split('/').at(-1);
        if(action==='init'){
          if(!secret(request,this.env))throw new QuizError('접근 정보를 확인해 주세요.',403);
          const record=await body(request) as RoomRecord;
          if(!this.game){
            this.game=new QuizArenaRoom(record);
            this.websocketUrl=url.origin.replace(/^http/,'ws')+url.pathname.replace(/init$/,'socket');
            await this.writeChunks('questions',record.question_bank);
            await this.ctx.storage.put('url',this.websocketUrl);await this.save();
            // Vercel has committed this initial record before calling init.
            this.syncedRevision=record.revision;await this.persistSync();await this.armAlarm();
          }
          return json({ok:true});
        }
        if(!this.game)throw new QuizError('실시간 경기 정보를 찾을 수 없습니다. 새 게임방을 만들어 주세요.',404);
        if(action==='socket'){
          if(this.ctx.getWebSockets().length>=64)throw new QuizError('연결이 많습니다. 잠시 후 다시 연결해 주세요.',429);
          const pair=new WebSocketPair(),[client,server]=Object.values(pair);
          server.serializeAttachment({createdAt:Date.now()} satisfies Attachment);
          this.ctx.acceptWebSocket(server);
          this.authenticationTimers.set(server,setTimeout(()=>{this.authenticationTimers.delete(server);if(!(server.deserializeAttachment() as Attachment)?.who)try{server.close(1008,'Authentication required');}catch{}},10000));
          return new Response(null,{status:101,webSocket:client});
        }
        if(action!=='rpc'||!secret(request,this.env))throw new QuizError('접근 정보를 확인해 주세요.',403);
        const data=await body(request),who=data.identity as QuizIdentity;
        const changed=this.game.tick();
        if(changed){await this.save();this.broadcastSnapshots();this.run();}
        if(data.body?.action==='join')this.game.join(who,data.body);
        else if(data.body)this.game.act(who,data.body);
        const result=this.snapshot(who);
        if(data.body&&data.body.action!=='arena-input'){await this.persistAction(who,data.body.action);this.queueCheckpoint(this.game.room.status==='ended'||data.body.action==='pause');}
        else if(data.body){if(Date.now()-this.saveAt>=5000)await this.save();this.queueCheckpoint();}
        else this.queueCheckpoint();
        this.run();await this.armAlarm();return json(result);
      }catch(error){const e=failure(error);return json({error:e.error},e.status);}
    });
  }
  async webSocketMessage(ws:WebSocket,message:string|ArrayBuffer){
    return this.enqueue(async()=>{
      let id:unknown;
      try{
        if(typeof message!=='string'||message.length>16000)throw new QuizError('요청이 너무 큽니다.',413);
        const now=Date.now(), rate=this.rates.get(ws)||{at:now,tokens:60};
        rate.tokens=Math.min(60,rate.tokens+(now-rate.at)/1000*20)-1;rate.at=now;this.rates.set(ws,rate);
        if(rate.tokens<0){ws.close(1008,'Too many messages');return;}
        const data=JSON.parse(message);id=data.id;
        if(id!==undefined&&(typeof id!=='string'||id.length>64))throw new QuizError('요청 정보를 확인해 주세요.');
        const attachment=ws.deserializeAttachment() as Attachment;
        if(!attachment.who){
          if(data.type!=='auth'||now-attachment.createdAt>10000)throw new QuizError('참여 정보를 확인해 주세요.',403);
          const who=data.identity as QuizIdentity;this.game!.authorize(who);
          if(who.role==='public')throw new QuizError('참여 정보가 필요합니다.',403);
          // One live controller per identity; another browser cannot keep an
          // old held key active after this device takes over.
          for(const other of this.members()){
            const prior=(other.deserializeAttachment() as Attachment).who!;
            if(other!==ws&&prior.role===who.role&&prior.playerId===who.playerId)other.close(4001,'Connected elsewhere');
          }
          ws.serializeAttachment({...attachment,who,playerDeltas:data.playerDeltas===1});
          this.clearAuthenticationTimer(ws);
          this.send(ws,{type:'ready',motion:true,world:true});
          this.send(ws,{type:'snapshot',data:this.snapshot(who)});this.run();this.queueCheckpoint();await this.armAlarm();return;
        }
        const who=attachment.who;this.game!.authorize(who);
        const changed=this.game!.tick();
        if(changed){await this.save();this.broadcastSnapshots();this.run();}
        if(data.type==='input'){
          this.game!.input(who,data.inputs,data.roomRevision);
          this.run();return;
        }
        if(data.type==='request'){
          if(data.body)this.game!.act(who,data.body);
          const result=this.snapshot(who);
          if(data.body&&data.body.action!=='arena-input'){await this.persistAction(who,data.body.action);if(this.game!.room.status==='ended'||data.body.action==='pause')this.queueCheckpoint(true);}
          else if(data.body&&Date.now()-this.saveAt>=5000)await this.save();
          this.send(ws,{type:'response',id,data:result});this.run();return;
        }
        if(data.type==='ping'){this.send(ws,{type:'pong'});return;}
        throw new QuizError('지원하지 않는 통신입니다.');
      }catch(error){const e=failure(error);this.send(ws,{type:'error',id,...e});if(e.status===403)ws.close(1008,'Access denied');}
    });
  }
  async webSocketClose(ws:WebSocket){
    return this.enqueue(async()=>{
      this.rates.delete(ws);
      this.clearAuthenticationTimer(ws);
      const who=(ws.deserializeAttachment() as Attachment)?.who;
      const peers=this.members().filter(other=>other!==ws);
      if(who?.role==='student'&&this.game?.room.status==='running'&&!peers.some(other=>(other.deserializeAttachment() as Attachment).who?.playerId===who.playerId))this.game.stopInputs(who.playerId);
      if(!peers.length)await this.sleepWhenEmpty();
    });
  }
  webSocketError(ws:WebSocket){try{ws.close(1011,'Reconnect');}catch{}return this.webSocketClose(ws);}
  async alarm(){
    return this.enqueue(async()=>{
      if(!this.game)return;
      this.alarmAt=0;
      if(Date.parse(this.game.record.expires_at)<=Date.now()){
        if(this.timer)clearInterval(this.timer);this.timer=undefined;
        for(const timer of this.authenticationTimers.values())clearTimeout(timer);this.authenticationTimers.clear();
        for(const ws of this.ctx.getWebSockets())ws.close(1000,'Room expired');
        await this.ctx.storage.deleteAll();this.game=undefined;return;
      }
      if(this.game.tick()){await this.save();this.broadcastSnapshots();this.run();}
      if(this.syncAttempts<IDLE_SYNC_ATTEMPTS)this.queueCheckpoint();
      await this.armAlarm();
    });
  }
}
