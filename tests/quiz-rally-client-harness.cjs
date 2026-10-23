// Runs the shipped input, transport, reconciliation and render-frame code.
// Only the DOM/canvas and network clock are test doubles; probes stay in this VM.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),modules=new Map();
function load(file){
 file=path.resolve(root,file);if(!path.extname(file))file+='.ts';if(modules.has(file))return modules.get(file).exports;
 const m={exports:{}};modules.set(file,m);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',source)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)):require(name),m,m.exports);return m.exports;
}
const {QuizArenaRoom}=load('lib/quiz-rally-room');
function fixture(count=1){
 const token=()=>randomBytes(32).toString('base64url'),teacher={role:'teacher',token:token(),playerId:''};
 const record={code:'ABC234',teacher_key_hash:createHash('sha256').update(teacher.token).digest('hex'),expires_at:new Date(Date.now()+86400000).toISOString(),revision:0,savedAt:Date.now(),question_bank:null,state:{title:'입력 검증',durationSeconds:900,extension:false,stealEnabled:true,status:'lobby',endsAt:null,remainingMs:900000,metaRevision:0,requests:[],players:{},arena:{version:2,length:27000,seed:42,course:4,combat:true,energy:true,supplies:2},arenaEffects:[],arenaRevision:0,finishers:[],realtime:{version:1,generation:randomUUID(),checkpoint:0}}};
 const game=new QuizArenaRoom(record),students=Array.from({length:count},(_,i)=>({role:'student',token:token(),playerId:randomUUID()}));
 students.forEach((who,i)=>game.join(who,{nickname:'검증'+i}));game.act(teacher,{action:'start',requestId:randomUUID()});game.room.endsAt-=4000;game.tick();
 for(const p of Object.values(game.room.players))Object.assign(p.runner,{x:0,y:300});
 return {game,teacher,students};
}
function scheduler(){let now=0,id=0;const tasks=new Map();return {
 get now(){return now;},schedule(fn,ms,repeat=0){const key=++id;tasks.set(key,{at:now+ms,fn,repeat});return key;},cancel:key=>tasks.delete(key),
 run(until){for(let steps=0;steps<100000;steps++){const next=[...tasks].filter(([,v])=>v.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next){now=until;return;}now=next[1].at;tasks.delete(next[0]);if(next[1].repeat)tasks.set(next[0],{...next[1],at:now+next[1].repeat});next[1].fn();}throw Error('Scheduler loop');}
};}
function client(time,who,onPacket,{width=1363,height=850,fps=60,WebSocket:NativeSocket}={}){
 const callbacks={},nodes=new Map(),errors=[],frames=[],closes=[],sockets=[],corrections=[];
 const noop=()=>{},paint=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
 const node=key=>{if(!nodes.has(key))nodes.set(key,{dataset:{},style:{setProperty:noop},classList:{toggle:noop,remove:noop,add:noop},hidden:true,textContent:'',innerHTML:'',isConnected:true,clientWidth:width,clientHeight:height,getContext:()=>paint,setAttribute:noop,removeAttribute:noop,addEventListener:noop,append:noop,focus:noop,showModal(){this.open=true;},close(){this.open=false;},open:false,querySelector:s=>node(key+' '+s),querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture:noop});return nodes.get(key);};
 class Socket{
  static OPEN=1;readyState=0;bufferedAmount=0;
  constructor(){sockets.push(this);time.schedule(()=>{this.readyState=1;this.onopen?.();},0);}
  send(raw){onPacket(this,JSON.parse(raw));}
  receive(value){if(this.readyState===1)this.onmessage?.({data:JSON.stringify(value)});}
  close(code=1000){if(this.readyState===3)return;this.readyState=3;closes.push({at:time.now,code});this.onclose?.({code});}
 }
 const context={window:{addEventListener:(type,fn)=>callbacks['window:'+type]=fn},document:{createElement:tag=>node(tag),body:node('body'),activeElement:{tagName:'CANVAS'},addEventListener:(type,fn)=>callbacks[type]=fn,querySelector:()=>null,hasFocus:()=>true,hidden:false},Image:class{complete=false;},WebSocket:NativeSocket||Socket,devicePixelRatio:1,performance:{now:()=>time.now},Date:{now:()=>time.now+1800000000000},navigator:{userAgent:'test'},console,URL,crypto:{randomUUID},setTimeout:(fn,ms)=>time.schedule(fn,ms),clearTimeout:time.cancel,setInterval:(fn,ms)=>time.schedule(fn,ms,ms),clearInterval:time.cancel,requestAnimationFrame:fn=>time.schedule(()=>{try{fn(time.now);frames.push(context.window.__probe());}catch(e){errors.push({at:time.now,message:e.stack});}},1000/fps),cancelAnimationFrame:time.cancel};
 context.window.quizArenaScene=new Proxy({},{get:()=>noop});context.window.quizArenaFX=new Proxy({},{get:()=>noop});context.window.quizRobot={art:()=>''};context.window.quizCrew={icon:()=>''};
 vm.createContext(context);
 for(const file of ['arena-model.js','arena-motion.js','arena-sync.js','arena-live.js','arena.js']){
  let source=fs.readFileSync(path.join(root,'public/labs/quiz-rally',file),'utf8');
  if(file==='arena.js')source=source.replace(/\}\)\(\);\s*$/,"window.__probe=()=>({at:performance.now(),clock:clock(),local:{...local},shown:{...visual},camera:{x:camX,y:camY},pending:pending.map(e=>({...e})),curve:ownView.vertical?{...ownView.vertical}:null,connected:liveFast,lost:connectionLost});})();");
  vm.runInContext(source,context,{filename:file});
  if(file==='arena-motion.js'){const prototype=context.window.quizArenaMotion.LocalView.prototype,correct=prototype.correct;prototype.correct=function(before,after,changed){const result=correct.call(this,before,after,changed);corrections.push({at:time.now,before,after,changed,vertical:this.vertical?{...this.vertical}:null});return result;};}
 }
 const ui=context.window.quizArena,rootNode=node('root');let snapshot;
 const sync=data=>{snapshot=context.window.quizArenaSync.mergeSnapshot(snapshot,data);if(snapshot)ui.sync(rootNode,snapshot,()=>{},()=>false,()=>'<p>문제</p>');};
 const transport=new context.window.quizArenaLive({event:e=>{try{if(e.type==='snapshot')sync(e.data);else ui.liveMotion(e);}catch(error){errors.push({at:time.now,message:error.stack});throw error;}},status:(...args)=>ui.liveStatus(...args),refresh:noop});
 ui.sendInput=input=>transport.sendInput(input,{roomRevision:snapshot.roomRevision,arenaRevision:snapshot.arenaRevision});
 ui.sendInputs=inputs=>transport.sendInputs(inputs,{roomRevision:snapshot.roomRevision,arenaRevision:snapshot.arenaRevision});
 transport.configure('',who,true,{version:1,url:'wss://test/room'});
 const key=(code,down=true,extra={})=>callbacks[down?'keydown':'keyup']({code,key:code==='Space'?' ':code,repeat:false,shiftKey:false,preventDefault:noop,...extra});
 const pointer=(type,pointerId,kind,x=50,y=26)=>callbacks[type]({pointerId,clientX:x,clientY:y,preventDefault:noop,target:{closest:s=>s===`[data-arena-action="${kind}"]`?{}:kind==='pad'&&s==='[data-arena-pad]'?node('pad'):null}});
 return {context,ui,transport,frames,errors,closes,sockets,key,pointer,sync,corrections,viewport:{width,height}};
}
module.exports={client,scheduler,fixture,load};

