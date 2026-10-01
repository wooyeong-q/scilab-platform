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
export const IRON={z:26,symbol:'Fe',name:'철',n:30,period:4,group:8};
export const atom=z=>z===79?GOLD:z===26?IRON:ELEMENTS[z-1];
export const MATERIALS={
 water:{defaultZ:8,card:'물방울 속 작은 입자',name:'물',formula:'H₂O',kind:'molecule',atoms:[1,8,1],color:'#6ae0dc',tag:'가장 가까운 물질',intro:'물방울 하나에는 무엇이 숨어 있을까?',field:'물은 아주 많은 물 분자(H₂O)로 이루어져 있어요.',detail:'물 분자 하나에는 수소 원자 2개와 산소 원자 1개가 결합해 있어요.',image:'water.webp',alt:'물결 위의 투명한 물방울을 사실적으로 표현한 일러스트'},
 hydrogen:{defaultZ:1,card:'가장 간단한 원자를 가진 기체',name:'수소 기체',formula:'H₂',kind:'molecule',atoms:[1,1],color:'#b4caff',tag:'가장 간단한 원자',intro:'보이지 않는 기체도 입자로 이루어져 있을까?',field:'수소 기체는 수소 분자(H₂)들로 이루어져 있어요.',detail:'수소 원자 2개가 결합하면 수소 분자 하나가 돼요.',image:'hydrogen.webp',alt:'무색의 수소 기체가 담긴 투명한 유리 용기를 표현한 일러스트'},
 gold:{defaultZ:79,card:'금속 조각 속 반복된 원자들',name:'금',formula:'Au',kind:'array',atoms:[79],color:'#f2cf76',tag:'반복되는 원자 배열',intro:'단단한 금도 끝없이 확대하면 무엇이 보일까?',field:'금은 금 원자들이 반복된 구조를 이루는 물질이에요.',detail:'금은 물처럼 작은 분자 단위로 나뉘지 않아요. 반복된 배열에서 금 원자 하나를 골라 봅시다.',image:'gold.webp',alt:'울퉁불퉁한 순금 조각을 사실적으로 표현한 일러스트'},
 oxygen:{defaultZ:8,name:'산소 기체',formula:'O₂',kind:'molecule',atoms:[8,8],color:'#f38673',card:'우리가 숨 쉴 때 필요한 기체',intro:'용기 안의 산소 기체를 확대해 볼까요?',field:'산소 기체는 산소 분자(O₂)들로 이루어져 있어요.',detail:'산소 분자 하나에는 산소 원자 2개가 결합해 있어요.',image:'oxygen.webp',alt:'산소 기체를 담은 용기를 표현한 일러스트'},
 'carbon-dioxide':{defaultZ:6,name:'이산화 탄소',formula:'CO₂',kind:'molecule',atoms:[8,6,8],color:'#8da6bf',card:'숨을 내쉴 때 나오는 기체 중 하나',intro:'용기 안의 이산화 탄소 기체를 확대해 볼까요?',field:'이산화 탄소 기체는 이산화 탄소 분자(CO₂)들로 이루어져 있어요.',detail:'탄소 원자 1개와 산소 원자 2개가 결합한 분자예요.',image:'carbon-dioxide.webp',alt:'무색의 이산화 탄소 기체를 담은 투명한 유리 용기 일러스트'},
 helium:{defaultZ:2,name:'헬륨 기체',formula:'He',kind:'atom',atoms:[2],color:'#c99be8',card:'풍선 안에 든 헬륨 기체',intro:'풍선 안에 든 헬륨 기체를 확대해 보세요.',field:'헬륨 기체는 헬륨 원자 하나하나가 떨어져 있어요.',detail:'헬륨 기체는 원자들이 분자로 묶이지 않고 하나씩 존재해요.',image:'helium.webp',alt:'헬륨 기체를 넣어 띄운 연보라색 풍선 일러스트'},
 iron:{defaultZ:26,name:'철',formula:'Fe',kind:'array',atoms:[26],color:'#aab7c5',card:'순수한 철 조각 속 원자들',intro:'순수한 철 조각 안에는 어떤 입자가 있을까요?',field:'철은 철 원자들이 반복된 구조를 이루는 물질이에요.',detail:'반복된 배열에서 철 원자 하나를 골라 보세요.',image:'iron.webp',alt:'회색 금속 광택이 나는 순수한 철 조각을 표현한 일러스트'}
};
export const MOLECULE_LAYOUTS={
 water:{atoms:[{z:8,x:360,y:210,r:100,labelY:74},{z:1,x:203,y:330,r:65,labelY:433},{z:1,x:517,y:330,r:65,labelY:433}],bonds:[[0,1],[0,2]]},
 hydrogen:{atoms:[{z:1,x:265,y:245,r:92,labelY:390},{z:1,x:455,y:245,r:92,labelY:390}],bonds:[[0,1]]},
 oxygen:{atoms:[{z:8,x:265,y:245,r:92,labelY:390},{z:8,x:455,y:245,r:92,labelY:390}],bonds:[[0,1]]},
 'carbon-dioxide':{atoms:[{z:8,x:176,y:250,r:76,labelY:380},{z:6,x:360,y:250,r:88,labelY:105},{z:8,x:544,y:250,r:76,labelY:380}],bonds:[[0,1],[1,2]]}
};
export const ATOM_COLORS={1:['#effaff','#a6d8df','#497b93'],2:['#f4dcff','#c99be8','#755a99'],6:['#bdd0df','#607b94','#263b52'],8:['#ffc3a9','#f38673','#9c444f'],26:['#eef2f5','#aab7c5','#4a5968'],79:['#fff0bb','#eac465','#987032']};
export const PARTICLES={p:{name:'양성자',sign:'+',location:'원자핵',description:'양의 전하를 띠는 입자예요.'},n:{name:'중성자',sign:'0',location:'원자핵',description:'전하가 0인 입자예요. 같은 원소라도 중성자 수는 다를 수 있어요.'},e:{name:'전자',sign:'−',location:'원자핵 주변',description:'전자와 양성자의 전하 크기는 같고 부호는 반대예요.'}};
export const DISCOVERIES={
 water:'물 → 물 분자(H₂O) → 수소 원자 2개와 산소 원자 1개',
 hydrogen:'수소 기체 → 수소 분자(H₂) → 수소 원자 2개',
 gold:'금 → 반복된 금 원자 배열 → 금 원자',
 oxygen:'산소 기체 → 산소 분자(O₂) → 산소 원자 2개',
 'carbon-dioxide':'이산화 탄소 기체 → CO₂ 분자 → 탄소 원자 1개와 산소 원자 2개',
 helium:'헬륨 기체 → 따로 떨어져 있는 헬륨 원자 → 원자 내부',
 iron:'철 → 반복된 철 원자 배열 → 철 원자',
 structure:'원자는 원자핵과 전자로, 원자핵은 양성자와 중성자로 이루어져 있다. 가장 흔한 수소 원자핵에는 중성자가 없다.',
 particles:'양성자는 +, 중성자는 0, 전자는 −의 전기적 성질을 가진다.',
 compare:'원소는 원자의 종류다. 원소의 종류는 양성자 수에 의해 결정된다.',
 number:'원자 번호는 양성자 수와 같다. 전자 수가 달라져도 원자 번호는 그대로다.',
 neutral:'전기적으로 중성인 원자는 양성자 수와 전자 수가 같다.',
 shells:'이번 활동의 원자번호 1~20 바닥상태 중성 원자는 안쪽 껍질부터 전자를 배치한다. 칼륨과 칼슘에서는 네 번째 껍질도 사용한다.',
 table:'원자 번호 1~20의 원소 이름·기호·양성자 수를 주기율표에서 살펴보았다.',
 final:'양성자 수로 원소와 원자 번호를, 양성자·전자 수로 중성을, 전자 수로 배치를 분석했다.'
};
