// Neutral ground-state atom teaching data. Neutrons are isotope examples, not element constants.
const rows = [
 ['H','수소', [1],0,1,1], ['He','헬륨',[2],2,1,18],
 ['Li','리튬',[2,1],4,2,1], ['Be','베릴륨',[2,2],5,2,2],
 ['B','붕소',[2,3],6,2,13], ['C','탄소',[2,4],6,2,14],
 ['N','질소',[2,5],7,2,15], ['O','산소',[2,6],8,2,16],
 ['F','플루오린',[2,7],10,2,17], ['Ne','네온',[2,8],10,2,18],
 ['Na','나트륨',[2,8,1],12,3,1], ['Mg','마그네슘',[2,8,2],12,3,2],
 ['Al','알루미늄',[2,8,3],14,3,13], ['Si','규소',[2,8,4],14,3,14],
 ['P','인',[2,8,5],16,3,15], ['S','황',[2,8,6],16,3,16],
 ['Cl','염소',[2,8,7],18,3,17], ['Ar','아르곤',[2,8,8],22,3,18],
 ['K','칼륨',[2,8,8,1],20,4,1], ['Ca','칼슘',[2,8,8,2],20,4,2]
];
export const ELEMENTS=rows.map(([symbol,name,shells,n,period,group],i)=>({z:i+1,symbol,name,shells,n,period,group}));
export const GOLD={z:79,symbol:'Au',name:'금',n:118,shells:[2,8,18,32,18,1],period:6,group:11};
export const atom=z=>z===79?GOLD:ELEMENTS[z-1];
export const MATERIALS={
 water:{name:'물',formula:'H₂O',kind:'molecule',atoms:[1,8,1],color:'#6ae0dc',tag:'가장 가까운 물질',intro:'물방울 하나에는 무엇이 숨어 있을까?',field:'물은 아주 많은 물 분자(H₂O)로 이루어져 있어요.',detail:'물 분자 하나에는 수소 원자 2개와 산소 원자 1개가 결합해 있어요.',image:'water.webp',alt:'물결 위의 투명한 물방울을 사실적으로 표현한 일러스트'},
 hydrogen:{name:'수소 기체',formula:'H₂',kind:'molecule',atoms:[1,1],color:'#b4caff',tag:'가장 간단한 원자',intro:'보이지 않는 기체도 입자로 이루어져 있을까?',field:'수소 기체는 수소 분자(H₂)들로 이루어져 있어요.',detail:'수소 원자 2개가 결합하면 수소 분자 하나가 돼요.',image:'hydrogen.webp',alt:'무색의 수소 기체가 담긴 투명한 유리 용기를 표현한 일러스트'},
 gold:{name:'금',formula:'Au',kind:'array',atoms:[79],color:'#f2cf76',tag:'반복되는 원자 배열',intro:'단단한 금도 끝없이 확대하면 무엇이 보일까?',field:'금은 금 원자들이 반복된 구조를 이루는 물질이에요.',detail:'금은 물처럼 작은 분자 단위로 나뉘지 않아요. 반복된 배열에서 금 원자 하나를 골라 봅시다.',image:'gold.webp',alt:'울퉁불퉁한 순금 조각을 사실적으로 표현한 일러스트'}
};
export const PARTICLES={p:{name:'양성자',sign:'+',location:'원자핵',description:'양성자 수가 원소의 종류를 결정해요.'},n:{name:'중성자',sign:'0',location:'원자핵',description:'전하가 0인 입자예요. 같은 원소라도 중성자 수는 다를 수 있어요.'},e:{name:'전자',sign:'−',location:'원자핵 주변',description:'전자와 양성자의 전하 크기는 같고 부호는 반대예요.'}};
export const CHAPTERS=['확대 탐험','원자 비교','원자 번호','중성의 비밀','전자 배치','주기율표','종합 탐험'];
export const DISCOVERIES={
 water:'물 → 물 분자(H₂O) → 수소 원자 2개와 산소 원자 1개',
 hydrogen:'수소 기체 → 수소 분자(H₂) → 수소 원자 2개',
 gold:'금 → 반복된 금 원자 배열 → 금 원자',
 structure:'원자는 원자핵과 전자로, 원자핵은 양성자와 중성자로 이루어져 있다. 가장 흔한 수소 원자핵에는 중성자가 없다.',
 particles:'양성자는 +, 중성자는 0, 전자는 −의 전기적 성질을 가진다.',
 compare:'원소의 종류는 양성자 수로 결정된다. 중성자 수가 달라도 같은 원소일 수 있다.',
 number:'원자 번호는 양성자 수다. 수소 1, 산소 8, 금 79.',
 neutral:'전기적으로 중성인 원자는 양성자 수와 전자 수가 같다.',
 shells:'이번 활동의 원자번호 1~20 바닥상태 중성 원자는 안쪽 껍질부터 전자를 배치한다. 칼륨과 칼슘에서는 네 번째 껍질도 사용한다.',
 table:'주기율표에서 원자 번호·원소 기호·이름을 연결할 수 있다.',
 final:'양성자 수로 원소와 원자 번호를, 양성자·전자 수로 중성을, 전자 수로 배치를 분석했다.'
};
