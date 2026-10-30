import {CAST as ORIGINAL_CAST} from './story.mjs?v=19';

const moods=['neutral','nervous','surprised','smile','excited','panicked','sincere','sheepish','amused','concerned','warm'];
const frames={neutral:0,nervous:1,surprised:2,smile:3,excited:3,panicked:2,sincere:0,sheepish:1,amused:3,concerned:2,warm:3};
const faces=['차분한 표정','수줍게 긴장한 표정','놀란 표정','미소'];
const boy=(id,name,short,role,quote)=>({id,name,short,role,quote,asset:id+'-v20',sheet:id+'-expressions-v20',sheetSplit:512,sheetCenters:[256,256],moods,expressionFrames:frames,faces:moods.map(m=>faces[frames[m]])});
export const HEROES=[
 boy('yunjae','서윤재','윤재','차분하고 단정한 모범생','오늘은, 내 마음을 말할게.'),
 boy('doha','강도하','도하','웃음 많은 장난꾸러기','장난 말고, 이번엔 진심이야.'),
 boy('siwoo','차시우','시우','짧은 머리의 든든한 야구부','떨려도, 정면으로 가 볼게.'),
 boy('minwoo','정민우','민우','세심하게 살피는 기록가','작은 순간들을 기억하고 있어.')
];
export const normalizeHero=id=>HEROES.some(h=>h.id===id)?id:'yunjae';
// Story indices are roles, not player seats. Swapping the lead keeps a friend
// from appearing twice; the heroine and all cooperative permissions stay fixed.
export function castForHero(id){
 const hero=HEROES.find(h=>h.id===normalizeHero(id));
 const cast=[HEROES[0],ORIGINAL_CAST[1],HEROES[1],HEROES[2]];
 const slot=cast.findIndex(c=>c.id===hero.id);
 if(slot>0)cast[slot]=HEROES[0];
 cast[0]=hero;
 return cast;
}
export function characterText(text,id){
 const cast=castForHero(id),names=new Map();
 ORIGINAL_CAST.forEach((c,i)=>{names.set(c.name,cast[i].name);names.set(c.short,cast[i].short);});
 return String(text).replace(/서윤재|한서아|강도하|차시우|윤재|서아|도하|시우/g,name=>names.get(name));
}
export function characterDialogue(list,id){
 return list.map(([who,text,options])=>[who,characterText(text,id),options?{...options,label:options.label?characterText(options.label,id):options.label}:undefined]);
}
