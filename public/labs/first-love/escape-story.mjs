import {CAST} from './story.mjs';
import {ESCAPE_STAGES,DEVICE_NAMES} from './escape-content.mjs';
export {CAST};
export const STORY_VERSION=8;
export const ROOMS={
 classroom:{name:'교실',caption:'축제 부스의 출발점과 마지막 수납함',art:'classroom',unlock:0},
 library:{name:'도서관',caption:'안내도에 표시된 두 번째 체험 장소',art:'library',unlock:2},
 club:{name:'동아리실',caption:'운영 도구와 방송 소품을 보관한 곳',art:'club',unlock:4},
 corridor:{name:'복도',caption:'수납함 점검 열쇠를 보관한 전시벽',art:'corridor',unlock:6},
 courtyard:{name:'벚꽃길',caption:'친구들과 함께 되찾은 편지를 쥐고',art:'courtyard',unlock:10},
 bench:{name:'벚꽃나무 아래',caption:'이제, 직접 전할 말',art:'cherry',unlock:10}
};

// Actor numbers are story functions, not genders: 0 lead, 1 recipient,
// 2 the installation helper, 3 the device observer, 4 the photo keeper.
// The cast adapter supplies the selected names without changing these functions.
export const OPENING=[
 [0,'서아야, 정리 끝나면 뒤뜰 벤치에서 잠깐 볼래? 오늘은 직접 하고 싶은 말이 있어.',{channel:'phone',room:'classroom',arrival:[2,3,4]}],
 [1,'응, 좋아. 나 전시판만 내려놓으면 끝나니까, 정리 마치고 거기로 갈게.',{channel:'phone'}],
 [0,'알겠어. 나도 여기 마무리하고 갈게.',{channel:'phone'}],
 [-1,'전송된 문장을 다시 읽었다. 손끝이 조금 떨려서, 편지 봉투 대신 휴대전화를 먼저 내려놓았다.',{room:'classroom',reaction:{actor:0,expression:'nervous'}}],
 [2,'보냈어? 네가 문장 고치는 동안 여기 테이프는 내가 다 뗐어.',{expression:'smile'}],
 [0,'너희가 다 보고 있으니까 더 못 보내겠더라. 평소엔 아무렇지도 않게 말하는데.',{expression:'nervous'}],
 [3,'그래서 일부러 다른 데 보고 있었어. 도하만 네 화면을 계속 보더라.',{expression:'amused'}],
 [4,'세 번 지웠다가 결국 처음 문장으로 보냈어. 그 문장이 제일 네 말 같았거든.',{expression:'warm'}],
 [-1,'도하는 책상에 남은 종이 소품과 파란 봉투를 한꺼번에 모았다. 민우가 전시판의 마지막 사진을 찍는 사이, 교실 뒤 수납함의 손잡이가 딸깍 내려갔다.',{reaction:{actor:2,expression:'neutral'}}],
 [0,'도하야, 여기 책 위에 있던 파란 봉투 못 봤어? 나 그거 챙겨야 하는데.',{expression:'surprised'}],
 [2,'파란 거? 부스에서 쓰던 빈 봉투인 줄 알고 같이 넣었어. 잠깐, 그게 네 편지였어?',{expression:'panicked'}],
 [0,'응, 서아한테 주려고 쓴 거야. 어디에 넣었어?',{expression:'nervous'}],
 [2,'뒤에 있는 수납함, 아직 바로 꺼낼 수… 왜 손잡이가 안 움직이지?',{expression:'panicked'}],
 [3,'잠깐만, 더 당기지 마. 옆에 자동으로 잠긴다고 적혀 있어.',{expression:'concerned'}],
 [2,'미안. 정리 상자인 줄 알았어, 위에 소품이 덮여 있어서 안내를 못 봤네.',{expression:'sincere'}],
 [4,'이건 오늘 방탈출 부스에서 마지막에 열던 수납함이야. 옆에 운영 안내가 아직 붙어 있어.',{expression:'neutral'}],
 [-1,'민우가 접힌 안내를 펴고, 시우가 가려진 아래쪽을 받쳤다. 도하는 방금 덮어 둔 종이 소품을 조심스럽게 옆으로 옮겼다.',{reaction:{actor:4,expression:'concerned'}}],
 [4,'교실에서 출발해서 도서관, 동아리실, 복도를 거쳐 다시 여기로 오는 동선이네. 장치마다 다음 보관 위치를 알려 주게 만들었대.',{expression:'neutral'}],
 [0,'그럼 이 수납함을 열 방법도 그 동선 끝에 있는 거야?',{expression:'neutral'}],
 [3,'응, 마지막에 점검 열쇠와 위치표를 받는다고 적혀 있어. 우선 이 안내가 가리키는 첫 장치부터 확인하면 되겠다.',{expression:'neutral',deviceText:'opening-device'}],
 [0,'도하야, 너 설치 도왔다고 했지? 혹시 열쇠가 어디 있는지 알아?',{expression:'nervous'}],
 [2,'나는 도구랑 전시판을 옮겨서 놓는 것만 도왔어. 문제는 다른 부원들이 만들었는데, 내가 옮긴 물건은 같이 찾아볼 수 있어.',{expression:'sincere'}],
 [4,'첫 운영함 옆에 기록이 남아 있어. 정리하기 전에 찍어 둔 사진도 있으니까, 필요하면 지금 모습과 비교해 보자.',{expression:'neutral'}],
 [2,'이번에는 확인하고 손댈게. 내가 넣었으니까, 끝까지 같이 꺼내자.',{expression:'sincere'}],
 [0,'그래, 혼자 당기고 있는 것보단 낫겠다. 여기 첫 장치에 뭐라고 적혀 있는지부터 보자.',{expression:'smile'}]
];

