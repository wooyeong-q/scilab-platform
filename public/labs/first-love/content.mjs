import {ContentError} from '../common-escape/content.mjs';
export {ContentError};
export const SCHEMA='TODAY-TO-YOU-1';
export const STAGES=[
 ['P1','classroom','order','오늘은 미루지 않기로 했다','책상 위 파일'],
 ['P2','library','match','같이 보던 책','반납대'],
 ['P3','library','classify','비밀 유지가 너무 철저한데','정리대'],
 ['P4','library','compare','수정본을 믿으면 안 되는 이유','전달표'],
 ['P5','club','route-match','내 것은 어느 쪽으로 갔는데','전달 기록'],
 ['P6','club','select-order','확성기는 왜 있는데','준비대'],
 ['P7','club','matrix','그냥 넣으면 안 되는 거야?','보관함'],
 ['P8','club','deduce','이제 네가 가면 돼','인수 기록'],
 ['P9','classroom','photo','아까와 같은 교실인데','사진 속 자리'],
 ['P10','classroom','integrate','결국, 내가 쓴 말','마지막 자료함'],
].map(([id,room,type,title,object])=>({id,room,type,title,object}));
export const HEADERS={
 설정:['항목','값','설명'],
 퍼즐:['퍼즐ID','장소','형식','제목','공동과제','공통자료','해설','힌트1','힌트2','힌트3'],
 자료:['퍼즐ID','자료ID','표시이름','내용','담당','정답','중간정답','기준자료','조건통과','그림주소','그림설명'],
 대상:['퍼즐ID','대상ID','종류','표시이름'],
 모둠단서:['퍼즐ID','자리','제목','내용'],
 장치:['항목','값','설명'],
};
const fail=m=>{throw new ContentError(m);};
const str=(v,label,max=1200,optional=false)=>{if(typeof v!=='string'&&typeof v!=='number')v='';const s=String(v).trim();if((!optional&&!s)||s.length>max)fail(label+': 내용을 확인해 주세요.');return s;};
const arr=(v,label,max=30)=>{if(!Array.isArray(v)||v.length>max)fail(label+': 개수를 확인해 주세요.');return v;};
const unique=(v,label)=>{if(new Set(v).size!==v.length)fail(label+': 중복이 있습니다.');};
const identifier=(v,label)=>{const s=str(v,label,24);if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(s)||['constructor','prototype','__proto__'].includes(s))fail(label+': 영문으로 시작하는 ID를 사용하세요.');return s;};
const num=(v,label,min,max)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail(label+`: ${min}~${max} 정수가 필요합니다.`);return n;};
export function rotated(grid,turns){let g=[...grid];for(let n=0;n<turns;n++)g=[g[6],g[3],g[0],g[7],g[4],g[1],g[8],g[5],g[2]];return g;}
export const DIRS={up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]};
export function walk(grid,start,steps){let i=grid.indexOf(start);if(i<0)return null;const trace=[i];for(const dir of steps){const d=DIRS[dir];if(!d)return null;const y=Math.floor(i/3)+d[0],x=i%3+d[1];if(y<0||y>2||x<0||x>2)return null;i=y*3+x;trace.push(i);}return {cell:i,symbol:grid[i],trace};}
export function finalAnswer(d){const w=walk(rotated(d.grid,d.turns),d.start,d.route);if(!w)fail('장치: 이동 경로가 위치표 밖으로 나갑니다.');return {turns:d.turns,start:d.start,trace:w.trace,drawer:d.drawers[w.symbol]};}
export function validateLesson(input){
 if(!input||input.schema!==SCHEMA)fail('설정!양식버전: 오늘, 너에게 전용 TODAY-TO-YOU-1 양식을 사용하세요.');
 const meta=Object.fromEntries(['title','subject','unit','grade'].map(k=>[k,str(input.meta?.[k],'설정 '+k,100)]));
 const endings={positiveMax:num(input.endings?.positiveMax,'설정 미소_최대오답',0,99),neutralMax:num(input.endings?.neutralMax,'설정 당황_최대오답',1,199)};
 if(endings.neutralMax<=endings.positiveMax)fail('설정: 당황 최대 오답은 미소 최대 오답보다 커야 합니다.');
 const raw=arr(input.puzzles,'퍼즐',8);if(raw.length!==8)fail('퍼즐: P1~P8을 한 번씩 입력하세요. P9~P10은 고정 관찰·통합 단계입니다.');unique(raw.map(p=>p.id),'퍼즐ID');
 const puzzles=STAGES.slice(0,8).map(stage=>{
  const src=raw.find(p=>p.id===stage.id),label='퍼즐 '+stage.id;if(!src||src.type!==stage.type||src.room!==stage.room)fail(label+': 장소·형식 고정값을 유지하세요.');
  const p={...stage,task:str(src.task,label+' 공동과제'),reference:str(src.reference,label+' 공통자료',2000,true),explanation:str(src.explanation,label+' 해설',2000),hints:arr(src.hints,label+' 힌트',3).map((v,i)=>str(v,label+' 힌트'+(i+1)))};
  if(p.hints.length!==3)fail(label+': 힌트 3개가 필요합니다.');
  p.items=arr(src.items,label+' 자료',8).map((i,n)=>{
   const at=`자료 ${stage.id} ${n+1}번째`,image=str(i.image,at+' 그림주소',700000,true);
   if(image&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image))fail(at+': 그림은 엑셀에 포함한 500KB 이하 PNG·JPG·WEBP만 지원합니다.');
   if(image&&image.length>667000)fail(at+': 그림이 500KB를 넘습니다.');
   return {id:identifier(i.id,at+' 자료ID'),label:str(i.label,at+' 표시이름',50),text:str(i.text,at+' 내용'),owner:num(i.owner,at+' 담당',0,4),answer:str(i.answer,at+' 정답',24,true),via:str(i.via,at+' 중간정답',24,true),original:str(i.original,at+' 기준자료',1200,true),passes:arr(i.passes||[],at+' 조건통과',4).map(v=>num(v,at+' 조건통과',1,4)),image,alt:str(i.alt,at+' 그림설명',180,true)};
  });
  unique(p.items.map(i=>i.id),label+' 자료ID');
  const count=['classify','select-order','deduce'].includes(p.type)?8:4;if(p.items.length!==count)fail(label+`: 자료 ${count}개가 필요합니다.`);
  p.targets=arr(src.targets||[],label+' 대상',12).map(t=>({id:identifier(t.id,label+' 대상ID'),kind:str(t.kind,label+' 대상 종류',12),label:str(t.label,label+' 대상 이름',180)}));unique(p.targets.map(t=>t.id),label+' 대상ID');
  if(p.targets.some(t=>!['대상','중간','도착','수정'].includes(t.kind)))fail(label+': 대상 종류를 확인하세요.');
  p.clues=arr(src.clues,label+' 모둠단서',4).map(c=>({role:num(c.role,label+' 자리',1,4),title:str(c.title,label+' 단서 제목',80),text:str(c.text,label+' 단서 내용',1500)}));
  if(p.clues.length!==4||p.clues.map(c=>c.role).sort().join()!=='1,2,3,4')fail(label+': 자리 1~4의 서로 다른 단서가 필요합니다.');
  unique(p.clues.map(c=>c.text),label+' 자리별 단서 내용');
  if(['compare','deduce'].includes(p.type)){if(p.items.some(i=>i.owner!==0))fail(label+': 자료 담당은 공통 0입니다. 기준/조건은 모둠단서로 나눕니다.');}
  else for(let role=1;role<=4;role++)if(p.items.filter(i=>i.owner===role).length!==count/4)fail(label+': 각 자리에 자료를 같은 수로 나누세요.');
  const targetIds=kind=>p.targets.filter(t=>t.kind===kind).map(t=>t.id);
  if(['order','select-order'].includes(p.type)){
   if(p.targets.length||p.items.filter(i=>i.answer!=='제외').map(i=>i.answer).sort().join()!=='1,2,3,4')fail(label+': 정답 1~4를 한 번씩, 나머지는 제외로 입력하세요. 대상 시트는 비웁니다.');
   if(p.type==='select-order'&&[1,2,3,4].some(r=>p.items.filter(i=>i.owner===r&&i.answer!=='제외').length!==1))fail(label+': 각 자리의 두 자료 중 한 장만 유효해야 합니다.');
  }else if(p.type==='compare'){
   const fixes=targetIds('수정');if(fixes.length<4||p.targets.some(t=>t.kind!=='수정'))fail(label+': 수정 설명 조각 4개 이상이 필요합니다.');
   for(const i of p.items){if(!i.original||!['유지',...fixes].includes(i.answer))fail(label+': 기준자료와 유지/수정조각ID 정답이 필요합니다.');if((i.original===i.text)!==(i.answer==='유지'))fail(label+': 기준자료의 일치 여부와 정답이 다릅니다.');if(i.answer!=='유지'&&p.targets.find(t=>t.id===i.answer).label!==i.original)fail(label+': 수정 조각의 내용이 기준자료와 다릅니다.');}
   if(!p.items.some(i=>i.answer==='유지')||!p.items.some(i=>i.answer!=='유지'))fail(label+': 유지와 수정 항목을 섞으세요.');
  }else if(p.type==='deduce'){
   if(p.targets.length)fail(label+': 후보는 자료 시트에만 넣으세요.');
   p.items.forEach(i=>unique(i.passes,label+' 조건통과'));
   const survivors=p.items.filter(i=>i.passes.length===4);if(survivors.length!==1)fail(label+': 네 조건을 모두 통과하는 후보가 하나여야 합니다.');
   if(p.items.some(i=>i.answer!==(i.passes.length===4?'가능':'제외')))fail(label+': 조건통과와 가능/제외 정답이 다릅니다.');
   for(let r=1;r<=4;r++)if(p.items.filter(i=>[1,2,3,4].filter(n=>n!==r).every(n=>i.passes.includes(n))).length<2)fail(label+`: ${r}번 조건 없이도 답이 정해집니다. 네 조건이 모두 필요하도록 고치세요.`);
  }else if(p.type==='route-match'){
   const mid=targetIds('중간'),end=targetIds('도착');if(mid.length!==2||end.length!==4||p.targets.length!==6||p.items.some(i=>!mid.includes(i.via)||!end.includes(i.answer)))fail(label+': 중간 지점 2개, 도착함 4개와 두 단계 정답이 필요합니다.');unique(p.items.map(i=>i.answer),label+' 최종 도착함');
  }else{
   const ids=targetIds('대상'),n=p.type==='classify'?2:4;if(ids.length!==n||p.targets.length!==n||p.items.some(i=>!ids.includes(i.answer)))fail(label+': 대상 수 또는 정답 참조가 다릅니다.');
   if(ids.some(id=>!p.items.some(i=>i.answer===id)))fail(label+': 비어 있는 대상이 있습니다.');
   if(p.type!=='classify')unique(p.items.map(i=>i.answer),label+' 대응 정답');
   if(p.type==='matrix'){const a=p.targets.map(t=>t.label.split('|').map(s=>s.trim()));if(a.some(x=>x.length!==2||!x[0]||!x[1])||a[0][0]!==a[1][0]||a[2][0]!==a[3][0]||a[0][1]!==a[2][1]||a[1][1]!==a[3][1]||a[0][0]===a[2][0]||a[0][1]===a[1][1])fail(label+': 2×2 대상을 행1|열1, 행1|열2, 행2|열1, 행2|열2 순서로 입력하세요.');}
  }
  return p;
 });
 const d=input.devices||{},grid=arr(d.grid,'장치 배치표',9).map(v=>str(v,'장치 표식',4));if(grid.length!==9)fail('장치: 표식은 9개입니다.');unique(grid,'장치 표식');
 const devices={grid,start:str(d.start,'장치 시작표식',4),turns:num(d.turns,'장치 회전',0,3),route:arr(d.route,'장치 이동경로',12).map(String),drawers:Object.fromEntries(grid.map(s=>[s,str(d.drawers?.[s],'장치 자료함 대응',1)]))};
 if(!grid.includes(devices.start)||devices.route.length<4||devices.route.some(s=>!DIRS[s]))fail('장치: 시작표식과 4~12칸 경로를 확인하세요.');
 if(Object.values(devices.drawers).sort().join()!=='A,B,C,D,E,F,G,H,I')fail('장치: 자료함 A~I를 한 번씩 연결하세요.');finalAnswer(devices);
 const lesson={schema:SCHEMA,meta,endings,puzzles,devices};if(JSON.stringify(lesson).length>2500000)fail('그림을 줄여 전체 자료를 2.5MB 이하로 저장하세요.');return lesson;
}
export function toSheets(l){const s=Object.fromEntries(Object.entries(HEADERS).map(([k,v])=>[k,[[...v]]]));
 s.설정.push(['양식버전',SCHEMA,'고정'],...Object.entries({title:'수업명',subject:'과목',unit:'단원',grade:'대상'}).map(([k,n])=>[n,l.meta[k],'교사 입력']),['미소_최대오답',l.endings.positiveMax,'시작한 수업에는 고정'],['당황_최대오답',l.endings.neutralMax,'그보다 많으면 부정 표정']);
 for(const p of l.puzzles){s.퍼즐.push([p.id,p.room,p.type,p.title,p.task,p.reference,p.explanation,...p.hints]);s.자료.push(...p.items.map(i=>[p.id,i.id,i.label,i.text,i.owner,i.answer,i.via,i.original,i.passes.join('|'),i.image,i.alt]));s.대상.push(...p.targets.map(t=>[p.id,t.id,t.kind,t.label]));s.모둠단서.push(...p.clues.map(c=>[p.id,c.role,c.title,c.text]));}
 const d=l.devices;s.장치.push(['배치표',d.grid.join('|'),'왼쪽 위부터 9칸 / 표식 중복 금지'],['시작표식',d.start,'P2 책갈피'],['시계방향회전',d.turns,'P8 방향 표시 / 0~3'],['이동경로',d.route.join('|'),'P5 전달 기록 / 화면 기준 up right down left'],['자료함대응',d.grid.map(s=>d.drawers[s]).join('|'),'P9 관찰 / 배치표 표식 순서대로 A~I']);return s;}
