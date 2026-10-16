import { EventEmitter } from 'node:events';
import { authorizeQuizStream,type QuizIdentity } from './quiz-rally';
import { serveQuizSocket,type MotionPeer } from './quiz-rally-socket';

// HTTP streaming owns an authenticated simulation and cross-instance bus,
// including revocation, backpressure and resource cleanup.
export async function quizMotionStream(request:Request,code:string,identity:QuizIdentity){
  const access=await authorizeQuizStream(code,identity);
  if(access.status==='ended')return new Response(null,{status:204});
  const encoder=new TextEncoder();let closed=false,controller:ReadableStreamDefaultController<Uint8Array>|undefined;
  let expiry:ReturnType<typeof setTimeout>|undefined;
  const peer=new EventEmitter() as EventEmitter & {readyState:number;bufferedAmount:number;send:(text:string)=>void;close:()=>void};
  peer.readyState=1;peer.bufferedAmount=0;
  peer.close=()=>{if(closed)return;closed=true;peer.readyState=3;clearTimeout(expiry);request.signal.removeEventListener('abort',peer.close);try{controller?.close();}catch{}peer.emit('close');};
  peer.send=(text:string)=>{if(closed||!controller)return;if((controller.desiredSize??0)<0){peer.close();return;}
    const event=JSON.parse(text);if(event.type==='ready'){event.motion=true;event.transport='stream';}
    controller.enqueue(encoder.encode('data: '+JSON.stringify(event)+'\n\n'));
  };
  request.signal.addEventListener('abort',peer.close,{once:true});
  const body=new ReadableStream<Uint8Array>({start(c){
    controller=c;if(request.signal.aborted){peer.close();return;}
    serveQuizSocket(peer as unknown as MotionPeer,access.code,new URL(request.url).searchParams.get('world')==='1');
    // Credentials remain on the server; the browser authenticates this stream
    // with the existing HTTP headers, not URL parameters or a socket message.
    peer.emit('message',JSON.stringify({type:'auth',...identity}));
    // Spread routine handovers over half a minute instead of reconnecting the
    // whole class every 45 seconds. Access is still rechecked every 15 seconds.
    expiry=setTimeout(peer.close,210000+Math.random()*30000);
  },cancel(){peer.close();}},{highWaterMark:64});
  return new Response(body,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'}});
}
