// Stable IDs preserve existing lesson references; PLAY_ORDER defines play order.
export const ADDITIONAL_STAGES=[
 {id:'P8',room:'도서관',type:'select-order',title:'떨어진 상자의 기록'},
 {id:'P9',room:'방송실',type:'matrix',title:'켜진 화면의 네 칸'},
 {id:'P10',room:'중앙 현관',type:'circuit',title:'비상 회로 점검'}
];
export const CIRCUIT_LINKS=[[0,1],[1,2],[2,3],[0,1,3]];
export function circuitLamps(switches=[]){const lamps=[false,false,false,false];switches.forEach((on,n)=>{if(on)for(const lamp of CIRCUIT_LINKS[n]||[])lamps[lamp]=!lamps[lamp];});return lamps;}
const item=(id,text,owner,answer)=>({id,label:'기록 '+id,text,owner,answer,original:'',image:'',alt:''});
const clue=(role,text)=>({role,title:role+'번의 확인 기록',text});
// Subject-neutral additions also upgrade older seven-puzzle Excel workbooks.
export function expansionPuzzles(){return [
 {...ADDITIONAL_STAGES[0],task:'오늘 보관한 기록만 한 장씩 골라, 기록에 적힌 시각이 빠른 순서대로 네 홈에 꽂으세요.',reference:'각 담당자의 기록 두 장 중 한 장만 오늘의 보관 조건에 맞는다. 나머지 네 장은 상자 안에 남겨 둔다.',intro:'천장 점검구에서 떨어진 상자다. 안쪽에는 기록을 끼우는 홈 네 개가 있다.',success:'기록을 맞추자 상자 바닥에서 보관함 열쇠가 나왔다. 반납 도서 아래의 덮개에 맞을 것 같다.',hints:['각자 가진 두 기록에서 오늘의 조건에 맞는 한 장을 찾으세요.','날짜와 확인 표시를 모두 대조한 뒤, 고른 네 기록의 시각을 비교하세요.','각자 한 장씩 골라야 합니다. 선택이 끝난 뒤 이른 시각부터 네 홈을 채우세요.'],
 items:[item('A','10월 20일 / 담당 확인 있음 / 17:32',1,'3'),item('B','10월 19일 / 담당 확인 있음 / 17:21',1,'제외'),item('C','10월 20일 / 담당 확인 없음 / 17:29',2,'제외'),item('D','10월 20일 / 담당 확인 있음 / 17:24',2,'1'),item('E','10월 20일 / 담당 확인 있음 / 17:36',3,'4'),item('F','10월 20일 / 담당 확인 없음 / 17:38',3,'제외'),item('G','10월 19일 / 담당 확인 있음 / 17:25',4,'제외'),item('H','10월 20일 / 담당 확인 있음 / 17:28',4,'2')],targets:[],clues:[clue(1,'오늘 보관한 기록의 날짜는 10월 20일이다.'),clue(2,'담당 확인이 없는 것은 접수 전의 초안이다. 보관할 기록에 넣지 않는다.'),clue(3,'선별이 끝나면 기록에 인쇄된 시각을 사용한다. 자료ID 순서로 넣지 않는다.'),clue(4,'네 홈은 왼쪽부터 가장 이른 시각, 그다음 시각 순이다. 각자 한 장씩 들어간다.')]},
 {...ADDITIONAL_STAGES[1],task:'기록의 장소와 시각을 함께 대조하여 화면의 네 칸에 복원하세요.',reference:'행은 장소, 열은 17:30 전후다. 두 조건이 모두 맞는 칸에 한 장씩 넣는다.',intro:'손대지 않은 모니터가 켜졌다. 녹음 장치와 연결된 네 칸에 기록이 섞여 있다.',success:'네 칸의 기록이 복구됐다. 책상 위 녹음 장치에 재생 표시가 들어왔다.',hints:['각 기록에 적힌 장소와 시각을 확인하세요.','시각이 직접 쓰이지 않은 기록은 담당자의 확인 메모와 연결하세요.','한 칸에는 한 장만 들어갑니다. 장소가 맞아도 시간대가 다르면 다른 칸입니다.'],
 items:[item('A','교실 / 하교 안내 5분 전',1,'T2'),item('B','도서관 / 점검 시작 5분 후',2,'T3'),item('C','교실 / 점검 시작 5분 전',3,'T1'),item('D','도서관 / 하교 안내 2분 전',4,'T4')],targets:[{id:'T1',label:'교실|17:30 이전'},{id:'T2',label:'교실|17:30 이후'},{id:'T3',label:'도서관|17:30 이전'},{id:'T4',label:'도서관|17:30 이후'}],clues:[clue(1,'하교 안내는 17:40이다. A의 시각은 그보다 5분 빠르다.'),clue(2,'점검 시작은 17:20이다. B는 그로부터 5분 뒤의 기록이다.'),clue(3,'점검 시작은 17:20이다. C는 그보다 5분 빠르다.'),clue(4,'하교 안내는 17:40이다. D는 그보다 2분 빠르다.')]},
 {...ADDITIONAL_STAGES[2],task:'점검 기록의 조건을 만족하는 표시등만 켜세요. 스위치 하나가 여러 표시등을 함께 바꿉니다.',reference:'스위치를 누르면 연결된 표시등이 켜짐과 꺼짐 사이에서 바뀐다. 네 표시등을 모두 점검한 뒤 회로를 확인한다.',intro:'현관 조명이 꺼졌다가 비상등만 남았다. 제어 장치 아래 점검판이 열려 있다.',success:'비상 회로가 안정됐다. 현관 번호 입력 장치에 전원이 돌아왔다.',hints:['각자 맡은 표시등이 켜져야 하는지 먼저 판단하세요.','스위치 아래의 연결 표시를 보세요. 한 번 누르면 연결된 등이 모두 반전됩니다.','어떤 스위치를 누르면 이미 맞춘 등이 바뀌는지 확인하세요. 같은 스위치를 두 번 누르면 원래대로 돌아옵니다.'],
 items:[item('A','창문 닫힘 / 잠금 확인',1,'켜짐'),item('B','자료 보관 / 담당 확인 없음',2,'꺼짐'),item('C','책 4권 / 반납 확인 4권',3,'켜짐'),item('D','교실 비어 있음 / 전등 켜짐',4,'꺼짐')],targets:[],clues:[clue(1,'A: 창문이 닫혀 있고 잠금도 확인되었을 때만 점검 완료로 켠다.'),clue(2,'B: 자료 보관과 담당 확인이 모두 끝났을 때만 켠다.'),clue(3,'C: 반납해야 할 책 수와 확인된 책 수가 같으면 켠다.'),clue(4,'D: 교실이 비어 있고 전등이 꺼졌을 때만 켠다.')]}
];}
