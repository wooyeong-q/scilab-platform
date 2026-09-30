import {atom,MATERIALS,DISCOVERIES} from './data.mjs';
import {missionFor,evaluateMission} from './levels.mjs';
export const STORAGE_KEY='scilab-matter-zoom-v2';
const lessonMode=mode=>mode==='high'?'high':'middle';
export const fresh=(mode='middle')=>({version:2,mode:lessonMode(mode),chapter:0,unlocked:0,material:null,level:0,deepest:0,z:8,selected:0,visited:[],seen:[],records:[],answers:{},numberAnswers:{},neutralZ:8,neutralE:0,neutron:8,shellZ:8,shells:[0,0,0,0],shellDone:[],tableZ:1,tableSeen:[],missionZ:12,mission:{},done:false,missionIndex:0,conceptAnswers:{},shellPrediction:'',shellPredictionChecked:false,familyAnswer:'',isotopeAnswer:'',massAnswer:'',evidence:{},highViewed:false});
export const total=s=>s.reduce((a,b)=>a+b,0);
// These are lesson limits for ground-state neutral atoms Z=1..20, not universal shell capacities.
export const LESSON_CAPS=[2,8,8,2];
export function placeElectron(shells,index,z){
 if(!Number.isInteger(index)||index<0||index>3||!atom(z)||z>20)return {ok:false,message:'원자번호 1~20의 껍질을 선택해 주세요.'};
 if(total(shells)>=z)return {ok:false,message:'이 중성 원자의 전자를 모두 놓았어요. 전자 수는 양성자 수와 같아요.'};
 if(shells[index]>=LESSON_CAPS[index])return {ok:false,message:`이 활동에서 ${index+1}번째 껍질에는 ${LESSON_CAPS[index]}개까지 놓아요.`};
 if(shells.slice(0,index).some((n,i)=>n<LESSON_CAPS[i]))return {ok:false,message:'안쪽 껍질을 먼저 채워 보세요.'};
 const next=[...shells];next[index]++;return {ok:true,shells:next};
}
export const correctShells=(s,z)=>s.every((n,i)=>n===(atom(z)?.shells[i]||0));
export function checkMission(z,answers){
 const e=atom(z);return {neutral:answers.neutral==='yes',number:Number(answers.number)===z,element:Number(answers.element)===z,shells:String(answers.shells||'').replace(/\s/g,'')===e.shells.join(',')};
}
export function restore(raw,mode='middle'){
 const base=fresh(mode);if(!raw)return base;
 let s;try{s=JSON.parse(raw);}catch{return base;}
 // Scoped lessons never inherit a legacy/global save or the other school level.
 if(!s||s.version!==2||s.mode!==base.mode)return base;
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 for(const [key,max] of [['chapter',6],['unlocked',6],['level',5],['deepest',5],['selected',40],['neutralE',20],['neutron',10]])if(integer(s[key],0,max))base[key]=s[key];
 if(s.material&&Object.hasOwn(MATERIALS,s.material))base.material=s.material;
 for(const key of ['z','neutralZ','shellZ','tableZ','missionZ'])if(integer(s[key],1,20)||(key==='z'&&s[key]===79))base[key]=s[key];
 for(const [key,valid] of [['visited',v=>Object.hasOwn(MATERIALS,v)],['seen',v=>/^(1|8|79):[pne]$/.test(v)],['records',v=>Object.hasOwn(DISCOVERIES,v)],['shellDone',v=>integer(v,1,20)],['tableSeen',v=>integer(v,1,20)]])if(Array.isArray(s[key]))base[key]=[...new Set(s[key].filter(valid))];
 if(Array.isArray(s.shells)&&s.shells.length===4&&s.shells.every((n,i)=>integer(n,0,LESSON_CAPS[i]))&&total(s.shells)<=base.shellZ&&s.shells.every((n,i)=>!n||s.shells.slice(0,i).every((p,j)=>p===LESSON_CAPS[j])))base.shells=s.shells;
 // Only retain whitelisted fields and safe scalar option values. Saved content is untrusted.
 const safeScalar=v=>(typeof v==='string'||typeof v==='number')&&/^[a-zA-Z0-9,+−\- ]{1,40}$/.test(String(v));
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 for(const key of ['answers','numberAnswers','mission'])if(object(s[key]))for(const [k,v] of Object.entries(s[key]))if(['identity','isotope','neutral','number','element','shells','mass','1','8','79'].includes(k)&&safeScalar(v))base[key][k]=v;
 if(Number.isInteger(s.missionIndex))base.missionIndex=Math.min(1000,Math.max(0,s.missionIndex));
 if(object(s.conceptAnswers))for(const material of ['water','hydrogen'])if(object(s.conceptAnswers[material])){
  const answers={};for(const key of ['atoms','types'])if((typeof s.conceptAnswers[material][key]==='string'||typeof s.conceptAnswers[material][key]==='number')&&['1','2','3'].includes(String(s.conceptAnswers[material][key])))answers[key]=String(s.conceptAnswers[material][key]);
  if(Object.keys(answers).length)base.conceptAnswers[material]=answers;
 }
 const predictionOptions=new Set(Array.from({length:20},(_,i)=>atom(i+1).shells.join(',')));
 predictionOptions.add('2,10');
 if(typeof s.shellPrediction==='string'&&s.shellPrediction.length<24&&predictionOptions.has(s.shellPrediction))base.shellPrediction=s.shellPrediction;
 for(const key of ['familyAnswer','isotopeAnswer','massAnswer'])if(safeScalar(s[key]))base[key]=String(s[key]);
 if(object(s.evidence))for(const key of ['identity','neutral','shells','final'])if(typeof s.evidence[key]==='string'&&/^[a-z0-9_-]{1,40}$/.test(s.evidence[key]))base.evidence[key]=s.evidence[key];
 base.shellPredictionChecked=s.shellPredictionChecked===true&&base.shellPrediction==='2,8,2'&&base.evidence.shells==='second-shell';
 base.highViewed=base.mode==='high'&&s.highViewed===true;
 base.done=s.done===true&&base.evidence.final==='protons'&&evaluateMission(missionFor(base.mode,base.missionIndex),base.mission,base.mode).allCorrect;
 base.chapter=Math.min(base.chapter,base.unlocked);base.deepest=Math.max(base.deepest,base.level);
 if(!base.material){base.level=0;base.deepest=0;}
 return base;
}
