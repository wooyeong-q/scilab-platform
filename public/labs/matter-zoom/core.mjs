import {atom,MATERIALS,DISCOVERIES} from './data.mjs';
export const STORAGE_KEY='scilab-matter-zoom-v1';
export const fresh=()=>({version:1,chapter:0,unlocked:0,material:null,level:0,deepest:0,z:8,selected:0,visited:[],seen:[],records:[],answers:{},numberAnswers:{},neutralZ:8,neutralE:0,neutron:8,shellZ:8,shells:[0,0,0,0],shellDone:[],tableZ:1,tableSeen:[],missionZ:12,mission:{},done:false});
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
export function restore(raw){
 const base=fresh();if(!raw)return base;
 let s;try{s=JSON.parse(raw);}catch{return base;}
 if(!s||s.version!==1)return base;
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 for(const [key,max] of [['chapter',6],['unlocked',6],['level',5],['deepest',5],['selected',40],['neutralE',20],['neutron',10]])if(integer(s[key],0,max))base[key]=s[key];
 if(s.material&&Object.hasOwn(MATERIALS,s.material))base.material=s.material;
 for(const key of ['z','neutralZ','shellZ','tableZ','missionZ'])if(integer(s[key],1,20)||(key==='z'&&s[key]===79))base[key]=s[key];
 for(const [key,valid] of [['visited',v=>Object.hasOwn(MATERIALS,v)],['seen',v=>/^(1|8|79):[pne]$/.test(v)],['records',v=>Object.hasOwn(DISCOVERIES,v)],['shellDone',v=>integer(v,1,20)],['tableSeen',v=>integer(v,1,20)]])if(Array.isArray(s[key]))base[key]=[...new Set(s[key].filter(valid))];
 if(Array.isArray(s.shells)&&s.shells.length===4&&s.shells.every((n,i)=>integer(n,0,LESSON_CAPS[i]))&&total(s.shells)<=base.shellZ&&s.shells.every((n,i)=>!n||s.shells.slice(0,i).every((p,j)=>p===LESSON_CAPS[j])))base.shells=s.shells;
 // Only retain whitelisted scalar answer fields. Never interpolate arbitrary saved content.
 for(const key of ['answers','numberAnswers','mission'])if(s[key]&&typeof s[key]==='object')for(const [k,v] of Object.entries(s[key]))if(['identity','isotope','neutral','number','element','shells','1','8','79'].includes(k)&&(typeof v==='string'||typeof v==='number')&&String(v).length<32)base[key][k]=v;
 base.done=s.done===true;base.chapter=Math.min(base.chapter,base.unlocked);base.deepest=Math.max(base.deepest,base.level);
 if(!base.material){base.level=0;base.deepest=0;}
 return base;
}
