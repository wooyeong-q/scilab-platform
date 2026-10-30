import {CAST} from './story.mjs';
import {ESCAPE_STAGES} from './escape-content.mjs';
export {CAST};
export const STORY_VERSION=7;
export const ROOMS={
 "classroom": {
  "name": "교실",
  "caption": "축제 부스의 마지막 수납함",
  "art": "classroom",
  "unlock": 0
 },
 "library": {
  "name": "도서관",
  "caption": "도서부의 작은 도구함",
  "art": "library",
  "unlock": 2
 },
 "club": {
  "name": "동아리실",
  "caption": "방송부 소품 보관실",
  "art": "club",
  "unlock": 4
 },
 "corridor": {
  "name": "복도",
  "caption": "철거를 기다리는 전시판",
  "art": "corridor",
  "unlock": 6
 },
 "courtyard": {
  "name": "벚꽃길",
  "caption": "편지를 손에 쥐고",
  "art": "courtyard",
  "unlock": 10
 },
 "bench": {
  "name": "벚꽃나무 아래",
  "caption": "말하고 싶었던 한마디",
  "art": "cherry",
  "unlock": 10
 }
};
export const OPENING=[
 [
  0,
  "서아야, 정리 끝나면 뒤뜰 벤치에서 잠깐 볼래?",
  {
   "channel": "phone",
   "room": "classroom",
   "arrival": [
    2,
    3,
    4
   ]
  }
 ],
 [
  1,
  "응. 나 전시판만 내리면 끝나.",
  {
   "channel": "phone"
  }
 ],
 [
  0,
  "알겠어. 나도 정리하고 갈게.",
  {
   "channel": "phone"
  }
 ],
 [
  -1,
  "문자를 고치는 사이, 도하가 파란 봉투를 종이 소품과 함께 쓸어 담았다.",
  {
   "room": "classroom",
   "reaction": {
    "actor": 2,
    "expression": "neutral"
   }
  }
 ],
 [
  2,
  "보냈어?",
  {
   "expression": "sheepish"
  }
 ],
 [
  0,
  "왜 너희가 더 조용해.",
  {
   "expression": "nervous"
  }
 ],
 [
  3,
  "전송 누르는 거 보고 있었지.",
  {
   "expression": "amused"
  }
 ],
 [
  4,
  "세 번 지웠잖아.",
  {
   "expression": "neutral"
  }
 ],
 [
  2,
  "됐네, 이제 편지만 챙기면—",
  {
   "expression": "sheepish"
  }
 ],
 [
  0,
  "여기 있던 파란 봉투는?",
  {
   "expression": "surprised"
  }
 ],
 [
  2,
  "…그거 소품 아니었어?",
  {
   "expression": "panicked"
  }
 ],
 [
  0,
  "어디 넣었어.",
  {
   "expression": "surprised"
  }
 ],
 [
  2,
  "뒤에 수납함.",
  {
   "expression": "panicked"
  }
 ],
 [
  3,
  "잠겼어.",
  {
   "expression": "concerned"
  }
 ],
 [
  2,
  "닫으면 바로 잠기는 줄은 몰랐어.",
  {
   "expression": "panicked"
  }
 ],
 [
  0,
  "알았어, 누가 열기 전에 꺼내자.",
  {
   "expression": "nervous"
  }
 ]
];
export const BEFORE={
 "2": [
  [
   3,
   "이번엔 손잡이부터 내리지 마.",
   {
    "expression": "amused",
    "room": "library"
   }
  ],
  [
   2,
   "나도 이제 알아.",
   {
    "expression": "sheepish"
   }
  ],
  [
   4,
   "옆에 붙은 자료가 서로 다른데.",
   {
    "expression": "neutral"
   }
  ]
 ],
 "4": [
  [
   0,
   "그거 왜 숨겨.",
   {
    "expression": "nervous",
    "room": "club"
   }
  ],
  [
   2,
   "원래 여기 두는 거야.",
   {
    "expression": "sheepish"
   }
  ],
  [
   4,
   "아까 네 가방에서 나왔는데.",
   {
    "expression": "neutral"
   }
  ],
  [
   0,
   "설마 그걸로 하라고?",
   {
    "expression": "surprised"
   }
  ],
  [
   2,
   "혹시 목소리 안 나올까 봐.",
   {
    "expression": "sheepish"
   }
  ],
  [
   3,
   "걔 바로 앞에 있을 건데.",
   {
    "expression": "concerned"
   }
  ]
 ],
 "6": [
  [
   2,
   "아까 봉투, 미안.",
   {
    "expression": "sheepish",
    "room": "corridor"
   }
  ],
  [
   0,
   "응, 찾고 나서 얘기해.",
   {
    "expression": "nervous"
   }
  ],
  [
   2,
   "알았어.",
   {
    "expression": "sheepish"
   }
  ],
  [
   4,
   "사진엔 이 판이 거꾸로야.",
   {
    "expression": "neutral"
   }
  ]
 ],
 "8": [
  [
   3,
   "열쇠부터 써 보자.",
   {
    "expression": "warm",
    "room": "classroom"
   }
  ],
  [
   4,
   "사진 찍은 자리는 여기였어.",
   {
    "expression": "neutral"
   }
  ],
  [
   2,
   "내가 옮기기 전 사진이지?",
   {
    "expression": "sheepish"
   }
  ],
  [
   4,
   "응, 지금이랑 비교해 봐.",
   {
    "expression": "neutral"
   }
  ]
 ]
};
export const AFTER={
 "0": [
  [
   2,
   "정답은 나도 몰라, 난 설치만 했어.",
   {
    "expression": "sheepish",
    "room": "classroom"
   }
  ],
  [
   4,
   "그럼 네가 옮긴 것부터 봐.",
   {
    "expression": "neutral"
   }
  ]
 ],
 "1": [
  [
   3,
   "그림 이어졌어.",
   {
    "expression": "amused",
    "room": "classroom"
   }
  ],
  [
   0,
   "이 표식, 책갈피에도 있어.",
   {
    "expression": "nervous"
   }
  ],
  [
   2,
   "도서관 쪽이네, 내가 앞장설게.",
   {
    "expression": "sheepish"
   }
  ]
 ],
 "2": [
  [
   0,
   "들어 봐, 밑에 하나 더 있어.",
   {
    "expression": "neutral",
    "room": "library"
   }
  ],
  [
   2,
   "이것도 필요한 거야?",
   {
    "expression": "sheepish"
   }
  ],
  [
   3,
   "저 판에 꽂는 것 같은데.",
   {
    "expression": "concerned"
   }
  ]
 ],
 "3": [
  [
   4,
   "소품함 표시가 초록색이야.",
   {
    "expression": "neutral",
    "room": "library"
   }
  ],
  [
   0,
   "그럼 동아리실로 가자.",
   {
    "expression": "neutral"
   }
  ]
 ],
 "4": [
  [
   3,
   "꺼냈어.",
   {
    "expression": "amused",
    "room": "club"
   }
  ],
  [
   4,
   "필름이 두 장이네.",
   {
    "expression": "neutral"
   }
  ]
 ],
 "5": [
  [
   2,
   "현수막은 그냥 접어 둘게.",
   {
    "expression": "sheepish",
    "room": "club"
   }
  ],
  [
   0,
   "응, 그건 꼭 접어.",
   {
    "expression": "neutral"
   }
  ],
  [
   2,
   "확성기도.",
   {
    "expression": "sheepish"
   }
  ]
 ],
 "6": [
  [
   3,
   "내가 잡고 있을게, 빼 봐.",
   {
    "expression": "amused",
    "room": "corridor"
   }
  ],
  [
   2,
   "잡았어, 손 놔도 돼.",
   {
    "expression": "sheepish"
   }
  ]
 ],
 "7": [
  [
   0,
   "고마워.",
   {
    "expression": "smile",
    "room": "corridor"
   }
  ],
  [
   2,
   "편지부터 찾자.",
   {
    "expression": "sheepish"
   }
  ],
  [
   4,
   "휴대폰 울렸어.",
   {
    "expression": "neutral"
   }
  ],
  [
   1,
   "우리 쪽도 거의 끝났어.",
   {
    "channel": "phone"
   }
  ],
  [
   0,
   "나도 곧 끝나, 이따 봐.",
   {
    "channel": "phone"
   }
  ]
 ],
 "8": [
  [
   0,
   "시작 표식은 이거야.",
   {
    "expression": "nervous",
    "room": "classroom"
   }
  ],
  [
   2,
   "메모 찾았어, 읽는 순서가 적혀 있어.",
   {
    "expression": "sheepish"
   }
  ],
  [
   3,
   "옆판 표시는 내가 볼게.",
   {
    "expression": "warm"
   }
  ],
  [
   4,
   "누른 순서, 여기 남는다.",
   {
    "expression": "neutral"
   }
  ]
 ],
 "9": [
  [
   3,
   "열렸다.",
   {
    "expression": "warm",
    "room": "classroom"
   }
  ],
  [
   0,
   "있어.",
   {
    "expression": "smile"
   }
  ],
  [
   2,
   "구겨졌어?",
   {
    "expression": "sheepish"
   }
  ],
  [
   0,
   "모서리만 조금.",
   {
    "expression": "smile"
   }
  ],
  [
   2,
   "다행이다.",
   {
    "expression": "sheepish"
   }
  ]
 ]
};
export const WALK_TO_YOU=[
 [
  2,
  "저기, 서아.",
  {
   "expression": "sheepish",
   "room": "courtyard"
  }
 ],
 [
  0,
  "응.",
  {
   "expression": "smile"
  }
 ],
 [
  3,
  "가, 여긴 우리가 치울게.",
  {
   "expression": "warm"
  }
 ],
 [
  4,
  "가방은 이따 가져다줄게.",
  {
   "expression": "neutral",
   "exit": [
    2,
    3,
    4
   ]
  }
 ],
 [
  -1,
  "윤재가 마지막 몇 걸음을 뛰어갔다. 서아가 휴대전화를 넣고 돌아봤다.",
  {
   "room": "bench",
   "arrival": 1,
   "cue": "steps"
  }
 ]
];
export const CONFESSION=[
 [
  1,
  "뛰어왔어?",
  {
   "expression": "surprised",
   "room": "bench"
  }
 ],
 [
  0,
  "조금.",
  {
   "expression": "smile"
  }
 ],
 [
  1,
  "무슨 말 하려고 했는데?",
  {
   "expression": "neutral"
  }
 ],
 [
  0,
  "이거, 너 주려고 쓴 거야.",
  {
   "expression": "smile"
  }
 ],
 [
  -1,
  "봉투의 접힌 모서리를 펴고, 서아의 눈을 봤다.",
  {
   "room": "bench",
   "cue": "heartbeat"
  }
 ]
];
export const GOALS=ESCAPE_STAGES.map((s,n)=>n===8?'점검 열쇠로 덮개를 열고 사진 속 사물을 찾자.':n===9?'모은 기록으로 수납함을 열고 파란 봉투를 되찾자.':s.object+'에서 다음 장치의 실마리를 찾자.');

