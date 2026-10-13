import {particleModel,particleLegend,atomComparison,conceptComparison,notationComparison} from './chemistry-models.mjs?v=20261013d';
// Learning models share the existing observation workspace. No electron shells.
export const IONS={
 Na:{name:'나트륨',ionName:'나트륨 이온',p:11,n:12,charge:1},
 Mg:{name:'마그네슘',ionName:'마그네슘 이온',p:12,n:12,charge:2},
 Al:{name:'알루미늄',ionName:'알루미늄 이온',p:13,n:14,charge:3},
 Ca:{name:'칼슘',ionName:'칼슘 이온',p:20,n:20,charge:2},
 Cl:{name:'염소',ionName:'염화 이온',p:17,n:18,charge:-1},
 O:{name:'산소',ionName:'산화 이온',p:8,n:8,charge:-2},
 F:{name:'플루오린',ionName:'플루오린화 이온',p:9,n:10,charge:-1},
};
export const MOLECULES={
 water:{name:'물',parts:[['H',2],['O',1]],points:[['H',140,158],['O',230,115],['H',320,158]],bonds:[[0,1],[1,2]]},
 hydrogen:{name:'수소',parts:[['H',2]],points:[['H',180,130],['H',280,130]],bonds:[[0,1]]},
 oxygen:{name:'산소',parts:[['O',2]],points:[['O',180,130],['O',280,130]],bonds:[[0,1]]},
 nitrogen:{name:'질소',parts:[['N',2]],points:[['N',180,130],['N',280,130]],bonds:[[0,1]]},
 co2:{name:'이산화 탄소',parts:[['C',1],['O',2]],points:[['O',130,130],['C',230,130],['O',330,130]],bonds:[[0,1],[1,2]]},
 ammonia:{name:'암모니아',parts:[['N',1],['H',3]],points:[['N',230,125],['H',140,170],['H',230,205],['H',320,170]],bonds:[[0,1],[0,2],[0,3]]},
 methane:{name:'메테인',parts:[['C',1],['H',4]],points:[['C',230,140],['H',150,75],['H',310,75],['H',150,205],['H',310,205]],bonds:[[0,1],[0,2],[0,3],[0,4]]},
};
export const SALTS={
 nacl:{name:'염화 나트륨',positive:'Na',negative:'Cl'},
 mgcl2:{name:'염화 마그네슘',positive:'Mg',negative:'Cl'},
 cacl2:{name:'염화 칼슘',positive:'Ca',negative:'Cl'},
 na2o:{name:'산화 나트륨',positive:'Na',negative:'O'},
 mgo:{name:'산화 마그네슘',positive:'Mg',negative:'O'},
 al2o3:{name:'산화 알루미늄',positive:'Al',negative:'O'},
};
export const GLOSSARY=[
 ['물질','물체를 이루는 재료.','컵은 물체이고, 그 컵을 이루는 유리나 철은 물질이에요.'],
 ['원소','물질을 이루는 기본 성분으로, 원자의 종류를 구분하는 기준.','양성자 수가 같은 원자들은 같은 원소예요. 산소 원자와 산화 이온은 모두 산소 원소에 속해요.'],
 ['원자','원소의 화학적 성질을 지니는 기본 입자. 원자핵과 전자로 이루어져 있어요.','중성 원자는 양성자 수와 전자 수가 같아요. 원소는 종류를, 원자는 입자를 가리켜요.'],
 ['분자','독립된 입자로 존재하며 그 물질의 성질을 나타내는 가장 작은 입자.','물 분자 하나는 수소 원자 2개와 산소 원자 1개로 이루어져요. 금속이나 염화 나트륨을 분자 하나씩으로 나누어 설명하지는 않아요.'],
 ['원자핵','원자 중심의 매우 작은 부분. 양성자와 중성자로 이루어져 있어요.','가장 흔한 수소 원자핵에는 양성자 1개만 있어요.'],
 ['양성자','원자핵에 있는 양(+)전하를 띠는 입자.','양성자 수가 원소의 종류를 결정해요.'],
 ['중성자','원자핵에 있는 전하를 띠지 않는 입자.','같은 원소의 원자라도 중성자 수가 다를 수 있어요.'],
 ['전자','원자핵 주변에 있는 음(−)전하를 띠는 입자.','전자 1개의 전하 크기는 양성자 1개의 전하 크기와 같아요.'],
 ['원자 번호','원자핵 속 양성자 수를 나타내는 수.','Na의 원자 번호는 11. Na⁺가 되어도 양성자 수와 원자 번호는 그대로예요.'],
 ['전하·전기적 중성','전하는 전기적 성질이며 +와 −가 있어요. 양전하의 총량과 음전하의 총량이 같으면 전기적으로 중성이에요.','중성은 전자가 없다는 뜻이 아니에요. 이 활동에서는 양성자 +1, 전자 −1을 단위로 나타내요.'],
 ['이온','원자 또는 원자단이 전자를 잃거나 얻어 전하를 띠게 된 입자.','이 활동에서는 원자 한 개가 이온이 되는 과정을 다뤄요. 원자단은 여러 원자가 결합한 집단이에요.'],
 ['양이온·음이온','양이온은 양(+)전하를 띠는 이온, 음이온은 음(−)전하를 띠는 이온.','원자가 전자를 잃으면 양이온, 얻으면 음이온이 돼요. 양성자가 이동해서 되는 것이 아니에요.'],
 ['원소 기호','원소를 나타내는 약속된 문자.','첫 글자는 대문자, 두 번째 글자가 있으면 소문자예요. Co는 코발트, CO는 일산화 탄소예요.'],
 ['화학식','원소 기호와 숫자로 물질을 이루는 원소의 종류와 구성 비를 나타낸 식.','분자식 H₂O는 분자 하나의 실제 원자 수를, NaCl은 양이온과 음이온의 가장 간단한 정수비를 나타내요.'],
 ['이온식','원소 기호 또는 원자단의 화학식 오른쪽 위에 전하를 표시한 식.','Mg²⁺는 +2 전하의 이온 1개예요. 2는 원자 개수가 아니며, +1·−1에서는 숫자 1을 생략해요.'],
];
export const CHEM_RECORDS={ions:'전자 수를 바꾸어 이온을 만들고, 양성자 수가 그대로임을 관찰했습니다.',ionNotation:'양성자 수와 전자 수로 전하를 구하고 이온식을 만들었습니다.',molecularFormula:'분자 모형에서 원자 수를 세어 화학식을 만들었습니다.',ionicFormula:'전체 전하가 0인 가장 간단한 이온 비율로 화학식을 만들었습니다.'};
const b=(label,action,value='',cls='',disabled=false,attrs='')=>`<button class="${cls}" data-action="${action}" data-value="${value}" ${disabled?'disabled':''} ${attrs}>${label}</button>`;
const sub=n=>n===1?'':`<sub>${n}</sub>`;
export const ionFormula=(s,q=IONS[s].charge)=>s+(q?`<sup>${Math.abs(q)===1?'':Math.abs(q)}${q>0?'+':'−'}</sup>`:'');
export const molecularFormula=(m,counts=m.parts.map(p=>p[1]))=>m.parts.map(([s],i)=>s+sub(counts[i])).join('');
export const gcd=(a,b)=>b?gcd(b,a%b):a;
export function saltResult(key,positive,negative){const s=SALTS[key],q=IONS[s.positive].charge*positive+IONS[s.negative].charge*negative;return {charge:q,balanced:q===0,simplest:gcd(positive,negative)===1,formula:s.positive+sub(positive)+s.negative+sub(negative)};}
export function freshChem(){return {ion:'Na',electronCount:11,moved:0,ionStep:0,sign:'+',magnitude:0,ionFeedback:'',formulaKind:'molecule',molecule:'water',formulaStep:0,counts:[1,1],salt:'nacl',positive:1,negative:1,formulaFeedback:'',modelFocus:'all',atomFocus:'',notationFocus:'',saltFocus:'positive'};}
export function restoreChem(raw){
 const s=freshChem();if(!raw||typeof raw!=='object')return s;
 for(const [key,options] of [['ion',IONS],['molecule',MOLECULES],['salt',SALTS]])if(Object.hasOwn(options,raw[key]))s[key]=raw[key];
 const range=(key,min,max)=>{if(Number.isInteger(raw[key])&&raw[key]>=min&&raw[key]<=max)s[key]=raw[key];};
 range('moved',0,3);range('ionStep',0,2);range('magnitude',1,3);range('formulaStep',0,2);range('positive',1,6);range('negative',1,6);
 if(raw.sign==='−'||raw.sign==='+')s.sign=raw.sign;
 if(raw.formulaKind==='ionic')s.formulaKind='ionic';
 if(Array.isArray(raw.counts)&&raw.counts.length===MOLECULES[s.molecule].parts.length&&raw.counts.every(n=>Number.isInteger(n)&&n>=1&&n<=6))s.counts=[...raw.counts];else s.counts=MOLECULES[s.molecule].parts.map(()=>1);
 if(['all','protons','neutrons','electrons','charge'].includes(raw.modelFocus))s.modelFocus=raw.modelFocus;
 if(MOLECULES[s.molecule].parts.some(([symbol])=>symbol===raw.atomFocus))s.atomFocus=raw.atomFocus;
 if(['subscript','coefficient','charge'].includes(raw.notationFocus))s.notationFocus=raw.notationFocus;
 if(raw.saltFocus==='negative')s.saltFocus='negative';
 const a=IONS[s.ion];
 const e=Number.isInteger(raw.electronCount)&&raw.electronCount>=a.p-3&&raw.electronCount<=a.p+3?raw.electronCount:a.p-Math.sign(a.charge)*s.moved;
 setIonElectrons(s,e,false);
 if(s.ionStep>0&&s.electronCount===a.p)s.ionStep=0;
 return s;
}

