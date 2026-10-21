// Downloaded CC0 audio. Credits: docs/common-escape/AUDIO-SOURCES.json.
// The standalone builder embeds these exact files; no third-party runtime requests.
export const AUDIO_FILES=Object.freeze(Object.fromEntries([
 'click','latch','door','paper','step-a','step-b','creak','breath','static','bell','ambience','ghost-library','ghost-entrance','ghost-ending'
].map(name=>[name,'assets/audio/'+name+(['breath','ambience'].includes(name)?'-v2.mp3':'-v1.mp3')])));
export const SOUND_CUES=Object.freeze({
 tap:[['click',.35]],goal:[['bell',.32]],bell:[['bell',.65]],
 step:[['step-a',.64],['step-b',.52,.38],['step-a',.42,.76]],
 latch:[['latch',.78]],unlock:[['latch',.65],['door',.6,.14]],
 switch:[['click',.6]],paper:[['paper',.6]],
 broadcast:[['click',.45],['static',.55,.1]],
 'apparition-classroom':[['breath',.78,.08]],
 'apparition-library':[['creak',.42],['ghost-library',.66,.18]],
 'apparition-broadcast':[['static',.58]],
 'apparition-entrance':[['ghost-entrance',.66,.08]],
 'ending-shadow':[['ghost-ending',.58,.25]],
 'box-fall':[['creak',.46],['door',.78,1.04],['paper',.52,1.3]],
 'monitor-on':[['click',.55],['static',.52,.2]],
 'lights-out':[['click',.7]],
 preview:[['breath',.78,.08]]
});
const audioURL=name=>globalThis.window?.__commonEscapeAudio?.[name]||'./'+AUDIO_FILES[name];
let context,output,warming,epoch=0,ambienceVoice=null,ambiencePending=null,ambienceEpoch=0,ambienceLevel=.52;
const buffers=new Map(),active=new Set();
function audioContext(){
 const AudioContext=globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext;
 if(!AudioContext)return null;
 if(!context){
  context=new AudioContext();output=context.createGain();output.gain.value=.9;
  // Control combined peaks without generating any sound.
  const compressor=context.createDynamicsCompressor?.();
  if(compressor){compressor.threshold.value=-6;compressor.knee.value=6;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.15;output.connect(compressor);compressor.connect(context.destination);}
  else output.connect(context.destination);
 }
 return context;
}
function loadAudio(name,ctx){
 if(!buffers.has(name)){
  const pending=fetch(audioURL(name)).then(response=>{
   if(!response.ok)throw Error('Audio unavailable');
   return response.arrayBuffer();
  }).then(bytes=>ctx.decodeAudioData(bytes)).catch(error=>{buffers.delete(name);throw error;});
  buffers.set(name,pending);
 }
 return buffers.get(name);
}
export function warmSounds(){
 try{
  const ctx=audioContext();if(!ctx)return;
  ctx.resume()?.catch(()=>{});
  warming ||= Promise.allSettled(Object.keys(AUDIO_FILES).map(name=>loadAudio(name,ctx)));
 }catch{}
}
function release(voice){
 if(voice.released)return;voice.released=true;active.delete(voice);
 if(ambienceVoice===voice)ambienceVoice=null;
 voice.source.disconnect();voice.gain.disconnect();voice.panner?.disconnect();
}
function stop(voice){try{voice.source.stop();}catch{}release(voice);}
function createVoice(ctx,buffer,volume,pan=0){
 const source=ctx.createBufferSource(),gain=ctx.createGain(),panner=ctx.createStereoPanner?.();
 const voice={source,gain,panner};source.buffer=buffer;gain.gain.value=volume;
 source.connect(gain);
 if(panner){panner.pan.value=Math.max(-.75,Math.min(.75,pan));gain.connect(panner);panner.connect(output);}else gain.connect(output);
 source.onended=()=>release(voice);return voice;
}
export function stopSounds(){epoch++;setAmbience(false);for(const voice of [...active])stop(voice);}
export function setAmbience(enabled,level=.52){
 ambienceLevel=level;
 if(!enabled){ambienceEpoch++;ambiencePending=null;if(ambienceVoice)stop(ambienceVoice);return Promise.resolve(false);}
 try{
  const ctx=audioContext();if(!ctx)return Promise.resolve(false);
  if(ambienceVoice){ambienceVoice.gain.gain.setTargetAtTime?.(level,ctx.currentTime,.6);return Promise.resolve(true);}
  if(ambiencePending)return ambiencePending;
  const ticket=++ambienceEpoch,soundEpoch=epoch;
  const request=Promise.all([ctx.resume(),loadAudio('ambience',ctx)]).then(([,buffer])=>{
   if(ticket!==ambienceEpoch||soundEpoch!==epoch)return false;
   const voice=createVoice(ctx,buffer,0);voice.source.loop=true;ambienceVoice=voice;
   voice.gain.gain.setValueAtTime(0,ctx.currentTime);voice.gain.gain.linearRampToValueAtTime(ambienceLevel,ctx.currentTime+1.2);
   voice.source.start(ctx.currentTime);return true;
  }).catch(()=>false).finally(()=>{if(ambiencePending===request)ambiencePending=null;});
  ambiencePending=request;return request;
 }catch{return Promise.resolve(false);}
}
export async function playSound(kind='tap',pan=0){
 try{
  const ctx=audioContext();if(!ctx)return false;
  const ticket=epoch,cues=SOUND_CUES[kind]||SOUND_CUES.tap;
  // resume is invoked before the first await to preserve the user gesture.
  const [, ...ready]=await Promise.all([ctx.resume(),...cues.map(([name])=>loadAudio(name,ctx))]);
  if(ticket!==epoch)return false;
  const start=ctx.currentTime;
  cues.forEach(([,volume,delay=0],index)=>{
   while(active.size>=8)stop(active.values().next().value);
   const voice=createVoice(ctx,ready[index],volume,pan);active.add(voice);voice.source.start(start+delay);
  });
  return true;
 }catch{return false;}
}