export function fromSheets(sheets){const version=sheets.설정?.find(r=>r?.[0]==='양식버전')?.[1];if(version&&version!==SCHEMA)fail('설정!양식버전: 오늘, 너에게 전용 TODAY-TO-YOU-1 양식을 사용하세요.');const rows={};for(const [name,heads]of Object.entries(HEADERS)){const s=sheets[name];if(!Array.isArray(s))fail(name+': 시트가 없습니다.');const header=s.findIndex(r=>r?.[0]===heads[0]&&heads.every(h=>r.includes(h)));if(header<0)fail(name+': 열 이름을 유지하세요.');const h=s[header];if(h.filter(v=>v!=null&&v!=='').length!==heads.length)fail(name+': 알 수 없는 열이 있습니다.');rows[name]=s.slice(header+1).map((r,n)=>({r,n:header+n+2})).filter(({r})=>r?.some(v=>v!=null&&String(v).trim())).map(({r,n})=>({...Object.fromEntries(heads.map(k=>[k,r[h.indexOf(k)]??''])),_row:n}));}
 const parseSettings=name=>{unique(rows[name].map(r=>r.항목),name+' 항목');return Object.fromEntries(rows[name].map(r=>[r.항목,r.값]));},settings=parseSettings('설정'),d=parseSettings('장치');
 for(const name of ['퍼즐','자료','대상','모둠단서'])for(const r of rows[name])if(!STAGES.slice(0,8).some(s=>s.id===r.퍼즐ID))fail(`${name}!A${r._row}: P1~P8만 입력하세요. P9~P10은 공통 장면입니다.`);
 const split=v=>String(v??'').split('|').map(x=>x.trim()).filter(Boolean),grid=split(d.배치표),drawers=split(d.자료함대응);
 return validateLesson({schema:settings.양식버전,meta:{title:settings.수업명,subject:settings.과목,unit:settings.단원,grade:settings.대상},endings:{positiveMax:settings.미소_최대오답,neutralMax:settings.당황_최대오답},puzzles:rows.퍼즐.map(r=>({id:r.퍼즐ID,room:r.장소,type:r.형식,task:r.공동과제,reference:r.공통자료,explanation:r.해설,hints:[r.힌트1,r.힌트2,r.힌트3],items:rows.자료.filter(i=>i.퍼즐ID===r.퍼즐ID).map(i=>({id:i.자료ID,label:i.표시이름,text:i.내용,owner:i.담당,answer:i.정답,via:i.중간정답,original:i.기준자료,passes:split(i.조건통과),image:i.그림주소,alt:i.그림설명})),targets:rows.대상.filter(t=>t.퍼즐ID===r.퍼즐ID).map(t=>({id:t.대상ID,kind:t.종류,label:t.표시이름})),clues:rows.모둠단서.filter(c=>c.퍼즐ID===r.퍼즐ID).map(c=>({role:c.자리,title:c.제목,text:c.내용}))})),devices:{grid,start:d.시작표식,turns:d.시계방향회전,route:split(d.이동경로),drawers:Object.fromEntries(grid.map((s,i)=>[s,drawers[i]]))}});
}
