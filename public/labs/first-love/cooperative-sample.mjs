import {validateLesson,STAGES} from './content.mjs';
import {SAMPLE as LEGACY} from './sample.mjs';
import {COOP_SCHEMA} from './cooperative.mjs';
// The example teaches information sharing. Teachers replace observations AND
// their curriculum-based interpretation, never the engine's numeric rules.
const item=(id,label,text,answer)=>({id,label,text,answer,owner:0});
function choose(stage,n){
 const features=n===1?['파랑','원','두 줄','종이']:n===4?['노랑','별','한 줄','천']:['초록','네모','세 줄','나무'];
 const others=['빨강','세모','네 줄','금속'];
 const shift=n%6,profile=i=>(i+shift)%6;
 const cards=Array.from({length:6},(_,i)=>item('ABCDEF'[i],`기록 ${'가나다라마바'[i]}`,features.map((v,j)=>profile(i)===j+1||profile(i)===5?others[j]:v).join(' · '),profile(i)===0?'선택':'제외'));
 const clues=features.map((v,i)=>({role:i+1,title:['색 관찰','모양 관찰','줄 관찰','재질 관찰'][i],text:`내 관찰 기록의 ${['색','모양','줄 수','재질'][i]}: ${v}`,rule:cards.filter((_,j)=>profile(j)!==i+1&&profile(j)!==5).map(x=>x.id).join('|')}));
 return {...stage,type:'choose',task:'네 관찰과 모두 맞는 기록 한 장을 고르세요.',reference:'친구에게 서로 다른 관찰 결과를 물어보세요.',explanation:`${cards.find(c=>c.answer==='선택').label}만 네 관찰을 함께 만족합니다. 각 관찰을 빼면 해당 특징만 다른 기록도 남습니다.`,hints:['색·모양·줄 수·재질의 관찰을 모으세요.','조건이 다른 기록을 하나씩 비교하세요.','마지막 기록을 누르고 정답 확인을 누르세요.'],items:cards,targets:[],clues};
}
function order(stage){return {...stage,type:'order',task:'네 전달 메모를 모아 봉투를 순서대로 놓으세요.',reference:'메모의 앞·뒤는 왼쪽에서 오른쪽 순서입니다.',explanation:'나 → 라 → 가 → 다. 네 조건 중 하나라도 빼면 순서가 둘 이상 가능합니다.',hints:['네 사람이 받은 전달 메모를 하나씩 읽으세요.','앞뒤 관계와 붙어 있는지를 함께 확인하세요.','봉투를 누른 뒤 놓을 순서 칸을 누르세요.'],items:[...'ABCD'].map((id,i)=>item(id,`봉투 ${'가나다라'[i]}`,'',[3,1,4,2][i]+'')),targets:[],clues:[['앞뒤 메모','가 봉투는 나 봉투보다 뒤에 놓는다.','A>B'],['간격 메모','가 봉투와 나 봉투는 붙여 놓지 않는다.','A!~B'],['전달 메모','가 봉투는 라 봉투보다 뒤에 놓는다.','A>D'],['끝자리 메모','가 봉투는 마지막에 놓지 않는다.','A!=4']].map(([title,text,rule],i)=>({role:i+1,title,text,rule}))};}
function classify(stage,n){
 const words=n===0?['달리다','책','예쁘다','웃다']:n===3?['−3','+7','−8','+2']:['고양이','장미','민들레','강아지'];
 const labels=n===0?['명사','동사','형용사']:n===3?['양수','음수']:['동물','식물'];
 const answers=n===0?[2,1,3,2]:n===3?[2,1,2,1]:[1,2,2,1];
 const clues=words.map((word,i)=>({role:i+1,title:`메모 ${'가나다라'[i]}의 정보`,text:`메모 ${'가나다라'[i]}에 적힌 ${n===0?'낱말':n===3?'수':'생물'}: ${word}`,rule:'ABCD'[i]+'=T'+answers[i]}));
 return {...stage,type:'classify',task:'각자 가진 정보를 모아 네 메모를 분류하세요.',reference:n===0?'낱말을 품사에 따라 분류합니다.':n===3?'0보다 크면 양수, 작으면 음수입니다.':'관찰한 생물을 동물과 식물로 분류합니다.',explanation:words.map((w,i)=>`${'가나다라'[i]}: ${w} → ${labels[answers[i]-1]}`).join('\n'),hints:['각 메모에 적힌 정보를 담당 친구에게 물어보세요.','같은 분류함에 여러 메모가 들어갈 수 있어요.','메모를 누른 뒤 분류함을 누르세요.'],items:[...'ABCD'].map((id,i)=>item(id,`메모 ${'가나다라'[i]}`,'담당자의 단서와 연결','T'+answers[i])),targets:labels.map((label,i)=>({id:'T'+(i+1),label,kind:'대상'})),clues};
}
function dress(p,n){
 const names=['메모','책','봉투','기록표','반납함','연결표','상자','인수 봉투'];
 const tasks=['메모를 알맞은 주머니에 넣어 파일을 여세요.','관찰 기록과 맞는 책을 찾아 꺼내세요.','봉투를 순서대로 끼워 서랍을 여세요.','기록표를 맞는 칸에 놓고 확인 도장을 누르세요.','네 기록과 맞는 반납함의 걸쇠를 여세요.','연결표를 순서대로 꽂고 레버를 내리세요.','상자를 맞는 칸에 넣어 보관함을 여세요.','네 기록과 맞는 봉투를 찾아 인수함을 여세요.'];
 p.task=tasks[n];
 const old=p.type==='choose'?'기록':p.type==='order'?'봉투':'메모';
 const rename=t=>t.replaceAll(old,names[n]);
 p.items=p.items.map((i,j)=>({...i,label:`${names[n]} ${'가나다라마바'[j]}`,text:p.type==='classify'?'':i.text}));
 p.clues=p.clues.map(c=>({...c,title:rename(c.title),text:rename(c.text)}));
 p.explanation=rename(p.explanation);p.reference=rename(p.reference);
 p.hints=[`장치의 쪽지와 덮개를 눌러 각자 기록을 찾아보세요.`,p.type==='choose'?'네 관찰에 모두 맞는 물건인지 비교하세요.':p.type==='order'?'앞뒤 관계와 이웃한 자리를 함께 확인하세요.':'기록에 나온 정보를 분류 기준과 대조하세요.',p.type==='choose'?'물건을 선택한 뒤 아래 손잡이 버튼을 누르세요.':`${names[n]}를 누르고 놓을 곳을 누른 뒤 장치를 작동하세요.`];
 return p;
}
export const COOPERATIVE_SAMPLE=validateLesson({schema:COOP_SCHEMA,meta:{title:'오늘, 너에게 · 함께 맞추는 기록',subject:'협동 시연 자료',unit:'국어·수학·관찰 예시',grade:'공통'},endings:LEGACY.endings,devices:LEGACY.devices,puzzles:STAGES.slice(0,8).map((stage,n)=>[1,4,7].includes(n)?choose(stage,n):[2,5].includes(n)?order(stage):classify(stage,n)).map(dress)});
