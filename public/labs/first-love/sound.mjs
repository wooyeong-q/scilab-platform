// Original procedural music and foley. No external recordings or dependencies.
export class Sound{
 constructor(){this.volume=0.16;this.muted=false;this.context=null;this.timer=null;this.phase=0;this.mode='quiet';try{const s=JSON.parse(localStorage.getItem('first-love-audio'));if(s){this.muted=s.muted;this.volume=s.volume;}}catch{}}
 start(){if(!window.AudioContext&&!window.webkitAudioContext)return;if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.context.createGain();this.gain.connect(this.context.destination);}this.context.resume().catch(()=>{});this.gain.gain.value=this.muted?0:this.volume;this.schedule();}
 set(mode){this.mode=mode;this.phase=0;}
 settings(){if(this.gain)this.gain.gain.value=this.muted?0:this.volume;try{localStorage.setItem('first-love-audio',JSON.stringify({muted:this.muted,volume:this.volume}));}catch{}}
 note(freq,duration=1,offset=0,level=.15){if(!this.context||this.muted)return;const t=this.context.currentTime+offset,o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.gain);o.start(t);o.stop(t+duration+.03);}
 effect(kind){if(kind==='success'){[440,554.37,659.25].forEach((v,i)=>this.note(v,.7,i*.1,.18));}else if(kind==='paper')this.note(180,.07,0,.07);else if(kind==='message'){this.note(880,.22,0,.1);this.note(1174,.2,.1,.08);}else this.note(310,.1,0,.08);}
 schedule(){clearTimeout(this.timer);if(this.context&&this.mode!=='silence'&&!document.hidden){const progression=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];const chord=progression[Math.floor(this.phase/4)%4],n=this.phase%4;this.note(chord[n%3],this.mode==='comic'?.7:2.4,0,.12);if(n===0)this.note(chord[0]/2,3,0,.08);this.phase++;}this.timer=setTimeout(()=>this.schedule(),this.mode==='comic'?500:1050);}
 stop(){clearTimeout(this.timer);this.context?.suspend();}
}
