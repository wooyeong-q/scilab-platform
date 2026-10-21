export const ROLE_NAMES=['1번 기록 담당','2번 기록 담당','3번 기록 담당','4번 기록 담당'];
export const RECORD_ROLES={desk1:1,desk2:2,board:3,notebook:4},PHOTO_ROLES={chair:1,book:2,notice:3};
const KEY='scilab-common-escape-student-v2',API='/api/labs/common-escape/sessions';
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export class GroupSession{
 constructor(onChange,onStatus){this.onChange=onChange;this.onStatus=onStatus;this.timer=null;this.epoch=0;this.failures=0;this.busy=false;this.active=false;this.data=null;try{this.meta=JSON.parse(localStorage.getItem(KEY))||{};}catch{this.meta={};}}
 get available(){return !!(this.meta.token&&this.meta.code);}
 setData(d){if(this.data&&d.group.revision<this.data.group.revision)return false;this.data=d;return true;}
 async request(action,body){
   if(!this.available)throw new Error('수업 코드로 입장해 주세요.');
   const headers={authorization:'Bearer '+this.meta.token},options={headers,cache:'no-store',signal:AbortSignal.timeout(12000)};
   let url=API+'/'+encodeURIComponent(this.meta.code);
   if(action==='progress')url+='?view=progress';
   else if(action==='state'){if(body?.revision!==undefined)url+='?revision='+body.revision;}
   else {options.method='POST';headers['content-type']='application/json';options.body=JSON.stringify(action==='event'?{action,event:body}:{action,...body});}
   const response=await fetch(url,options);if(response.status===204)return null;
   const value=await response.json();if(!response.ok){const e=new Error(value.error||'수업 연결을 확인해 주세요.');e.status=response.status;throw e;}return value;
 }
 async connect(action,body={}){
   if(action==='join'){
     const code=String(body.code||'').replace(/[\s-]/g,'').toUpperCase();
     if(!(this.meta.pending&&this.meta.code===code&&this.meta.team===body.team&&this.meta.role===body.role))this.meta={code,token:secret(),name:body.name,team:body.team,role:body.role,pending:true};
     this.data=null;
   }
   try{localStorage.setItem(KEY,JSON.stringify(this.meta));}catch{throw new Error('이 브라우저에 입장 정보를 저장할 수 없어요. 저장 공간을 확인해 주세요.');}
   let next;
   try{next=await this.request(this.meta.pending?'join':action==='state'?'state':'join',this.meta.pending?{name:this.meta.name,team:this.meta.team,role:this.meta.role}:body);}
   catch(error){if([400,401,403,404,409,410].includes(error.status)&&this.meta.pending)this.forget();throw error;}
   this.setData(next);this.meta.pending=false;try{localStorage.setItem(KEY,JSON.stringify(this.meta));}catch{/* The pending identity still resumes the same seat. */}
   this.active=true;this.failures=0;this.schedule(1500);return next;
 }
 async send(action,body={}){const next=await this.request(action,body);if(next?.group)this.setData(next);return next;}
 pause(){this.active=false;this.epoch++;clearTimeout(this.timer);}
 schedule(delay=1500){clearTimeout(this.timer);if(!this.active)return;const epoch=this.epoch;this.timer=setTimeout(()=>this.poll(epoch),delay);}
 async poll(epoch){
   if(!this.active||epoch!==this.epoch)return;if(this.busy){this.schedule(1500);return;}this.busy=true;
   try{const next=await this.request('state',{revision:this.data?.group.revision});if(!this.active||epoch!==this.epoch)return;this.failures=0;this.onStatus('connected');if(next&&this.setData(next))this.onChange(next);}
   catch(e){if(!this.active||epoch!==this.epoch)return;if([401,403,410].includes(e.status)){this.forget();this.onChange({left:true,message:e.message});return;}this.failures++;this.onStatus('offline');}
   finally{this.busy=false;if(this.active&&epoch===this.epoch)this.schedule(Math.min(12000,1500*2**this.failures)*(document.hidden?3:1));}
 }
 saveLocal(s){if(!this.available)return;const local={room:s.room,gridTurns:s.gridTurns,seen:s.seen,journal:s.journal,sound:s.sound,soft:s.soft,drafts:s.drafts||{}};try{localStorage.setItem(KEY+':'+this.meta.token,JSON.stringify(local));}catch{/* Progress remains on the server. */}}
 loadLocal(){try{return JSON.parse(localStorage.getItem(KEY+':'+this.meta.token))||{};}catch{return {};}}
 forget(){this.pause();try{localStorage.removeItem(KEY);localStorage.removeItem(KEY+':'+this.meta.token);}catch{}this.meta={};this.data=null;}
}
