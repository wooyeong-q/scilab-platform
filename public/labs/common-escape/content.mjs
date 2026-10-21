// The same contract is used by Excel import, teacher preview and the server.
import {ADDITIONAL_STAGES,expansionPuzzles} from './expansion.mjs';
export const SCHEMA = 'LAST-BROADCAST-3';
export const PLAY_ORDER=['P1','P2','P8','P3','P9','P4','P5','P6','P10','P7'];
export const STAGES = [
  ['P1','교실','order','흩어진 수업 기록'],
  ['P2','도서관','match','반납 도서 대응'],
  ['P3','도서관','classify','책 사이의 자료'],
  ['P4','방송실','compare','대본과 다른 방송'],
  ['P5','방송실','connect','제어함 연결'],
  ['P6','학교 지도','photo','사진에 없던 흔적'],
  ['P7','중앙 현관','route','현관의 마지막 잠금'],
].map(([id,room,type,title])=>({id,room,type,title})).concat(ADDITIONAL_STAGES);
export const HEADERS = {
  '설정':['항목','값','설명'],
  '퍼즐':['퍼즐ID','장소','형식','제목','공동과제','공통자료','도입대사','완료대사','힌트1','힌트2','힌트3'],
  '자료':['퍼즐ID','자료ID','표시이름','내용','담당','정답','기준자료','그림주소','그림설명'],
  '대상':['퍼즐ID','대상ID','표시이름'],
  '모둠단서':['퍼즐ID','자리','제목','내용'],
  '장치':['항목','값','설명'],
};
export class ContentError extends Error { constructor(message,status=400){super(message);this.name='ContentError';this.status=status;} }
const problem=message=>{throw new ContentError(message);};
const clean=(v,label,max=1000,required=true)=>{
  if(typeof v!=='string'&&typeof v!=='number'&&v!=null)problem(label+': 글자 또는 숫자를 입력해 주세요.');
  const s=String(v??'').normalize('NFC').trim();
  if(required&&!s)problem(label+': 내용이 비어 있어요.');
  if(s.length>max)problem(label+`: ${max}자 이하로 줄여 주세요.`);
  if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s))problem(label+': 지원하지 않는 문자가 있어요.');
  return s;
};
const array=(v,label,max=50)=>{if(!Array.isArray(v)||v.length>max)problem(label+': 자료 개수를 확인해 주세요.');return v;};
const unique=(values,label)=>{if(new Set(values).size!==values.length)problem(label+': 중복된 값이 있어요.');};
const norm=s=>String(s).replace(/\s+/g,' ').trim();
export const DEFAULT_DEVICES={photoDigits:{chair:'7',book:'2',notice:'5'},photoOrder:['book','notice','chair'],key:{'○':'6','△':'2','□':'8','☆':'4','◇':'9','＋':'1'},grid:['○','△','☆','◇','□','○','△','＋','◇'],start:2,skip:6,route:['right','down','right','down','left','up']};
export const DEVICE_ROWS=[
  ['사진_의자','7','교실 의자에서 찾는 숫자. 0~9 한 자리.'],
  ['사진_책','2','도서관 책에서 찾는 숫자. 0~9 한 자리.'],
  ['사진_게시물','5','현관 게시물에서 찾는 숫자. 0~9 한 자리.'],
  ['사진_순서','book|notice|chair','chair, book, notice를 한 번씩 |로 구분. 4번 자리에게 보임.'],
  ['기호_○','6','기호표의 숫자. 여섯 기호는 서로 다른 한 자리 숫자.'],
  ['기호_△','2','기호표의 숫자.'],['기호_□','8','기호표의 숫자.'],['기호_☆','4','기호표의 숫자.'],['기호_◇','9','기호표의 숫자.'],['기호_＋','1','기호표의 숫자.'],
  ['배치표','○|△|☆|◇|□|○|△|＋|◇','회전 전 3×3 칸. 왼쪽 위부터 가로로 9개.'],
  ['시작칸',3,'회전 전 칸 번호 1~9.'],['제외칸',7,'회전 전 칸 번호 1~9. 시작칸과 다르게.'],
  ['이동경로','right|down|right|down|left|up','현관 표시를 아래로 돌린 뒤 경로. right/down/left/up. 6~12번.'],
];
export function gridCells(devices,turns=0){
  let cells=devices.grid.map((symbol,i)=>({symbol,start:i===devices.start,skip:i===devices.skip}));
  for(let t=0;t<((turns%4)+4)%4;t++)cells=Array.from({length:9},(_,i)=>cells[(2-i%3)*3+Math.floor(i/3)]);
  return cells;
}
export function exitCode(devices){
  const cells=gridCells(devices,3);let pos=cells.findIndex(c=>c.start),answer='',skipped=false;
  for(const direction of devices.route){
    const delta=({right:[1,0],down:[0,1],left:[-1,0],up:[0,-1]})[direction];
    if(!delta)problem('장치 · 이동경로: 방향을 확인해 주세요.');
    const x=pos%3+delta[0],y=Math.floor(pos/3)+delta[1];
    if(x<0||x>2||y<0||y>2)problem('장치 · 이동경로: 현관 표시를 아래로 돌린 뒤 경로가 배치표 밖으로 나갑니다.');
    pos=y*3+x;if(cells[pos].skip)skipped=true;else answer+=devices.key[cells[pos].symbol];
  }
  if(!skipped||answer.length<5||answer.length>10)problem('장치 · 이동경로: 제외칸을 한 번 이상 지나고, 남는 번호가 5~10자리여야 합니다.');
  return answer;
}
export function validateLesson(input){
  if(input?.schema==='LAST-BROADCAST-2'&&input.puzzles?.length===7){
    input={...input,schema:SCHEMA,puzzles:[...input.puzzles.map(p=>p.id==='P2'?{...p,success:'반납함의 확인 표시가 켜졌다. 천장 쪽에서 무언가 움직이는 소리가 났다.'}:p),...expansionPuzzles()]};
  }
  if(!input||input.schema!==SCHEMA)problem('새 공용 퍼즐 양식을 사용해 주세요. 예전 12문제 양식은 이 버전과 다릅니다.');
  const meta={};for(const [k,n]of Object.entries({title:'수업명',subject:'과목',unit:'단원',grade:'대상'}))meta[k]=clean(input.meta?.[k],`설정 · ${n}`,80);
  if(array(input.puzzles,'퍼즐',10).length!==10)problem('퍼즐: P1~P10 열 단계를 모두 넣어 주세요.');
  unique(input.puzzles.map(p=>p.id),'퍼즐ID');
  const puzzles=STAGES.map(stage=>{
    const src=input.puzzles.find(p=>p.id===stage.id);if(!src||src.type!==stage.type||src.room!==stage.room)problem(`${stage.id}: 장소와 형식을 양식 그대로 유지해 주세요.`);
    const label=stage.id;const p={...stage};
    for(const [k,max]of Object.entries({title:80,task:500,reference:2000,intro:200,success:200}))p[k]=clean(src[k],`${label} · ${k}`,max,k!=='reference');
    p.hints=array(src.hints,`${label} 힌트`,3).map((v,i)=>clean(v,`${label} · 힌트${i+1}`,500));
    if(p.hints.length!==3)problem(`${label}: 단계별 힌트 3개가 필요해요.`);
    p.items=array(src.items||[],`${label} 자료`,12).map((r,i)=>{
      const where=`자료 · ${label} ${i+1}행`,owner=Number(r.owner);
      if(!Number.isInteger(owner)||owner<0||owner>4)problem(where+': 담당은 공통 0 또는 자리 1~4입니다.');
      const image=clean(r.image,where+' 그림주소',700000,false),alt=clean(r.alt,where+' 그림설명',200,false);
      if(image&&!/^https:\/\/[^\s<>]+$/i.test(image)&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image))problem(where+': HTTPS 또는 PNG/JPG/WEBP 그림을 사용해 주세요.');
      if(image&&!alt)problem(where+': 그림설명을 넣어 주세요.');
      const row={id:clean(r.id,where+' 자료ID',30),label:clean(r.label,where+' 표시이름',80),text:clean(r.text,where+' 내용',900),owner,answer:clean(r.answer,where+' 정답',40),original:clean(r.original,where+' 기준자료',900,false),image,alt};
      if(!/^[A-Za-z0-9_-]+$/.test(row.id))problem(where+': 자료ID는 영문·숫자·밑줄·하이픈만 사용해 주세요.');
      return row;
    });
    unique(p.items.map(r=>r.id),label+' 자료ID');
    p.targets=array(src.targets||[],`${label} 대상`,4).map(r=>({id:clean(r.id,label+' 대상ID',20),label:clean(r.label,label+' 대상 이름',100)}));
    unique(p.targets.map(r=>r.id),label+' 대상ID');
    if(p.targets.some(r=>!/^T[1-4]$/.test(r.id)))problem(label+': 대상ID는 T1~T4입니다.');
    p.clues=array(src.clues||[],label+' 모둠단서',4).map(r=>({role:Number(r.role),title:clean(r.title,label+' 단서 제목',80),text:clean(r.text,label+' 단서 내용',1200)}));
    if(['photo','route'].includes(p.type)){
      if(p.items.length||p.targets.length||p.clues.length)problem(label+': 자료와 역할 단서는 장치 시트에서 자동으로 만듭니다.');
      return p;
    }
    if(p.clues.length!==4||[1,2,3,4].some(r=>!p.clues.some(c=>c.role===r)))problem(label+': 모둠단서는 1~4번 자리가 각각 하나씩 필요해요.');
    if(p.type==='select-order'){
      if(p.items.length!==8||p.targets.length)problem(label+': 선별 자료 8개를 넣고 대상은 비워 주세요.');
      if(p.items.filter(i=>i.answer!=='제외').map(i=>i.answer).sort().join(',')!=='1,2,3,4'||p.items.filter(i=>i.answer==='제외').length!==4)problem(label+': 정답 1~4를 한 번씩, 제외를 네 번 사용해 주세요.');
      if([1,2,3,4].some(r=>p.items.filter(i=>i.owner===r).length!==2||p.items.filter(i=>i.owner===r&&i.answer!=='제외').length!==1))problem(label+': 각 자리에 두 장씩, 그중 한 장만 선택하도록 배정해 주세요.');
      return p;
    }
    if(p.type==='classify'){
      if(p.items.length!==8||p.targets.length<2||p.targets.length>4)problem(label+': 분류 자료 8개와 분류함 2~4개가 필요해요.');
    }else if(p.items.length!==4)problem(label+': 자료가 정확히 4개여야 해요.');
    if(['order','classify','connect','matrix','circuit'].includes(p.type)&&[1,2,3,4].some(r=>!p.items.some(i=>i.owner===r)))problem(label+': 각 자리에 서로 다른 자료를 하나 이상 배정해 주세요.');
    if(p.type==='match'&&(p.items.map(i=>i.id).sort().join(',')!=='A,B,C,D'||p.items.some(i=>i.owner!==0)))problem(label+': 도서 자료ID A~D와 공통 담당 0을 양식 그대로 유지해 주세요.');
    if(p.type==='circuit'){
      if(p.targets.length||p.items.map(i=>i.id).join(',')!=='A,B,C,D'||p.items.some(i=>!['켜짐','꺼짐'].includes(i.answer))||!p.items.some(i=>i.answer==='켜짐')||!p.items.some(i=>i.answer==='꺼짐'))problem(label+': 표시등 A~D와 켜짐/꺼짐 정답을 사용하고, 두 상태를 모두 포함해 주세요.');
      return p;
    }
    if(p.type==='matrix'){
      const axes=p.targets.map(t=>t.label.split('|').map(s=>s.trim()));
      if(p.targets.map(t=>t.id).join(',')!=='T1,T2,T3,T4'||axes.some(a=>a.length!==2||a.some(v=>!v))||axes[0][0]!==axes[1][0]||axes[2][0]!==axes[3][0]||axes[0][1]!==axes[2][1]||axes[1][1]!==axes[3][1]||axes[0][0]===axes[2][0]||axes[0][1]===axes[1][1])problem(label+': 대상 T1~T4를 행1|열1, 행1|열2, 행2|열1, 행2|열2 순서로 작성해 주세요.');
    }
    if(p.type==='order'){
      if(p.targets.length)problem(label+': 순서 칸은 자동으로 만들므로 대상 시트에 넣지 마세요.');
      if(p.items.map(i=>i.answer).sort().join(',')!=='1,2,3,4')problem(label+': 정답 순서는 중복 없이 1~4입니다.');
    }else if(p.type==='compare'){
      if(p.targets.length||p.items.some(i=>i.owner!==0||!i.original||!['일치','수정'].includes(i.answer)))problem(label+': 방송 자료는 담당 0, 기준자료, 일치/수정 정답이 필요해요.');
      if(p.items.some(i=>(norm(i.text)===norm(i.original))!==(i.answer==='일치')))problem(label+': 녹음과 기준자료의 일치 여부가 정답과 다릅니다.');
      if(!p.items.some(i=>i.answer==='수정')||!p.items.some(i=>i.answer==='일치'))problem(label+': 일치하는 방송과 수정할 방송을 모두 넣어 주세요.');
    }else{
      if(['match','connect','matrix'].includes(p.type)&&p.targets.length!==4)problem(label+': 대상 4개가 필요해요.');
      if(p.items.some(i=>!p.targets.some(t=>t.id===i.answer)))problem(label+': 자료의 정답이 대상ID와 연결되지 않습니다.');
      if(p.type!=='classify')unique(p.items.map(i=>i.answer),label+' 대응 정답');
      if(p.targets.some(t=>!p.items.some(i=>i.answer===t.id)))problem(label+': 비어 있는 분류함 또는 대상이 있어요.');
    }
    return p;
  });
  const src=input.devices||{},devices={};
  devices.photoDigits=Object.fromEntries(['chair','book','notice'].map(id=>{const s=clean(src.photoDigits?.[id],'장치 사진 숫자',1);if(!/^\d$/.test(s))problem('장치: 사진 숫자는 0~9 한 자리입니다.');return [id,s];}));
  devices.photoOrder=array(src.photoOrder,'장치 사진 순서',3).map(String);
  if([...devices.photoOrder].sort().join(',')!=='book,chair,notice')problem('장치: 사진 순서에 chair, book, notice를 한 번씩 넣어 주세요.');
  devices.key=Object.fromEntries(['○','△','□','☆','◇','＋'].map(s=>{const v=clean(src.key?.[s],'장치 기호_'+s,1);if(!/^\d$/.test(v))problem('장치: 기호는 0~9에 대응합니다.');return [s,v];}));
  unique(Object.values(devices.key),'장치 기호 숫자');
  devices.grid=array(src.grid,'장치 배치표',9).map(String);
  if(devices.grid.length!==9||devices.grid.some(s=>!(s in devices.key)))problem('장치: 배치표에는 지정된 기호 9개가 필요해요.');
  for(const k of ['start','skip']){devices[k]=Number(src[k]);if(!Number.isInteger(devices[k])||devices[k]<0||devices[k]>8)problem('장치: 칸 번호는 1~9입니다.');}
  if(devices.start===devices.skip)problem('장치: 시작칸과 제외칸이 같습니다.');
  devices.route=array(src.route,'장치 경로',12).map(String);if(devices.route.length<6)problem('장치: 이동 경로는 6번 이상입니다.');
  exitCode(devices);
  const lesson={schema:SCHEMA,meta,puzzles,devices};
  if(JSON.stringify(lesson).length>2500000)problem('자료 용량이 큽니다. 그림의 크기를 줄여 주세요.');
  return lesson;
}
export function fromSheets(sheets){
  const rows={};for(const [name,headers]of Object.entries(HEADERS)){
    const source=sheets[name];if(!Array.isArray(source))problem(name+' 시트가 없어요.');
    const start=source.findIndex(r=>r?.[0]===headers[0]&&headers.every(h=>r.includes(h)));
    if(start<0)problem(name+': 양식의 열 이름을 유지해 주세요.');
    if(source[start].filter(v=>v!=null&&v!=='').length!==headers.length)problem(name+': 양식에 없는 열이 있어요.');
    const cols=headers.map(h=>source[start].indexOf(h));
    rows[name]=source.slice(start+1).filter(r=>r&&r.some(v=>v!=null&&String(v).trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[cols[i]]??''])));
  }
  for(const name of ['설정','장치'])unique(rows[name].map(r=>r.항목),name+' 항목');
  const settings=Object.fromEntries(rows.설정.map(r=>[r.항목,r.값])),d=Object.fromEntries(rows.장치.map(r=>[r.항목,r.값]));
  for(const name of ['자료','대상','모둠단서'])if(rows[name].some(r=>!STAGES.some(p=>p.id===r.퍼즐ID)))problem(name+': 알 수 없는 퍼즐ID가 있어요.');
  if(rows.설정.some(r=>!['양식버전','수업명','과목','단원','대상'].includes(r.항목)))problem('설정: 양식에 없는 항목이 있어요.');
  if(rows.장치.length!==DEVICE_ROWS.length||rows.장치.some(r=>!DEVICE_ROWS.some(([k])=>k===r.항목)))problem('장치: 양식의 항목을 그대로 유지해 주세요.');
  const split=v=>String(v??'').split('|').map(s=>s.trim());
  return validateLesson({schema:settings.양식버전,meta:{title:settings.수업명,subject:settings.과목,unit:settings.단원,grade:settings.대상},puzzles:rows.퍼즐.map(r=>({id:r.퍼즐ID,room:r.장소,type:r.형식,title:r.제목,task:r.공동과제,reference:r.공통자료,intro:r.도입대사,success:r.완료대사,hints:[r.힌트1,r.힌트2,r.힌트3],items:rows.자료.filter(i=>i.퍼즐ID===r.퍼즐ID).map(i=>({id:i.자료ID,label:i.표시이름,text:i.내용,owner:i.담당,answer:i.정답,original:i.기준자료,image:i.그림주소,alt:i.그림설명})),targets:rows.대상.filter(i=>i.퍼즐ID===r.퍼즐ID).map(i=>({id:i.대상ID,label:i.표시이름})),clues:rows.모둠단서.filter(i=>i.퍼즐ID===r.퍼즐ID).map(i=>({role:i.자리,title:i.제목,text:i.내용}))})),devices:{photoDigits:{chair:d.사진_의자,book:d.사진_책,notice:d.사진_게시물},photoOrder:split(d.사진_순서),key:Object.fromEntries(['○','△','□','☆','◇','＋'].map(s=>[s,d['기호_'+s]])),grid:split(d.배치표),start:Number(d.시작칸)-1,skip:Number(d.제외칸)-1,route:split(d.이동경로)}});
}
export function toSheets(lesson){
  const sheets=Object.fromEntries(Object.entries(HEADERS).map(([name,h])=>[name,[h]]));
  sheets.설정.push(['양식버전',SCHEMA,'고정값'],...Object.entries({title:'수업명',subject:'과목',unit:'단원',grade:'대상'}).map(([k,n])=>[n,lesson.meta[k],'교사가 지정한 수업 정보']));
  for(const p of PLAY_ORDER.map(id=>lesson.puzzles.find(p=>p.id===id))){
    sheets.퍼즐.push([p.id,p.room,p.type,p.title,p.task,p.reference,p.intro,p.success,...p.hints]);
    sheets.자료.push(...p.items.map(i=>[p.id,i.id,i.label,i.text,i.owner,i.answer,i.original||'',i.image||'',i.alt||'']));
    sheets.대상.push(...p.targets.map(t=>[p.id,t.id,t.label]));
    sheets.모둠단서.push(...p.clues.map(c=>[p.id,c.role,c.title,c.text]));
  }
  const d=lesson.devices,values={'사진_의자':d.photoDigits.chair,'사진_책':d.photoDigits.book,'사진_게시물':d.photoDigits.notice,'사진_순서':d.photoOrder.join('|'),'배치표':d.grid.join('|'),'시작칸':d.start+1,'제외칸':d.skip+1,'이동경로':d.route.join('|'),...Object.fromEntries(Object.entries(d.key).map(([k,v])=>['기호_'+k,v]))};
  sheets.장치.push(...DEVICE_ROWS.map(([k,,note])=>[k,values[k],note]));return sheets;
}
export function answerMatches(p,answer){
  if(!p)return false;
  if(p.type==='order'||p.type==='select-order')return Array.isArray(answer)&&answer.length===4&&answer.every((id,i)=>p.items.some(r=>r.id===id&&Number(r.answer)===i+1));
  if(p.type==='compare'){
    const expected=['STORY1','STORY2',...p.items.filter(i=>i.answer==='수정').map(i=>i.id)];
    return Array.isArray(answer)&&new Set(answer).size===answer.length&&answer.length===expected.length&&expected.every(id=>answer.includes(id));
  }
  return answer&&typeof answer==='object'&&!Array.isArray(answer)&&Object.keys(answer).length===p.items.length&&p.items.every(i=>answer[i.id]===i.answer);
}
export const STORY_LINES=[
  {id:'STORY1',label:'하교 안내',text:'교내에 남아 있는 학생은 교실로 이동해 주십시오.',original:'교내에 남아 있는 학생은 중앙 현관으로 이동해 주십시오.'},
  {id:'STORY2',label:'퇴실 안내',text:'교실 문은 닫아 두시기 바랍니다.',original:'퇴실할 때 교실 문은 열어 두시기 바랍니다.'},
];
export function unlockedPuzzles(s){return ['P1',...(s.flags.includes('locker-records')?['P2']:[]),...(s.flags.includes('box-open')?['P8']:[]),...(s.flags.includes('archive')?['P3']:[]),...(s.flags.includes('script')?['P9']:[]),...(s.flags.includes('monitor')?['P4']:[]),...(s.flags.includes('compared')?['P5']:[]),...(s.flags.includes('power')?['P6']:[]),...(s.flags.includes('order')?['P10']:[]),...(s.flags.includes('relay')?['P7']:[])];}
export function playerContent(lesson,roles,s){
  const available=unlockedPuzzles(s);
  return {meta:lesson.meta,puzzles:lesson.puzzles.filter(p=>available.includes(p.id)).map(p=>({id:p.id,type:p.type,room:p.room,title:p.title,task:p.task,reference:p.reference,intro:p.intro,success:p.success,targets:p.targets,items:p.items.map(({answer,original,...i})=>{
    const unfound=p.id==='P2'&&!s.libraryBooks?.includes(i.id);
    const hidden=unfound||(i.owner>0&&(!roles.includes(i.owner)||(p.id==='P1'&&!s.cards.includes(['desk1','desk2','board','notebook'][i.owner-1]))));
    return hidden?{id:i.id,label:i.label,owner:i.owner,hidden:true,...(unfound?{unfound:true}:{})}:{...i,hidden:false};
  }),clues:p.clues.filter(c=>roles.includes(c.role)).map(c=>({...c,...(p.type==='compare'?{original:p.items[c.role-1].original,record:p.items[c.role-1].label}:{}),...(p.id==='P1'&&!s.cards.includes(['desk1','desk2','board','notebook'][c.role-1])?{text:'교실에 남겨진 담당 기록을 먼저 찾아야 한다.'}:{} )})),hints:p.hints.slice(0,s.hints?.[p.id]||0)})),exitLength:exitCode(lesson.devices).length};
}
