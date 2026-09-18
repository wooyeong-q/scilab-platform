const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(fetch){
 const node={};const navigator={onLine:true};
 const box={window:{},navigator,document:{getElementById:()=>node},AbortController,Date,Math,fetch,setTimeout:(fn,ms)=>{if(ms<12000)queueMicrotask(fn);return 1},clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync('public/labs/star-escape/network.js','utf8'),box);
 return {api:box.window.StarEscapeNetwork,node,navigator};
}
test('offline prevents requests; recovery resumes polling and clears status',async()=>{
 let calls=0;const {api,node,navigator}=setup(async()=>{calls++;return{ok:true,json:async()=>({ok:true})}});
 navigator.onLine=false;await assert.rejects(api.request('/state'));assert.equal(calls,0);assert.equal(api.canPoll(),false);
 navigator.onLine=true;api.resume();await api.request('/state');assert.equal(api.canPoll(),true);assert.equal(node.hidden,true);
});
test('failed reads back off and HTTP authentication errors do not retry',async()=>{
 let calls=0;const {api}=setup(async()=>{calls++;throw Error('network')});
 await assert.rejects(api.request('/state'));assert.equal(calls,2);assert.equal(api.canPoll(),false);
 calls=0;const auth=setup(async()=>{calls++;return{ok:false,status:401,json:async()=>({error:'expired'})}});
 await assert.rejects(auth.api.request('/state'),{status:401});assert.equal(calls,1);
});
test('lost mutation response never duplicates teacher start or player submission',async()=>{
 let calls=0;const {api}=setup(async()=>{calls++;throw Error('lost response')});
 await assert.rejects(api.request('/answers',{method:'POST'}));assert.equal(calls,1);
});