export const BEFORE={
 0:[
  [-1,'파란 편지가 들어 있는 수납함 옆에 부스 운영 안내가 남아 있다. 안내의 출발 표시는 바로 옆 첫 운영함을 가리킨다.',{room:'classroom'}],
  [4,'운영함 안에 다음 보관 위치를 알려 주는 자료가 있대. 여기에서 시작하면 수납함 점검 열쇠까지 이어질 거야.',{expression:'neutral'}],
  [2,'아까 내가 가져다 놓은 기록도 여기 있어. 버리려고 접어 두기만 해서 다행이다.',{expression:'sheepish'}],
  [3,'먼저 장치 옆 자료를 확인하자. 손잡이는 그다음에 움직여도 돼.',{expression:'neutral',deviceText:'starter-before'}],
  [0,'응, 편지는 저 안에 있으니까. 여는 방법부터 차근차근 찾아보자.',{expression:'nervous'}]
 ],
 1:[
  [-1,'첫 운영함에서 꺼낸 자료를 책상 위에 펼쳤다. 부스의 다음 보관 장소를 알려 주는 안내였다.',{room:'classroom'}],
  [4,'여기 배치도라고 적혀 있어. 조각의 선과 표식을 맞추면 어느 쪽으로 가야 하는지 보이겠어.',{expression:'neutral',deviceText:'map-before'}],
  [2,'빈 책상부터 치워 둘게. 이번엔 중요한 종이인지 먼저 물어보고 옮긴다.',{expression:'sheepish'}],
  [0,'그 말 아까 들었으면 좋았겠는데. 그래도 같이 찾고 있으니까 됐어.',{expression:'smile'}],
  [3,'자료를 전부 펼쳐 두자. 다음 장소를 찾으면 돌아다니면서 헤맬 필요는 없겠어.',{expression:'neutral'}]
 ],
 2:[
  [-1,'완성된 안내를 들고 도서관으로 왔다. 표시된 자리에는 체험용 도구함과 그 옆 장치가 나란히 남아 있었다.',{room:'library'}],
  [3,'안내에서 본 표식이 여기에도 있어. 도구함부터 확인하라는 뜻이네.',{expression:'neutral'}],
  [2,'이번에는 나 손잡이 안 만졌어. 먼저 자료부터 읽고 있어.',{expression:'sheepish'}],
  [4,'서로 다른 기록을 각자 보게 해 놨어. 한 사람 것만 읽으면 전체 조합은 모르겠네.',{expression:'neutral'}],
  [0,'그럼 찾은 내용부터 서로 말해 보자. 나는 이쪽 기록을 확인할게.',{expression:'neutral'}]
 ],
 3:[
  [-1,'열린 도구함 안의 안내가 옆 장치를 가리킨다. 시우가 두 장치의 표식을 나란히 확인했다.',{room:'library'}],
  [3,'이 부품이 옆 장치의 빈 소켓에 맞아. 먼저 꽂아 두고, 자료를 보고 연결을 맞추자.',{expression:'neutral',deviceText:'connector-before'}],
  [2,'내가 이쪽을 잡고 있을게. 제대로 맞는지 보고 끼워 줘.',{expression:'neutral'}],
  [4,'다음 목적지는 동아리실 소품함이래. 여기를 풀면 그쪽 걸쇠가 열리는 구조야.',{expression:'neutral'}],
  [0,'이제 왜 여기까지 와야 했는지 알겠다. 편지가 다른 데 간 건 아닌데, 열 방법은 따로 보관해 둔 거네.',{expression:'neutral'}]
 ],
 4:[
  [-1,'동아리실의 소품함 표시등이 켜져 있었다. 도하는 선반을 살피다 작은 확성기를 자기 가방 뒤로 밀어 놓았다.',{room:'club',reaction:{actor:2,expression:'sheepish'}}],
  [0,'도하야, 지금 가방 뒤로 숨긴 거 뭐야? 소품함 열쇠는 아닌 것 같은데.',{expression:'surprised'}],
  [2,'아, 이거? 혹시 말이 안 나올까 봐 작은 확성기를 하나 준비해 뒀지.',{expression:'sheepish'}],
  [3,'바로 앞에서 이야기할 건데 확성기가 왜 필요해. 옆 반까지 다 듣겠다.',{expression:'amused'}],
  [4,'접힌 현수막도 네가 가져온 거지? 사진에 네 가방 손잡이랑 같이 찍혀 있어.',{expression:'amused'}],
  [0,'마음은 고마운데, 그건 접어 두자. 나 그냥 내 목소리로 말하고 싶어.',{expression:'smile'}],
  [2,'알았어, 응원 방식은 조금 줄일게. 대신 지금은 필요한 물건 찾는 데 집중한다.',{expression:'sincere'}],
  [3,'좋아, 도서관에서 열린 소품함부터 보자. 다음 장치에 쓸 물건이 거기 있다고 했어.',{expression:'neutral'}]
 ],
 5:[
  [-1,'소품함에서 찾은 자료를 밝은 작업대 위에 펼쳤다. 도하는 현수막을 접어, 작업대에 그림자가 지지 않도록 치웠다.',{room:'club'}],
  [4,'서로 따로 있을 땐 끊긴 선처럼 보이네. 안내에 같은 모서리 표식을 맞추라고 적혀 있어.',{expression:'neutral',deviceText:'film-before'}],
  [2,'이렇게 작은 걸 놓치면 아까 선반을 또 뒤졌겠네. 먼저 펼쳐 보고 얘기하길 잘했다.',{expression:'sheepish'}],
  [0,'너도 계속 같이 보고 있잖아. 아까부터 계속 미안해하지 않아도 돼.',{expression:'smile'}],
  [3,'그럼 이 자료가 가리키는 위치를 확인하자. 다음 장소를 알면 남은 길도 짧아지겠어.',{expression:'neutral'}]
 ],
 6:[
  [-1,'작업대에서 찾은 표시를 따라 복도 전시벽에 섰다. 멀리서 들리던 축제 정리 소리도 조금 잦아들었다.',{room:'corridor'}],
  [2,'아까 내가 봉투 넣었을 때 많이 놀랐지? 네가 왜 그렇게 조심해서 들고 다녔는지 이제 알겠어.',{expression:'sincere'}],
  [0,'응, 좀 놀랐어. 무슨 말을 써야 할지 몰라서 몇 번이나 다시 썼거든.',{expression:'nervous'}],
  [2,'그 편지 이번엔 제대로 네 손으로 전하게 하자. 내가 옆에서 필요한 건 다 도울게.',{expression:'sincere'}],
  [4,'정리 전 전시판 사진이 여기 있어. 지금 남은 자료와 비교하면 원래 관계를 찾을 수 있겠어.',{expression:'neutral',deviceText:'display-before'}],
  [3,'이쪽은 내가 잡고 있을게. 자료를 펼칠 때 떨어지지 않게 천천히 보자.',{expression:'warm'}]
 ],
 7:[
  [-1,'전시판의 안쪽 보관부가 열렸다. 수납함을 점검하는 데 쓰는 장치가 한 단계 더 남아 있었다.',{room:'corridor'}],
  [3,'이게 점검 열쇠를 받는 마지막 장치래. 방금 찾은 조각을 여기 맞추는 것 같아.',{expression:'neutral',deviceText:'key-before'}],
  [4,'완성하면 교실 수납함의 덮개를 열 수 있대. 안에 있는 위치표도 같이 챙겨야 하고.',{expression:'neutral'}],
  [2,'이번엔 내가 먼저 다 맞췄다고 우기지 않을게. 서로 찾은 근거부터 확인하자.',{expression:'sheepish'}],
  [0,'응, 여기까지 같이 왔는데 마지막에 서두르지 말자. 거의 다 찾은 것 같아.',{expression:'smile'}]
 ],
 8:[
  [-1,'네 사람은 교실 수납함 앞으로 돌아왔다. 파란 봉투를 넣은 뒤 닫힌 손잡이는 그대로였지만, 이제 점검 열쇠가 있었다.',{room:'classroom'}],
  [3,'이 열쇠는 큰 문이 아니라 옆 점검 덮개에 쓰는 거였어. 덮개부터 열어 보자.',{expression:'neutral'}],
  [2,'내가 옮기기 전 모습도 확인할 수 있어? 정리하다가 사물 몇 개를 옮겼거든.',{expression:'sheepish'}],
  [4,'응, 사진은 네가 정리하기 전에 찍었어. 같은 사물과 표식을 찾으면 위치표를 읽을 수 있을 거야.',{expression:'neutral'}],
  [0,'편지는 계속 이 안에 있었구나. 이제 우리가 모은 기록으로 어느 칸을 열지 확인하면 되겠네.',{expression:'smile'}]
 ],
 9:[
  [-1,'점검 덮개 안의 표식과 사진 속 사물이 연결됐다. 네 사람이 모은 기록이 수납함 앞에 나란히 놓였다.',{room:'classroom'}],
  [4,'처음 가져온 표식, 옮길 때 남긴 메모, 실제 방향, 사진 속 칸이 다 여기서 이어지는 거네.',{expression:'neutral'}],
  [3,'입력한 순서는 화면에 남아. 한 번에 다 누르고 나서, 기록과 맞는지 확인하자.',{expression:'neutral'}],
  [2,'이번 손잡이는 네가 직접 내려. 나는 옆에서 기다릴게.',{expression:'sincere'}],
  [0,'알겠어. 이번에는 다 확인하고 열자.',{expression:'nervous'}]
 ]
};