// Electron count is the single source for the diagram, readout and notation.
export function ionState(s){const a=IONS[s.ion],e=s.electronCount,q=a.p-e;return {a,e,q,atTarget:q===a.charge};}
function setIonElectrons(s,value,highlight=true){
 const a=IONS[s.ion];s.electronCount=Math.max(a.p-3,Math.min(a.p+3,value));
 const q=a.p-s.electronCount;s.moved=Math.abs(q);s.magnitude=Math.abs(q);s.sign=q<0?'−':'+';s.ionFeedback='';
 if(highlight)s.modelFocus='electrons';
}
function steps(labels,current,action){return `<ol class="chem-steps" aria-label="만드는 순서">${labels.map((v,i)=>`<li>${b(`<span>${i+1}</span> ${v}`,action,i,current===i?'selected':'',i>current+1)}</li>`).join('')}</ol>`;}
function definition(title,body){return `<div class="chem-definition"><strong>${title}</strong><p>${body}</p></div>`;}
export function glossaryView(){return `${conceptComparison()}<p class="chem-lead">관찰한 그림과 용어의 뜻을 연결해 보세요.</p><div class="chem-glossary">${GLOSSARY.map(([term,def,example])=>`<article><h2>${term}</h2><p>${def}</p><p class="chem-example">${example}</p></article>`).join('')}</div>${b('전자 이동으로 이온 만들기 →','open-drawer','ions','primary')}`;}
export function contextDefinition(material,level,kind){
 const terms=level===0?['물질']:level===1||level===2?[kind==='molecule'?'분자':'원자']:level===5?['원자핵']:['원자','원소'];
 return `<aside class="observation-definition">${terms.map(t=>{const [,d]=GLOSSARY.find(x=>x[0]===t);return `<p><b>${t}</b> ${d}</p>`;}).join('')}<div class="choice-row">${b('개념 사전','open-drawer','definitions','text-button')}${level===2?b('이 분자를 화학식으로 →','learn-formula',material,'secondary'):level>=4?b('전자를 바꾸면? 이온 만들기 →','open-drawer','ions','secondary'):''}</div></aside>`;
}
export function ionsView(s){
 const {a,e,q,atTarget}=ionState(s),charge=q>0?'+'+q:q<0?'−'+Math.abs(q):'0';
 const kind=q===0?'중성 원자':q>0?'양이온':'음이온';
 const target=ionFormula(s.ion),status=q===0?'양성자 수 = 전자 수 → 중성':`전자 ${Math.abs(q)}개 ${q>0?'잃음':'얻음'} → ${kind}`;
 return `<div class="ion-studio" data-ion="${s.ion}">
  <nav class="ion-elements" aria-label="이온이 될 원자 선택">${Object.entries(IONS).map(([key,v])=>b(`<b>${key}</b><span>${v.name}</span>`,'chem-ion',key,s.ion===key?'selected':'',false,`aria-pressed="${s.ion===key}"`)).join('')}</nav>
  <div class="ion-studio-main">
   ${atomComparison(s,a,ionFormula)}
   <section class="ion-console" aria-label="전자 수 조작과 이온식">
    <section class="ion-electron-panel"><div class="ion-panel-heading"><h2><span>1</span> 전자 수 바꾸기</h2>${b('중성으로 초기화','chem-neutral','','text-button')}</div>
     <div class="ion-electron-readout"><span>지금의 전자</span><output aria-label="현재 전자 수">${e}<small>개</small></output><span class="ion-delta">${a.p}개 → ${e}개</span></div>
     <div class="ion-adjust-buttons" role="group" aria-label="전자 개수 직접 바꾸기">${b('<b aria-hidden="true">−</b><span>전자 1개 제거</span>','chem-electron-adjust',-1,'remove-electron',e<=a.p-3)}${b('<b aria-hidden="true">＋</b><span>전자 1개 추가</span>','chem-electron-adjust',1,'add-electron',e>=a.p+3)}</div>
    </section>
    <section class="ion-charge-panel"><h2><span>2</span> 전하 계산하기</h2><dl class="ion-charge-equation" aria-label="양성자 수 빼기 전자 수는 전체 전하"><div><dt>양성자</dt><dd>${a.p}</dd></div><span aria-hidden="true">−</span><div><dt>전자</dt><dd>${e}</dd></div><span aria-hidden="true">=</span><div class="ion-net-charge ${q===0?'neutral':q>0?'positive-ion':'negative-ion'}"><dt>전체 전하</dt><dd>${charge}</dd></div></dl></section>
    <section class="ion-formula-panel ${q===0?'neutral':q>0?'positive-ion':'negative-ion'}"><div class="ion-panel-heading"><h2><span>3</span> ${q===0?'원소 기호':'이온식'}</h2><span class="ion-kind">${kind}</span></div>
     <div class="ion-live-formula" aria-label="현재 모형의 이온식">${b(s.ion,'chem-model-focus','protons','notation-part')}${q!==0?`<sup>${b(`${Math.abs(q)===1?'':Math.abs(q)}${q>0?'+':'−'}`,'chem-model-focus','charge','notation-part')}</sup>`:''}</div>
     <p class="ion-result" role="status">${status}</p>
     <div class="ion-charge-presets" role="group" aria-label="전하를 선택하면 모형의 전자 수도 바뀝니다">${[-3,-2,-1,0,1,2,3].map(n=>b(n===0?'0':`${Math.abs(n)}${n>0?'+':'−'}`,'chem-charge',n,q===n?'selected':'',false,`aria-label="전하 ${n===0?'0, 중성':Math.abs(n)+(n>0?' 양전하':' 음전하')}" aria-pressed="${q===n}"`)).join('')}</div>
    </section>
   </section>
  </div>
  <footer class="ion-studio-footer"><div class="ion-target"><span>대표 이온 <b>${target}</b> · 전자 ${a.p-a.charge}개</span>${b('비교 확인','chem-ion-check','','secondary')}</div><p class="ion-studio-feedback" role="status">${s.ionFeedback||(atTarget?'대표 이온과 같은 전자 수예요.':'대표 이온 외의 전하는 전자 수와 전하를 비교하기 위한 모형입니다.')}</p>${b('화학식 만들기 →','chem-go-salts','','secondary')}</footer>
 </div>`;
}
export function ionHelpView(s){
 const {a}=ionState(s);
 return `<h2>전자를 바꾸면 이온이 돼요</h2><div class="ion-help-content">${definition('이온','원자 또는 원자단이 전자를 잃거나 얻어 전하를 띠게 된 입자.')}
 <p><b>전자 제거 → 양이온(+)</b><br>양성자보다 전자가 적어져 전체 전하가 양수가 됩니다.</p>
 <p><b>전자 추가 → 음이온(−)</b><br>양성자보다 전자가 많아져 전체 전하가 음수가 됩니다.</p>
 <p><b>전체 전하 = 양성자 수 − 전자 수</b><br>양성자는 +1, 전자는 −1로 계산합니다. 중성자는 전하가 0입니다.</p>
 <p><b>이온식은 원소 기호 오른쪽 위에 전하를 표시합니다.</b><br>전하의 크기 1은 생략합니다. 예: Na⁺, Mg²⁺, O²⁻. 위 숫자는 원자의 개수가 아닙니다.</p>
 <p>${a.name}의 대표 이온은 <b>${ionFormula(s.ion)}</b>입니다. 다른 전하도 비교용으로 선택할 수 있지만 모두 흔히 생성되는 이온이라는 뜻은 아닙니다.</p>
 <p class="note">양성자 ${a.p}개와 중성자 ${a.n}개는 유지됩니다. 중성자 수는 한 동위 원소의 예입니다. 전자껍질을 생략한 모형으로, 점의 위치·크기·거리는 실제와 다릅니다.</p></div>`;
}

