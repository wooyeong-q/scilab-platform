const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/labs/quiz-rally/audio.js'),'utf8');
function fixture(options={}){
 let now=1000,created=0;const callbacks={},contexts=[],settings=options.settings||new Map();
 const button={attributes:{},disabled:false,innerHTML:'',setAttribute(k,v){this.attributes[k]=v;}};
 class Param{value=0;events=[];setValueAtTime(value,at){this.events.push({value,at});}exponentialRampToValueAtTime(value,at){this.events.push({value,at});}}
 class Gain{gain=new Param();disconnected=false;connect(){}disconnect(){this.disconnected=true;}}
 class Osc{frequency=new Param();disconnected=false;connect(){}disconnect(){this.disconnected=true;}start(at){this.startAt=at;}stop(at){this.stopAt=at;if(at===undefined)this.stopped=true;}}
 class Context{
  constructor(){created++;if(options.throwConstructor)throw Error('audio unavailable');this.state=options.suspended?'suspended':'running';this.currentTime=1;this.destination={};this.oscillators=[];this.gains=[];contexts.push(this);}
  createGain(){const gain=new Gain();this.gains.push(gain);return gain;}
  createOscillator(){if(options.throwOscillator)throw Error('audio node unavailable');const osc=new Osc();this.oscillators.push(osc);return osc;}
  resume(){if(options.rejectResume)return Promise.reject(Error('autoplay blocked'));this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
 }
 const document={hidden:false,querySelectorAll:()=>[button],addEventListener:(type,fn)=>{(callbacks[type]??=[]).push(fn);}};
 const env={window:{addEventListener:(type,fn)=>callbacks['window:'+type]=[fn]},document,performance:{now:()=>now},localStorage:{getItem:k=>{if(options.storageDenied)throw Error('storage denied');return settings.get(k)||null;},setItem:(k,v)=>{if(options.storageDenied)throw Error('storage denied');settings.set(k,v);}},console};
 if(!options.unsupported)env.window[options.webkit?'webkitAudioContext':'AudioContext']=Context;
 vm.runInNewContext(source,env,{filename:'audio.js'});
 function emit(type,extra={}){const event={type,isTrusted:true,target:{closest:()=>null},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};for(const fn of callbacks[type]||[])fn(event);return event;}
 const gesture=()=>emit('pointerdown'),toggle=()=>emit('click',{target:{closest:()=>button}});
 const count=()=>contexts.reduce((n,c)=>n+c.oscillators.length,0),active=()=>contexts.flatMap(c=>c.oscillators).filter(o=>!o.disconnected&&!o.stopped).length;
 const endAll=()=>{for(const c of contexts)for(const osc of c.oscillators)if(!osc.disconnected)osc.onended?.();};
 return {audio:env.window.quizAudio,button,contexts,settings,document,emit,gesture,toggle,count,active,endAll,advance(ms){now+=ms;},created:()=>created};
}
test('audio is lazy, uses one context and does not start without a user gesture',()=>{
 const f=fixture();assert.equal(f.created(),0);assert.equal(f.audio.play('jump'),false);f.gesture();f.gesture();assert.equal(f.created(),1);assert.equal(f.audio.play('jump'),true);assert.equal(f.count(),1);assert.equal(f.contexts[0].gains[0].gain.value,.23);
});
test('muting stops every voice, persists the preference and unmuting reuses the context',()=>{
 const f=fixture();f.gesture();f.audio.play('finish');assert.equal(f.active(),4);f.toggle();assert.equal(f.active(),0);assert.equal(f.audio.play('hit'),false);assert.equal(f.button.attributes['aria-pressed'],'true');assert.equal(f.settings.get('quiz-rally:sound-muted'),'1');
 const next=fixture({settings:f.settings});next.gesture();assert.equal(next.created(),0);f.toggle();assert.equal(f.created(),1);assert.equal(f.button.attributes['aria-pressed'],'false');assert(f.audio.button().includes('효과음 끄기'));
});
test('all cue bursts and priority cues stay below the six-oscillator cap',()=>{
 const f=fixture();f.gesture();for(let i=0;i<200;i++){f.audio.play(['jump','dash','correct','item','hit','fall','finish','start'][i%8]);assert(f.active()<=6);f.advance(80);}f.endAll();assert.equal(f.active(),0);
});
test('the same cue cannot flood the audio graph on consecutive frames',()=>{
 const f=fixture();f.gesture();for(let i=0;i<60;i++)f.audio.play('jump');assert.equal(f.count(),1);f.endAll();f.advance(700);assert.equal(f.audio.play('jump'),true);assert.equal(f.count(),2);
});
test('quiet runner frames create no nodes, timers, network calls or additional contexts',()=>{
 const f=fixture();f.gesture();const r={jumpAt:-2000,stunUntil:0,falls:0,vz:0};for(let i=0;i<10000;i++)f.audio.runner('ABC234','me',r,4000+i*16,false);assert.equal(f.count(),0);assert.equal(f.created(),1);
});
test('accepted takeoff, dash, hit and fall each make one cue, including stale pose replays',()=>{
 const f=fixture();f.gesture();let r={jumpAt:-2000,stunUntil:0,falls:0,vz:0};f.audio.runner('ABC234','me',r,4000,false);r={...r,jumpAt:4010,vz:300};f.audio.runner('ABC234','me',r,4016,false);assert.equal(f.count(),1);f.endAll();f.advance(800);
 f.audio.runner('ABC234','me',{...r,jumpAt:-2000},4020,false);f.audio.runner('ABC234','me',r,4030,false);assert.equal(f.count(),1);f.audio.runner('ABC234','me',r,4040,true);assert.equal(f.count(),2);f.endAll();
 r={...r,stunUntil:5000};f.audio.runner('ABC234','me',r,4100,false);f.audio.runner('ABC234','me',r,4120,false);assert.equal(f.count(),3);f.endAll();f.advance(700);f.audio.runner('ABC234','me',{...r,falls:1,stunUntil:6000},4200,false);assert.equal(f.count(),4);
});
test('a late join does not replay countdown, jump, hit or finish sounds',()=>{
 const f=fixture();f.gesture();f.audio.runner('ABC234','me',{jumpAt:3990,stunUntil:4500,falls:2,vz:100},4000,true);f.audio.snapshot({code:'ABC234',arena:{},status:'running',player:{id:'me',finish:{place:1}}});assert.equal(f.count(),0);
});
test('the start signal occurs at the countdown boundary, once',()=>{
 const f=fixture();f.gesture();const r={jumpAt:-2000,stunUntil:0,falls:0,vz:0};f.audio.runner('ABC234','me',r,2990,false);f.audio.runner('ABC234','me',r,3010,false);f.audio.runner('ABC234','me',r,3030,false);assert.equal(f.count(),3);
});
test('confirmed answer and item responses sound once; duplicate acknowledgements stay silent',()=>{
 const f=fixture();f.gesture();const s={arena:{},player:{runner:{open:true},turn:{feedback:{correct:true}}}};f.audio.action('answer',s,{},'one');f.audio.action('answer',s,{},'one');assert.equal(f.count(),3);f.endAll();f.audio.action('answer',{...s,player:{turn:{feedback:{correct:false}}}},{},'two');assert.equal(f.count(),4);f.endAll();f.audio.action('arena-use',s,{gear:'shield,missile',slot:0},'three');assert.equal(f.count(),5);assert.equal(f.contexts[0].oscillators.at(-1).frequency.events[0].value,760);
});
test('authoritative completion sounds once and does not repeat at the results screen',()=>{
 const f=fixture();f.gesture();const s={code:'ABC234',arena:{},status:'running',player:{id:'me'}};f.audio.snapshot(s);f.audio.snapshot({...s,player:{id:'me',finish:{place:1}}});f.audio.snapshot({...s,status:'ended',player:{id:'me',finish:{place:1}}});assert.equal(f.count(),4);
});
test('hidden tabs stop and suspend audio and do not queue missed cues for later',()=>{
 const f=fixture();f.gesture();f.audio.play('jump');f.document.hidden=true;f.emit('visibilitychange');assert.equal(f.active(),0);assert.equal(f.contexts[0].state,'suspended');assert.equal(f.audio.play('finish'),false);f.document.hidden=false;f.gesture();assert.equal(f.count(),1);assert.equal(f.created(),1);
});
test('unsupported or failed audio and blocked storage never stop gameplay callers',()=>{
 for(const options of [{unsupported:true},{throwConstructor:true},{throwOscillator:true},{storageDenied:true},{webkit:true}]){const f=fixture(options);assert.doesNotThrow(()=>{f.gesture();f.audio.play('jump');f.audio.snapshot({});f.audio.action('answer',{});f.audio.reset();});}
 const f=fixture({throwConstructor:true});f.gesture();f.gesture();assert.equal(f.created(),1);assert.equal(f.button.disabled,true);
});
test('keyboard activation of mute is not passed on as a jump input',()=>{
 const f=fixture();const e=f.emit('keydown',{key:' ',target:{closest:()=>f.button}});assert.equal(e.stopped,true);assert.equal(e.prevented,undefined);assert.equal(f.created(),0);
});
test('a denied resume remains silent and does not reject into the input event handler',async()=>{
 const f=fixture({suspended:true,rejectResume:true});f.gesture();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.audio.play('jump'),false);assert.equal(f.created(),1);
});