export const AFTER={
 0:[
  [-1,'첫 운영함의 보관부가 열렸다. 수납함 옆 운영 안내에 적힌 다음 자료가 그 안에 남아 있었다.',{room:'classroom'}],
  [4,'여기 부스 배치도 조각이 있어. 이걸 맞추면 다음 보관 장소를 알 수 있겠어.',{expression:'neutral',deviceText:'map-found'}],
  [2,'안내를 버리지 않아서 다행이다. 소품 치운다고 이 종이까지 같이 묶을 뻔했네.',{expression:'sheepish'}],
  [3,'책상에 펼쳐 두자. 이번에는 찾은 것부터 따로 챙기고.',{expression:'neutral'}],
  [0,'응, 이제 어디를 살펴봐야 할지 보이네. 다음 기록도 같이 확인해 보자.',{expression:'smile'}]
 ],
 1:[
  [3,'그림이 이어지니까 도서관 도구함이 보인다. 옆에 있는 표식도 같이 챙겨 두자.',{expression:'neutral',room:'classroom',deviceText:'map-done'}],
  [0,'이 작은 표식은 내 책갈피에도 있어. 처음에 받은 게 마지막까지 쓰이나 봐.',{expression:'neutral'}],
  [4,'그럼 책갈피도 버리지 말자. 다음 장소만 보고 나머지 표시를 놓치면 나중에 다시 와야겠어.',{expression:'neutral'}],
  [2,'도서관 장치는 내가 옮겨 놔서 자리 알아. 앞장설 테니까 자료는 잘 챙겨 줘.',{expression:'smile'}],
  [-1,'윤재는 책갈피와 안내를 파란 파일에 끼웠다. 네 사람은 잠긴 수납함을 뒤로하고, 표시된 다음 장소로 향했다.']
 ],
 2:[
  [3,'안에 전원 커넥터가 있어. 안내에 나온 모양이 옆 장치의 소켓과 같네.',{expression:'neutral',room:'library',deviceText:'connector-found'}],
  [2,'열기 전에는 그냥 별개 소품인 줄 알았는데, 서로 이어서 쓰는 거였구나.',{expression:'neutral'}],
  [4,'운영 안내에도 도구함 다음에 옆 장치를 확인하라고 적혀 있어. 다음 위치로 가려면 여기까지 봐야 해.',{expression:'neutral'}],
  [0,'그러면 찾은 부품부터 가져가자. 이번엔 필요한 걸 두고 가지 않게.',{expression:'neutral',deviceText:'connector-take'}]
 ],
 3:[
  [4,'동아리실 소품함 표시가 초록색으로 바뀌었어. 다음 장소의 걸쇠가 풀린 모양이야.',{expression:'neutral',room:'library'}],
  [3,'여기서 작동시킨 장치가 그쪽 보관함을 열어 주는 거네. 안내에 나온 순서가 맞았어.',{expression:'neutral'}],
  [2,'방송 소품을 모아 둔 방이지? 아까 내가 가져다 놓은 것들 때문에 좀 어수선할 거야.',{expression:'sheepish'}],
  [0,'그럼 네가 어디에 뒀는지 잘 떠올려 봐. 우리는 필요한 물건부터 찾자.',{expression:'smile'}]
 ],
 4:[
  [3,'선반 안쪽에 있던 얇은 봉투를 꺼냈어. 파란 편지 봉투하고는 다른 물건이야.',{expression:'neutral',room:'club',deviceText:'films-found'}],
  [4,'안에 투명 필름 두 장과 다음 장치 안내가 들어 있어. 작업대에서 펼쳐 보라고 적혀 있네.',{expression:'neutral',deviceText:'films-open'}],
  [2,'아까 현수막을 밀어 놓다가 틈으로 떨어뜨렸나 봐. 어디에 있었는지 이제 기억났어.',{expression:'sheepish'}],
  [0,'그래도 찾아냈잖아. 필요한 건 여기 다 있으니까, 밝은 데서 확인해 보자.',{expression:'smile'}]
 ],
 5:[
  [4,'표시가 복도 전시판의 오른쪽 아래를 가리켜. 모서리에 작은 탭이 있다고 적혀 있어.',{expression:'neutral',room:'club',deviceText:'display-location'}],
  [3,'안내도에 있던 다음 전시벽이네. 거기서 마지막 점검 열쇠를 얻는 구조였어.',{expression:'neutral'}],
  [2,'현수막은 다 접었어. 확성기도 가방에 넣었고, 이제 이걸로 놀라게 할 일은 없을 거야.',{expression:'sheepish'}],
  [0,'고마워, 그건 정말 고마워. 준비한 마음까지 싫었던 건 아니야.',{expression:'smile'}],
  [2,'알아, 이번엔 옆에서 조용히 응원할게. 네가 하고 싶은 말은 네가 직접 해야지.',{expression:'sincere'}]
 ],
 6:[
  [3,'전시판 안쪽 보관부가 열렸어. 점검 열쇠를 조립하는 조각이 들어 있네.',{expression:'neutral',room:'corridor',deviceText:'key-pieces'}],
  [2,'이번엔 떨어뜨리지 않게 내가 받칠게. 민우야, 놓을 자리 좀 비워 줘.',{expression:'neutral'}],
  [4,'여기 두면 돼. 안내에 나온 마지막 장치도 바로 옆에 있어.',{expression:'neutral'}],
  [0,'이제 수납함에 쓸 물건이 눈앞에 보이네. 조금만 더 같이 확인하자.',{expression:'smile'}]
 ],
 7:[
  [3,'점검 열쇠와 위치표를 받았어. 둘 다 교실 수납함에 쓰는 거니까 같이 챙겨.',{expression:'warm',room:'corridor'}],
  [0,'고마워. 혼자였으면 여기까지 오면서 더 급해졌을 것 같아.',{expression:'smile'}],
  [2,'내가 일을 만든 건데. 그래도 이번엔 네가 편지 꺼내는 데까지 제대로 도운 거지?',{expression:'sheepish'}],
  [0,'응, 다 같이 도와줬어. 이제 편지 찾고 나면 내가 할 일만 남겠네.',{expression:'nervous'}],
  [4,'휴대전화 울렸어. 서아 쪽 정리도 거의 끝났나 봐.',{expression:'neutral'}],
  [1,'우리 쪽도 이제 거의 끝났어. 벤치 쪽으로 천천히 갈게, 정리 마치고 와.',{channel:'phone'}],
  [0,'응, 나도 마지막 것만 챙기면 끝나. 이따 보자.',{channel:'phone'}],
  [-1,'윤재는 답장을 보낸 뒤 점검 열쇠를 다시 쥐었다. 아까보다 손은 덜 떨렸지만, 약속이 가까워졌다는 건 더 선명하게 느껴졌다.',{reaction:{actor:0,expression:'nervous'}}]
 ],
 8:[
  [0,'내 책갈피 표식이 여기에도 있어. 처음부터 이 순서를 읽는 데 쓰는 거였구나.',{expression:'neutral',room:'classroom'}],
  [2,'내 준비 메모에는 표시를 읽는 순서가 적혀 있어. 옮긴 위치도 확인해서 같이 볼게.',{expression:'neutral'}],
  [3,'나는 점검 덮개 안쪽의 방향을 확인할게. 사진을 볼 때랑 실제로 서 있는 방향이 다를 수 있어.',{expression:'neutral'}],
  [4,'사진 속 사물과 수납함의 칸은 내가 맞춰 볼게. 서로 본 걸 말해 주면 전체 순서를 정할 수 있겠다.',{expression:'neutral'}],
  [0,'좋아, 각자 확인한 걸 한 번씩 이야기해 보자. 이번에는 누르기 전에 다 같이 맞춰 보자.',{expression:'nervous'}]
 ],
 9:[
  [-1,'걸쇠가 풀리는 소리가 났다. 윤재가 손잡이를 내리자, 종이 소품 사이에 파란 봉투가 보였다.',{room:'classroom',reaction:{actor:0,expression:'surprised'}}],
  [0,'여기 있었네. 내가 접어 둔 모서리도 그대로야.',{expression:'smile'}],
  [2,'많이 구겨진 건 아니지? 내가 넣을 때 너무 급하게 밀어 넣어서.',{expression:'sheepish'}],
  [0,'모서리만 조금 구겨졌어. 이 정도는 손으로 펴면 돼.',{expression:'smile'}],
  [2,'다행이다. 아까 서아한테 줄 편지라고 들었을 때 정말 식겁했어.',{expression:'sincere'}],
  [3,'봉투도 찾았고, 장치도 다 끝났어. 이제 여기서는 더 할 일 없어.',{expression:'warm'}],
  [4,'정리는 우리가 마저 할게. 약속한 곳으로 가도 돼.',{expression:'warm'}],
  [-1,'윤재는 봉투의 모서리를 천천히 폈다. 네 사람이 함께 내쉰 숨에, 조금 전까지 급하게 들리던 시계 소리가 다시 평범해졌다.',{reaction:{actor:0,expression:'smile'}}]
 ]
};