function moleculePicture(m,focus=''){const colors={H:'#e4f5fa',O:'#ffad99',C:'#a7bbce',N:'#9abfff'};return `<svg class="formula-scene" viewBox="0 0 460 285" role="group" aria-label="${m.name} 분자 하나: ${m.parts.map(([s,n])=>s+' 원자 '+n+'개').join(', ')}">${m.bonds.map(([a,b])=>`<line x1="${m.points[a][1]}" y1="${m.points[a][2]}" x2="${m.points[b][1]}" y2="${m.points[b][2]}" stroke="#668692" stroke-width="15"/>`).join('')}${m.points.map(([s,x,y])=>`<g class="model-molecule-atom ${focus===s?'is-emphasized':focus?'is-muted':''}" role="button" tabindex="0" data-action="chem-atom-focus" data-value="${s}" aria-label="${s} 원자를 모형과 식에서 강조"><circle cx="${x}" cy="${y}" r="33" fill="${colors[s]}"/><text x="${x}" y="${y+8}" text-anchor="middle" fill="#142d3b" font-size="25" font-weight="700">${s}</text></g>`).join('')}<text x="230" y="272" text-anchor="middle" fill="#aac5cf" font-size="17">${m.name} 분자 하나 · 원자 수를 세어 보세요</text></svg>`;}
function counter(label,n,key){const plain=label.replace(/<[^>]*>/g,'');return `<div class="chem-counter"><span>${label}</span><div>${b('−','chem-count',key+':-1','',n<=1,`aria-label="${plain} 개수 줄이기"`)}<output aria-label="${plain} 개수">${n}</output>${b('+','chem-count',key+':1','',n>=6,`aria-label="${plain} 개수 늘리기"`)}</div></div>`;}
function moleculesView(s){const m=MOLECULES[s.molecule];return `<div class="chem-choices" role="group" aria-label="분자 선택">${Object.entries(MOLECULES).map(([k,v])=>b(v.name,'chem-molecule',k,k===s.molecule?'selected':'')).join('')}</div>${steps(['종류 찾기','개수 세기','식으로 쓰기'],s.formulaStep,'chem-formula-step')}<div class="chem-split"><div>${moleculePicture(m,s.atomFocus)}<div class="model-formula-linked" aria-label="관찰 모형의 화학식">${m.parts.map(([symbol,n])=>b(symbol+sub(n),'chem-atom-focus',symbol,s.atomFocus===symbol?'selected':'',false,`aria-pressed="${s.atomFocus===symbol}"`)).join('')}</div><p class="model-explanation" role="status">${s.atomFocus?`모형에서 ${s.atomFocus} 원자 ${m.parts.find(([symbol])=>symbol===s.atomFocus)[1]}개를 강조했어요.`:'원자 또는 식의 기호·아래 숫자를 누르면 같은 원자들이 강조돼요.'}</p><p class="chem-model-note">원자의 색·크기·배열을 단순화한 모형이며, 선은 원자들이 연결되어 있음을 뜻해요.</p></div><section class="chem-lab"><h2>${['어떤 원소로 이루어져 있나요?','각 원자는 몇 개씩 있나요?','원소 기호 오른쪽 아래에 개수를 쓰세요'][s.formulaStep]}</h2>${s.formulaStep===0?`<div class="chem-symbols">${m.parts.map(([sym])=>b(sym,'chem-atom-focus',sym,s.atomFocus===sym?'selected':'')).join('')}</div><p>이 예의 원소 기호 순서는 <b>${m.parts.map(([sym])=>sym).join(' → ')}</b>입니다. 원소 기호의 대소문자를 구분해요.</p>${b('원자 수 세기 →','chem-formula-step',1,'primary')}`:`${m.parts.map(([sym],i)=>counter(sym+' 원자',s.counts[i],'m'+i)).join('')}<div class="chem-formula-preview">${s.formulaStep===2?m.parts.map(([symbol],i)=>b(symbol+sub(s.counts[i]),'chem-atom-focus',symbol,'notation-part')).join(''):m.parts.map(([sym],i)=>`${sym} × ${s.counts[i]}`).join(' + ')}</div><p>${s.formulaStep===2?'원자 수는 오른쪽 <b>아래</b>에 작게 써요. 원자 1개는 숫자 1을 생략해요.':'그림 속 분자 하나를 기준으로 원자 수를 맞춰 보세요.'}</p>${b(s.formulaStep===1?'개수 확인하고 식 만들기 →':'화학식 확인','chem-molecule-check','','primary')}<p class="chem-message" role="status">${s.formulaFeedback||'숫자를 바꾸어 모형과 연결해 보세요.'}</p>`}</section></div>${notationComparison(s.notationFocus)}<p class="chem-footnote">H₂O·CO₂처럼 분자를 이루는 원자의 실제 수를 나타내는 화학식을 <b>분자식</b>이라고 해요. 금(Au)·철(Fe)은 원자가 연결된 금속, 헬륨(He)은 원자가 따로 존재하는 기체이며 원소 기호로 나타내요.</p>`;}
function saltsView(s){const salt=SALTS[s.salt],a=IONS[salt.positive],c=IONS[salt.negative],r=saltResult(s.salt,s.positive,s.negative),selected=salt[s.saltFocus||'positive'],selectedIon=IONS[selected];return `<div class="chem-choices" role="group" aria-label="이온으로 이루어진 물질 선택">${Object.entries(SALTS).map(([k,v])=>b(v.name,'chem-salt',k,k===s.salt?'selected':'')).join('')}</div><p class="chem-lead">① 양이온과 음이온 확인 → ② 전체 전하를 0으로 → ③ 가장 간단한 정수비로 쓰기</p><div class="chem-split"><div class="chem-ion-balance"><h2>양이온과 음이온을 모아 보세요</h2><div class="chem-ion-tokens">${Array.from({length:s.positive},()=>`<button class="cation ${s.saltFocus==='positive'?'chosen-ion':''}" data-action="chem-salt-focus" data-value="positive" aria-label="양이온 하나의 내부 보기">${ionFormula(salt.positive)}</button>`).join('')}${Array.from({length:s.negative},()=>`<button class="anion ${s.saltFocus==='negative'?'chosen-ion':''}" data-action="chem-salt-focus" data-value="negative" aria-label="음이온 하나의 내부 보기">${ionFormula(salt.negative)}</button>`).join('')}</div><div class="chem-equation">(+${a.charge}) × ${s.positive}<br>+ (${c.charge}) × ${s.negative}<br>= <b>${r.charge>0?'+':''}${r.charge}</b></div><section class="salt-particle-detail"><h3>${ionFormula(selected)} · ${selectedIon.ionName} 하나의 내부</h3>${particleModel({symbol:selected,p:selectedIon.p,n:selectedIon.n,e:selectedIon.p-selectedIon.charge})}${particleLegend()}<p>양성자 ${selectedIon.p}개 · 전자 ${selectedIon.p-selectedIon.charge}개 · 전하 ${selectedIon.charge>0?'+':''}${selectedIon.charge}</p></section><p class="chem-model-note">위의 이온을 누르면 그 이온 하나의 내부를 볼 수 있어요. 비율을 세는 모형입니다. 이 구슬들이 독립된 분자 한 개를 이루는 것은 아니에요.</p></div><section class="chem-lab"><h2>전체 전하가 0이 되도록</h2>${counter(ionFormula(salt.positive)+' 이온',s.positive,'positive')}${counter(ionFormula(salt.negative)+' 이온',s.negative,'negative')}<div class="chem-formula-preview">${b(salt.positive+sub(s.positive),'chem-salt-focus','positive','notation-part')}${b(salt.negative+sub(s.negative),'chem-salt-focus','negative','notation-part')}</div><p>양이온을 먼저, 음이온을 뒤에 써요. 이온의 개수 비는 <b>아래 첨자</b>로 표시하고, 1과 이온의 전하 표시는 생략해요.</p>${b('비율과 화학식 확인','chem-salt-check','','primary')}<p class="chem-message" role="status">${s.formulaFeedback||'전하의 합과 가장 간단한 비를 모두 확인해 보세요.'}</p></section></div><div class="chem-distinction"><h3>왜 NaCl을 ‘NaCl 분자 하나’라고 하지 않을까?</h3><p>고체 염화 나트륨은 많은 Na⁺와 Cl⁻가 반복적으로 배열되어 있어요. NaCl은 떨어진 한 분자를 뜻하지 않고, <b>Na⁺ : Cl⁻ = 1 : 1</b>이라는 구성 비를 나타내요.</p><p>MgO에서 Mg²⁺ : O²⁻는 1 : 1입니다. 2 : 2도 전하의 합은 0이지만 가장 간단한 비로 줄여 써요.</p></div>`;}
export function formulasView(s){return `${definition('화학식','물질을 이루는 원소의 종류와 구성 비를 원소 기호와 숫자로 나타낸 식. 분자 하나의 원자 수를 쓰는 경우와 이온의 비율을 쓰는 경우를 구분해요.')}<div class="chem-tabs" role="group" aria-label="화학식 만드는 방법">${b('분자 모형 → 화학식','chem-kind','molecule',s.formulaKind==='molecule'?'selected':'')}${b('이온 비율 → 화학식','chem-kind','ionic',s.formulaKind==='ionic'?'selected':'')}</div>${s.formulaKind==='molecule'?moleculesView(s):saltsView(s)}`;}
export function chemistryAction(s,action,value){
 const result={handled:true,record:null,drawer:null,message:null};
 const {a,e,q,atTarget:full}=ionState(s),i=Number(value);
 switch(action){
 case 'chem-model-focus':if(['all','protons','neutrons','electrons','charge'].includes(value))s.modelFocus=value;break;
 case 'chem-atom-focus':if(MOLECULES[s.molecule].parts.some(([symbol])=>symbol===value))s.atomFocus=value;break;
 case 'chem-notation-focus':if(['subscript','coefficient','charge'].includes(value))s.notationFocus=value;break;
 case 'chem-salt-focus':if(['positive','negative'].includes(value))s.saltFocus=value;break;
 case 'chem-ion':if(Object.hasOwn(IONS,value)){Object.assign(s,{ion:value,ionStep:0,modelFocus:'all'});setIonElectrons(s,IONS[value].p,false);}break;
 case 'chem-electron':if(!full){setIonElectrons(s,e+Math.sign(a.p-a.charge-e));if(ionState(s).atTarget)result.record='ions';}break;
 case 'chem-electron-adjust':if([-1,1].includes(i)){setIonElectrons(s,e+i);if(ionState(s).atTarget)result.record='ions';}break;
 case 'chem-neutral':setIonElectrons(s,a.p);break;
 case 'chem-ion-step':if([0,1,2].includes(i)){if(i===0||q!==0)s.ionStep=i;else result.message='전자를 추가하거나 제거해 이온을 만든 뒤 비교해 보세요.';}break;
 case 'chem-charge':if(Number.isInteger(i)&&i>=-3&&i<=3){setIonElectrons(s,a.p-i);if(ionState(s).atTarget)result.record='ions';}break;
 case 'chem-magnitude':if([1,2,3].includes(i))setIonElectrons(s,a.p-(s.sign==='−'?-i:i));break;
 case 'chem-sign':if(['+','−'].includes(value))setIonElectrons(s,a.p-(value==='−'?-1:1)*(Math.abs(q)||1));break;
 case 'chem-ion-check':{s.ionFeedback=full?`맞아요! ${ionFormula(s.ion)} · 전자 ${e}개인 ${a.ionName}입니다.`:`지금 전자 ${e}개 · 대표 이온 ${ionFormula(s.ion)}은 ${a.p-a.charge}개. 다시 비교해 보세요.`;if(full)result.record='ionNotation';break;}
 case 'chem-go-salts':s.formulaKind='ionic';s.formulaFeedback='';result.drawer='formulas';break;
 case 'chem-kind':if(['molecule','ionic'].includes(value)){s.formulaKind=value;s.formulaFeedback='';}break;
 case 'chem-molecule':if(Object.hasOwn(MOLECULES,value)){s.molecule=value;s.atomFocus='';s.counts=MOLECULES[value].parts.map(()=>1);s.formulaStep=0;s.formulaFeedback='';}break;
 case 'chem-formula-step':if([0,1,2].includes(i)){s.formulaStep=i;s.formulaFeedback='';}break;
 case 'chem-salt':if(Object.hasOwn(SALTS,value)){s.salt=value;s.saltFocus='positive';s.positive=1;s.negative=1;s.formulaFeedback='';}break;
 case 'chem-count':{const [key,delta]=value.split(':'),d=Number(delta);if(![-1,1].includes(d))break;if(['positive','negative'].includes(key))s[key]=Math.max(1,Math.min(6,s[key]+d));else if(/^m[01]$/.test(key)&&Number(key[1])<s.counts.length){const index=Number(key[1]);s.counts[index]=Math.max(1,Math.min(6,s.counts[index]+d));s.atomFocus=MOLECULES[s.molecule].parts[index][0];}s.formulaFeedback='';break;}
 case 'chem-molecule-check':{const m=MOLECULES[s.molecule],ok=m.parts.every(([,n],j)=>n===s.counts[j]);s.formulaFeedback=ok?`맞아요! ${molecularFormula(m)} · ${m.parts.map(([symbol,n])=>symbol+' 원자 '+n+'개').join(', ')}입니다.`:'그림 속 분자 하나의 원자 수와 아직 달라요. 원소 기호별로 다시 세어 보세요.';if(ok){s.formulaStep=2;result.record='molecularFormula';}break;}
 case 'chem-salt-check':{const r=saltResult(s.salt,s.positive,s.negative);s.formulaFeedback=!r.balanced?`전체 전하가 ${r.charge>0?'+':''}${r.charge}입니다. 양전하와 음전하의 총량을 같게 맞춰 보세요.`:!r.simplest?'전체 전하는 0이지만, 더 작은 정수비로 줄일 수 있어요. 양쪽 개수를 같은 수로 나누어 보세요.':`맞아요! ${r.formula} · 양이온 : 음이온 = ${s.positive} : ${s.negative}, 전체 전하 0입니다.`;if(r.balanced&&r.simplest)result.record='ionicFormula';break;}
 default:result.handled=false;
 }
 return result;
}
