import {CAST as ORIGINAL_CAST} from './story.mjs?v=22';

const moods=['neutral','nervous','surprised','smile','excited','panicked','sincere','sheepish','amused','concerned','warm'];
const frames={neutral:0,nervous:1,surprised:2,smile:3,excited:3,panicked:2,sincere:0,sheepish:1,amused:3,concerned:2,warm:3};
const faces=['차분한 표정','수줍게 긴장한 표정','놀란 표정','미소'];
const boy=(id,name,short,role,quote)=>({id,name,short,role,quote,asset:id+'-v20',atlas:'cast-anime-v24',atlasSize:[1223,1286],atlasFrame:({yunjae:[8,6,598,560],doha:[617,6,598,560],siwoo:[8,643,598,572],minwoo:[617,643,598,572]})[id],sheet:id+'-expressions-v20',sheetSplit:512,sheetCenters:[256,256],moods,expressionFrames:frames,faces:moods.map(m=>faces[frames[m]])});
export const HEROES=[
 boy('yunjae','서윤재','윤재','1번 · 책갈피와 기억','편지는 내가 직접 전할게.'),
 boy('doha','강도하','도하','2번 · 설치 기록','내가 옮긴 자리부터 볼게.'),
 boy('siwoo','차시우','시우','3번 · 장치와 방향','이쪽은 내가 잡고 있을게.'),
 boy('minwoo','정민우','민우','4번 · 사진과 관찰','사진이랑 지금을 비교해 봐.')
];
export const normalizeHero=id=>HEROES.some(h=>h.id===id)?id:'yunjae';
// Selecting a player role never changes the romantic lead or the story cast.
export function castForHero(){
 return [HEROES[0],{...ORIGINAL_CAST[1],atlas:'seoa-anime-v24',atlasSize:[1254,1254],atlasFrames:{neutral:[10,6,611,560],smile:[632,6,611,560],shy:[632,6,611,560],surprised:[10,632,611,558]}},HEROES[1],HEROES[2],HEROES[3]];
}
export function characterText(text){return String(text);}
export function characterDialogue(list,id){
 return list.map(([who,text,options])=>[who,characterText(text,id),options?{...options,label:options.label?characterText(options.label,id):options.label}:undefined]);
}