// A teacher may replace any of P1–P8 with a subject device. Dialogue should
// describe the recovered story item without claiming an unused manipulation.
export function adaptDevices(stages){
 const before=structuredClone(BEFORE),after=structuredClone(AFTER);
 for(let n=0;n<8;n++)if(stages[n]?.type!==ESCAPE_STAGES[n].type){
  before[n]=[];
  if(n===1)after[n]=[[3,'배치도 찾았어.'],[0,'이 표식, 책갈피에도 있어.'],[2,'도서관 쪽이네. 내가 앞장설게.']];
  if(n===4)after[n]=[[3,'안에 봉투가 있어.'],[4,'편지는 아니고, 필름 두 장.']];
  if(n===5)after[n]=[[4,'복도 전시판이라고 적혀 있어.'],[2,'아까 지나온 데네.']];
 }
 if(stages[3]?.type!=='circuit')after[2]=[[0,'옆 장치도 열렸어.'],[3,'찾은 기록부터 모아 보자.']];
 if(stages[5]?.type!=='film')after[4]=[[3,'다음 장치가 켜졌어.'],[4,'작업대 쪽을 보자.']];
 if(stages[6]?.type!=='frames')after[5]=[[0,'복도로 가자.'],[2,'정리한 장치가 그쪽에도 있어.']];
 if(stages[7]?.type!=='key')after[6]=[[3,'옆 장치도 열렸어.'],[0,'이제 교실로 돌아갈 수 있겠네.']];
 // Subject matching does not require turning the board upside down.
 before[6]=(before[6]||[]).map(line=>line[1]==='사진엔 이 판이 거꾸로야.'?[4,'기록 번호랑 빈칸 번호가 같아.',line[2]||{}]:line);
 return {BEFORE:before,AFTER:after};
}
export const MEMORIES=[{stage:0,title:'보내 버린 문자',place:'교실',text:'서아야, 정리 끝나면 뒤뜰 벤치에서 잠깐 볼래?'},{stage:5,title:'조금 과했던 응원',place:'동아리실',text:'확성기도 현수막도 접었다. 친구들은 아직 옆에 있다.'},{stage:10,title:'되찾은 봉투',place:'교실',text:'모서리만 조금 구겨졌다. 이제 내가 말할 차례다.'}];
