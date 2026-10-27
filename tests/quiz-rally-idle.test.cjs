const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const schedule=fs.readFileSync('public/labs/quiz-rally/app.js','utf8').match(/^function schedulePoll\(\).*$/m)[0];
function poll(options={}){
 const calls=[],context={identity:{role:'teacher'},code:'ABC234',activeTab:true,snapshot:{arena:{},status:'paused',realtime:{version:1}},live:{authoritative:true,ready:true},refreshWanted:false,failureCount:0,pollTimer:1,poll(){},clearTimeout(){},setTimeout(fn,ms){calls.push(ms);},Math:{...Math,min:Math.min,random:()=>0},...options};
 vm.runInNewContext(schedule+';schedulePoll();',context);return calls;
}
test('connected authoritative rooms do not send periodic snapshot requests while idle or playing',()=>{
 for(const status of ['lobby','running','paused'])assert.deepEqual(poll({snapshot:{arena:{},status,realtime:{version:1}}}),[]);
});
test('explicit refresh and disconnected recovery remain available; legacy rooms keep their polling',()=>{
 assert.deepEqual(poll({refreshWanted:true}),[80]);
 assert.deepEqual(poll({live:{authoritative:true,ready:false}}),[800]);
 assert.deepEqual(poll({live:{authoritative:false,ready:true}}),[3000]);
 assert.deepEqual(poll({activeTab:false,refreshWanted:true}),[]);
});
