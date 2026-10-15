import { Client } from '@neondatabase/serverless';
import type { WebSocket } from 'ws';
import { getQuizMotionAccess,type QuizIdentity } from './quiz-rally';
import { MotionProjection } from './quiz-rally-motion';
import { QuizWorldFeed } from './quiz-rally-combat';

// Every live socket owns a bounded database session. PostgreSQL fan-out works
// across instances; no sticky routing or process-local room membership.
export type MotionPeer=Pick<WebSocket,'on'|'close'|'send'|'readyState'|'bufferedAmount'>;
export function serveQuizSocket(ws:MotionPeer,code:string,worldMode=false){
  let client:Client|undefined,identity:QuizIdentity|undefined,motion:MotionProjection|undefined;
  let closed=false,authenticating=false,refreshing=false,publishing=false,refreshAgain=false;
  let timer:ReturnType<typeof setInterval>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
  let lastPing=Date.now(),lastAuth=Date.now(),budget=100,budgetAt=Date.now();
  let waitingInputs:unknown[][]=[],authStage='waiting';
  let world:QuizWorldFeed|undefined;
  const authDeadline=setTimeout(()=>{console.warn('Quiz realtime authentication timed out',{stage:authStage});close(1008,'auth timeout: '+authStage);},20000);
  const send=(data:unknown)=>{if(closed||ws.readyState!==1)return;if(ws.bufferedAmount>65536){close(1013);return;}ws.send(JSON.stringify(data));};
  function close(reason=1000,detail=''){
    if(closed)return;closed=true;clearTimeout(authDeadline);clearTimeout(expiry);clearInterval(timer);
    ws.close(reason,detail);void client?.end().catch(()=>{});
  }
  function acceptInputs(values:unknown){
    const now=Date.now();budget=Math.min(100,budget+(now-budgetAt)*.1);budgetAt=now;
    budget-=Array.isArray(values)?values.length:1000;if(budget<0)throw new Error('rate limit');
    if(refreshing){waitingInputs.push(values as unknown[]);if(waitingInputs.reduce((n,a)=>n+(Array.isArray(a)?a.length:1000),0)>96)throw new Error('input backlog');}
    else motion?.inputs(values);
  }
  async function refresh(){
    if(refreshing){refreshAgain=true;return;}if(!identity)return;refreshing=true;
    try{do{refreshAgain=false;const access=await getQuizMotionAccess(code,identity);if(closed)return;
      if(!motion)motion=new MotionProjection(access,identity.playerId);else motion.reset(access);
      lastAuth=Date.now();if(access.status==='ended'){send({type:'refresh'});close();return;}
    }while(refreshAgain);
      const queued=waitingInputs;waitingInputs=[];for(const inputs of queued)motion?.inputs(inputs);
    }finally{refreshing=false;}
  }
  async function tick(){
    if(closed||!motion||!client||refreshing)return;
    if(Date.now()-lastPing>10000){send({type:'ping'});lastPing=Date.now();}
    if(Date.now()-lastAuth>15000){void refresh().catch(()=>close(1008));return;}
    if(publishing||!world)return;
    publishing=true;
    try{await world.tick();if(!worldMode&&identity?.role==='student'){const frame=motion.frame();if(frame)await client.query('SELECT pg_notify($1,$2)',['quiz_rally_'+code.toLowerCase(),JSON.stringify(frame)]);}}
    catch{close(1011);}finally{publishing=false;}
  }
  async function authenticate(value:Record<string,unknown>){
    if(authenticating||identity)throw new Error('duplicate auth');authenticating=true;
    if(value.role!=='student'&&value.role!=='teacher'||typeof value.token!=='string'||typeof value.playerId!=='string')throw new Error('invalid auth');
    identity={role:value.role,token:value.token,playerId:value.playerId};authStage='checking access';await refresh();if(closed)return;
    const connectionString=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING;
    if(!connectionString)throw new Error('no realtime database');
    client=new Client({connectionString,connectionTimeoutMillis:6000,query_timeout:5000});
    client.on('error',()=>close(1011));client.on('end',()=>close());
    client.on('notification',notification=>{
      if(closed||notification.channel!=='quiz_rally_'+code.toLowerCase()||!notification.payload)return;
      try{const event=JSON.parse(notification.payload);
        if(event.type==='refresh'){
          void refresh().then(()=>{if(!closed)send({type:'refresh'});}).catch(()=>close(1008));
        }else if(event.type==='input'&&event.id===identity?.playerId&&motion&&event.roomRevision===motion.access.roomRevision&&event.arenaRevision===motion.access.arenaRevision){
          acceptInputs(event.inputs);
        }else if(event.type==='effects'&&motion){
          if(refreshing||event.roomRevision!==motion.access.roomRevision||event.arenaRevision>motion.access.arenaRevision+1){
            void refresh().then(()=>{if(!closed)send({type:'refresh'});}).catch(()=>close(1008));
          }else if(event.arenaRevision===motion.access.arenaRevision+1){
            motion.effects(event.delta,event.arenaRevision);
            if(event.id===identity?.playerId)motion.ack(event.runner,event.version);
            send(event);
          }
        }else if(!refreshing&&event.type==='motion'){
          if(event.id===identity?.playerId&&motion&&event.roomRevision===motion.access.roomRevision&&event.arenaRevision===motion.access.arenaRevision)motion.ack(event.runner,event.version);
          send(event);
        }else if(!refreshing&&event.type==='world'&&worldMode)send(event);
        else if(!refreshing&&event.type==='frame'&&!worldMode&&event.id!==identity?.playerId)send(event);
      }catch{close(1011);}
    });
    authStage='connecting database';await client.connect();if(closed){await client.end();return;}
    authStage='subscribing';await client.query(`LISTEN "quiz_rally_${code.toLowerCase()}"`);authStage='rechecking access';await refresh();if(closed)return;
    world=new QuizWorldFeed(code,(statement,params)=>client!.query(statement,params));
    clearTimeout(authDeadline);authenticating=false;send({type:'ready',code,transport:'websocket',world:worldMode});
    timer=setInterval(()=>{void tick().catch(()=>close(1011));},100);
    expiry=setTimeout(()=>close(1012),240000+Math.random()*10000);
  }
  ws.on('close',()=>close());ws.on('error',()=>close(1011));
  ws.on('message',raw=>{
    if(closed)return;try{
      const text=raw.toString();if(Buffer.byteLength(text)>4096)throw new Error('large message');
      const value=JSON.parse(text);
      if(value.type==='auth'){void authenticate(value).catch(()=>{console.warn('Quiz realtime authentication failed',{stage:authStage});close(1008);});return;}
      if(!motion||authenticating&&!timer||!identity)throw new Error('not ready');
      if(value.type!=='input'||identity.role!=='student')throw new Error('invalid message');
      acceptInputs(value.inputs);
    }catch{close(1008);}
  });
  return close;
}
