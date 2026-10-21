/* Small local cues: one lazy audio context, at most six oscillators, no audio files or timers. */
(()=>{'use strict';
const KEY='quiz-rally:sound-muted',MAX_VOICES=6,MAX_CUES_PER_SECOND=8;
const Audio=window.AudioContext||window.webkitAudioContext;
let muted=false,failed=!Audio,context=null,master=null,resuming=null,tracker=null,lastRoom='',lastPlayer='',lastStatus='',lastFinish=false,lastAction='';
let burstAt=-Infinity,burstCount=0;
try{muted=localStorage.getItem(KEY)==='1';}catch{}
const voices=new Set(),lastPlayed=Object.create(null);
// Notes: frequency, ending frequency, duration, delay, waveform.
const cues={
 jump:{gap:650,notes:[[310,690,.11,0,'sine']]},
 dash:{gap:700,notes:[[260,90,.12,0,'triangle']]},
 collect:{gap:250,notes:[[620,620,.07,0,'sine'],[830,830,.08,.06,'sine']]},
 correct:{gap:160,notes:[[523,523,.08,0,'sine'],[659,659,.08,.06,'sine'],[784,784,.11,.12,'sine']]},
 wrong:{gap:180,notes:[[190,125,.15,0,'triangle']]},
 item:{gap:180,notes:[[390,160,.12,0,'triangle'],[680,340,.1,.035,'sine']]},
 shield:{gap:250,notes:[[760,1120,.16,0,'sine']]},
 hit:{gap:260,priority:true,notes:[[115,55,.16,0,'triangle']]},
 fall:{gap:650,priority:true,notes:[[210,55,.24,0,'sine']]},
 start:{gap:1500,priority:true,notes:[[392,392,.08,0,'sine'],[523,523,.08,.09,'sine'],[784,784,.14,.18,'sine']]},
 finish:{gap:2500,priority:true,notes:[[523,523,.11,0,'sine'],[659,659,.11,.075,'sine'],[784,784,.12,.15,'sine'],[1047,1047,.18,.24,'sine']]},
 end:{gap:2000,priority:true,notes:[[392,392,.1,0,'sine'],[330,330,.1,.1,'sine'],[262,262,.15,.2,'sine']]},
 enable:{gap:200,notes:[[660,660,.07,0,'sine']]}
};
function icon(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>${muted||failed?'<path d="m16 9 5 6m0-6-5 6"/>':'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;}
function label(){return failed?'이 브라우저에서 효과음을 사용할 수 없습니다':muted?'효과음 켜기':'효과음 끄기';}
function button(){return `<button type="button" class="quiz-sound-button" data-quiz-sound aria-label="${label()}" title="${label()}" aria-pressed="${muted}" ${failed?'disabled':''}>${icon()}</button>`;}
function syncButtons(){for(const b of document.querySelectorAll('[data-quiz-sound]')){b.innerHTML=icon();b.disabled=failed;b.setAttribute('aria-label',label());b.setAttribute('title',label());b.setAttribute('aria-pressed',String(muted));}}
function disconnect(voice){try{voice.osc.disconnect();voice.gain.disconnect();}catch{}}
function stopAll(){for(const voice of voices){try{voice.osc.stop();}catch{}disconnect(voice);}voices.clear();}
function unlock(){
 if(muted||failed||document.hidden)return null;
 try{
  if(!context){context=new Audio({latencyHint:'interactive'});master=context.createGain();master.gain.value=.23;master.connect(context.destination);}
  if(context.state==='closed'){failed=true;syncButtons();return null;}
  if(context.state!=='running'&&!resuming){resuming=Promise.resolve(context.resume()).catch(()=>{}).finally(()=>{resuming=null;});}
  return resuming;
 }catch{failed=true;stopAll();syncButtons();return null;}
}
function play(name){
 const cue=cues[name];
 if(!cue||muted||failed||document.hidden||context?.state!=='running')return false;
 const now=performance.now();
 if(now-(lastPlayed[name]??-Infinity)<cue.gap)return false;
 if(now-burstAt>=1000){burstAt=now;burstCount=0;}
 if(burstCount>=MAX_CUES_PER_SECOND&&!cue.priority)return false;
 if(voices.size+cue.notes.length>MAX_VOICES){if(!cue.priority)return false;stopAll();}
 try{
  for(const [from,to,duration,delay,type] of cue.notes){
   const osc=context.createOscillator(),gain=context.createGain(),at=context.currentTime+.004+delay,voice={osc,gain};
   voices.add(voice);osc.type=type;osc.frequency.setValueAtTime(from,at);
   if(from!==to)osc.frequency.exponentialRampToValueAtTime(to,at+duration);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.14,at+.007);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   osc.connect(gain);gain.connect(master);osc.onended=()=>{voices.delete(voice);disconnect(voice);};osc.start(at);osc.stop(at+duration+.005);
  }
  lastPlayed[name]=now;burstCount++;return true;
 }catch{failed=true;stopAll();syncButtons();return false;}
}
function snapshot(s){
 if(!s?.arena)return;
 const player=s.player?.id||'',finish=!!s.player?.finish;
 if(lastRoom!==s.code||lastPlayer!==player){lastRoom=s.code;lastPlayer=player;lastStatus=s.status;lastFinish=finish;return;}
 if(finish&&!lastFinish)play('finish');
 else if(s.status==='ended'&&lastStatus!=='ended'&&!finish)play('end');
 lastStatus=s.status;lastFinish=finish;
}
function action(name,s,extras={},requestId=''){
 if(!s?.arena||!s.player||requestId&&requestId===lastAction)return;
 lastAction=requestId;
 if(name==='answer'&&typeof s.player.turn?.feedback?.correct==='boolean')play(s.player.turn.feedback.correct?'correct':'wrong');
 if(name==='arena-collect'&&s.player.runner?.open)play('collect');
 if(name==='arena-use'){const item=String(extras.gear||'').split(',')[extras.slot];play(item==='shield'?'shield':'item');}
}
function runner(room,id,r,t,dashing){
 if(!r||failed)return;
 if(!tracker||tracker.room!==room||tracker.id!==id||t<tracker.t-500){tracker={room,id,t,jump:r.jumpAt,stun:r.stunUntil,falls:r.falls,dash:dashing};return;}
 if(t>=3000&&tracker.t<3000)play('start');
 if(r.falls>tracker.falls)play('fall');
 else if(r.stunUntil>tracker.stun+100&&r.stunUntil>t)play('hit');
 if(r.jumpAt>tracker.jump+250&&r.jumpAt>=0&&r.vz>0&&t-r.jumpAt<200)play('jump');
 if(dashing&&!tracker.dash&&t>=3000)play('dash');
 tracker.t=t;tracker.jump=Math.max(tracker.jump,r.jumpAt);tracker.stun=Math.max(tracker.stun,r.stunUntil);tracker.falls=Math.max(tracker.falls,r.falls);tracker.dash=dashing;
}
function reset(){tracker=null;lastRoom='';lastPlayer='';lastStatus='';lastFinish=false;lastAction='';stopAll();}
function silence(){stopAll();tracker=null;try{if(context?.state==='running')Promise.resolve(context.suspend()).catch(()=>{});}catch{}}
function gesture(e){
 const soundButton=e.target?.closest?.('[data-quiz-sound]');
 if(soundButton){if(e.type==='keydown'&&(e.key===' '||e.key==='Enter'))e.stopPropagation();return;}
 if(e.isTrusted===false||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
 unlock();
}
document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
document.addEventListener('keydown',gesture,true);
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('[data-quiz-sound]');if(!b||failed)return;e.preventDefault();e.stopPropagation();muted=!muted;
 try{localStorage.setItem(KEY,muted?'1':'0');}catch{}
 if(muted)stopAll();else{const pending=unlock();if(pending)pending.then(()=>play('enable'));else play('enable');}syncButtons();
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)silence();});
window.addEventListener('pagehide',silence);
window.quizAudio={play,button,snapshot,action,runner,reset};syncButtons();
})();
