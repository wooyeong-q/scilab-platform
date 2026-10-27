// Four recurring learning characters. Scientific reactions remain in scene.mjs.
export const ENZYMES = {
 amylase:{name:'아밀레이스',hint:'아…',asset:'enzyme-amylase-v7.png',team:'starch',target:'녹말',substrate:'녹말',result:'엿당 등',after:'작은창자 벽의 소화 효소 → 포도당',places:'입 · 작은창자',source:'입에서는 침, 작은창자에서는 이자에서 만든 이자액에 들어 있어요.',phrase:'입과 작은창자에서, 녹말은 아밀레이스!',role:'녹말을 엿당 등으로 나눠요.',look:'번개 옷의 달리기 토끼',stage:0,beat:3},
 pepsin:{name:'펩신',hint:'펩…',asset:'enzyme-pepsin-v7.png',team:'protein',target:'단백질',substrate:'단백질',result:'짧은 단백질 조각',after:'작은창자에서 소화가 이어져요.',places:'위',source:'위액에 들어 있어요.',phrase:'위에서 단백질 시작, 펩신!',role:'단백질을 짧은 조각으로 나눠요.',look:'빨간 머리띠의 근육 곰',stage:2,beat:2},
 trypsin:{name:'트립신',hint:'트…',asset:'enzyme-trypsin-v7.png',team:'protein',target:'단백질',substrate:'단백질 조각',result:'더 작은 단백질 조각',after:'작은창자 벽의 소화 효소 → 아미노산',places:'작은창자',source:'이자에서 만든 이자액에 들어 작은창자로 와요.',phrase:'작은창자에서 단백질 이어받기, 트립신!',role:'단백질 조각을 더 작게 나눠요.',look:'초록 머리띠의 근육 곰',stage:3,beat:3},
 lipase:{name:'라이페이스',hint:'라…',asset:'enzyme-lipase-v7.png',team:'fat',target:'지방',substrate:'지방',result:'지방산 + 모노글리세리드',after:'작은창자 벽 세포로 흡수돼요.',places:'작은창자',source:'이자에서 만든 이자액에 들어 작은창자로 와요.',phrase:'작은창자에서 지방 담당, 라이페이스!',role:'지방을 지방산과 모노글리세리드로 나눠요.',look:'둥근 볼과 배의 통통 햄스터',stage:3,beat:4}
};
export function maskEnzymeNames(text,mode='visible'){
 if(mode==='visible')return String(text);
 return String(text).replace(/(아밀레이스|펩신|트립신|라이페이스)(은|이|을|과|와)?/g,(match,name,particle='')=>{
  if(mode==='hint')return name.slice(0,1)+'…'+particle;
  const adjusted=/신$/.test(name)?({은:'는',이:'가',을:'를',과:'와'}[particle]||particle):particle;
  return '이 효소'+adjusted;
 });
}
export function getEnzymeContext(stage,beat){
 if(stage===0)return {id:'amylase',label:beat<2?'이곳에서 만날 효소':'지금 만나는 효소',place:'입',role:beat<2?'침이 나오면 녹말을 엿당 등으로 나눠요.':ENZYMES.amylase.role};
 if(stage===2)return {id:'pepsin',label:beat===0?'이곳에서 만날 효소':'지금 만나는 효소',place:'위',role:ENZYMES.pepsin.role};
 if(stage===3 && beat>=2){const id=beat===2?'amylase':beat===3?'trypsin':'lipase';return {id,label:beat===5?'방금 만난 효소':'지금 만나는 효소',place:'작은창자',role:ENZYMES[id].role};}
 if(stage===1)return {symbol:'→',label:'음식의 이동',title:'식도의 연동 운동',role:'근육이 차례로 오므라들며 음식물을 위로 보내요.'};
 if(stage===3 && beat===0)return {symbol:'＋',label:'소화액이 모이는 곳',title:'쓸개즙과 이자액',role:'관을 통해 작은창자로 들어오는 모습을 살펴봐요.'};
 if(stage===3)return {symbol:'●',label:'지방 소화를 돕는 물질',title:'쓸개즙 · 효소 아님',role:'큰 지방 방울을 흩어 놓아요. 지방 분자는 그대로예요.'};
 if(stage===4 && (beat===1 || beat===2))return {symbol:'효소',label:'작은창자 벽에서 소화 마무리',title:'소화 효소',reference:beat===1?'(말테이스)':'(펩티데이스)',substrate:beat===1?'엿당':'작은 단백질 조각',result:beat===1?'포도당':'아미노산',role:beat===1?'엿당을 포도당으로 나눠요.':'작은 단백질 조각을 아미노산으로 나눠요.'};
 if(stage===4)return {symbol:'↗',label:'작은 영양소가 몸속으로',title:'작은창자 융털의 흡수',role:'영양소가 작은창자 벽을 건너는 모습을 관찰해요.'};
 return {symbol:'↓',label:'음식의 여행 마무리',title:'수분 흡수와 배출',role:'남은 물 일부를 흡수하고 찌꺼기를 몸 밖으로 내보내요.'};
}