export const WALK_TO_YOU=[
 [-1,'네 사람은 함께 교실을 나왔다. 복도 끝에서 서아가 전시판을 내려놓고 약속 장소 쪽으로 걸어가고 있었다.',{room:'courtyard'}],
 [2,'저기 서아 가네. 이제 따라가도 늦지 않겠다.',{expression:'smile'}],
 [0,'응, 나 먼저 가 볼게. 오늘 같이 찾아줘서 고마워.',{expression:'smile'}],
 [3,'우리는 여기 정리하고 갈게. 생각해 둔 문장 전부 외우려고 하진 마.',{expression:'warm'}],
 [0,'이미 절반은 잊어버린 것 같은데. 그래도 첫마디는 기억해.',{expression:'nervous'}],
 [4,'가방은 우리가 챙겨 줄게. 편지는 네가 들고 가야지.',{expression:'warm',exit:[2,3,4]}],
 [-1,'윤재는 마지막 몇 걸음을 조금 빠르게 걸었다. 서아가 다가오는 발소리를 듣고 휴대전화를 넣으며 돌아봤다.',{room:'bench',arrival:1,cue:'steps'}]
];
export const CONFESSION=[
 [1,'왔네. 정리할 게 많았어? 아까보다 조금 숨차 보인다.',{expression:'smile',room:'bench'}],
 [0,'조금 돌아오긴 했어. 그래도 기다리게 하고 싶진 않아서.',{expression:'nervous'}],
 [1,'나도 방금 왔어. 아까 직접 하고 싶은 말 있다고 했지?',{expression:'neutral'}],
 [-1,'가까이에서 마주 보니, 연습할 때는 없던 침묵이 생겼다. 윤재는 봉투를 쥔 손에 힘이 들어간 걸 느끼고 천천히 손가락을 폈다.',{reaction:{actor:0,expression:'nervous'}}],
 [0,'말하려고 하면 자꾸 다른 이야기부터 하게 돼서, 이번에는 미리 적어 왔어.',{expression:'nervous'}],
 [1,'그래서 그 봉투를 들고 온 거구나. 나한테 주려고 쓴 거야?',{expression:'surprised'}],
 [0,'응, 너한테 주려고 쓴 거야. 그래도 이 말은 종이보다 내가 먼저 하고 싶어.',{expression:'smile'}],
 [-1,'봉투의 접힌 모서리를 한 번 펴고, 서아의 눈을 봤다. 윤재는 숨을 고른 뒤, 준비한 문장 중 가장 전하고 싶었던 말을 골랐다.',{room:'bench',cue:'heartbeat',reaction:{actor:0,expression:'nervous'}}]
];
export const GOALS=ESCAPE_STAGES.map((s,n)=>n===8?'점검 열쇠로 덮개를 열고 사진과 현장의 같은 사물을 확인하자.':n===9?'모은 기록을 연결해 수납함을 열고 파란 편지 봉투를 되찾자.':n===0?'수납함 옆 운영 안내가 가리키는 첫 장치에서 부스의 다음 보관 위치를 찾자.':s.object+'에 남은 자료에서 다음에 확인할 물건과 위치를 찾자.');

