import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const moduleURL=new URL('../public/labs/common-escape/sound.mjs',import.meta.url);
let serial=0;
const fresh=()=>import(moduleURL.href+'?test='+serial++);
function mockContext(){
 const state={starts:[],stops:0,disconnected:0,decodes:0,sources:[]};
 class AudioContext{
  constructor(){this.destination={};this.currentTime=7;}
  resume(){return Promise.resolve();}
  decodeAudioData(bytes){assert.ok(bytes.byteLength>100);state.decodes++;return Promise.resolve({duration:1});}
  createBufferSource(){const node={connect(){},disconnect(){state.disconnected++;},start(at){state.starts.push(at);},stop(){state.stops++;this.onended?.();}};state.sources.push(node);return node;}
  createGain(){return{gain:{value:0,setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;}},connect(){},disconnect(){}};}
  createStereoPanner(){return{pan:{value:0},connect(){},disconnect(){}};}
 }
 return{AudioContext,state};
}
test('downloaded MP3 cues work from embedded data, reuse decoding, and mute stops scheduled voices',async()=>{
 const originalWindow=globalThis.window;
 try{
  const audio=await fresh(),{AudioContext,state}=mockContext();
  const embedded={};
  for(const [name,file]of Object.entries(audio.AUDIO_FILES)){
   const bytes=await readFile(new URL('../public/labs/common-escape/'+file,import.meta.url));
   assert.ok(bytes.length>1000,name);
   embedded[name]='data:audio/mpeg;base64,'+bytes.toString('base64');
  }
  globalThis.window={AudioContext,__commonEscapeAudio:embedded};
  assert.equal(await audio.playSound('step'),true);
  assert.deepEqual(state.starts,[7,7.38,7.76]);
  assert.equal(state.decodes,2,'the repeated footstep shares its decoded buffer');
  audio.stopSounds();assert.equal(state.stops,3);assert.equal(state.disconnected,3);
  state.starts=[];
  for(let i=0;i<10;i++)assert.equal(await audio.playSound('tap'),true);
  assert.equal(state.starts.length,10);assert.equal(state.stops,5,'at most eight overlapping voices');
  audio.stopSounds();assert.equal(state.stops,13);assert.equal(state.disconnected,13);
 }finally{globalThis.window=originalWindow;}
});
test('muting while a download is pending prevents late playback',async()=>{
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 try{
  const audio=await fresh(),{AudioContext,state}=mockContext();
  globalThis.window={AudioContext};
  let finish;
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const playing=audio.playSound('tap');audio.stopSounds();
  finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(256)});
  assert.equal(await playing,false);assert.equal(state.starts.length,0);
 }finally{globalThis.window=originalWindow;globalThis.fetch=originalFetch;}
});
test('unsupported audio and unavailable files fail silently, and failed files can be retried',async()=>{
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 try{
  const audio=await fresh();globalThis.window={};
  assert.equal(await audio.playSound(),false);
  const {AudioContext,state}=mockContext();globalThis.window={AudioContext};
  globalThis.fetch=async()=>({ok:false});
  assert.equal(await audio.playSound('tap'),false);assert.equal(state.starts.length,0);
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(256)});
  assert.equal(await audio.playSound('tap'),true);audio.stopSounds();
 }finally{globalThis.window=originalWindow;globalThis.fetch=originalFetch;}
});
test('re-rendering keeps one ambience loop, and muting stops ambience plus effects',async()=>{
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 try{
  const audio=await fresh(),{AudioContext,state}=mockContext();globalThis.window={AudioContext};
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(256)});
  assert.ok((await Promise.all(Array.from({length:20},()=>audio.setAmbience(true)))).every(Boolean));
  assert.equal(state.starts.length,1);assert.equal(state.sources[0].loop,true);assert.equal(state.decodes,1);
  await audio.setAmbience(true);assert.equal(state.starts.length,1,'do not restart the bed for an inventory or room render');
  await audio.playSound('apparition-library');assert.equal(state.starts.length,3);
  audio.stopSounds();assert.equal(state.stops,3,'stop the loop and both cue layers');
  await audio.setAmbience(true);assert.equal(state.starts.length,4,'unmuting starts exactly one new loop');
  await audio.setAmbience(false);assert.equal(state.stops,4);
 }finally{globalThis.window=originalWindow;globalThis.fetch=originalFetch;}
});
test('leaving while ambience downloads cannot start a late loop',async()=>{
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 try{
  const audio=await fresh(),{AudioContext,state}=mockContext();globalThis.window={AudioContext};
  let finish;globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const playing=audio.setAmbience(true);audio.stopSounds();
  finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(256)});
  assert.equal(await playing,false);assert.equal(state.starts.length,0);
 }finally{globalThis.window=originalWindow;globalThis.fetch=originalFetch;}
});

test('new sessions enable sound, saved mute is respected, and each apparition has a distinct recording',async()=>{
 const {fresh:createState,restore}=await import('../public/labs/common-escape/engine.mjs');
 assert.equal(createState().sound,true);assert.equal(restore({...createState(),sound:false}).sound,false);
 const {SOUND_CUES,AUDIO_FILES}=await fresh();
 const primary=['apparition-classroom','apparition-library','apparition-broadcast','apparition-entrance','ending-shadow'].map(k=>SOUND_CUES[k].at(-1)[0]);
 assert.equal(new Set(primary).size,5);
 assert.match(AUDIO_FILES.ambience,/ambience-v2/);
 const {createHash}=await import('node:crypto');
 const hashes=await Promise.all(primary.map(async name=>createHash('sha256').update(await readFile(new URL('../public/labs/common-escape/'+AUDIO_FILES[name],import.meta.url))).digest('hex')));
 assert.equal(new Set(hashes).size,5,'different names must not disguise the same sound file');
});
