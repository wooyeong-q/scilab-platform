(function(root){
  'use strict';
  // One durable FIFO for actions. Retrying the same reference is safe because
  // PostgreSQL commits the unique event and its score changes together.
  function createOutbox({initial=[],persist,send,canSend=()=>true,onResult=()=>{},onError=()=>{}}){
    const pending=initial.map(event=>({...event})),waiting=new Map();let busy=false;
    const id=event=>event.kind+':'+event.reference;
    function enqueue(event){
      const key=id(event);let existing=pending.find(e=>id(e)===key);
      if(!existing){existing={...event};pending.push(existing);persist(pending)}
      const promise=new Promise(resolve=>{const callbacks=waiting.get(key)||[];callbacks.push(resolve);waiting.set(key,callbacks)});
      void flush();return promise;
    }
    async function flush(){
      if(busy||!canSend())return;busy=true;
      try{while(pending.length&&canSend()){
        const event=pending[0];let result;
        try{result=await send(event)}catch(error){onError(error,event);break}
        if(result.retry){onError(new Error(result.error||'연결 복구 후 기록을 다시 저장합니다.'),event);break}
        pending.shift();persist(pending);onResult(result,event);
        for(const resolve of waiting.get(id(event))||[])resolve(result);waiting.delete(id(event));
      }}finally{busy=false}
    }
    return {pending,enqueue,flush,get busy(){return busy}};
  }
  function updatePose(peer,target,now){
    const interval=peer.receivedAt==null?1500:Math.max(300,Math.min(2500,now-peer.receivedAt));
    peer.from=peer.current.slice();peer.target=target;peer.receivedAt=now;peer.duration=interval;
  }
  function samplePose(peer,now){
    const blend=Math.min(1,Math.max(0,(now-peer.receivedAt)/peer.duration));
    for(let i=0;i<3;i++)peer.current[i]=peer.from[i]+(peer.target[i]-peer.from[i])*blend;
    return peer.current;
  }
  const api={createOutbox,updatePose,samplePose};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.GalaxyClassroomSync=api;
})(globalThis);
