const KEY='scilab-first-love-student-v1',API='/api/labs/first-love/sessions';
export const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export class Session{
 constructor(change,status){this.change=change;this.status=status;this.timer=null;this.active=false;this.busy=false;this.epoch=0;this.data=null;this.failures=0;try{this.meta=JSON.parse(localStorage.getItem(KEY))||{};}catch{this.meta={};}}
 get available(){return !!(this.meta.code&&this.meta.token);}
 save(){localStorage.setItem(KEY,JSON.stringify(this.meta));}
 setData(v){if(!v?.group)return;if(this.data&&v.group.revision<this.data.group.revision)return;this.data={...v,content:v.content||this.data?.content};return this.data;}
 async api(action,payload={}){const headers={authorization:'Bearer '+this.meta.token},options={headers,cache:'no-store',signal:AbortSignal.timeout(12000)};let url=API+'/'+this.meta.code;
  if(action==='state'){const q=new URLSearchParams();if(payload.revision!==undefined)q.set('revision',payload.revision);if(this.data?.contentKey)q.set('contentKey',this.data.contentKey);url+='?'+q;}
  else{options.method='POST';headers['content-type']='application/json';options.body=JSON.stringify(action==='event'?{action,event:{...payload,contentKey:this.data?.contentKey}}:{action,...payload});}
  const r=await fetch(url,options);if(r.status===204)return null;const v=await r.json();if(!r.ok){const e=new Error(v.error||'연결을 확인해 주세요.');e.status=r.status;throw e;}return v;
 }
 async connect(input){this.pause();this.data=null;if(input){const code=input.code.replace(/[\s-]/g,'').toUpperCase();if(!this.meta.pending||this.meta.code!==code||this.meta.team!==input.team||this.meta.role!==input.role)this.meta={...input,code,token:secret(),pending:true};this.save();}
  const v=await this.api(this.meta.pending?'join':'state',this.meta);this.meta.pending=false;this.save();this.setData(v);this.active=true;this.schedule();return this.data;
 }
 async send(event){const epoch=this.epoch;if(event.type==='submit'){this.meta.pendingAttempt=event;this.save();}
  try{const v=await this.api('event',event);if(epoch!==this.epoch)return null;if(event.type==='submit'){delete this.meta.pendingAttempt;this.save();}this.setData(v);return {...this.data,outcome:v.outcome,duplicate:v.duplicate};}
  catch(e){if([400,401,403,409,410].includes(e.status)&&event.type==='submit'){delete this.meta.pendingAttempt;this.save();}throw e;}
 }
 pause(){this.active=false;this.epoch++;clearTimeout(this.timer);}
 schedule(){clearTimeout(this.timer);if(!this.active)return;const epoch=this.epoch;this.timer=setTimeout(()=>this.poll(epoch),Math.min(15000,2000*2**this.failures)*(document.hidden?3:1)+Math.random()*300);}
 async poll(epoch){if(!this.active||epoch!==this.epoch)return;if(this.busy){this.schedule();return;}this.busy=true;try{const v=await this.api('state',{revision:this.data?.group.revision});if(epoch!==this.epoch)return;this.failures=0;this.status('연결됨');if(v){const d=this.setData(v);if(d)this.change(d);}}catch(e){this.failures++;this.status('재연결 중 · 진행 유지');if([401,403,410].includes(e.status)){this.pause();this.change({error:e.message});}}finally{this.busy=false;if(epoch===this.epoch)this.schedule();}}
 async leave(){await this.api('leave');this.forget();}
 forget(){this.pause();localStorage.removeItem(KEY);this.meta={};this.data=null;}
}