// Subject changes replace only device-specific observations. The conversations,
// apologies, reactions and reasons for going to the next room always remain.
export function adaptDevices(stages){
 const before=structuredClone(BEFORE),after=structuredClone(AFTER),type=n=>stages[n]?.type||ESCAPE_STAGES[n]?.type;
 const object=n=>stages[n]?.object||DEVICE_NAMES[type(n)]||ESCAPE_STAGES[n]?.object||'다음 장치';
 const deviceText={
  'opening-device':`응, 마지막에 점검 열쇠와 위치표를 받는다고 적혀 있어. 우선 출발점인 ${object(0)}부터 확인하면 되겠다.`,
  'starter-before':`${object(0)} 옆에 남은 자료부터 확인하자. 손잡이는 그다음에 움직여도 돼.`,
  'map-before':type(1)==='jigsaw'?'여기 배치도라고 적혀 있어. 조각의 선과 표식을 맞추면 어느 쪽으로 가야 하는지 보이겠어.':`${object(1)}에 보관 위치를 알려 주는 자료가 있어. 각각의 기록이 무슨 뜻인지 먼저 확인해 보자.`,
  'map-found':type(1)==='jigsaw'?'여기 부스 배치도 조각이 있어. 이걸 맞추면 다음 보관 장소를 알 수 있겠어.':`운영 안내가 ${object(1)}를 가리켜. 다음 장소를 알려 주는 자료는 저 장치에 보관한 모양이야.`,
  'map-done':type(1)==='jigsaw'?'그림이 이어지니까 도서관 도구함이 보인다. 옆에 있는 표식도 같이 챙겨 두자.':'장치 안쪽의 안내에 도서관 도구함이 표시돼 있어. 옆에 있는 표식도 같이 챙겨 두자.',
  'connector-before':type(3)==='circuit'?'이 부품이 옆 장치의 빈 소켓에 맞아. 먼저 꽂아 두고, 자료를 보고 연결을 맞추자.':`이제 옆의 ${object(3)}를 확인할 수 있어. 앞에서 찾은 안내와 이쪽 자료를 같이 보자.`,
  'connector-found':type(3)==='circuit'?'안에 전원 커넥터가 있어. 안내에 나온 모양이 옆 장치의 소켓과 같네.':`첫 장치를 풀자 옆의 ${object(3)}가 해제됐어. 남아 있는 자료도 계속 확인할 수 있겠네.`,
  'connector-take':type(3)==='circuit'?'그러면 찾은 부품부터 가져가자. 이번엔 필요한 걸 두고 가지 않게.':'그러면 찾은 안내를 옆 장치에 같이 가져가자. 이번엔 필요한 기록을 두고 가지 않게.',
  'films-found':type(5)==='film'?(type(4)==='tools'?'선반 안쪽에 있던 얇은 봉투를 꺼냈어. 파란 편지 봉투하고는 다른 물건이야.':'장치 안쪽에 얇은 봉투가 있어. 파란 편지 봉투하고는 다른 물건이야.'):`이쪽을 풀자 옆의 ${object(5)}가 해제됐어. 운영함 안에서 안내한 다음 장치가 저거였네.`,
  'films-open':type(5)==='film'?'안에 투명 필름 두 장과 다음 장치 안내가 들어 있어. 작업대에서 펼쳐 보라고 적혀 있네.':'작업대의 자료를 확인하면 복도 전시벽으로 이어진대. 어떤 위치를 가리키는지 함께 살펴보자.',
  'film-before':type(5)==='film'?'서로 따로 있을 땐 끊긴 선처럼 보이네. 안내에 같은 모서리 표식을 맞추라고 적혀 있어.':`여기 ${object(5)}의 기록도 서로 연결돼 있어. 자료가 가리키는 관계를 확인하면 다음 위치를 찾을 수 있겠어.`,
  'display-location':type(6)==='frames'?'표시가 복도 전시판의 오른쪽 아래를 가리켜. 모서리에 작은 탭이 있다고 적혀 있어.':`안내가 복도에 있는 ${object(6)}를 가리켜. 다음 보관 기록은 그쪽 장치에서 볼 수 있대.`,
  'display-before':type(6)==='frames'?'정리 전 전시판 사진이 여기 있어. 지금 남은 자료와 비교하면 원래 관계를 찾을 수 있겠어.':`정리 전 찍은 사진에도 ${object(6)}가 있어. 옆에 남은 자료와 기록을 비교해 보자.`,
  'key-pieces':type(7)==='key'?'전시판 안쪽 보관부가 열렸어. 점검 열쇠를 조립하는 조각이 들어 있네.':`이쪽을 풀자 옆의 ${object(7)}가 해제됐어. 점검 열쇠를 받으려면 저 장치까지 확인해야 해.`,
  'key-before':type(7)==='key'?'이게 점검 열쇠를 받는 마지막 장치래. 방금 찾은 조각을 여기 맞추는 것 같아.':`${object(7)}가 점검 열쇠를 받는 마지막 장치래. 여기 남은 자료까지 확인하면 교실로 돌아갈 수 있겠어.`
 };
 const adapt=list=>list.map(([actor,text,options={}])=>[actor,deviceText[options.deviceText]||text,{...options}]);
 for(const [n,list]of Object.entries(before))before[n]=adapt(list);
 for(const [n,list]of Object.entries(after))after[n]=adapt(list);
 return {BEFORE:before,AFTER:after,OPENING:adapt(OPENING)};
}
export const MEMORIES=[
 {stage:0,title:'보내 버린 문자',place:'교실',text:'전송 버튼을 누른 뒤에야, 파란 봉투가 사라진 걸 알았다. 함께 정리하던 친구들은 아무도 먼저 돌아가지 않았다.'},
 {stage:5,title:'조금 과했던 응원',place:'동아리실',text:'확성기와 현수막은 접어 두었다. 대신 필요한 물건을 함께 찾고, 급해지는 내 걸음을 옆에서 맞춰 주었다.'},
 {stage:10,title:'되찾은 파란 봉투',place:'교실',text:'편지는 처음 넣은 수납함 안에 그대로 있었다. 네 사람이 모은 기록이 거기까지 이어졌다. 이제 마지막 말은 내가 직접 전할 차례다.'}
];
