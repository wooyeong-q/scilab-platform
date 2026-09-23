import {element} from './data.mjs';
export const STORAGE_KEY='scilab-atom-explorer-v1';
export const fresh=()=>({version:1,step:0,completed:[],unlocked:[],records:[],work:{},sound:false});
export function validateSave(raw){
 if(!raw||raw.version!==1||!Number.isInteger(raw.step)||raw.step<0||raw.step>11||!raw.work||typeof raw.work!=='object'||Array.isArray(raw.work))return null;
 if(!Array.isArray(raw.completed)||!raw.completed.every(x=>Number.isInteger(x)&&x>=0&&x<=10))return null;
 if(!Array.isArray(raw.unlocked)||!raw.unlocked.every(x=>Number.isInteger(x)&&x>=1&&x<=20))return null;
 if(!Array.isArray(raw.records)||!raw.records.every(x=>x&&typeof x.rule==='string'&&typeof x.evidence==='string'))return null;
 return {...fresh(),...raw};
}
export const neutralModel=z=>({p:z,n:element(z).exampleNeutrons,shells:[...element(z).electronShells,0,0,0,0].slice(0,4)});
export const electrons=a=>a.shells.reduce((sum,n)=>sum+n,0);
export function place(a,kind,zone){
 const next={...a,shells:[...a.shells]};
 if(zone==='nucleus'){
  if(kind==='e')return {error:'전자도 원자핵 안에 있었나요? 원자핵 주변 영역을 다시 살펴보세요.'};
  if(kind==='p'&&a.p>=20)return {error:'이번 연구소에서는 양성자 20개까지 탐구해요.'};
  if(kind==='n'&&a.n>=24)return {error:'중성자는 지금 모형에 충분해요. 원소를 결정하는 입자를 살펴보세요.'};
  next[kind]++;return {model:next};
 }
 if(kind!=='e')return {error:'양성자와 중성자는 원자의 어느 부분에 있었나요? 원자핵으로 옮겨 보세요.'};
 const i=Number(zone),caps=[2,8,8,2];
 if(!Number.isInteger(i)||i<0||i>3)return {error:'전자 배치 영역으로 옮겨 보세요.'};
 if(a.shells[i]>=caps[i])return {error:`${i+1}번째 전자 배치 영역이 가득 찬 것 같습니다. 다음 영역을 살펴보세요.`};
 if(i>0&&a.shells.slice(0,i).some((n,j)=>n<caps[j]))return {error:'안쪽 영역에 아직 빈자리가 있어요. 안쪽부터 채워 보세요.'};
 if(electrons(a)>=a.p)return {error:'중성 원자를 만드는 중이에요. 양성자 수만큼 전자를 배치했는지 비교해 보세요.'};
 next.shells[i]++;return {model:next};
}
export const isComplete=(a,z)=>a.p===z&&electrons(a)===z&&element(z).electronShells.every((n,i)=>a.shells[i]===n)&&a.shells.slice(element(z).electronShells.length).every(n=>n===0);
