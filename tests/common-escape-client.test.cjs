const {test}=require('node:test'),assert=require('node:assert/strict');
test('join retry resumes the persisted seat after a lost response; full seats clear the pending identity',async()=>{
 const saved=new Map();global.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const {GroupSession}=await import('../public/labs/common-escape/group-client.mjs');
 const headers=[],storageAtRequest=[];let calls=0;
 global.fetch=async(_url,opts)=>{headers.push(opts.headers.authorization);storageAtRequest.push([...saved.values()][0]);if(++calls===1)throw new Error('Lost response');return {ok:true,status:200,json:async()=>({group:{revision:1}})}};
 const client=new GroupSession(()=>{},()=>{}),body={code:'ABCDEFGH',team:1,role:2,name:'학생'};
 await assert.rejects(client.connect('join',body),/Lost/);assert.ok(storageAtRequest[0]);
 const restored=new GroupSession(()=>{},()=>{});await restored.connect('state');restored.pause();
 assert.equal(headers[0],headers[1]);assert.equal(restored.meta.pending,false);
 assert.equal(restored.setData({group:{revision:0}}),false);assert.equal(restored.data.group.revision,1);
 restored.forget();
 global.fetch=async()=>({ok:false,status:409,json:async()=>({error:'이미 참여 중인 자리입니다.'})});
 await assert.rejects(client.connect('join',body),/참여/);assert.equal(client.available,false);
});
