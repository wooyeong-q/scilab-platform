// Answer keys stay on the server. Core questions target middle-school grade 2.
export type QuizDiagram =
  | { kind: 'atom'; protons: number; neutrons: number; electrons: number }
  | { kind: 'molecules'; atoms: string[]; count: number }
  | { kind: 'formula'; text: string }
  | { kind: 'element'; symbol: string; number: number; name: string };
export type QuizQuestion = {
  id: string; topic: string; prompt: string; options: [string, string, string, string];
  answer: number; explanation: string; diagram?: QuizDiagram; extension?: boolean;
};
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {id:'core01',topic:'원자 내부',prompt:'원자핵을 이루는 입자는?',options:['양성자와 중성자','양성자와 전자','중성자와 전자','전자만'],answer:0,explanation:'원자핵에는 양성자와 중성자가 있습니다. 전자는 원자핵 주변에 있습니다. 가장 흔한 수소 원자핵에는 중성자가 없습니다.'},
  {id:'core02',topic:'전기적 성질',prompt:'양성자, 중성자, 전자의 전기적 성질을 순서대로 나타낸 것은?',options:['+, 0, −','+, −, 0','−, 0, +','0, +, −'],answer:0,explanation:'양성자는 양전하(+), 중성자는 전하 없음(0), 전자는 음전하(−)입니다.'},
  {id:'core03',topic:'원자 내부',prompt:'원자핵 주변에 있는 입자는?',options:['전자','양성자','중성자','물 분자'],answer:0,explanation:'전자는 원자핵 주변에 있습니다. 그림으로 나타내는 위치와 크기는 이해를 돕기 위한 모형입니다.'},
  {id:'core04',topic:'원소',prompt:'원소의 종류를 결정하는 것은?',options:['양성자 수','중성자 수','원자가 있는 장소','물질의 덩어리 크기'],answer:0,explanation:'원자핵 속 양성자 수가 원소의 종류를 결정합니다. 양성자가 1개이면 수소, 8개이면 산소입니다.'},
  {id:'core05',topic:'원자 번호',prompt:'이 산소 원자의 원자 번호는?',diagram:{kind:'atom',protons:8,neutrons:8,electrons:8},options:['8','16','24','0'],answer:0,explanation:'원자 번호는 양성자 수입니다. 이 원자는 양성자가 8개이므로 원자 번호가 8입니다.'},
  {id:'core06',topic:'전기적 중성',prompt:'이 원자가 전기적으로 중성인 까닭은?',diagram:{kind:'atom',protons:3,neutrons:4,electrons:3},options:['양성자 수와 전자 수가 같아서','중성자가 있어서','입자 수가 모두 같아서','전자가 없어서'],answer:0,explanation:'양성자 3개의 양전하와 전자 3개의 음전하가 서로 상쇄됩니다. 중성자 수는 중성 여부를 결정하지 않습니다.'},
  {id:'core07',topic:'전기적 중성',prompt:'양성자가 11개인 중성 원자의 전자는 몇 개일까?',options:['11개','22개','0개','중성자 수와 항상 같은 수'],answer:0,explanation:'전기적으로 중성인 원자는 양성자 수와 전자 수가 같습니다. 따라서 전자도 11개입니다.'},
  {id:'core08',topic:'원소 비교',prompt:'양성자가 각각 8개인 두 원자는 중성자 수가 달라도…',options:['같은 원소이다','반드시 다른 원소이다','하나는 반드시 수소이다','원소를 비교할 수 없다'],answer:0,explanation:'원소는 양성자 수로 구분합니다. 두 원자 모두 양성자가 8개이므로 산소입니다.'},
  {id:'core09',topic:'물 분자',prompt:'물 분자 1개를 이루는 원자의 조합은?',diagram:{kind:'formula',text:'H₂O'},options:['수소 2개와 산소 1개','수소 1개와 산소 2개','수소 2개와 산소 2개','물 원자 1개'],answer:0,explanation:'H₂O는 수소 원자 2개와 산소 원자 1개가 결합한 물 분자입니다. 물을 ‘물 원자’라고 부르지 않습니다.'},
  {id:'core10',topic:'분자 모형',prompt:'모형 속 물 분자 2개에 들어 있는 원자는 모두 몇 개일까?',diagram:{kind:'molecules',atoms:['H','O','H'],count:2},options:['6개','2개','3개','4개'],answer:0,explanation:'물 분자 1개에는 원자 3개가 있습니다. 2개에는 수소 원자 4개와 산소 원자 2개, 모두 6개가 있습니다.'},
  {id:'core11',topic:'수소 기체',prompt:'수소 기체를 이루는 수소 분자 1개는?',diagram:{kind:'molecules',atoms:['H','H'],count:1},options:['수소 원자 2개가 결합한 것','수소 원자 1개와 산소 원자 1개','양성자만 모인 것','물 분자 1개'],answer:0,explanation:'보통의 수소 기체는 H₂ 분자들로 이루어져 있습니다. H₂ 분자 1개에는 수소 원자가 2개 있습니다.'},
  {id:'core12',topic:'다양한 물질',prompt:'금 조각을 입자 수준의 모형으로 나타내면?',options:['금 원자들이 반복되어 배열된 모습','물 분자들이 모인 모습','금 분자 2개만 있는 모습','원자 없이 전자만 있는 모습'],answer:0,explanation:'금은 금 원자들이 반복된 구조를 이룹니다. 모든 물질이 물처럼 독립된 분자들로 이루어진 것은 아닙니다.'},
  {id:'core13',topic:'분자와 원자',prompt:'그림 속 산소 분자 3개에 들어 있는 산소 원자는?',diagram:{kind:'molecules',atoms:['O','O'],count:3},options:['6개','3개','2개','9개'],answer:0,explanation:'산소 분자는 O₂입니다. 분자 1개에 산소 원자 2개가 있으므로, 분자 3개에는 원자 6개가 있습니다.'},
  {id:'core14',topic:'분자식',prompt:'이산화 탄소 분자 1개에 들어 있는 원소의 종류는 몇 가지일까?',diagram:{kind:'formula',text:'CO₂'},options:['2가지','3가지','1가지','4가지'],answer:0,explanation:'탄소(C)와 산소(O), 2가지 원소가 있습니다. 원자의 개수는 3개이지만 원소의 종류는 2가지입니다.'},
  {id:'core15',topic:'원소 기호',prompt:'산소의 원소 기호는?',options:['O','H','N','C'],answer:0,explanation:'산소는 O, 수소는 H, 질소는 N, 탄소는 C로 나타냅니다.'},
  {id:'core16',topic:'원소 기호',prompt:'원소 기호 Na의 이름은?',diagram:{kind:'element',symbol:'Na',number:11,name:'?'},options:['나트륨','네온','질소','니켈'],answer:0,explanation:'Na는 나트륨입니다. 두 글자로 된 원소 기호는 첫 글자를 대문자, 둘째 글자를 소문자로 씁니다.'},
  {id:'core17',topic:'원자 번호',prompt:'이 원소의 원자에 들어 있는 양성자는?',diagram:{kind:'element',symbol:'C',number:6,name:'탄소'},options:['6개','12개','3개','0개'],answer:0,explanation:'칸 위의 6은 원자 번호입니다. 원자 번호는 양성자 수이므로 탄소 원자에는 양성자가 6개 있습니다.'},
  {id:'core18',topic:'원자 번호',prompt:'원자 번호가 1에서 2로 달라지면 반드시 달라지는 것은?',options:['양성자 수','물질의 온도','덩어리의 크기','물질을 담은 그릇'],answer:0,explanation:'원자 번호 1은 양성자 1개인 수소, 2는 양성자 2개인 헬륨입니다. 양성자 수가 달라지면 원소도 달라집니다.'},
  {id:'core19',topic:'분자식',prompt:'2H₂O에 포함된 수소 원자는 모두 몇 개일까?',diagram:{kind:'formula',text:'2H₂O'},options:['4개','2개','3개','6개'],answer:0,explanation:'앞의 2는 물 분자가 2개라는 뜻입니다. 각 물 분자에 수소 원자 2개가 있으므로 2 × 2 = 4개입니다.'},
  {id:'core20',topic:'원자와 분자',prompt:'물 분자를 이루는 수소 원자와 산소 원자는 무엇이 다를까?',options:['양성자 수','전자가 가진 전하의 종류','양성자가 가진 전하의 종류','중성자의 전기적 성질'],answer:0,explanation:'수소는 양성자 1개, 산소는 양성자 8개입니다. 어느 원소에서나 양성자는 +, 전자는 −, 중성자는 0입니다.'},
  {id:'core21',topic:'전기적 성질',prompt:'양성자 11개, 전자 10개인 입자의 전체 전하는?',diagram:{kind:'atom',protons:11,neutrons:12,electrons:10},options:['+1','−1','0','+21'],answer:0,explanation:'양성자의 +11과 전자의 −10을 합하면 +1입니다. 이처럼 전하를 띤 입자를 이온이라고 합니다.'},
  {id:'core22',topic:'이온',prompt:'중성 원자가 전자 1개를 잃으면?',options:['양이온이 된다','음이온이 된다','양성자가 1개 늘어난다','다른 원소가 된다'],answer:0,explanation:'음전하를 띤 전자를 잃으면 전체적으로 양전하를 띱니다. 양성자 수는 변하지 않으므로 원소의 종류는 그대로입니다.'},
  {id:'core23',topic:'이온',prompt:'중성 원자가 전자 1개를 얻으면?',options:['음이온이 된다','양이온이 된다','중성자가 1개 늘어난다','전하가 항상 0이다'],answer:0,explanation:'음전하를 띤 전자가 1개 더 많아져 음이온이 됩니다. 양성자 수는 바뀌지 않습니다.'},
  {id:'core24',topic:'모형 읽기',prompt:'원자 내부 그림을 볼 때 올바른 생각은?',options:['이해를 돕기 위해 크기와 위치를 단순화한 모형이다','전자와 원자핵의 실제 크기 비율을 그대로 보여 준다','전자들이 그림의 선 위에서만 움직인다','보통 현미경으로 찍은 사진이다'],answer:0,explanation:'원자 그림은 실제 사진이 아니라 단순화한 모형입니다. 실제 크기 비율이나 전자의 정확한 경로를 나타내지 않습니다.'},
  {id:'extra01',topic:'주기율표 · 확장',extension:true,prompt:'주기율표에서 세로줄을 무엇이라고 할까?',options:['족','주기','분자','원자핵'],answer:0,explanation:'주기율표의 세로줄은 족, 가로줄은 주기입니다.'},
  {id:'extra02',topic:'주기율표 · 확장',extension:true,prompt:'주기율표에서 가로줄을 무엇이라고 할까?',options:['주기','족','원자 번호','분자식'],answer:0,explanation:'주기율표의 가로줄을 주기라고 합니다. 원소는 원자 번호가 증가하는 순서로 배치됩니다.'},
  {id:'extra03',topic:'주기율표 · 확장',extension:true,prompt:'주기율표에서 같은 족의 원소들에 대한 설명은?',options:['화학적 성질이 비슷한 경우가 많다','양성자 수가 모두 같다','모두 같은 원소이다','상온에서 모두 기체이다'],answer:0,explanation:'같은 족의 원소들은 화학적 성질이 비슷한 경우가 많습니다. 그렇다고 양성자 수나 물질의 상태까지 모두 같은 것은 아닙니다.'},
  {id:'extra04',topic:'주기율표 · 확장',extension:true,prompt:'주기율표에서 원소를 배열하는 기본 순서는?',options:['원자 번호가 증가하는 순서','원소 이름의 가나다순','물질의 가격순','원자의 색깔순'],answer:0,explanation:'주기율표는 원자 번호가 증가하는 순서로 원소를 배열하고, 성질의 규칙성이 드러나도록 구성합니다.'},
];
export const QUESTION_MAP = new Map(QUIZ_QUESTIONS.map(q => [q.id,q]));
