import { Client } from '@neondatabase/serverless';
import { authorizeQuizStream, QuizError, type QuizIdentity } from './quiz-rally';

// Each listener belongs to one bounded HTTP request. LISTEN requires the
// direct connection, never the transaction pool used for ordinary queries.
export async function quizStream(request:Request,code:string,identity:QuizIdentity){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new QuizError('같은 사이트에서 참여해 주세요.',403);
  const access=await authorizeQuizStream(code,identity);
  if(access.status==='ended')return new Response(null,{status:204});
  const connectionString=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING;
  if(!connectionString)throw new QuizError('실시간 연결을 준비 중입니다.',503);
  const client=new Client({connectionString,connectionTimeoutMillis:8000});
  const channel='quiz_rally_'+access.code.toLowerCase(),encoder=new TextEncoder();
  let closed=false,controller:ReadableStreamDefaultController<Uint8Array>|undefined;
  let heartbeat:ReturnType<typeof setInterval>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
  let checking=false;
  const close=()=>{
    if(closed)return;closed=true;clearInterval(heartbeat);clearTimeout(expiry);
    request.signal.removeEventListener('abort',close);
    try{controller?.close();}catch{}
    void client.end().catch(()=>{});
  };
  const emit=(data:string)=>{
    if(closed||!controller)return;
    // A suspended/slow tab must not accumulate an unbounded class history.
    if((controller.desiredSize??0)<0){close();return;}
    try{controller.enqueue(encoder.encode('data: '+data+'\n\n'));}catch{close();}
  };
  client.on('error',close);client.on('end',close);
  client.on('notification',msg=>{
    if(msg.channel!==channel||!msg.payload)return;
    // Control events are authorization boundaries (e.g. teacher removal).
    // Stop delivering until credentials have been checked again.
    try{const event=JSON.parse(msg.payload);
      if(event.type==='refresh'){
        if(checking)return;checking=true;
        void authorizeQuizStream(access.code,identity).then(current=>{
          if(current.status==='ended'){emit(msg.payload!);close();}
          else emit(msg.payload!);
        }).catch(close).finally(()=>{checking=false;});
      }else if(!checking)emit(msg.payload);
    }catch{}
  });
  request.signal.addEventListener('abort',close,{once:true});
  try{
    await client.connect();
    if(closed||request.signal.aborted){close();return new Response(null,{status:204});}
    await client.query(`LISTEN "${channel}"`);
    // Recheck after LISTEN to cover removal while the connection was opening.
    await authorizeQuizStream(access.code,identity);
  }catch(error){close();throw error;}
  const body=new ReadableStream<Uint8Array>({
    start(c){
      controller=c;if(closed){c.close();return;}
      // The client resyncs after ready; notifications are not a durable log.
      emit(JSON.stringify({type:'ready',code:access.code}));
      heartbeat=setInterval(()=>emit('{"type":"ping"}'),10000);
      // Reauthenticate on each reconnect, before the host request time limit.
      expiry=setTimeout(close,45000+Math.random()*5000);
    },cancel(){close();}
  },{highWaterMark:64});
  return new Response(body,{headers:{
    'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform',
    'X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'
  }});
}
