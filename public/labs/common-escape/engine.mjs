import {answerMatches,exitCode,gridCells,PLAY_ORDER} from './content.mjs';
import {SAMPLE} from './sample.mjs';
export const VERSION=6;
export const ROOMS={classroom:{name:'교실',no:'01',caption:'마지막 수업이 끝난 자리'},library:{name:'도서관',no:'02',caption:'반납되지 않은 기록'},broadcast:{name:'방송실',no:'03',caption:'전원이 꺼진 마이크'},entrance:{name:'중앙 현관',no:'04',caption:'운동장이 보이는 문'}};
export const CARDS=['desk1','desk2','board','notebook'],PHOTOS=['chair','book','notice'];
export const LIBRARY_BOOKS={A:{spot:'checkout',where:'대출대'},B:{spot:'books',where:'반납 도서 선반'},C:{spot:'footprints',where:'책장 사이'},D:{spot:'book',where:'안쪽 책장'}};
export const PHOTO_DIGITS=SAMPLE.devices.photoDigits,SYMBOL_KEY=SAMPLE.devices.key,SYMBOL_GRID=SAMPLE.devices.grid,EXIT_ROUTE=SAMPLE.devices.route;
export const ROUTE_ARROWS={right:'→',down:'↓',left:'←',up:'↑'};
export const rotatedGrid=(turns=0,devices=SAMPLE.devices)=>gridCells(devices,turns);
export const exitSide=turns=>['top','right','bottom','left'][(3+turns)%4];
export const EXIT_CODE_LENGTH=exitCode(SAMPLE.devices).length;
export const fresh=()=>({version:VERSION,started:false,room:'entrance',cards:[],libraryBooks:[],flags:[],photos:[],hints:{},gridTurns:0,seen:[],journal:[],sound:true,soft:false,finished:false});
export const has=(s,f)=>s.flags.includes(f);
export function goal(s){
 if(s.finished)return {id:'end',chapter:'탈출',title:'학교 밖으로',text:'현관문을 나왔다. 멈춰 있던 시간이 다시 흐른다.'};
 if(has(s,'unlocked'))return {id:'exit',chapter:'마지막 방송',title:'학교 밖으로',text:'중앙 현관의 열린 문을 통해 밖으로 나가세요.'};
 if(has(s,'relay'))return {id:'final',chapter:'마지막 방송',title:'중앙 현관의 잠금',text:'중앙 현관에서 모은 기록으로 문을 열 방법을 찾으세요.'};
 if(has(s,'order'))return {id:'relay',chapter:'남은 비상등',title:'현관의 점검 기록',text:'중앙 현관에서 비상 회로의 점검 기록을 확인하세요.'};
 if(s.photos.length===3)return {id:'drawer',chapter:'달라진 자리',title:'다시 방송실로',text:'방송실로 돌아가 찾아낸 흔적이 어디에 쓰이는지 확인하세요.'};
 if(has(s,'power'))return {id:'photos',chapter:'달라진 자리',title:'달라진 흔적',text:'사진 속 장소들을 다시 둘러보고 달라진 흔적을 찾으세요.'};
 if(has(s,'compared'))return {id:'power',chapter:'다른 방송',title:'방송실의 장치',text:'방송실에서 현관 전원을 켤 방법을 찾으세요.'};
 if(has(s,'monitor'))return {id:'compare',chapter:'다른 방송',title:'방송실의 기록',text:'방송실에서 대본과 실제 방송을 비교하세요.'};
 if(has(s,'script'))return {id:'monitor',chapter:'켜진 화면',title:'방송실의 화면',text:'방송실에서 화면에 남은 기록을 확인하세요.'};
 if(has(s,'archive'))return {id:'books',chapter:'종이에 남은 기록',title:'도서관의 자료',text:'도서관 반납 도서의 보관 덮개를 확인하세요.'};
 if(has(s,'returns'))return {id:'archive',chapter:'천장 너머',title:'떨어진 보관 상자',text:'도서관 바닥에 떨어진 상자를 확인하세요.'};
 if(has(s,'locker-records'))return s.libraryBooks?.length===4?{id:'return',chapter:'종이에 남은 기록',title:'모아 둔 반납 도서',text:'도서관에서 모은 책을 반납할 곳을 확인하세요.'}:{id:'library-records',chapter:'종이에 남은 기록',title:'도서관의 기록',text:'도서관에 남겨진 기록을 찾으세요.'};
 if(has(s,'locker'))return {id:'locker-contents',chapter:'남겨진 교실',title:'사물함 안의 기록',text:'교실에서 잠금이 풀린 사물함을 확인하세요.'};
 if(s.cards.length===4)return {id:'locker',chapter:'남겨진 교실',title:'교실에 모인 기록',text:'교실에서 모은 기록이 어디에 쓰이는지 확인하세요.'};
 return {id:'records',chapter:'남겨진 교실',title:'교실에 남겨진 기록',text:'교실에 남겨진 기록을 찾으세요.'};
}
export const PUZZLE_EVENTS={P1:'locker',P2:'returns',P3:'script',P4:'compare',P5:'power',P6:'order',P7:'unlock',P8:'archive',P9:'monitor',P10:'relay'};
export const ROOM_FOR={collect:'classroom',locker:'classroom','locker-open':'classroom','locker-records':'classroom','library-book':'library',returns:'library','box-open':'library',archive:'library',script:'library',monitor:'broadcast',transcript:'broadcast',compare:'broadcast',power:'broadcast',order:'broadcast',relay:'entrance',unlock:'entrance',exit:'entrance'};
export function previewState(id){
 const s=fresh();s.started=true;s.seen=['opening:complete'];s.cards=[...CARDS];
 const index=PLAY_ORDER.indexOf(id);
 s.flags=PLAY_ORDER.slice(0,index).map(pid=>({compare:'compared',unlock:'unlocked'})[PUZZLE_EVENTS[pid]]||PUZZLE_EVENTS[pid]);
 if(index>0){s.flags.push('locker-open','locker-records');s.libraryBooks=Object.keys(LIBRARY_BOOKS);}
 if(index>=2)s.flags.push('box-open');
 if(index>=5)s.flags.push('transcript');
 if(index>=8)s.photos=[...PHOTOS];
 s.room=ROOM_FOR[PUZZLE_EVENTS[id]];return s;
}
export function act(state,event,lesson=SAMPLE){
 const s=structuredClone(state);let accepted=false;
 const flag=f=>{if(!has(s,f)){s.flags.push(f);accepted=true;}};
 const room=r=>s.room===r;
 const solved=id=>answerMatches(lesson.puzzles.find(p=>p.id===id),event.answer);
 if(event.type==='start'){s.started=true;accepted=true;}
 if(event.type==='move'&&ROOMS[event.room]&&!s.finished){s.room=event.room;accepted=true;}
 if(event.type==='collect'&&room('classroom')&&CARDS.includes(event.id)&&!s.cards.includes(event.id)){s.cards.push(event.id);accepted=true;}
 if(event.type==='locker'&&room('classroom')&&s.cards.length===4&&solved('P1'))flag('locker');
 if(event.type==='locker-open'&&room('classroom')&&has(s,'locker'))flag('locker-open');
 if(event.type==='locker-records'&&room('classroom')&&has(s,'locker-open'))flag('locker-records');
 if(event.type==='library-book'&&room('library')&&has(s,'locker-records')&&Object.hasOwn(LIBRARY_BOOKS,event.id)&&!s.libraryBooks.includes(event.id)){s.libraryBooks.push(event.id);accepted=true;}
 if(event.type==='returns'&&room('library')&&has(s,'locker-records')&&s.libraryBooks.length===4&&solved('P2'))flag('returns');
 if(event.type==='box-open'&&room('library')&&has(s,'returns'))flag('box-open');
 if(event.type==='archive'&&room('library')&&has(s,'box-open')&&solved('P8'))flag('archive');
 if(event.type==='script'&&room('library')&&has(s,'archive')&&solved('P3'))flag('script');
 if(event.type==='rotate-grid'&&has(s,'script')&&[-1,1].includes(event.delta)){s.gridTurns=(s.gridTurns+event.delta+4)%4;accepted=true;}
 if(event.type==='monitor'&&room('broadcast')&&has(s,'script')&&solved('P9'))flag('monitor');
 if(event.type==='transcript'&&room('broadcast')&&has(s,'monitor'))flag('transcript');
 if(event.type==='compare'&&room('broadcast')&&has(s,'monitor')&&has(s,'script')&&has(s,'transcript')&&solved('P4'))flag('compared');
 if(event.type==='power'&&room('broadcast')&&has(s,'compared')&&solved('P5'))flag('power');
 const photoRoom={chair:'classroom',book:'library',notice:'entrance'};
 if(event.type==='photo'&&has(s,'power')&&room(photoRoom[event.id])&&!s.photos.includes(event.id)&&PHOTOS.includes(event.id)){s.photos.push(event.id);accepted=true;}
 if(event.type==='order'&&room('broadcast')&&has(s,'power')&&s.photos.length===3&&event.code===lesson.devices.photoOrder.map(id=>lesson.devices.photoDigits[id]).join(''))flag('order');
 if(event.type==='relay'&&room('entrance')&&has(s,'order')&&solved('P10'))flag('relay');
 if(event.type==='unlock'&&room('entrance')&&has(s,'relay')&&has(s,'power')&&has(s,'locker-records')&&has(s,'script')&&has(s,'order')&&event.code===exitCode(lesson.devices))flag('unlocked');
 if(event.type==='exit'&&room('entrance')&&has(s,'unlocked')){s.finished=true;accepted=true;}
 if(event.type==='hint'&&lesson.puzzles.some(p=>p.id===event.id)){s.hints[event.id]=Math.min(3,(s.hints[event.id]||0)+1);accepted=true;}
 if(event.type==='seen'&&!s.seen.includes(event.id)){s.seen.push(event.id);accepted=true;}
 if(event.type==='journal'&&!s.journal.some(j=>j.id===event.id)){s.journal.push({id:event.id,title:event.title,text:event.text});accepted=true;}
 if(event.type==='setting'&&['sound','soft'].includes(event.key)){s[event.key]=!!event.value;accepted=true;}
 return {state:s,accepted};
}
export function restore(raw){
 if(!raw||![4,5,VERSION].includes(raw.version))return fresh();
 const flags=Array.isArray(raw.flags)?[...raw.flags]:[];
 // Version 4 already granted both records on solving P1. Preserve that progress.
 if(raw.version===4&&flags.includes('locker'))for(const f of ['locker-open','locker-records'])if(!flags.includes(f))flags.push(f);
 // Preserve stages already passed in a saved seven-puzzle game.
 if(raw.version<VERSION){
  if(flags.includes('script'))for(const f of ['box-open','archive'])if(!flags.includes(f))flags.push(f);
  if(flags.includes('compared')&&!flags.includes('monitor'))flags.push('monitor');
  if(flags.includes('unlocked')&&!flags.includes('relay'))flags.push('relay');
 }
 const libraryBooks=raw.version===4&&flags.includes('returns')?Object.keys(LIBRARY_BOOKS):Array.isArray(raw.libraryBooks)?raw.libraryBooks.filter(x=>Object.hasOwn(LIBRARY_BOOKS,x)):[];
 return {...fresh(),...raw,version:VERSION,flags,libraryBooks:[...new Set(libraryBooks)],room:ROOMS[raw.room]?raw.room:'classroom',cards:Array.isArray(raw.cards)?raw.cards.filter(x=>CARDS.includes(x)):[],photos:Array.isArray(raw.photos)?raw.photos.filter(x=>PHOTOS.includes(x)):[],hints:raw.hints||{},seen:Array.isArray(raw.seen)?raw.seen:[],journal:Array.isArray(raw.journal)?raw.journal:[]};
}
export function inventory(s){const items=[];
 if(s.cards.length)items.push({id:'records',name:'수업 기록',sub:`${s.cards.length}/4장`});
 if(has(s,'locker-records'))items.push({id:'slip',name:'반납 확인표',sub:'도서관'},{id:'key',name:'기호표',sub:'기록 1'});
 if(s.libraryBooks?.length)items.push({id:'library-books',name:'반납 도서',sub:`${s.libraryBooks.length}/4권`});
 if(has(s,'returns'))items.push({id:'returns',name:'반납 목록',sub:'도서 4권'});
 if(has(s,'archive'))items.push({id:'archive-key',name:'보관함 열쇠',sub:'도서관'});
 if(has(s,'script'))items.push({id:'script',name:'방송 대본',sub:'원본'},{id:'grid',name:'배치표',sub:'기록 2'});
 if(has(s,'transcript'))items.push({id:'transcript',name:'방송 기록',sub:'17:40'});
 if(has(s,'power'))items.push({id:'photos',name:'사진 세 장',sub:`${s.photos.length}/3 확인`});
 if(has(s,'order'))items.push({id:'order',name:'순서표',sub:'기록 3'});
 return items;
}

export const solvedFlag=id=>({compare:'compared',unlock:'unlocked'})[PUZZLE_EVENTS[id]]||PUZZLE_EVENTS[id];
export function progress(s){const solved=PLAY_ORDER.filter(id=>has(s,solvedFlag(id)));return {solved,current:PLAY_ORDER.find(id=>!solved.includes(id))||null,total:PLAY_ORDER.length,finished:s.finished,lastProgressAt:s.lastProgressAt||null};}
// Only the next unsolved puzzle can be bypassed; preserve local and shared history.
export function forcePuzzle(state,id){
 if(state.finished||progress(state).current!==id)throw new Error('현재 미해결 퍼즐만 통과시킬 수 있습니다. 현황을 새로 확인해 주세요.');
 const s=structuredClone(state),prep=previewState(id);
 for(const key of ['cards','libraryBooks','flags','photos'])s[key]=[...new Set([...s[key],...prep[key]])];
 if(id==='P6')s.photos=[...PHOTOS];
 s.flags=[...new Set([...s.flags,solvedFlag(id)])];
 return s;
}
