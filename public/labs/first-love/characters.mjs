import {CAST as ORIGINAL_CAST} from './story.mjs?v=22';

const moods=['neutral','nervous','surprised','smile','excited','panicked','sincere','sheepish','amused','concerned','warm','disgust'];
const frames={neutral:0,nervous:1,surprised:2,smile:3,excited:3,panicked:2,sincere:0,sheepish:1,amused:3,concerned:2,warm:3,disgust:2};
const faces=['차분한 표정','수줍게 긴장한 표정','놀란 표정','미소'];
const roles=['주인공 · 편지와 출발 기록','친구 · 운반과 설치 기록','친구 · 장치와 방향','친구 · 사진과 관찰'];
const boy=(id,name,short,roleNo,quote)=>({id,name,short,roleNo,gender:'남학생',role:roleNo+'번 · '+roles[roleNo-1],quote,asset:id+'-v20',atlas:'cast-anime-v24',atlasSize:[1223,1286],atlasFrame:({yunjae:[8,6,598,560],doha:[617,6,598,560],siwoo:[8,643,598,572],minwoo:[617,643,598,572]})[id],sheet:id+'-expressions-v20',sheetSplit:512,sheetCenters:[256,256],moods,expressionFrames:frames,faces:moods.map(m=>faces[frames[m]])});
const girl=(id,name,short,roleNo,quote)=>({id,name,short,roleNo,gender:'여학생',role:roleNo+'번 · '+roles[roleNo-1],quote,atlas:id+'-expressions-v30',atlasSize:[1024,1536],atlasFrames:{neutral:[0,0,512,768],nervous:[512,0,512,768],surprised:[0,768,512,768],smile:[512,768,512,768]},moods,expressionFrames:frames,faces:moods.map(m=>faces[frames[m]])});
export const HEROES=[
 boy('yunjae','서윤재','윤재',1,'이번에는 내 말로 전하고 싶어.'),
 boy('doha','강도하','도하',2,'내가 옮긴 자리부터 같이 확인하자.'),
 boy('siwoo','차시우','시우',3,'일단 뭘 확인해야 하는지부터 보자.'),
 boy('minwoo','정민우','민우',4,'정리하기 전에 찍은 사진이 있어.'),
 girl('harin','이하린','하린',1,'지금 놓치면 또 말 못 할 것 같아.'),
 girl('soyeon','오소연','소연',2,'이번엔 확인하고 옮길게. 같이 찾자.'),
 girl('jian','정지안','지안',3,'기록이랑 실제 장치를 맞춰 보자.'),
 girl('naeun','문나은','나은',4,'작은 차이도 사진에는 남아 있거든.')
];
export const DEFAULT_ACTORS=['yunjae','doha','siwoo','minwoo'];
export const ROLE_OPTIONS=[1,2,3,4].map(roleNo=>({roleNo,label:roles[roleNo-1],actors:HEROES.filter(h=>h.roleNo===roleNo)}));
const seoa={...ORIGINAL_CAST[1],id:'seoa',gender:'여학생',quote:'정리 끝나면, 약속한 데서 보자.',role:'고백 상대 · 퍼즐에 참여하지 않음',atlas:'seoa-anime-v24',atlasSize:[1254,1254],atlasFrames:{neutral:[10,6,611,560],smile:[632,6,611,560],shy:[632,6,611,560],surprised:[10,632,611,558],disgust:[632,632,611,558]},moods,endingAsset:'ending-disgust-v23'};
const doyun={id:'doyun',name:'이도윤',short:'도윤',gender:'남학생',quote:'응, 끝나면 그쪽으로 갈게.',role:'고백 상대 · 퍼즐에 참여하지 않음',atlas:'doyun-expressions-v30',atlasSize:[1024,1536],atlasFrames:{neutral:[0,0,512,768],smile:[512,0,512,768],surprised:[0,768,512,768],disgust:[512,768,512,768]},moods};
export const RECIPIENTS=[seoa,doyun];
export const heroById=id=>HEROES.find(h=>h.id===id);
export const recipientById=id=>RECIPIENTS.find(c=>c.id===id)||RECIPIENTS[0];
export const normalizeHero=id=>heroById(id)?.id||'yunjae';
export const normalizeRecipient=id=>recipientById(id).id;
export function normalizeCasting(value={}){
 const actors=DEFAULT_ACTORS.map((fallback,n)=>heroById(value?.actors?.[n])?.roleNo===n+1?value.actors[n]:fallback);
 return {actors,recipient:normalizeRecipient(value?.recipient)};
}
export function castingForHero(id,recipient='seoa',base={}){
 const out=normalizeCasting({...base,recipient}),actor=heroById(normalizeHero(id));out.actors[actor.roleNo-1]=actor.id;return out;
}
export function castForHero(id='yunjae',recipient='seoa',base={}){
 const c=typeof id==='object'?normalizeCasting(id):castingForHero(id,recipient,base);
 return [heroById(c.actors[0]),recipientById(c.recipient),...c.actors.slice(1).map(heroById)];
}
export const roleNames=casting=>normalizeCasting(casting).actors.map(id=>heroById(id).short);
export const hasFinalConsonant=name=>{const n=String(name).codePointAt(String(name).length-1)-0xac00;return n>=0&&n<=11171&&n%28!==0;};
export const withParticle=(name,pair)=>name+(hasFinalConsonant(name)?pair.split('/')[0]:pair.split('/')[1]);
const particles={은:'은/는',는:'은/는',이:'이/가',가:'이/가',을:'을/를',를:'을/를',과:'과/와',와:'과/와',아:'아/야',야:'아/야',이랑:'이랑/랑',랑:'이랑/랑'};
// One pass prevents a newly substituted name from being treated as another source name.
// Only story copy passes through this function; teacher-authored subject material stays intact.
export function characterText(text,selection='yunjae',recipient='seoa'){
 const cast=castForHero(selection,recipient),original=['서윤재','한서아','강도하','차시우','정민우'];
 const map=new Map(original.flatMap((full,n)=>[[full,cast[n].name],[full.slice(1),cast[n].short]]));
 return String(text).replace(/(서윤재|한서아|강도하|차시우|정민우|윤재|서아|도하|시우|민우)(이랑|은|는|이|가|을|를|과|와|아|야|랑)?/g,(_,name,particle)=>{
  const replacement=map.get(name);return replacement+(particle?(hasFinalConsonant(replacement)?particles[particle].split('/')[0]:particles[particle].split('/')[1]):'');
 });
}
export function characterDialogue(list,selection='yunjae',recipient='seoa'){
 return list.map(([who,text,options])=>[who,characterText(text,selection,recipient),options?{...options,label:options.label?characterText(options.label,selection,recipient):options.label}:undefined]);
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moodFrame=m=>frames[m]??0;
export function portraitHTML(actor,extra='',expression=null){
 if(!actor)return '';
 const mood=expression||'neutral';
 if(actor.atlasFrames){
  const aliases={nervous:'nervous',sheepish:'nervous',panicked:'surprised',concerned:'surprised',amused:'smile',warm:'smile',excited:'smile',sincere:'neutral',shy:'smile'};
  const f=actor.atlasFrames[mood]||actor.atlasFrames[aliases[mood]]||actor.atlasFrames.neutral;
  const [x,y,w,h]=f,[aw,ah]=actor.atlasSize;
  return `<svg class="portrait anime-portrait ${extra}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(actor.name)} · ${escape(mood)}" data-expression="${escape(mood)}"><image href="./assets/${actor.atlas}.webp" width="${aw}" height="${ah}"/></svg>`;
 }
 if(expression===null&&actor.atlasFrame){const [x,y,w,h]=actor.atlasFrame,[aw,ah]=actor.atlasSize;return `<svg class="portrait anime-portrait ${extra}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(actor.name)}"><image href="./assets/${actor.atlas}.webp" width="${aw}" height="${ah}"/></svg>`;}
 const frame=moodFrame(mood),x=(frame%2)*512,y=Math.floor(frame/2)*768;
 return `<svg class="portrait expression-sprite ${extra}" viewBox="${x} ${y} 512 768" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(actor.name)} · ${escape(mood)}" data-expression="${escape(mood)}"><image href="./assets/${actor.sheet}.webp" width="1024" height="1536"/></svg>`;
}
