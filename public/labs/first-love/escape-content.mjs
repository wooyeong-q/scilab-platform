import {ContentError} from '../common-escape/content.mjs';
export const ESCAPE_SCHEMA='TODAY-TO-YOU-3';
export const ROLE_NAMES=['윤재','도하','시우','민우'];
export const ESCAPE_STAGES=[
 ['classroom','riddle','사라진 파란 봉투','칠판 아래 수수께끼'],
 ['classroom','jigsaw','남겨진 부스 배치도','찢어진 배치도'],
 ['library','dials','도서관의 작은 도구함','네 기호 자물쇠'],
 ['library','circuit','전원이 닿는 곳','전시 모형 연결판'],
 ['club','tools','조금 과했던 응원','현수막 뒤 선반'],
 ['club','film','겹쳐야 보이는 표시','투명 필름 작업대'],
 ['corridor','frames','뒤섞인 전시판','그림 슬라이드 전시판'],
 ['corridor','key','네가 하려던 말','열쇠 조립대'],
 ['classroom','photo','다시, 네 사람이 함께','수납함 점검 덮개'],
 ['classroom','integrate','결국, 내가 쓴 말','마지막 수납함']
].map(([room,type,title,object],i)=>({id:'P'+(i+1),room,type,title,object}));
export const REWARDS=[['배치도 조각 4개','조각을 돌리고 이어 보자.'],['부스 배치도','도서관 도구함과 다이얼을 읽는 방향을 찾았다.'],['전원 커넥터','연결판의 빈 소켓에 꽂을 수 있다.'],['소품함 걸쇠 해제','동아리실 소품함에서 도구를 꺼낼 수 있다.'],['투명 필름 두 장','밝은 작업대에서 겹쳐 볼 수 있다.'],['숨은 탭의 위치','복도 전시판 오른쪽 아래의 탭을 당겨 보자.'],['열쇠 조각 4개','전시판 옆 조립대에 끼울 수 있다.'],['점검 열쇠 · 위치표','교실 수납함의 점검 덮개를 열 수 있다.'],['교실 점검 기록','사진 속 사물과 수납함의 표식을 확인했다. 모은 기록을 마지막 수납함에 사용하자.'],['파란 편지 봉투','윤재가 쓴 편지를 되찾았다.']];
export const SOURCE_IDS={classroom:['file','shelf','plant','clock'],library:['bookmark','notebook','lamp','shelves'],club:['megaphone','ribbon','bag','memo'],corridor:['locker','bench','umbrella','window']};
export const clueKey=(id,role)=>`prop:${id}:${role}`;
export const escapeSource=(stage,role)=>SOURCE_IDS[ESCAPE_STAGES[stage].room]?.[role-1];
const fail=m=>{throw new ContentError(m);};
const clean=(v,label,max=100,optional=false)=>{const s=String(v??'').trim();if((!s&&!optional)||s.length>max)fail(label+`: ${max}자 이내로 작성하세요.`);return s;};
const item=(id,label,answer='',via='')=>({id,label,text:'',answer,via,owner:0,original:'',passes:[],image:'',alt:''});
const clue=(role,title,text)=>({role,title,text});
function fixed(n,task,reference,clues,items=[]){return {...ESCAPE_STAGES[n],task,reference,clues,items,targets:[],hints:['주변 사물에서 단서를 찾아보세요.','단서함에서 쓸 곳과 발견한 내용을 함께 확인하세요.','조작을 바꿔 보고 전체 모습을 확인하세요.'],explanation:REWARDS[n][1]};}
export const FIXED_PUZZLES={
 P1:fixed(0,'수수께끼의 물건을 들어 보고, 흩어진 조각을 찾으세요.','내 몸이 더러워질수록 칠판은 깨끗해진다. 쉬는 곳은 칠판 아래. 나는 누구일까?',[
 clue(1,'정리 쪽지','내 몸이 더러워질수록 칠판은 깨끗해진다. 쉬는 곳은 칠판 아래.'),clue(2,'책 밑의 조각','접힌 책 밑에서 배치도 조각을 찾았다. 선의 끝이 오른쪽으로 이어진다.'),clue(3,'화분 뒤의 조각','화분 뒤에서 배치도 조각을 찾았다. 종이에 위쪽을 가리키는 작은 표식이 있다.'),clue(4,'사진 뒤의 조각','사진 뒤에서 배치도 조각을 찾았다. 사진 속 종이의 바깥 테두리가 보인다.')]),
 P2:fixed(1,'조각을 선택해 놓고 돌린 뒤, 그림 전체를 확인하세요.','선과 그림의 연결을 살펴보세요.',[clue(1,'책이 있는 모서리','책 그림은 도서관을 나타낸다. 책 그림과 연결선이 끊어지지 않도록 잇는다.'),clue(2,'부스 연결선','선은 굽은 곳에서 끊기지 않는다. 서로 다른 두께의 선은 연결하지 않는다.'),clue(3,'위쪽 표식','작은 삼각형은 완성된 종이의 위쪽을 향한다.'),clue(4,'정리 전 사진','완성된 종이의 겉 테두리는 하나의 사각형이다.')],[item('A','조각 가','3','0'),item('B','조각 나','1','0'),item('C','조각 다','4','0'),item('D','조각 라','2','0')]),
 P5:fixed(4,'도구를 고른 뒤 사용할 곳을 누르세요.','선반 안쪽은 어두워 바로 보이지 않는다.',[clue(1,'봉투의 재질','내 편지는 불투명한 파란 봉투다. 틈에 낀 것은 얇고 빛이 비친다.'),clue(2,'옮긴 자리','현수막을 선반 앞으로 밀었다. 그 뒤 틈에 작은 봉투가 떨어졌다.'),clue(3,'틈 안의 반사','손은 들어가지 않는다. 거울로 안쪽을 먼저 볼 수 있겠다.'),clue(4,'정리 전 사진','집게 끝이 닿는 선반 안쪽에 얇은 봉투가 있었다.')]),
 P6:fixed(5,'필름을 움직이고 돌려 선을 겹쳐 보세요.','같은 모서리 표식을 포개면, 끊어진 표시가 이어진다.',[clue(1,'필름 A','두 개의 점이 있는 모서리가 위쪽이다. 그림에 비어 있는 선이 있다.'),clue(2,'필름 B','작은 점이 겹치는 자리에 맞춘다. 선을 따라 다음 장소를 읽는다.'),clue(3,'회전 표식','필름 B의 두 개의 점을 필름 A의 점 위에 놓는다.'),clue(4,'전시판 사진','복도 전시판은 모서리에 탭이 숨어 있다. 겹친 표시가 그 위치를 가리킨다.')])
};
export function validateEscapePuzzles(raw){
 if(!Array.isArray(raw)||raw.length!==8||new Set(raw.map(p=>p?.id)).size!==8)fail('퍼즐: P1~P8을 한 번씩 입력하세요.');
 return ESCAPE_STAGES.slice(0,8).map((stage,n)=>{
  const p=raw.find(p=>p.id===stage.id);if(!p||p.type!==stage.type||p.room!==stage.room)fail(`${stage.id}: 고정된 장소·장치 형식을 유지하세요.`);
  if(FIXED_PUZZLES[stage.id])return structuredClone(FIXED_PUZZLES[stage.id]);
  const out={...stage,task:clean(p.task,stage.id+' 조작',65),reference:clean(p.reference,stage.id+' 공통자료',120,true),explanation:clean(p.explanation,stage.id+' 해설',2000),hints:(p.hints||[]).map(h=>clean(h,'힌트',90)),targets:[]};
  if(out.hints.length!==3)fail(stage.id+': 힌트는 3개입니다.');
  out.clues=(p.clues||[]).map(c=>({role:Number(c.role),title:clean(c.title,'단서 제목',24),text:clean(c.text,'개인 단서',150)}));
  if(out.clues.length!==4||out.clues.map(c=>c.role).sort().join('')!=='1234'||new Set(out.clues.map(c=>c.text)).size!==4)fail(stage.id+': 네 역할마다 서로 다른 단서를 작성하세요.');
  if(!Array.isArray(p.items)||p.items.length!==(stage.type==='key'?4:6))fail(stage.id+': 다이얼·단자·슬라이드는 6개, 열쇠는 4조각입니다.');
  out.items=p.items.map((i,j)=>{
   if(i.id!=='ABCDEF'[j])fail(stage.id+': 자료ID는 A부터 차례대로 입력하세요.');
   const image=String(i.image||'');if(image&&(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image)||image.length>667000))fail('그림은 500KB 이하 PNG·JPG·WEBP입니다.');
   return {...item(i.id,clean(i.label,'자료 이름',18),clean(i.answer,'정답',30,true),clean(i.via,'방향',2,true)),text:clean(i.text,'자료 내용',50,true),image,alt:clean(i.alt,'그림 설명',100,true)};
  });
  if(['dials','circuit'].includes(stage.type)){
   const answers=out.items.flatMap(i=>i.answer.split('|').filter(Boolean));
   if(answers.sort().join('')!=='1234')fail(stage.id+': 정답 열에 해당 다이얼·입력선 번호 1~4를 한 번씩 배정하세요. 같은 자료는 1|3처럼 함께 쓸 수 있습니다.');
  }else{
   if(out.items.map(i=>i.answer).filter(a=>a!=='제외').sort().join('')!=='1234'||out.items.some(i=>!['1','2','3','4','제외'].includes(i.answer)))fail(stage.id+': 정답 1~4를 한 번씩 배정하고 쓰지 않는 슬라이드는 제외로 입력하세요.');
   if(out.items.some(i=>!['0','1'].includes(i.via)))fail(stage.id+': 중간정답에 앞면 0 또는 뒤집음 1을 입력하세요.');
  }
  return out;
 });
}
